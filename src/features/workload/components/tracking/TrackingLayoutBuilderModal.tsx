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
  Layout
} from "lucide-react";
import { toast } from "sonner";
import { groupsApi } from "@/features/groups/api/groupsApi";

export type WidgetType = "tasks_list" | "calendar_view" | "chart" | "notes";
export type ColumnWidth = "25%" | "33%" | "50%" | "75%" | "100%";

export interface TrackingLayoutColumn {
  id: string;
  name?: string;
  width: ColumnWidth;
  widget: WidgetType;
}

export interface TrackingLayoutRow {
  id: string;
  name?: string;
  columns: TrackingLayoutColumn[];
}

export interface TrackingLayoutTab {
  id: string;
  name: string;
  rows: TrackingLayoutRow[];
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
      // Data might be an array or single layout. Use the first one or object itself.
      const layoutData = Array.isArray(data) ? data[0] : data;
      
      if (layoutData) {
         if (layoutData.id) {
           setExistingLayoutId(layoutData.id);
         }
      }
      
      if (layoutData && layoutData.layout_json && layoutData.layout_json.tabs && layoutData.layout_json.rows) {
        const parsedTabs = layoutData.layout_json.tabs.map((tabName: string, i: number) => {
          return {
            id: `tab_${i}`,
            name: tabName,
            rows: layoutData.layout_json.rows
          };
        });
        setTabs(parsedTabs);
        if (parsedTabs.length > 0) setActiveTabId(parsedTabs[0].id);
      } else {
        const initialTabId = generateId();
        setTabs([{ id: initialTabId, name: "Overview", rows: [] }]);
        setActiveTabId(initialTabId);
      }
    } catch (e) {
      console.error(e);
      const initialTabId = generateId();
      setTabs([{ id: initialTabId, name: "Overview", rows: [] }]);
      setActiveTabId(initialTabId);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payloadRows = tabs.flatMap(t => t.rows).map(row => {
        const payloadRow: any = { id: row.id, columns: [] };
        if (row.name) payloadRow.name = row.name;
        
        payloadRow.columns = row.columns.map(col => {
          const payloadCol: any = { id: col.id, width: col.width };
          if (col.widget) payloadCol.widget = col.widget;
          if (col.name) payloadCol.name = col.name;
          return payloadCol;
        });
        
        return payloadRow;
      });

      const payload: any = {
        group_id: groupId,
        organization_id: organizationId,
        board_id: boardId,
        layout_json: {
          rows: payloadRows,
          tabs: tabs.map(t => t.name)
        }
      };

      if (existingLayoutId) {
        payload.id = existingLayoutId;
      }

      await groupsApi.saveTrackingLayout(payload);
      toast.success("Layout saved successfully!");
      onOpenChange(false);
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
    setTabs([...tabs, { id: newId, name: "New Tab", rows: [] }]);
    setActiveTabId(newId);
  };

  const removeTab = (tabId: string) => {
    const updated = tabs.filter((t) => t.id !== tabId);
    setTabs(updated);
    if (activeTabId === tabId && updated.length > 0) {
      setActiveTabId(updated[0].id);
    }
  };

  const addRow = (tabId: string) => {
    const newRowId = `row_${generateId()}`;
    setTabs((prev) => 
      prev.map((t) => {
        if (t.id === tabId) {
          return {
            ...t,
            rows: [...t.rows, { id: newRowId, columns: [] }]
          };
        }
        return t;
      })
    );
  };

  const updateRowName = (tabId: string, rowId: string, name: string) => {
    setTabs((prev) => 
      prev.map(t => t.id === tabId ? {
        ...t, 
        rows: t.rows.map(r => r.id === rowId ? { ...r, name } : r)
      } : t)
    );
  };

  const removeRow = (tabId: string, rowId: string) => {
    setTabs((prev) => 
      prev.map((t) => {
        if (t.id === tabId) {
          return { ...t, rows: t.rows.filter((r) => r.id !== rowId) };
        }
        return t;
      })
    );
  };

  const addColumn = (tabId: string, rowId: string) => {
    const newColId = `col_${generateId()}`;
    setTabs((prev) => 
      prev.map((t) => {
        if (t.id === tabId) {
          return {
            ...t,
            rows: t.rows.map((r) => {
              if (r.id === rowId) {
                return {
                  ...r,
                  columns: [...r.columns, { id: newColId, width: "50%", widget: "tasks_list" }]
                }
              }
              return r;
            })
          };
        }
        return t;
      })
    );
  };

  const updateColumn = (tabId: string, rowId: string, colId: string, updates: Partial<TrackingLayoutColumn>) => {
    setTabs((prev) => 
      prev.map((t) => {
        if (t.id === tabId) {
          return {
            ...t,
            rows: t.rows.map((r) => {
              if (r.id === rowId) {
                return {
                  ...r,
                  columns: r.columns.map((c) => c.id === colId ? { ...c, ...updates } : c)
                }
              }
              return r;
            })
          };
        }
        return t;
      })
    );
  };

  const removeColumn = (tabId: string, rowId: string, colId: string) => {
    setTabs((prev) => 
      prev.map((t) => {
        if (t.id === tabId) {
          return {
            ...t,
            rows: t.rows.map((r) => {
              if (r.id === rowId) {
                return {
                  ...r,
                  columns: r.columns.filter((c) => c.id !== colId)
                }
              }
              return r;
            })
          };
        }
        return t;
      })
    );
  };

  // Drag and Drop State Native
  const [draggedRowId, setDraggedRowId] = useState<string | null>(null);

  const handleRowDragStart = (e: React.DragEvent, rowId: string) => {
    setDraggedRowId(rowId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleRowDragOver = (e: React.DragEvent, targetRowId: string, tabId: string) => {
    e.preventDefault();
    if (!draggedRowId || draggedRowId === targetRowId) return;

    setTabs((prev) => {
      const newTabs = [...prev];
      const tabIndex = newTabs.findIndex(t => t.id === tabId);
      if (tabIndex === -1) return prev;

      const tab = { ...newTabs[tabIndex] };
      const rows = [...tab.rows];
      
      const draggedIndex = rows.findIndex(r => r.id === draggedRowId);
      const targetIndex = rows.findIndex(r => r.id === targetRowId);
      
      if (draggedIndex === -1 || targetIndex === -1) return prev;

      const [draggedRow] = rows.splice(draggedIndex, 1);
      rows.splice(targetIndex, 0, draggedRow);

      tab.rows = rows;
      newTabs[tabIndex] = tab;
      return newTabs;
    });
  };

  const handleRowDragEnd = () => {
    setDraggedRowId(null);
  };

  const activeTab = tabs.find(t => t.id === activeTabId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-full h-[85vh] flex flex-col p-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="flex items-center justify-between">
            <div>
              <span className="text-xl">{boardName}</span>
              <div className="text-sm text-muted-foreground mt-1">Group: {groupName}</div>
            </div>
            <div className="flex items-center gap-2 pr-6">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save Layout"}
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">Loading layout...</div>
        ) : (
          <div className="flex-1 flex overflow-hidden">
            {/* Tabs Sidebar */}
            <div className="w-64 border-r bg-muted/20 flex flex-col">
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

            {/* Layout Canvas */}
            <div className="flex-1 overflow-y-auto p-6 bg-background">
              {activeTab ? (
                <div className="space-y-6 max-w-5xl mx-auto">
                  <div className="flex items-center justify-between pb-4 border-b">
                    <h3 className="font-semibold text-lg">{activeTab.name} Dashboard Layout</h3>
                    <Button onClick={() => addRow(activeTab.id)} size="sm" variant="secondary">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Row
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {activeTab.rows.map((row) => (
                      <div 
                        key={row.id}
                        draggable
                        onDragStart={(e) => handleRowDragStart(e, row.id)}
                        onDragOver={(e) => handleRowDragOver(e, row.id, activeTab.id)}
                        onDragEnd={handleRowDragEnd}
                        className={`border rounded-lg p-3 bg-card shadow-sm transition-all relative group ${draggedRowId === row.id ? 'opacity-50 border-primary border-dashed' : 'border-border'}`}
                      >
                        <div className="absolute left-[-12px] top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 cursor-grab z-10 bg-background border rounded-md shadow-sm p-1">
                          <GripVertical className="h-4 w-4 text-muted-foreground" />
                        </div>
                        
                        <div className="flex items-center justify-between mb-3 border-b pb-3 pt-1">
                          <div className="flex items-center gap-3 flex-1">
                             <div className="text-xs font-medium text-muted-foreground uppercase bg-muted py-1 px-2 rounded">
                                Row
                             </div>
                             <Input 
                               placeholder="Optional Row Name..."
                               value={row.name || ""}
                               onChange={(e) => updateRowName(activeTab.id, row.id, e.target.value)}
                               className="max-w-[200px] h-7 text-sm"
                             />
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => addColumn(activeTab.id, row.id)}>
                              <Plus className="h-3 w-3 mr-1" /> Add Column
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeRow(activeTab.id, row.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-3">
                          {row.columns.length === 0 ? (
                            <div className="flex-1 border border-dashed rounded-md flex items-center justify-center text-muted-foreground p-4 bg-muted/10 min-h-[50px]">
                              <span className="text-xs mr-3">Empty Row</span>
                              <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={() => addColumn(activeTab.id, row.id)}>Add Column</Button>
                            </div>
                          ) : (
                            row.columns.map((col) => (
                              <div 
                                key={col.id} 
                                style={{ flexBasis: `calc(${col.width} - 12px)` }}
                                className="border rounded-md bg-muted/40 p-2 flex flex-col relative group/col transition-all overflow-hidden"
                              >
                                <div className="flex items-center justify-between gap-2 mb-2">
                                  <div className="flex items-center flex-1 gap-2">
                                    <Input 
                                      className="h-7 text-xs flex-1 min-w-[100px]"
                                      placeholder="Column Name..."
                                      value={col.name || ""}
                                      onChange={(e) => updateColumn(activeTab.id, row.id, col.id, { name: e.target.value })}
                                    />
                                  </div>
                                  
                                  <div className="flex items-center gap-1 shrink-0">
                                    <select 
                                      className="text-xs border rounded p-1.5 w-[65px] bg-background"
                                      value={col.width}
                                      onChange={(e) => updateColumn(activeTab.id, row.id, col.id, { width: e.target.value as ColumnWidth })}
                                    >
                                      <option value="25%">25%</option>
                                      <option value="33%">33%</option>
                                      <option value="50%">50%</option>
                                      <option value="75%">75%</option>
                                      <option value="100%">100%</option>
                                    </select>
                                    
                                    <Button 
                                      size="icon" 
                                      variant="ghost" 
                                      className="h-7 w-7 text-destructive hover:bg-destructive/10" 
                                      onClick={() => removeColumn(activeTab.id, row.id, col.id)}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    ))}
                    
                    {activeTab.rows.length === 0 && (
                      <div className="border border-dashed rounded-xl p-12 flex flex-col items-center justify-center text-muted-foreground">
                         <Layout className="h-10 w-10 mb-4 opacity-30" />
                         <p className="mb-4">This tab is currently empty</p>
                         <Button onClick={() => addRow(activeTab.id)}>Create First Row</Button>
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
