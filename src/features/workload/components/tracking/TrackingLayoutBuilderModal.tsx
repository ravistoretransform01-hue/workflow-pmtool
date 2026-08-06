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
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { groupsApi } from "@/features/groups/api/groupsApi";

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
}

export function TrackingLayoutBuilderModal({
  open,
  onOpenChange,
  groupId,
  groupName,
  boardId,
  boardName,
  organizationId
}: TrackingLayoutBuilderModalProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [tabs, setTabs] = useState<TrackingLayoutTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>("");
  const [existingLayoutId, setExistingLayoutId] = useState<number | string | null>(null);

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
      const layoutData = Array.isArray(data) ? data[0] : data;
      
      if (layoutData) {
         if (layoutData.id) {
           setExistingLayoutId(layoutData.id);
         }
      }
      
      const rawLayout = layoutData?.layout_data || layoutData?.layout_json;
      if (layoutData && rawLayout) {
        let parsedLayoutJson = rawLayout;
        
        if (typeof parsedLayoutJson === 'string') {
          try {
            parsedLayoutJson = JSON.parse(parsedLayoutJson);
            if (typeof parsedLayoutJson === 'string') {
               parsedLayoutJson = JSON.parse(parsedLayoutJson);
            }
          } catch (e) {
            console.error("Failed to parse layout string:", e);
          }
        }

        if (parsedLayoutJson && parsedLayoutJson.tabs) {
          if (Array.isArray(parsedLayoutJson.tabs) && parsedLayoutJson.tabs.length > 0 && typeof parsedLayoutJson.tabs[0] === 'object') {
            // Parses specific payload: tabs[] -> rows[] -> columns[]
            const parsedTabs = parsedLayoutJson.tabs.map((tab: any, i: number) => {
              // Extract all columns from all rows in this tab
              let allColumns: TrackingLayoutColumn[] = [];
              if (Array.isArray(tab.rows)) {
                tab.rows.forEach((row: any) => {
                  if (Array.isArray(row.columns)) {
                     const rowCols = row.columns.map((c: any) => ({
                       id: c.id || `col_${generateId()}`,
                       name: c.name || "",
                       rows: Array.isArray(c.rows) ? c.rows.map((r: any) => ({ id: r.id || `row_${generateId()}`, name: r.name || "" })) : []
                     }));
                     allColumns = [...allColumns, ...rowCols];
                  }
                });
              }

              return {
                id: `tab_${i}_${generateId()}`,
                name: tab.name || "Tab",
                columns: allColumns
              };
            });
            setTabs(parsedTabs);
            if (parsedTabs.length > 0) setActiveTabId(parsedTabs[0].id);
            setLoading(false);
            return;
          } else {
            // Legacy string array parser
            const parsedTabs = parsedLayoutJson.tabs.map((tabName: string, i: number) => {
              let tabCols: TrackingLayoutColumn[] = [];
              
              if (Array.isArray(parsedLayoutJson.columns)) {
                tabCols = parsedLayoutJson.columns.map((c: any) => ({
                  id: c.id || `col_${generateId()}`,
                  name: c.name || "",
                  rows: Array.isArray(c.rows) ? c.rows : []
                }));
              } else if (Array.isArray(parsedLayoutJson.rows)) {
                tabCols = [
                  {
                    id: `col_legacy_${i}`,
                    name: "Main Column",
                    rows: parsedLayoutJson.rows.map((r: any) => ({ id: r.id || `row_${generateId()}`, name: r.name || "" }))
                  }
                ];
              }

              return {
                id: `tab_${i}`,
                name: tabName || "Tab",
                columns: i === 0 ? tabCols : [] // only apply legacy rows to first tab
              };
            });
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
      // Build payload matching strict backend schema: tabs -> rows -> columns
      const tabsPayload = tabs.map(tab => {
        const rowId = `row_${generateId()}`;
        return {
          name: tab.name,
          rows: [
            {
              id: rowId,
              columns: tab.columns.map(col => ({
                id: col.id,
                name: col.name || "",
                width: "50%", // Satisfy layout_json defaults
                widget: "tasks_list", // Satisfy layout_json defaults
                rows: col.rows.map(r => ({ id: r.id, name: r.name || "" })) // Keep UI rows if backed accepts them
              }))
            }
          ]
        };
      });

      const payload: any = {
        group_id: groupId,
        organization_id: organizationId,
        board_id: boardId,
        layout_json: { tabs: tabsPayload }
      };

      if (existingLayoutId) {
        payload.id = existingLayoutId;
      }

      await groupsApi.saveTrackingLayout(payload);
      toast.success("Layout saved successfully!");
    } catch (e: any) {
      console.error(e);
      const errMsg = e.response?.data?.message || e.message || "Failed to save layout";
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
            columns: [...t.columns, { id: newColId, name: "New Column", rows: [] }]
          };
        }
        return t;
      })
    );
  };

  const updateColumnName = (tabId: string, colId: string, name: string) => {
    setTabs((prev) => 
      prev.map(t => t.id === tabId ? {
        ...t, 
        columns: t.columns.map(c => c.id === colId ? { ...c, name } : c)
      } : t)
    );
  };

  const removeColumn = (tabId: string, colId: string) => {
    setTabs((prev) => 
      prev.map((t) => {
        if (t.id === tabId) {
          return { ...t, columns: t.columns.filter((c) => c.id !== colId) };
        }
        return t;
      })
    );
  };

  const addRow = (tabId: string, colId: string) => {
    const newRowId = `row_${generateId()}`;
    setTabs((prev) => 
      prev.map((t) => {
        if (t.id === tabId) {
          return {
            ...t,
            columns: t.columns.map((c) => {
              if (c.id === colId) {
                return {
                  ...c,
                  rows: [...c.rows, { id: newRowId }]
                }
              }
              return c;
            })
          };
        }
        return t;
      })
    );
  };

  const updateRow = (tabId: string, colId: string, rowId: string, name: string) => {
    setTabs((prev) => 
      prev.map((t) => {
        if (t.id === tabId) {
          return {
            ...t,
            columns: t.columns.map((c) => {
              if (c.id === colId) {
                return {
                  ...c,
                  rows: c.rows.map((r) => r.id === rowId ? { ...r, name } : r)
                }
              }
              return c;
            })
          };
        }
        return t;
      })
    );
  };

  const removeRow = (tabId: string, colId: string, rowId: string) => {
    setTabs((prev) => 
      prev.map((t) => {
        if (t.id === tabId) {
          return {
            ...t,
            columns: t.columns.map((c) => {
              if (c.id === colId) {
                return {
                  ...c,
                  rows: c.rows.filter((r) => r.id !== rowId)
                }
              }
              return c;
            })
          };
        }
        return t;
      })
    );
  };

  const [draggedColId, setDraggedColId] = useState<string | null>(null);

  const handleColDragStart = (e: React.DragEvent, colId: string) => {
    setDraggedColId(colId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleColDragOver = (e: React.DragEvent, targetColId: string, tabId: string) => {
    e.preventDefault();
    if (!draggedColId || draggedColId === targetColId) return;

    setTabs((prev) => {
      const newTabs = [...prev];
      const tabIndex = newTabs.findIndex(t => t.id === tabId);
      if (tabIndex === -1) return prev;

      const tab = { ...newTabs[tabIndex] };
      const columns = [...tab.columns];
      
      const draggedIndex = columns.findIndex(c => c.id === draggedColId);
      const targetIndex = columns.findIndex(c => c.id === targetColId);
      
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

  const activeTab = tabs.find(t => t.id === activeTabId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[70vw] w-full h-[85vh] flex flex-col p-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="flex items-center justify-between">
            <div>
              <span className="text-xl">{boardName}</span>
              <div className="text-sm text-muted-foreground mt-1">Group: {groupName}</div>
            </div>
            <div className="flex items-center gap-2 pr-6">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving} className="min-w-[120px]">
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {saving ? "Saving..." : "Save Layout"}
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">Loading layout...</div>
        ) : (
          <div className="flex-1 flex overflow-hidden">
            <div className="w-64 border-r bg-muted/20 flex flex-col shrink-0">
              <div className="p-3 border-b flex items-center justify-between">
                <span className="font-medium text-sm">Layout Tabs</span>
                <Button variant="ghost" size="icon" onClick={addTab} className="h-7 w-7">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {tabs.map((tab) => (
                  <div 
                    key={tab.id}
                    className={`flex items-center gap-2 p-2 rounded-md cursor-pointer group hover:bg-muted ${activeTabId === tab.id ? 'bg-primary/10 text-primary font-medium' : 'text-sm'}`}
                    onClick={() => setActiveTabId(tab.id)}
                  >
                    <Layout className="h-4 w-4 shrink-0" />
                    <Input 
                      value={tab.name}
                      onChange={(e) => {
                        setTabs(prev => prev.map(t => t.id === tab.id ? { ...t, name: e.target.value } : t));
                      }}
                      className="h-7 text-xs bg-transparent border-none focus-visible:ring-1 px-1 -ml-1"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0 text-destructive"
                      onClick={(e) => { e.stopPropagation(); removeTab(tab.id); }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-x-auto overflow-y-hidden bg-background">
              {activeTab ? (
                <div className="h-full flex flex-col p-4">
                  <div className="flex items-center justify-between mb-4 shrink-0">
                    <h3 className="font-semibold text-lg">{activeTab.name} Dashboard</h3>
                    <Button onClick={() => addColumn(activeTab.id)} size="sm" variant="secondary">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Column
                    </Button>
                  </div>

                  <div className="flex-1 overflow-x-auto overflow-y-hidden flex items-start gap-4 pb-2">
                    {(activeTab.columns || []).map((col) => (
                      <div 
                        key={col.id}
                        draggable
                        onDragStart={(e) => handleColDragStart(e, col.id)}
                        onDragOver={(e) => handleColDragOver(e, col.id, activeTab.id)}
                        onDragEnd={handleColDragEnd}
                        className={`w-80 shrink-0 h-full flex flex-col border rounded-lg bg-card shadow-sm transition-all group ${draggedColId === col.id ? 'opacity-50 border-primary border-dashed' : 'border-border'}`}
                      >
                        <div className="p-3 border-b flex items-center justify-between bg-muted/30">
                          <div className="flex items-center gap-2 flex-1 relative">
                            <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab shrink-0 hidden group-hover:block absolute -left-2" />
                            <Input 
                              placeholder="Column Name..."
                              value={col.name || ""}
                              onChange={(e) => updateColumnName(activeTab.id, col.id, e.target.value)}
                              className="h-8 text-sm font-medium border-transparent hover:border-border focus:border-border ml-3"
                            />
                          </div>
                          
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive shrink-0 ml-1" onClick={() => removeColumn(activeTab.id, col.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-3 space-y-3">
                          {(!col.rows || col.rows.length === 0) ? (
                            <div className="border border-dashed rounded-md flex flex-col items-center justify-center text-muted-foreground p-6 bg-muted/10 h-32">
                              <span className="text-xs mb-3">Empty Column</span>
                              <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={() => addRow(activeTab.id, col.id)}>Add Row</Button>
                            </div>
                          ) : (
                            col.rows.map((row) => (
                              <div 
                                key={row.id} 
                                className="border rounded-md bg-background p-2 flex flex-col relative group/row transition-all shadow-sm"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <Input 
                                    className="h-7 text-xs flex-1"
                                    placeholder="Row Name..."
                                    value={row.name || ""}
                                    onChange={(e) => updateRow(activeTab.id, col.id, row.id, e.target.value)}
                                  />
                                  <Button 
                                    size="icon" 
                                    variant="ghost" 
                                    className="h-7 w-7 text-destructive hover:bg-destructive/10 shrink-0" 
                                    onClick={() => removeRow(activeTab.id, col.id, row.id)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>

                        <div className="p-3 border-t bg-muted/10 shrink-0">
                          <Button size="sm" variant="ghost" className="w-full text-xs hover:bg-secondary justify-start" onClick={() => addRow(activeTab.id, col.id)}>
                            <Plus className="h-3.5 w-3.5 mr-2" /> Add another row
                          </Button>
                        </div>
                      </div>
                    ))}
                    
                    {(!activeTab.columns || activeTab.columns.length === 0) && (
                      <div className="w-full h-full border border-dashed rounded-xl p-12 flex flex-col items-center justify-center text-muted-foreground m-4">
                         <Layout className="h-10 w-10 mb-4 opacity-30" />
                         <p className="mb-4">This dashboard has no columns yet</p>
                         <Button onClick={() => addColumn(activeTab.id)}>Add First Column</Button>
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
  );
}
