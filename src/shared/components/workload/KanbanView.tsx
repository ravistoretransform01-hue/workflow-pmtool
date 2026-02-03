import { useMemo, useState, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  DragOverlay,
} from "@dnd-kit/core";
import type { DragStartEvent } from "@dnd-kit/core";
import type { Status } from "@/features/cms/types";
import type { Task } from "./WorkloadBoard";
import { KanbanColumn } from "./KanbanColumn";
import { KanbanCard } from "./KanbanCard";
import { Popover, PopoverTrigger, PopoverContent } from "@/shared/components/ui/popover";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";

interface KanbanViewProps {
  groups: Array<{ id: string; name: string; color: string; tasks: Task[] }>;
  statuses: Status[];
  boardId?: string; // used for persisting visible statuses
  onTaskMove: (taskId: string, newStatusId: string) => Promise<void>;
  onTaskClick: (task: Task) => void;
  searchQuery?: string;
}

export function KanbanView({
  groups,
  statuses,
  boardId,
  onTaskMove,
  onTaskClick,
  searchQuery = "",
}: KanbanViewProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const [activeId, setActiveId] = useState<string | null>(null);
  
  // Track optimistic status changes: taskId -> newStatusId
  const [optimisticStatusChanges, setOptimisticStatusChanges] = useState<Record<string, string>>({});

  // Visible statuses (persisted per board when boardId is provided)
  const [visibleStatuses, setVisibleStatuses] = useState<Set<string>>(() => {
    try {
      if (!boardId) return new Set(statuses.map((s) => String(s.id)));
      const raw = localStorage.getItem(`kanban-visible-statuses-${boardId}`);
      return raw ? new Set(JSON.parse(raw)) : new Set(statuses.map((s) => String(s.id)));
    } catch {
      return new Set(statuses.map((s) => String(s.id)));
    }
  });

  // Keep visible statuses in sync if statuses list changes (add any new statuses by default)
  useEffect(() => {
    setVisibleStatuses((prev) => {
      const next = new Set(prev);
      statuses.forEach((s) => next.add(String(s.id)));
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statuses]);

  const persistVisibleStatuses = (set: Set<string>) => {
    try {
      if (!boardId) return;
      localStorage.setItem(`kanban-visible-statuses-${boardId}`, JSON.stringify(Array.from(set)));
    } catch {}
  };

  const toggleStatus = (id: string) => {
    setVisibleStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      persistVisibleStatuses(next);
      return next;
    });
  };

  const setAllStatuses = (visible: boolean) => {
    const next = new Set<string>();
    if (visible) {
      statuses.forEach((s) => next.add(String(s.id)));
    }
    setVisibleStatuses(next);
    persistVisibleStatuses(next);
  };

  // Organize tasks by status (with optimistic updates applied)
  const tasksByStatus = useMemo(() => {
    const organized: Record<string, Task[]> = {};

    // Initialize all statuses
    statuses.forEach((status) => {
      organized[String(status.id)] = [];
    });

    // Distribute tasks from all groups
    groups.forEach((group) => {
      group.tasks.forEach((task) => {
        // Apply optimistic status change if exists
        const effectiveStatusId = optimisticStatusChanges[task.id] 
          ? optimisticStatusChanges[task.id] 
          : String(task.status_id || "");
        
        if (organized[effectiveStatusId]) {
          organized[effectiveStatusId].push(task);
        }
      });
    });

    // Filter by search query if provided
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      Object.keys(organized).forEach((statusId) => {
        organized[statusId] = organized[statusId].filter((task) =>
          task.name.toLowerCase().includes(query)
        );
      });
    }

    return organized;
  }, [groups, statuses, searchQuery, optimisticStatusChanges]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    setActiveId(null);

    if (!over) return;

    const taskId = String(active.id);
    const newStatusId = String(over.id);

    // Extract status ID from the over ID (format: "status-{statusId}")
    const statusMatch = newStatusId.match(/^status-(.+)$/);
    if (!statusMatch) return;

    const statusId = statusMatch[1];
    
    // Find the task to get its original status
    let originalStatusId: string | null = null;
    for (const group of groups) {
      const task = group.tasks.find((t) => t.id === taskId);
      if (task) {
        originalStatusId = String(task.status_id);
        break;
      }
    }
    
    // Don't do anything if dropping in the same column
    if (originalStatusId === statusId) return;

    // Optimistically update the UI immediately
    setOptimisticStatusChanges((prev) => ({
      ...prev,
      [taskId]: statusId,
    }));

    try {
      // Call the API
      await onTaskMove(taskId, statusId);
      
      // If successful, remove the optimistic change (the real data will update)
      setOptimisticStatusChanges((prev) => {
        const next = { ...prev };
        delete next[taskId];
        return next;
      });
    } catch (error) {
      console.error("Failed to move task:", error);
      
      // Revert the optimistic change on error
      setOptimisticStatusChanges((prev) => {
        const next = { ...prev };
        delete next[taskId];
        return next;
      });
      
      toast.error("Failed to move task. Please try again.");
    }
  };

  // Find active task for DragOverlay rendering
  const activeTask = (() => {
    if (!activeId) return null;
    for (const group of groups) {
      const t = group.tasks.find((task) => task.id === activeId);
      if (t) return t;
    }
    return null;
  })();

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {/* Columns visibility popover */}
      <div className="px-6 py-2">
        <div className="flex items-center gap-3">
          <Popover>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-2 px-3 py-2 rounded bg-muted border border-border text-sm">
                <span className="font-medium">Kanban Cards</span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-3 bg-popover border-border z-50" align="start">
              <div className="space-y-3 max-h-64 overflow-auto pr-2">
                {statuses.map((s) => {
                  const id = String(s.id);
                  const visible = visibleStatuses.has(id);
                  return (
                    <label
                      key={`status-item-${id}`}
                      className="flex items-center gap-3 p-2 rounded hover:bg-muted cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={visible}
                        onChange={() => toggleStatus(id)}
                        className="h-4 w-4"
                      />
                      <div className="flex items-center gap-3">
                        <div
                          className="w-6 h-6 rounded-full"
                          style={{ backgroundColor: s.color_code }}
                        />
                        <div className="text-sm max-w-[160px] truncate">{s.name}</div>
                      </div>

                      <div className="ml-auto">
                        <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary">
                          {tasksByStatus[String(s.id)]?.length || 0}
                        </span>
                      </div>
                    </label>
                  );
                })}
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-between">
                <div className="text-sm text-muted-foreground">Select which statuses will show as Kanban columns</div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setAllStatuses(true)}
                    className="text-sm px-2 py-1 rounded bg-background border border-border"
                  >
                    Show all
                  </button>
                  <button
                    onClick={() => setAllStatuses(false)}
                    className="text-sm px-2 py-1 rounded bg-background border border-border"
                  >
                    Hide all
                  </button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto p-6 h-full">
        {statuses
          .filter((status) => visibleStatuses.has(String(status.id)))
          .map((status) => (
            <KanbanColumn
              key={status.id}
              status={status}
              tasks={tasksByStatus[String(status.id)] || []}
              onTaskClick={onTaskClick}
            />
          ))}
      </div>

      <DragOverlay adjustScale={false} dropAnimation={{ duration: 150 }}>
        {activeTask ? <KanbanCard task={activeTask} overlay /> : null}
      </DragOverlay>
    </DndContext>
  );
}
