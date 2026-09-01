import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import {
  Plus,
  Trash2,
  GripVertical,
  Layout,
  Loader2,
  Download,
  Upload,
  Pencil,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { groupsApi } from "@/features/groups/api/groupsApi";
import { tasksApi } from "@/features/tasks/api/tasksApi";
import type { CreateTaskRequest } from "@/features/tasks/types/types";
import type { Status, Priority } from "@/features/cms/types/types";
import type { Task } from "@/features/workload/types/workload-types";
import * as XLSX from "xlsx";
import * as ExcelJS from "exceljs";

export type WidgetType = "tasks_list" | "calendar_view" | "chart" | "notes";

export interface TrackingLayoutRow {
  id: string;
  name?: string;
}

export interface TrackingLayoutColumn {
  id: string;
  name?: string;
  rows: TrackingLayoutRow[];
}

export interface TrackingLayoutTab {
  id: string;
  name: string;
  columns: TrackingLayoutColumn[];
}

interface TrackingLayoutBuilderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string | number;
  groupName: string;
  boardId: string | number;
  boardName: string;
  organizationId: string | number;
  statuses?: Status[];
  priorities?: Priority[];
  onLayoutStatusChange?: (status: "default" | "pending" | "complete") => void;
  onTaskCreated?: (task: Task) => void;
}

export function TrackingLayoutBuilderModal({
  open,
  onOpenChange,
  groupId,
  groupName,
  boardId,
  boardName,
  organizationId,
  statuses,
  priorities,
  onLayoutStatusChange,
  onTaskCreated,
}: TrackingLayoutBuilderModalProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [tabs, setTabs] = useState<TrackingLayoutTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [tempTabName, setTempTabName] = useState<string>("");
  const [addingTaskKey, setAddingTaskKey] = useState<string | null>(null);

  const handleStartEditingTab = (
    tab: TrackingLayoutTab,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    setEditingTabId(tab.id);
    setTempTabName(tab.name);
  };

  const handleSaveTabName = (tabId: string) => {
    if (tempTabName.trim()) {
      setTabs((prev) =>
        prev.map((t) =>
          t.id === tabId ? { ...t, name: tempTabName.trim() } : t,
        ),
      );
    }
    setEditingTabId(null);
  };

  useEffect(() => {
    let hasTrackingData = false;
    let hasPendingStatus = false;

    tabs.forEach((tab) =>
      tab.columns?.forEach((column) => {
        if (!column.name?.toLowerCase().includes("status")) return;

        column.rows?.forEach((row) => {
          const status = (row.name || "").trim().toLowerCase();
          if (!status || status === "n/a") return;

          hasTrackingData = true;
          if (status === "pending" || status === "not started") {
            hasPendingStatus = true;
          }
        });
      }),
    );

    onLayoutStatusChange?.(
      !hasTrackingData
        ? "default"
        : hasPendingStatus
          ? "pending"
          : "complete",
    );
  }, [tabs, onLayoutStatusChange]);

  useEffect(() => {
    setStatusFilter("All");
  }, [activeTabId]);
  const [existingLayoutId, setExistingLayoutId] = useState<
    number | string | null
  >(null);

  interface PendingImportData {
    mode: "global" | "tab";
    globalTabs?: TrackingLayoutTab[];
    tabColumns?: TrackingLayoutColumn[];
  }
  const [showStatusConfirm, setShowStatusConfirm] = useState(false);
  const [pendingImport, setPendingImport] = useState<PendingImportData | null>(
    null,
  );

  const globalFileInputRef = React.useRef<HTMLInputElement>(null);
  const tabFileInputRef = React.useRef<HTMLInputElement>(null);

  const handleGlobalImportCSVClick = () => {
    if (globalFileInputRef.current) {
      globalFileInputRef.current.click();
    }
  };

  const handleTabImportCSVClick = () => {
    if (tabFileInputRef.current) {
      tabFileInputRef.current.click();
    }
  };

  const processFile = async (
    e: React.ChangeEvent<HTMLInputElement>,
    mode: "global" | "tab",
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validExtensions = [".csv", ".xls", ".xlsx"];
    const extension = file.name
      .substring(file.name.lastIndexOf("."))
      .toLowerCase();

    if (!validExtensions.includes(extension)) {
      toast.error(
        "Invalid file type. Please upload a .csv, .xls, or .xlsx file.",
      );
      e.target.value = "";
      return;
    }

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);

      if (mode === "global") {
        const newTabsToAppend: TrackingLayoutTab[] = [];

        workbook.SheetNames.forEach((sheetName) => {
          const worksheet = workbook.Sheets[sheetName];
          const json: any[][] = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
            defval: "",
          });

          const lines = json.filter((row) =>
            row.some((cell) => String(cell).trim() !== ""),
          );

          if (lines.length === 0) return;

          const headers = lines[0].map((h: any) => String(h).trim());
          const dataRowLines = lines.slice(1);

          const newColumns: TrackingLayoutColumn[] = headers.map((header) => ({
            id: `col_${generateId()}`,
            name: header,
            rows: [],
          }));

          dataRowLines.forEach((rowValues) => {
            rowValues.forEach((val, i) => {
              const strVal = String(val).trim();
              if (i < newColumns.length && strVal) {
                newColumns[i].rows.push({
                  id: `row_${generateId()}`,
                  name: strVal,
                });
              }
            });
          });

          newTabsToAppend.push({
            id: `tab_${sheetName}_${generateId()}`,
            name: sheetName,
            columns: newColumns,
          });
        });

        if (newTabsToAppend.length === 0) {
          toast.error("File is empty or contains no valid data");
          return;
        }

        let hasStatusField = false;
        newTabsToAppend.forEach((tab) => {
          tab.columns.forEach((c) => {
            if (c.name?.toLowerCase().includes("status")) hasStatusField = true;
          });
        });

        const pending: PendingImportData = {
          mode: "global",
          globalTabs: newTabsToAppend,
        };
        if (hasStatusField) {
          setPendingImport(pending);
          setShowStatusConfirm(true);
        } else {
          commitImport(pending, false);
        }
      } else {
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        const json: any[][] = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          defval: "",
        });

        const lines = json.filter((row) =>
          row.some((cell) => String(cell).trim() !== ""),
        );

        if (lines.length === 0) {
          toast.error("File is empty");
          return;
        }

        const headers = lines[0].map((h: any) => String(h).trim());
        const dataRowLines = lines.slice(1);

        const newColumns: TrackingLayoutColumn[] = headers.map((header) => ({
          id: `col_${generateId()}`,
          name: header,
          rows: [],
        }));

        dataRowLines.forEach((rowValues) => {
          rowValues.forEach((val, i) => {
            const strVal = String(val).trim();
            if (i < newColumns.length && strVal) {
              newColumns[i].rows.push({
                id: `row_${generateId()}`,
                name: strVal,
              });
            }
          });
        });

        let hasStatusField = false;
        newColumns.forEach((c) => {
          if (c.name?.toLowerCase().includes("status")) hasStatusField = true;
        });

        const pending: PendingImportData = {
          mode: "tab",
          tabColumns: newColumns,
        };
        if (hasStatusField) {
          setPendingImport(pending);
          setShowStatusConfirm(true);
        } else {
          commitImport(pending, false);
        }
      }
    } catch (err) {
      toast.error("Failed to parse file");
      console.error(err);
    } finally {
      e.target.value = "";
    }
  };

  const commitImport = (payload: PendingImportData, resetToNA: boolean) => {
    if (payload.mode === "global" && payload.globalTabs) {
      const finalTabs = payload.globalTabs.map((tab) => ({
        ...tab,
        columns: tab.columns.map((col) => {
          if (resetToNA && col.name?.toLowerCase().includes("status")) {
            return {
              ...col,
              rows: col.rows.map((r) => ({ ...r, name: "N/A" })),
            };
          }
          return col;
        }),
      }));

      setTabs((prev) => {
        if (
          prev.length === 1 &&
          prev[0].columns.length === 0 &&
          prev[0].name === "Overview"
        ) {
          return finalTabs;
        }
        return [...prev, ...finalTabs];
      });

      setActiveTabId(finalTabs[0].id);
      toast.success("All tabs imported successfully");
    } else if (payload.mode === "tab" && payload.tabColumns) {
      const finalCols = payload.tabColumns.map((col) => {
        if (resetToNA && col.name?.toLowerCase().includes("status")) {
          return {
            ...col,
            rows: col.rows.map((r) => ({ ...r, name: "N/A" })),
          };
        }
        return col;
      });

      setTabs((prev) =>
        prev.map((t) => {
          if (t.id === activeTabId) {
            return {
              ...t,
              columns: [...t.columns, ...finalCols],
            };
          }
          return t;
        }),
      );
      toast.success("Sheet imported to current tab");
    }

    setPendingImport(null);
    setShowStatusConfirm(false);
  };

  const cancelImport = () => {
    setShowStatusConfirm(false);
    setPendingImport(null);
  };

  const handleGlobalFileUpload = (e: React.ChangeEvent<HTMLInputElement>) =>
    processFile(e, "global");

  const handleTabFileUpload = (e: React.ChangeEvent<HTMLInputElement>) =>
    processFile(e, "tab");

  const handleGlobalExport = async () => {
    if (!tabs || tabs.length === 0) {
      toast.error("No data to export");
      return;
    }
    const wb = new ExcelJS.Workbook();

    tabs.forEach((tab) => {
      let sheetTitle = (tab.name || "Tab").substring(0, 31);
      let count = 1;
      while (wb.worksheets.find((ws) => ws.name === sheetTitle)) {
        let suffix = ` (${count})`;
        sheetTitle =
          (tab.name || "Tab").substring(0, 31 - suffix.length) + suffix;
        count++;
      }
      const ws = wb.addWorksheet(sheetTitle);

      const headers = tab.columns
        ? tab.columns.map((c) => c.name || "Untitled")
        : [];
      if (headers.length > 0) {
        ws.addRow(headers);
      }

      let maxRows = 0;
      if (tab.columns) {
        maxRows = Math.max(0, ...tab.columns.map((c) => c.rows?.length || 0));
      }

      for (let i = 0; i < maxRows; i++) {
        const rowData = tab.columns.map((c) => c.rows?.[i]?.name || "");
        ws.addRow(rowData);
      }

      tab.columns?.forEach((c, idx) => {
        if (c.name?.toLowerCase().includes("status")) {
          for (let rowNum = 2; rowNum <= 1000; rowNum++) {
            ws.getCell(rowNum, idx + 1).dataValidation = {
              type: "list",
              allowBlank: true,
              formulae: ['"Not Added,Done,In Progress,Pending,N/A"'],
            };
          }
        }
      });
    });

    if (wb.worksheets.length === 0) {
      toast.error("No valid tabs to export");
      return;
    }

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${boardName || "Global"}_Export.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleTabExport = async () => {
    const activeTabObj = tabs.find((t) => t.id === activeTabId);
    if (
      !activeTabObj ||
      !activeTabObj.columns ||
      activeTabObj.columns.length === 0
    ) {
      toast.error("No data to export in the active tab");
      return;
    }

    const wb = new ExcelJS.Workbook();
    const sheetTitle = (activeTabObj.name || "Tab").substring(0, 31);
    const ws = wb.addWorksheet(sheetTitle);

    const headers = activeTabObj.columns.map((c) => c.name || "Untitled");
    if (headers.length > 0) {
      ws.addRow(headers);
    }

    const maxRows = Math.max(
      0,
      ...activeTabObj.columns.map((c) => c.rows?.length || 0),
    );

    for (let i = 0; i < maxRows; i++) {
      const rowData = activeTabObj.columns.map((c) => c.rows?.[i]?.name || "");
      ws.addRow(rowData);
    }

    activeTabObj.columns?.forEach((c, idx) => {
      if (c.name?.toLowerCase().includes("status")) {
        for (let rowNum = 2; rowNum <= 1000; rowNum++) {
          ws.getCell(rowNum, idx + 1).dataValidation = {
            type: "list",
            allowBlank: true,
            formulae: ['"Not Added,Done,In Progress,Pending,N/A"'],
          };
        }
      }
    });

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeTabObj.name || "Tab"}_Export.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (open && groupId) {
      fetchLayout();
    }
  }, [open, groupId]);

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const fetchLayout = async () => {
    setLoading(true);
    setExistingLayoutId(null);
    try {
      const data = await groupsApi.getTrackingLayout(groupId);
      const layoutData = Array.isArray(data)
        ? (data.find(
          (item: any) => String(item?.group_id) === String(groupId),
        ) ?? null)
        : data;

      if (layoutData) {
        const resolvedId =
          layoutData.id ??
          layoutData.ID ??
          layoutData.tracking_id ??
          layoutData.layout_id;
        if (resolvedId != null) {
          setExistingLayoutId(resolvedId);
        }
      }

      const rawLayout = layoutData?.layout_data || layoutData?.layout_json;
      if (layoutData && rawLayout) {
        let parsedLayoutJson = rawLayout;

        if (typeof parsedLayoutJson === "string") {
          try {
            parsedLayoutJson = JSON.parse(parsedLayoutJson);
            if (typeof parsedLayoutJson === "string") {
              parsedLayoutJson = JSON.parse(parsedLayoutJson);
            }
          } catch (e) {
            console.error("Failed to parse layout string:", e);
          }
        }

        if (parsedLayoutJson && parsedLayoutJson.tabs) {
          if (
            Array.isArray(parsedLayoutJson.tabs) &&
            parsedLayoutJson.tabs.length > 0 &&
            typeof parsedLayoutJson.tabs[0] === "object"
          ) {
            const parsedTabs = parsedLayoutJson.tabs.map(
              (tab: any, i: number) => {
                let allColumns: TrackingLayoutColumn[] = [];
                if (Array.isArray(tab.rows)) {
                  tab.rows.forEach((row: any) => {
                    if (Array.isArray(row.columns)) {
                      const rowCols = row.columns.map((c: any) => ({
                        id: c.id || `col_${generateId()}`,
                        name: c.name || "",
                        rows: Array.isArray(c.rows)
                          ? c.rows.map((r: any) => ({
                            id: r.id || `row_${generateId()}`,
                            name: r.name || "",
                          }))
                          : [],
                      }));
                      allColumns = [...allColumns, ...rowCols];
                    }
                  });
                }

                return {
                  id: `tab_${i}_${generateId()}`,
                  name: tab.name || "Tab",
                  columns: allColumns,
                };
              },
            );
            setTabs(parsedTabs);
            if (parsedTabs.length > 0) setActiveTabId(parsedTabs[0].id);
            setLoading(false);
            return;
          } else {
            const parsedTabs = parsedLayoutJson.tabs.map(
              (tabName: string, i: number) => {
                let tabCols: TrackingLayoutColumn[] = [];

                if (Array.isArray(parsedLayoutJson.columns)) {
                  tabCols = parsedLayoutJson.columns.map((c: any) => ({
                    id: c.id || `col_${generateId()}`,
                    name: c.name || "",
                    rows: Array.isArray(c.rows) ? c.rows : [],
                  }));
                } else if (Array.isArray(parsedLayoutJson.rows)) {
                  tabCols = [
                    {
                      id: `col_legacy_${i}`,
                      name: "Main Column",
                      rows: parsedLayoutJson.rows.map((r: any) => ({
                        id: r.id || `row_${generateId()}`,
                        name: r.name || "",
                      })),
                    },
                  ];
                }

                return {
                  id: `tab_${i}`,
                  name: tabName || "Tab",
                  columns: i === 0 ? tabCols : [],
                };
              },
            );
            setTabs(parsedTabs);
            if (parsedTabs.length > 0) setActiveTabId(parsedTabs[0].id);
            setLoading(false);
            return;
          }
        }
      }

      // Fallback
      const initialTabId = generateId();
      setTabs([{ id: initialTabId, name: "Overview", columns: [] }]);
      setActiveTabId(initialTabId);
    } catch (e) {
      console.error(e);
      const initialTabId = generateId();
      setTabs([{ id: initialTabId, name: "Overview", columns: [] }]);
      setActiveTabId(initialTabId);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const tabsPayload = tabs.map((tab) => {
        const rowId = `row_${generateId()}`;
        return {
          name: tab.name,
          rows: [
            {
              id: rowId,
              columns: tab.columns.map((col) => ({
                id: col.id,
                name: col.name || "",
                width: "50%",
                widget: "tasks_list",
                rows: col.rows.map((r) => ({ id: r.id, name: r.name || "" })),
              })),
            },
          ],
        };
      });

      const payload: any = {
        group_id: groupId,
        organization_id: organizationId,
        board_id: boardId,
        layout_json: { tabs: tabsPayload },
      };

      if (existingLayoutId) {
        payload.id = existingLayoutId;
      }

      await groupsApi.saveTrackingLayout(payload);
      toast.success("Layout saved successfully!");
    } catch (e: any) {
      console.error(e);
      const errMsg =
        e.response?.data?.message || e.message || "Failed to save layout";
      toast.error(errMsg);
    } finally {
      setSaving(false);
    }
  };

  const addTab = () => {
    const newId = generateId();
    setTabs([...tabs, { id: newId, name: "New Tab", columns: [] }]);
    setActiveTabId(newId);
  };

  const removeTab = (tabId: string) => {
    const updated = tabs.filter((t) => t.id !== tabId);
    setTabs(updated);
    if (activeTabId === tabId && updated.length > 0) {
      setActiveTabId(updated[0].id);
    }
  };

  const addColumn = (tabId: string) => {
    const newColId = `col_${generateId()}`;
    setTabs((prev) =>
      prev.map((t) => {
        if (t.id === tabId) {
          return {
            ...t,
            columns: [
              ...t.columns,
              { id: newColId, name: "New Column", rows: [] },
            ],
          };
        }
        return t;
      }),
    );
  };

  const updateColumnName = (tabId: string, colId: string, name: string) => {
    setTabs((prev) =>
      prev.map((t) =>
        t.id === tabId
          ? {
            ...t,
            columns: t.columns.map((c) =>
              c.id === colId ? { ...c, name } : c,
            ),
          }
          : t,
      ),
    );
  };

  const removeColumn = (tabId: string, colId: string) => {
    setTabs((prev) =>
      prev.map((t) => {
        if (t.id === tabId) {
          return { ...t, columns: t.columns.filter((c) => c.id !== colId) };
        }
        return t;
      }),
    );
  };

  const addRow = (tabId: string) => {
    setTabs((prev) =>
      prev.map((t) => {
        if (t.id === tabId) {
          const maxRows = Math.max(
            0,
            ...t.columns.map((c) => c.rows?.length || 0),
          );
          return {
            ...t,
            columns: t.columns.map((c) => {
              const currentRows = [...(c.rows || [])];
              while (currentRows.length < maxRows) {
                currentRows.push({ id: `row_${generateId()}`, name: "" });
              }
              currentRows.push({ id: `row_${generateId()}`, name: "" });
              return { ...c, rows: currentRows };
            }),
          };
        }
        return t;
      }),
    );
  };

  const updateRow = (
    tabId: string,
    colId: string,
    rowId: string,
    name: string,
  ) => {
    setTabs((prev) =>
      prev.map((t) => {
        if (t.id === tabId) {
          return {
            ...t,
            columns: t.columns.map((c) => {
              if (c.id === colId) {
                return {
                  ...c,
                  rows: c.rows.map((r) =>
                    r.id === rowId ? { ...r, name } : r,
                  ),
                };
              }
              return c;
            }),
          };
        }
        return t;
      }),
    );
  };

  const removeRow = (
    tabId: string,
    colId: string,
    rowId: string,
    rowIndex?: number,
  ) => {
    if (rowIndex !== undefined) {
      removeGlobalRow(tabId, rowIndex);
      return;
    }
    setTabs((prev) =>
      prev.map((t) => {
        if (t.id === tabId) {
          return {
            ...t,
            columns: t.columns.map((c) => {
              if (c.id === colId) {
                return {
                  ...c,
                  rows: c.rows.filter((r) => r.id !== rowId),
                };
              }
              return c;
            }),
          };
        }
        return t;
      }),
    );
  };

  const removeGlobalRow = (tabId: string, rowIndex: number) => {
    setTabs((prev) =>
      prev.map((t) => {
        if (t.id === tabId) {
          return {
            ...t,
            columns: t.columns.map((c) => ({
              ...c,
              rows: c.rows.filter((_, idx) => idx !== rowIndex),
            })),
          };
        }
        return t;
      }),
    );
  };

  /**
   * Mappings:
   * Inprogress / In Progress -> Working on it
   * Pending -> Not Started
   * Not Added / N/A / NA / Empty -> Need a Meeting
   * Done -> Done
   */
  const resolveStatusId = (trackingStatus?: string): number | undefined => {
    if (!statuses || statuses.length === 0) return undefined;

    const normalized = (trackingStatus || "").trim().toLowerCase();

    let targetNames: string[] = [];
    if (
      normalized === "in progress" ||
      normalized === "inprogress" ||
      normalized === "working on it"
    ) {
      targetNames = ["working on it", "in progress", "inprogress"];
    } else if (normalized === "pending" || normalized === "not started") {
      targetNames = ["not started", "pending"];
    } else if (
      normalized === "not added" ||
      normalized === "need a meeting" ||
      normalized === "n/a" ||
      normalized === "na" ||
      !normalized
    ) {
      targetNames = ["need a meeting", "not added", "not started", "pending"];
    } else if (normalized === "done" || normalized === "completed") {
      targetNames = ["done", "complete", "completed"];
    } else {
      targetNames = [normalized, "need a meeting"];
    }

    for (const target of targetNames) {
      const found = statuses.find(
        (s) => s.name?.trim().toLowerCase() === target.toLowerCase(),
      );
      if (found) return parseInt(found.id, 10);
    }

    for (const target of targetNames) {
      const found = statuses.find(
        (s) =>
          s.name?.trim().toLowerCase().includes(target.toLowerCase()) ||
          target.toLowerCase().includes(s.name?.trim().toLowerCase()),
      );
      if (found) return parseInt(found.id, 10);
    }

    const needMeetingStatus = statuses.find(
      (s) => s.name?.trim().toLowerCase() === "need a meeting",
    );
    if (needMeetingStatus) return parseInt(needMeetingStatus.id, 10);

    return parseInt(statuses[0].id, 10);
  };



  const handleAddTaskFromGlobalRow = async (
    tabId: string,
    rowIndex: number,
  ) => {
    const targetTab = tabs.find((t) => t.id === tabId);
    if (!targetTab || !targetTab.columns || targetTab.columns.length === 0) {
      toast.error("No columns found in active tab");
      return;
    }

    let taskName = "";
    const nameCol = targetTab.columns.find((c) => {
      const colLower = (c.name || "").toLowerCase();
      return (
        (colLower.includes("task") ||
          colLower.includes("title") ||
          colLower.includes("name") ||
          colLower.includes("item") ||
          colLower.includes("feature")) &&
        !colLower.includes("status")
      );
    });

    if (nameCol && nameCol.rows?.[rowIndex]?.name?.trim()) {
      taskName = nameCol.rows[rowIndex].name!.trim();
    } else {
      const nonStatusCol = targetTab.columns.find(
        (c) =>
          !c.name?.toLowerCase().includes("status") &&
          c.rows?.[rowIndex]?.name?.trim(),
      );
      if (nonStatusCol && nonStatusCol.rows?.[rowIndex]?.name?.trim()) {
        taskName = nonStatusCol.rows[rowIndex].name!.trim();
      } else if (targetTab.columns[0]?.rows?.[rowIndex]?.name?.trim()) {
        taskName = targetTab.columns[0].rows[rowIndex].name!.trim();
      }
    }

    if (!taskName) {
      toast.error("Please enter a task name for this row first");
      return;
    }

    const descCol = targetTab.columns.find((c) => {
      const colLower = (c.name || "").toLowerCase();
      return (
        colLower.includes("desc") ||
        colLower.includes("notes") ||
        colLower.includes("detail")
      );
    });
    const description = descCol?.rows?.[rowIndex]?.name?.trim() || undefined;

    const statusColumn = targetTab.columns.find((c) =>
      c.name?.toLowerCase().includes("status"),
    );
    const rowStatus = statusColumn?.rows?.[rowIndex]?.name?.trim() || "";

    const key = `global_${rowIndex}`;
    setAddingTaskKey(key);

    try {
      const boardIdNum = parseInt(String(boardId), 10);
      const groupIdNum = parseInt(String(groupId), 10);
      const orgIdNum = parseInt(String(organizationId), 10);

      const defaultStatusId = resolveStatusId(rowStatus);
      const defaultPriorityId =
        priorities && priorities.length > 0
          ? parseInt(priorities[0].id, 10)
          : undefined;

      const payload: CreateTaskRequest = {
        group_id: groupIdNum,
        organization_id: orgIdNum,
        name: taskName,
        description,
        board_id: boardIdNum,
        parent_id: null,
        status_id: defaultStatusId,
        task_priority_id: defaultPriorityId,
      };

      const res = await tasksApi.createTask(payload);

      const matchedStatusName =
        res.status_label ||
        statuses?.find((s) => String(s.id) === String(defaultStatusId))?.name ||
        "Need a Meeting";

      const newTask: Task = {
        id: String(res.id),
        name: res.name,
        description: res.description,
        status: matchedStatusName,
        status_id: String(res.status_id || defaultStatusId),
        priority: res.priority_label,
        priority_id: String(res.task_priority_id || defaultPriorityId),
        estimatedDate: res.due_date || "-",
        person:
          res.assignee?.name ||
          (res.assignees && res.assignees.length > 0
            ? res.assignees[0].name
            : undefined),
        assigned_to_id:
          res.assignee?.id ||
          (res.assignees && res.assignees.length > 0
            ? String(res.assignees[0].user_id)
            : undefined),
        assigned_to_ids: res.assignees?.map((a) => String(a.user_id)),
        timeSpent: `${res.time_spent_hours || 0}h`,
        group_id: String(res.group_id),
        subitems: [],
        assignee_names:
          res.assignees?.map((a) => a.name || a.username || "") ||
          (res.assignee?.name ? [res.assignee.name] : []),
      };

      onTaskCreated?.(newTask);
      toast.success(
        `Task "${taskName}" added to main page with status "${matchedStatusName}"!`,
      );
    } catch (err: any) {
      console.error("Failed to create task from tracking layout:", err);
      const errMsg =
        err.response?.data?.message || err.message || "Failed to create task";
      toast.error(errMsg);
    } finally {
      setAddingTaskKey(null);
    }
  };

  const [draggedColId, setDraggedColId] = useState<string | null>(null);

  const handleColDragStart = (e: React.DragEvent, colId: string) => {
    setDraggedColId(colId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleColDragOver = (
    e: React.DragEvent,
    targetColId: string,
    tabId: string,
  ) => {
    e.preventDefault();
    if (!draggedColId || draggedColId === targetColId) return;

    setTabs((prev) => {
      const newTabs = [...prev];
      const tabIndex = newTabs.findIndex((t) => t.id === tabId);
      if (tabIndex === -1) return prev;

      const tab = { ...newTabs[tabIndex] };
      const columns = [...tab.columns];

      const draggedIndex = columns.findIndex((c) => c.id === draggedColId);
      const targetIndex = columns.findIndex((c) => c.id === targetColId);

      if (draggedIndex === -1 || targetIndex === -1) return prev;

      const [draggedCol] = columns.splice(draggedIndex, 1);
      columns.splice(targetIndex, 0, draggedCol);

      tab.columns = columns;
      newTabs[tabIndex] = tab;
      return newTabs;
    });
  };

  const handleColDragEnd = () => {
    setDraggedColId(null);
  };

  const getTabStatusStyle = (tab: TrackingLayoutTab, isActive: boolean) => {
    let hasStatusCol = false;
    let totalActionable = 0;
    let doneCount = 0;
    let pendingCount = 0;
    let inProgressCount = 0;

    tab.columns?.forEach((col) => {
      if (col.name?.toLowerCase().includes("status")) {
        hasStatusCol = true;
        col.rows?.forEach((row) => {
          const status = (row.name || "").toLowerCase().trim();
          if (status !== "n/a") {
            totalActionable++;
            if (status === "done") {
              doneCount++;
            } else if (status === "pending") {
              pendingCount++;
            } else {
              inProgressCount++;
            }
          }
        });
      }
    });

    if (!hasStatusCol) {
      return isActive
        ? "bg-primary/10 text-primary font-medium"
        : "hover:bg-muted text-foreground text-sm";
    }

    if (totalActionable === 0) {
      return isActive
        ? "bg-primary/10 text-primary font-medium"
        : "hover:bg-muted text-foreground text-sm";
    }

    if (pendingCount > 0) {
      return isActive
        ? "bg-red-500/20 text-red-600 dark:bg-red-500/30 dark:text-red-400 font-medium"
        : "bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 text-sm";
    }

    if (inProgressCount > 0) {
      return isActive
        ? "bg-orange-500/20 text-orange-600 dark:bg-orange-500/30 dark:text-orange-400 font-medium"
        : "bg-orange-500/10 text-orange-600 dark:text-orange-400 hover:bg-orange-500/20 text-sm";
    }

    if (doneCount === totalActionable) {
      return isActive
        ? "bg-green-500/20 text-green-600 dark:bg-green-500/30 dark:text-green-400 font-medium"
        : "bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500/20 text-sm";
    }

    return isActive
      ? "bg-primary/10 text-primary font-medium"
      : "hover:bg-muted text-foreground text-sm";
  };

  const activeTab = tabs.find((t) => t.id === activeTabId);
  const statusCol = activeTab?.columns?.find((c) =>
    c.name?.toLowerCase().includes("status"),
  );
  const hasStatusCol = !!statusCol;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[70vw] w-full h-[85vh] flex flex-col p-0">
          <DialogHeader className="p-4 border-b">
            <DialogTitle className="flex items-center justify-between">
              <div>
                <span className="text-xl">{boardName}</span>
                <div className="text-sm text-muted-foreground mt-1">
                  Group: {groupName}
                </div>
              </div>
              <div className="flex items-center gap-2 pr-6">
                <input
                  type="file"
                  accept=".csv, .xls, .xlsx"
                  className="hidden"
                  ref={globalFileInputRef}
                  onChange={handleGlobalFileUpload}
                />
                <Button variant="outline" onClick={handleGlobalExport}>
                  <Upload className="h-4 w-4 mr-2" />
                  Export Global
                </Button>
                <Button variant="outline" onClick={handleGlobalImportCSVClick}>
                  <Download className="h-4 w-4 mr-2" />
                  Import Global
                </Button>
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  className="min-w-[120px]"
                >
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {saving ? "Saving..." : "Save Layout"}
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              Loading layout...
            </div>
          ) : (
            <div className="flex-1 flex overflow-hidden">
              <div className="w-64 border-r bg-muted/20 flex flex-col shrink-0">
                <div className="p-3 border-b flex items-center justify-between">
                  <span className="font-medium text-sm">Layout Tabs</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={addTab}
                    className="h-7 w-7"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {tabs.map((tab) => {
                    const isEditing = editingTabId === tab.id;
                    const isActive = activeTabId === tab.id;

                    return (
                      <div
                        key={tab.id}
                        className={`flex items-center gap-2 p-2 rounded-md cursor-pointer group transition-colors ${getTabStatusStyle(tab, isActive)}`}
                        onClick={() => {
                          if (!isEditing) {
                            setActiveTabId(tab.id);
                          }
                        }}
                      >
                        <Layout className="h-4 w-4 shrink-0" />
                        {isEditing ? (
                          <div
                            className="flex-1 flex items-center gap-1 min-w-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Input
                              value={tempTabName}
                              onChange={(e) => setTempTabName(e.target.value)}
                              onBlur={() => handleSaveTabName(tab.id)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  handleSaveTabName(tab.id);
                                } else if (e.key === "Escape") {
                                  setEditingTabId(null);
                                }
                              }}
                              autoFocus
                              className="h-6 text-xs bg-background border px-1.5 py-0.5 rounded shadow-sm focus-visible:ring-1"
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 shrink-0 text-primary hover:bg-primary/10"
                              title="Save name"
                              onClick={() => handleSaveTabName(tab.id)}
                            >
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <>
                            <span className="flex-1 text-xs truncate select-none font-medium text-left">
                              {tab.name}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0 text-muted-foreground hover:text-foreground hover:bg-accent"
                              title="Edit tab name"
                              onClick={(e) => handleStartEditingTab(tab, e)}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0 text-destructive hover:bg-destructive/10"
                              title="Delete tab"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeTab(tab.id);
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex-1 overflow-auto bg-background">
                {activeTab ? (
                  <div className="p-4 flex flex-col gap-4 min-h-full">
                    <div className="flex items-center justify-between shrink-0">
                      <h3 className="font-semibold text-lg">
                        {activeTab.name} Dashboard
                      </h3>
                      <div className="flex items-center gap-2">
                        {hasStatusCol && (
                          <select
                            className="flex h-9 w-[160px] rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                          >
                            <option value="All">All Statuses</option>
                            <option value="Done">Done</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Pending">Pending</option>
                            <option value="Not Added">Not Added</option>
                            <option value="N/A">N/A</option>
                          </select>
                        )}
                        <input
                          type="file"
                          accept=".csv, .xls, .xlsx"
                          className="hidden"
                          ref={tabFileInputRef}
                          onChange={handleTabFileUpload}
                        />
                        <Button
                          onClick={handleTabExport}
                          size="sm"
                          variant="outline"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Export File
                        </Button>
                        <Button
                          onClick={handleTabImportCSVClick}
                          size="sm"
                          variant="outline"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Import File
                        </Button>
                        <Button
                          onClick={() => addColumn(activeTab.id)}
                          size="sm"
                          variant="secondary"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Column
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      {/* GLOBAL ROW ACTIONS GUTTER */}
                      {activeTab.columns &&
                        activeTab.columns.length > 0 &&
                        activeTab.columns[0].rows &&
                        activeTab.columns[0].rows.length > 0 && (
                          <div className="w-16 shrink-0 flex flex-col bg-transparent">
                            {/* Header spacer to match the exact 57px of the column headers */}
                            <div className="p-3 border-b border-transparent flex items-center justify-center invisible">
                              <div className="h-8 w-full" />
                            </div>
                            {/* Rows */}
                            <div className="p-3 space-y-3 px-0 flex flex-col items-center">
                              {Array.from({
                                length: Math.max(
                                  ...activeTab.columns.map(
                                    (c) => c.rows?.length || 0,
                                  ),
                                ),
                              }).map((_, rowIndex) => {
                                if (statusFilter !== "All" && statusCol) {
                                  const statusVal =
                                    statusCol.rows?.[rowIndex]?.name?.trim() ||
                                    "";
                                  if (
                                    statusVal.toLowerCase() !==
                                    statusFilter.toLowerCase()
                                  )
                                    return null;
                                }
                                return (
                                  <div
                                    key={`global_row_actions_${rowIndex}`}
                                    className="h-[46px] w-full flex items-center justify-center gap-1 group/globalrow opacity-60 hover:opacity-100 transition-opacity"
                                  >
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-7 w-7 text-primary shrink-0 hover:bg-primary/10"
                                      title="Add row as task to main page"
                                      onClick={() =>
                                        handleAddTaskFromGlobalRow(
                                          activeTab.id,
                                          rowIndex,
                                        )
                                      }
                                      disabled={
                                        addingTaskKey === `global_${rowIndex}`
                                      }
                                    >
                                      {addingTaskKey ===
                                      `global_${rowIndex}` ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      ) : (
                                        <Plus className="h-3.5 w-3.5" />
                                      )}
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-7 w-7 text-destructive shrink-0 hover:bg-destructive/10"
                                      title="Delete row from all columns"
                                      onClick={() =>
                                        removeGlobalRow(activeTab.id, rowIndex)
                                      }
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      {(activeTab.columns || []).map((col) => (
                        <div
                          key={col.id}
                          draggable
                          onDragStart={(e) => handleColDragStart(e, col.id)}
                          onDragOver={(e) =>
                            handleColDragOver(e, col.id, activeTab.id)
                          }
                          onDragEnd={handleColDragEnd}
                          className={`w-80 shrink-0 flex flex-col border rounded-lg bg-card shadow-sm transition-all group ${draggedColId === col.id ? "opacity-50 border-primary border-dashed" : "border-border"}`}
                        >
                          <div className="p-3 border-b flex items-center justify-between bg-muted/30">
                            <div className="flex items-center gap-2 flex-1 relative">
                              <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab shrink-0 hidden group-hover:block absolute -left-2" />
                              <Input
                                placeholder="Column Name..."
                                value={col.name || ""}
                                onChange={(e) =>
                                  updateColumnName(
                                    activeTab.id,
                                    col.id,
                                    e.target.value,
                                  )
                                }
                                className="h-8 text-sm font-medium border-transparent hover:border-border focus:border-border ml-3"
                              />
                            </div>

                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-destructive shrink-0 ml-1 hover:bg-destructive/10"
                              title="Delete column"
                              onClick={() => removeColumn(activeTab.id, col.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="p-3 space-y-3 flex-1 flex flex-col">
                              {!col.rows || col.rows.length === 0 ? (
                                <div className="border border-dashed rounded-md flex flex-col items-center justify-center text-muted-foreground p-6 bg-muted/10 h-32">
                                  <span className="text-xs mb-3">
                                    Empty Column
                                  </span>
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    className="h-7 text-xs"
                                    onClick={() => addRow(activeTab.id)}
                                  >
                                    Add Row
                                  </Button>
                                </div>
                              ) : (
                                <>
                                  {col.rows.map((row, rowIndex) => {
                                    if (statusFilter !== "All" && statusCol) {
                                      const statusVal =
                                        statusCol.rows?.[
                                          rowIndex
                                        ]?.name?.trim() || "";
                                      if (
                                        statusVal.toLowerCase() !==
                                        statusFilter.toLowerCase()
                                      )
                                        return null;
                                    }
                                    return (
                                      <div
                                        key={row.id}
                                        className="border rounded-md bg-background p-2 flex flex-col relative group/row transition-all shadow-sm"
                                      >
                                        <div className="flex items-center justify-between gap-1.5">
                                          {col.name
                                            ?.toLowerCase()
                                            .includes("status") ? (
                                            <select
                                              className="flex h-7 flex-1 rounded-md border border-input bg-background px-2 py-1 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                              value={row.name || ""}
                                              onChange={(e) =>
                                                updateRow(
                                                  activeTab.id,
                                                  col.id,
                                                  row.id,
                                                  e.target.value,
                                                )
                                              }
                                            >
                                              <option value="" disabled>
                                                Select Status
                                              </option>
                                              <option value="Done">Done</option>
                                              <option value="In Progress">
                                                In Progress
                                              </option>
                                              <option value="Pending">
                                                Pending
                                              </option>
                                              <option value="Not Added">
                                                Not Added
                                              </option>
                                              <option value="N/A">N/A</option>
                                              {row.name &&
                                                ![
                                                  "Done",
                                                  "In Progress",
                                                  "Pending",
                                                  "Not Added",
                                                  "N/A",
                                                ].includes(row.name) && (
                                                  <option value={row.name}>
                                                    {row.name}
                                                  </option>
                                                )}
                                            </select>
                                          ) : (
                                            <Input
                                              className="h-7 text-xs flex-1"
                                              placeholder="Row Name..."
                                              value={row.name || ""}
                                              onChange={(e) =>
                                                updateRow(
                                                  activeTab.id,
                                                  col.id,
                                                  row.id,
                                                  e.target.value,
                                                )
                                              }
                                            />
                                          )}
                                          <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-7 w-7 text-destructive hover:bg-destructive/10 shrink-0"
                                            title="Delete row"
                                            onClick={() =>
                                              removeRow(
                                                activeTab.id,
                                                col.id,
                                                row.id,
                                                rowIndex,
                                              )
                                            }
                                          >
                                            <Trash2 className="h-3.5 w-3.5" />
                                          </Button>
                                        </div>
                                      </div>
                                    );
                                  })}

                                  <button
                                    onClick={() => addRow(activeTab.id)}
                                    className="w-full h-[46px] border border-dashed border-border rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted/30 hover:border-primary/40 hover:text-primary transition-all bg-card/10 shadow-sm"
                                    title="Add a new row"
                                  >
                                    <Plus className="h-4 w-4" />
                                  </button>
                                </>
                              )}
                          </div>
                        </div>
                      ))}

                      {(!activeTab.columns ||
                        activeTab.columns.length === 0) && (
                          <div className="w-full flex-1 border border-dashed rounded-xl p-12 flex flex-col items-center justify-center text-muted-foreground mr-1 mb-1">
                            <Layout className="h-10 w-10 mb-4 opacity-30" />
                            <p className="mb-4">
                              This dashboard has no columns yet
                            </p>
                            <div className="flex items-center justify-center">
                              <Button onClick={() => addColumn(activeTab.id)}>
                                Add First Column
                              </Button>
                            </div>
                          </div>
                        )}
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    Select or create a tab to start building
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={showStatusConfirm}
        onOpenChange={(val) => !val && cancelImport()}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Status Field Detected</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-foreground">
              The imported file contains Status values. Do you want to reset all
              Status fields to N/A?
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => commitImport(pendingImport!, false)}
            >
              No, Keep Existing Status
            </Button>
            <Button onClick={() => commitImport(pendingImport!, true)}>
              Yes, Reset to N/A
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
