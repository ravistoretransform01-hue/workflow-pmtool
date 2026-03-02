import { useMemo, useState, useEffect } from "react";
import {
  DndContext,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  DragOverlay,
  type CollisionDetection,
} from "@dnd-kit/core";
import type { DragStartEvent } from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import type { Priority, Status } from "@/features/cms/types";
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
  members: any[];
  boardId?: string; // used for persisting visible statuses
  onTaskMove: (taskId: string, newStatusId: string) => Promise<void>;
  onTaskClick: (task: Task) => void;
  onAddTask: (
    name: string,
    statusId: string,
    groupId: string,
    parentId?: string,
  ) => Promise<void>;
}

export function KanbanView({
  groups,
  statuses,
  priorities,
  members,
  boardId,
  onTaskMove,
  onTaskClick,
  onAddTask,
}: KanbanViewProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  );

  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<"card" | "column" | null>(null);

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

  // Column ordering
  const [orderedStatusIds, setOrderedStatusIds] = useState<string[]>(() => {
    try {
      if (!boardId) return statuses.map((s) => String(s.id));
      const raw = localStorage.getItem(`kanban-column-order-${boardId}`);
      if (raw) {
        const savedOrder = JSON.parse(raw) as string[];
        // Ensure all current statuses are in the order, and remove deleted ones
        const currentIds = new Set(statuses.map((s) => String(s.id)));
        const filtered = savedOrder.filter((id) => currentIds.has(id));
        const missing = statuses
          .map((s) => String(s.id))
          .filter((id) => !new Set(filtered).has(id));
        return [...filtered, ...missing];
      }
    } catch {}
    return statuses.map((s) => String(s.id));
  });

  // Sync orderedStatusIds when statuses prop changes
  useEffect(() => {
    setOrderedStatusIds((prev) => {
      const currentIds = new Set(statuses.map((s) => String(s.id)));
      const filtered = prev.filter((id) => currentIds.has(id));
      const missing = statuses
        .map((s) => String(s.id))
        .filter((id) => !new Set(filtered).has(id));

      const newOrder = [...filtered, ...missing];

      // Only update if fundamentally different
      if (JSON.stringify(newOrder) !== JSON.stringify(prev)) {
        return newOrder;
      }
      return prev;
    });
  }, [statuses]);

  const persistVisibleStatuses = (set: Set<string>) => {
    try {
      if (!boardId) return;
      localStorage.setItem(
        `kanban-visible-statuses-${boardId}`,
        JSON.stringify(Array.from(set)),
      );
    } catch {}
  };

  const persistColumnOrder = (order: string[]) => {
    try {
      if (!boardId) return;
      localStorage.setItem(
        `kanban-column-order-${boardId}`,
        JSON.stringify(order),
      );
    } catch {}
  };

  // Sync visibleStatuses when statuses prop changes
  useEffect(() => {
    setVisibleStatuses((prev) => {
      let needsUpdate = false;

      const next = new Set(prev);

      // Add any missing statuses that are new
      statuses.forEach((s) => {
        const idStr = String(s.id);
        // If it's a completely new status that wasn't in the list before, make it visible by default
        // (If the user explicitly hid it, it would be in the prev set but currently we just add it if missing from tracking and if it's new)
        // Wait, if we want to ensure it's visible if newly added:
        if (!next.has(idStr)) {
          // To be safe, we only add it if it's completely missing from localStorage.
          // Since we initialize from localStorage, if it's missing, it's a new status.
          next.add(idStr);
          needsUpdate = true;
        }
      });

      if (needsUpdate) {
        // Also persist the new ones
        try {
          if (boardId) {
            localStorage.setItem(
              `kanban-visible-statuses-${boardId}`,
              JSON.stringify(Array.from(next)),
            );
          }
        } catch {}
        return next;
      }
      return prev;
    });
  }, [statuses, boardId]);

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

    return organized;
  }, [groups, statuses, optimisticStatusChanges]);

  // Mixed collision detection that distinguishes between columns and cards
  const collisionDetectionStrategy: CollisionDetection = (args) => {
    const { pointerCoordinates, active } = args;
    if (!pointerCoordinates) return [];

    const activeType = active.data.current?.type;

    if (activeType === "column") {
      return closestCorners({
        ...args,
        droppableContainers: args.droppableContainers.filter(
          (c) => c.data.current?.type === "column",
        ),
      });
    }

    // 1️⃣ First: detect column directly by pointer position
    const columnContainers = args.droppableContainers.filter((container) =>
      String(container.id).startsWith("status-"),
    );

    for (const container of columnContainers) {
      const rect = container.rect.current;
      if (!rect) continue;

      if (
        pointerCoordinates.x >= rect.left &&
        pointerCoordinates.x <= rect.right &&
        pointerCoordinates.y >= rect.top &&
        pointerCoordinates.y <= rect.bottom
      ) {
        return [{ id: container.id }];
      }
    }

    return closestCorners({
      ...args,
      droppableContainers: columnContainers,
    });
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(String(active.id));
    setActiveType(active.data.current?.type || "card");
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setActiveType(null);

    if (!over) return;

    // Handle column reordering
    if (active.data.current?.type === "column") {
      if (active.id !== over.id) {
        setOrderedStatusIds((items) => {
          const oldIndex = items.indexOf(
            String(active.id).replace("column-", ""),
          );
          const newIndex = items.indexOf(
            String(over.id).replace("column-", ""),
          );
          const newOrder = arrayMove(items, oldIndex, newIndex);
          persistColumnOrder(newOrder);
          return newOrder;
        });
      }
      return;
    }

    // Handle card movement
    const taskId = String(active.id);
    let overId = String(over.id);

    // If dropped over a card, find its column's status ID
    if (!overId.startsWith("status-")) {
      let taskFound = false;
      for (const statusId in tasksByStatus) {
        if (tasksByStatus[statusId].some((t) => String(t.id) === overId)) {
          overId = `status-${statusId}`;
          taskFound = true;
          break;
        }
      }
      if (!taskFound) return;
    }

    const statusMatch = overId.match(/^status-(.+)$/);
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
      for (const t of group.tasks) {
        const subtask = t.subitems?.find((st) => st.id === taskId);
        if (subtask) {
          originalStatusId = String(subtask.status_id);
          break;
        }
      }
      if (originalStatusId) break;
    }

    if (originalStatusId === statusId) return;

    setOptimisticStatusChanges((prev) => ({
      ...prev,
      [taskId]: statusId,
    }));

    try {
      await onTaskMove(taskId, statusId);
      setOptimisticStatusChanges((prev) => {
        const next = { ...prev };
        delete next[taskId];
        return next;
      });
    } catch (error) {
      console.error("Failed to move task:", error);
      setOptimisticStatusChanges((prev) => {
        const next = { ...prev };
        delete next[taskId];
        return next;
      });
      toast.error("Failed to move task. Please try again.");
    }
  };

  const activeTask = (() => {
    if (!activeId || activeType !== "card") return null;
    for (const group of groups) {
      const t = group.tasks.find((task) => task.id === activeId);
      if (t) return t;
      for (const task of group.tasks) {
        const subtask = task.subitems?.find((st) => st.id === activeId);
        if (subtask) return subtask;
      }
    }
    return null;
  })();

  const activeStatus = (() => {
    if (!activeId || activeType !== "column") return null;
    const sId = String(activeId).replace("column-", "");
    return statuses.find((s) => String(s.id) === sId);
  })();

  const groupMap = useMemo(() => {
    const map: Record<string, { name: string; color: string }> = {};
    groups.forEach((g) => {
      map[String(g.id)] = { name: g.name, color: g.color };
    });
    return map;
  }, [groups]);

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

  const CARD_FIELDS = [
    { id: "group", label: "Group Name" },
    { id: "assignees", label: "Assignees" },
    { id: "status", label: "Status" },
    { id: "priority", label: "Priority" },
  ];

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
    <div className="flex flex-col h-full bg-background overflow-hidden relative">
      <div className="flex-1 overflow-x-auto scrollbar-hide">
        <DndContext
          sensors={sensors}
          collisionDetection={collisionDetectionStrategy}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="px-6 pt-4">
            <div className="flex items-center gap-3">
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

          <div className="flex gap-4 overflow-x-auto px-6 py-4 h-full">
            <SortableContext
              items={orderedStatusIds.map((id) => `column-${id}`)}
              strategy={horizontalListSortingStrategy}
            >
              {orderedStatusIds
                .filter((id) => visibleStatuses.has(id))
                .map((statusId) => {
                  const status = statuses.find(
                    (s) => String(s.id) === statusId,
                  );
                  if (!status) return null;
                  return (
                    <KanbanColumn
                      key={status.id}
                      status={status}
                      tasks={tasksByStatus[String(status.id)] || []}
                      onTaskClick={onTaskClick}
                      onAddTask={(name, groupId, parentId) =>
                        onAddTask(name, String(status.id), groupId, parentId)
                      }
                      groups={groups}
                      groupMap={groupMap}
                      members={members}
                      visibleCardFields={visibleCardFields}
                      statusMap={statusMap}
                      priorityMap={priorityMap}
                    />
                  );
                })}
            </SortableContext>
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
                priorityColor={
                  priorityMap[String(activeTask.priority_id)]?.color
                }
                members={members}
                visibleCardFields={visibleCardFields}
              />
            ) : activeStatus ? (
              <KanbanColumn
                status={activeStatus}
                tasks={tasksByStatus[String(activeStatus.id)] || []}
                onTaskClick={onTaskClick}
                onAddTask={async () => {}}
                groups={groups}
                groupMap={groupMap}
                members={members}
                visibleCardFields={visibleCardFields}
                statusMap={statusMap}
                priorityMap={priorityMap}
                isOverlay
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}
