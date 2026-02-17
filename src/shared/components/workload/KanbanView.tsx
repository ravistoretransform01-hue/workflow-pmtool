import { useMemo, useState } from "react";
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
import type { Priority, Status, Label } from "@/features/cms/types";
import type { Task } from "./WorkloadBoard";
import { KanbanColumn } from "./KanbanColumn";
import { KanbanCard } from "./KanbanCard";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/shared/components/ui/popover";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";

interface KanbanViewProps {
  groups: Array<{ id: string; name: string; color: string; tasks: Task[] }>;
  statuses: Status[];
  priorities: Priority[];
  labels?: Label[];
  boardId?: string; // used for persisting visible statuses
  onTaskMove: (taskId: string, newStatusId: string) => Promise<void>;
  onTaskClick: (task: Task) => void;
  searchQuery?: string;
}

export function KanbanView({
  groups,
  statuses,
  priorities,
  labels = [],
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
    }),
  );

  const [activeId, setActiveId] = useState<string | null>(null);

  // Track optimistic status changes: taskId -> newStatusId
  const [optimisticStatusChanges, setOptimisticStatusChanges] = useState<
    Record<string, string>
  >({});

  // Visible statuses (persisted per board when boardId is provided)
  const [visibleStatuses, setVisibleStatuses] = useState<Set<string>>(() => {
    try {
      if (!boardId) return new Set(statuses.map((s) => String(s.id)));
      const raw = localStorage.getItem(`kanban-visible-statuses-${boardId}`);
      return raw
        ? new Set(JSON.parse(raw))
        : new Set(statuses.map((s) => String(s.id)));
    } catch {
      return new Set(statuses.map((s) => String(s.id)));
    }
  });

  // Keep visible statuses in sync if statuses list changes (add any new statuses by default)

  const persistVisibleStatuses = (set: Set<string>) => {
    try {
      if (!boardId) return;
      localStorage.setItem(
        `kanban-visible-statuses-${boardId}`,
        JSON.stringify(Array.from(set)),
      );
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
        // Process main task
        const effectiveStatusId = optimisticStatusChanges[task.id]
          ? optimisticStatusChanges[task.id]
          : String(task.status_id || "");

        if (organized[effectiveStatusId]) {
          organized[effectiveStatusId].push(task);
        }

        // Process subtasks
        if (task.subitems && task.subitems.length > 0) {
          task.subitems.forEach((subtask) => {
            const subtaskEffectiveStatusId = optimisticStatusChanges[subtask.id]
              ? optimisticStatusChanges[subtask.id]
              : String(subtask.status_id || "");

            if (organized[subtaskEffectiveStatusId]) {
              organized[subtaskEffectiveStatusId].push(subtask);
            }
          });
        }
      });
    });

    // Filter by search query if provided
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();

      // Lookup maps for dynamic name resolution during search
      const statusNameMap = new Map(
        statuses.map((s) => [String(s.id), s.name]),
      );
      const priorityNameMap = new Map(
        priorities.map((p) => [String(p.id), p.name]),
      );
      const labelNameMap = new Map(
        labels.map((l) => [String(l.id), l.label_name]),
      );

      Object.keys(organized).forEach((statusId) => {
        organized[statusId] = organized[statusId].filter((task) => {
          // Resolve readable names dynamically for better search accuracy
          const statusName = statusNameMap.get(task.status_id || "") || "";
          const priorityName =
            priorityNameMap.get(task.priority_id || "") || "";
          const groupLabelName = labelNameMap.get(task.label_id || "") || "";

          const content = [
            task.name,
            statusName,
            priorityName,
            groupLabelName,
            ...(task.assignee_names || []),
            ...(Array.isArray(task.tags)
              ? task.tags.map((t: any) => t.tag_name)
              : []),
          ]
            .join(" ")
            .toLowerCase();
          return content.includes(query);
        });
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
      // Check subitems
      for (const t of group.tasks) {
        const subtask = t.subitems?.find((st) => st.id === taskId);
        if (subtask) {
          originalStatusId = String(subtask.status_id);
          break;
        }
      }
      if (originalStatusId) break;
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
      // Check subitems
      for (const task of group.tasks) {
        const subtask = task.subitems?.find((st) => st.id === activeId);
        if (subtask) return subtask;
      }
    }
    return null;
  })();

  // Create a map of group metadata for quick lookup
  const groupMap = useMemo(() => {
    const map: Record<string, { name: string; color: string }> = {};
    groups.forEach((g) => {
      map[String(g.id)] = { name: g.name, color: g.color };
    });
    return map;
  }, [groups]);

  // Create lookup maps for status and priority
  const statusMap = useMemo(() => {
    const map: Record<string, { name: string; color: string }> = {};
    statuses.forEach((s) => {
      map[String(s.id)] = { name: s.name, color: s.color_code };
    });
    return map;
  }, [statuses]);

  const priorityMap = useMemo(() => {
    const map: Record<string, { name: string; color: string }> = {};
    priorities.forEach((p) => {
      map[String(p.id)] = { name: p.name, color: p.color_code };
    });
    return map;
  }, [priorities]);

  // Card visibility configuration
  const CARD_FIELDS = [
    { id: "group", label: "Group Name" },
    { id: "assignees", label: "Assignees" },
    { id: "status", label: "Status" },
    { id: "priority", label: "Priority" },
    { id: "description", label: "Description" },
  ];

  // Visible card fields (persisted per board)
  const [visibleCardFields, setVisibleCardFields] = useState<Set<string>>(
    () => {
      try {
        if (!boardId) return new Set(CARD_FIELDS.map((f) => f.id));
        const raw = localStorage.getItem(
          `kanban-visible-card-fields-${boardId}`,
        );
        return raw
          ? new Set(JSON.parse(raw))
          : new Set(CARD_FIELDS.map((f) => f.id));
      } catch {
        return new Set(CARD_FIELDS.map((f) => f.id));
      }
    },
  );

  const toggleCardField = (id: string) => {
    setVisibleCardFields((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);

      try {
        if (boardId) {
          localStorage.setItem(
            `kanban-visible-card-fields-${boardId}`,
            JSON.stringify(Array.from(next)),
          );
        }
      } catch {}

      return next;
    });
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="px-6 py-2">
        <div className="flex items-center gap-3">
          {/* Columns visibility popover */}
          <Popover>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-2 px-3 py-2 rounded bg-muted border border-border text-sm">
                <span className="font-medium">Kanban Cards</span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              className="w-74 p-3 bg-popover border-border z-50"
              align="start"
            >
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
                        <div className="text-sm max-w-[160px] truncate">
                          {s.name}
                        </div>
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
                <div className="text-sm text-muted-foreground">
                  Select which statuses will show as Kanban columns
                </div>
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

          {/* Card Fields Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-2 px-3 py-2 rounded bg-muted border border-border text-sm">
                <span className="font-medium">Card Fields</span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              className="w-56 p-3 bg-popover border-border z-50"
              align="start"
            >
              <div className="space-y-2">
                <div className="text-xs font-semibold text-muted-foreground mb-2">
                  Visible Card Fields
                </div>
                {CARD_FIELDS.map((field) => (
                  <label
                    key={field.id}
                    className="flex items-center gap-3 p-2 rounded hover:bg-muted cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={visibleCardFields.has(field.id)}
                      onChange={() => toggleCardField(field.id)}
                      className="h-4 w-4"
                    />
                    <span className="text-sm">{field.label}</span>
                  </label>
                ))}
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
              groupMap={groupMap}
              visibleCardFields={visibleCardFields}
              statusMap={statusMap}
              priorityMap={priorityMap}
            />
          ))}
      </div>

      <DragOverlay adjustScale={false} dropAnimation={{ duration: 150 }}>
        {activeTask ? (
          <KanbanCard
            task={activeTask}
            overlay
            groupName={groupMap[String(activeTask.group_id)]?.name}
            groupColor={groupMap[String(activeTask.group_id)]?.color}
            statusName={statusMap[String(activeTask.status_id)]?.name}
            statusColor={statusMap[String(activeTask.status_id)]?.color}
            priorityName={priorityMap[String(activeTask.priority_id)]?.name}
            priorityColor={priorityMap[String(activeTask.priority_id)]?.color}
            visibleCardFields={visibleCardFields}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
