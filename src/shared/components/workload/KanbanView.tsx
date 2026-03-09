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
import { getOrganizationId } from "@/lib/utils";
import { cmsApi } from "@/features/cms/cmsApi";

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
  onStatusesUpdated?: (statuses: Status[]) => void;
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
  onStatusesUpdated,
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

  // Local reordering: statusId -> taskId[]
  const [taskOrders, setTaskOrders] = useState<Record<string, string[]>>({});

  // Initialize taskOrders from localStorage
  useEffect(() => {
    if (!boardId) return;
    try {
      const raw = localStorage.getItem(`kanban-task-order-${boardId}`);
      if (raw) {
        setTaskOrders(JSON.parse(raw));
      }
    } catch (e) {
      console.error("Failed to load task orders", e);
    }
  }, [boardId]);

  const persistTaskOrders = (orders: Record<string, string[]>) => {
    if (!boardId) return;
    try {
      localStorage.setItem(
        `kanban-task-order-${boardId}`,
        JSON.stringify(orders),
      );
    } catch (e) {
      console.error("Failed to persist task orders", e);
    }
  };

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
    const newOrder = statuses.map((s) => String(s.id));

    // Only update if fundamentally different to avoid unnecessary re-renders
    setOrderedStatusIds((prev) => {
      if (JSON.stringify(newOrder) !== JSON.stringify(prev)) {
        // Also update localStorage to stay in sync
        if (boardId) {
          try {
            localStorage.setItem(
              `kanban-column-order-${boardId}`,
              JSON.stringify(newOrder),
            );
          } catch (e) {
            console.error("Failed to sync column order to localStorage", e);
          }
        }
        return newOrder;
      }
      return prev;
    });
  }, [statuses, boardId]);

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

    // Sort each list based on taskOrders
    Object.keys(organized).forEach((statusId) => {
      const order = taskOrders[statusId] ?? [];

      if (order.length > 0) {
        const orderMap = new Map(order.map((id, i) => [id, i]));

        organized[statusId].sort((a, b) => {
          const indexA = orderMap.get(String(a.id)) ?? Number.MAX_SAFE_INTEGER;
          const indexB = orderMap.get(String(b.id)) ?? Number.MAX_SAFE_INTEGER;
          return indexA - indexB;
        });
      }
    });

    return organized;
  }, [groups, statuses, optimisticStatusChanges, taskOrders]);

  // Mixed collision detection that distinguishes between columns and cards
  const collisionDetectionStrategy: CollisionDetection = (args) => {
    const { pointerCoordinates, active, droppableContainers } = args;
    if (!pointerCoordinates) return [];

    const activeType = active.data.current?.type;

    if (activeType === "column") {
      return closestCorners({
        ...args,
        droppableContainers: droppableContainers.filter(
          (c) => c.data.current?.type === "column",
        ),
      });
    }

    // 1️⃣ First: detect card directly by pointer position
    const cardContainers = droppableContainers.filter(
      (c) => c.data.current?.type === "card" && c.id !== active.id,
    );

    for (const container of cardContainers) {
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

    // 2️⃣ Second: detect column directly by pointer position
    const columnContainers = droppableContainers.filter(
      (container) => container.data.current?.type === "column",
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

    return closestCorners(args);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const id = String(active.id);
    setActiveId(id);
    setActiveType(active.data.current?.type || "card");

    // Seed task order for the active column if not already present
    if (active.data.current?.type === "card") {
      const statusId = String(active.data.current.task?.status_id || "");
      if (statusId && !taskOrders[statusId]) {
        setTaskOrders((prev) => ({
          ...prev,
          [statusId]: tasksByStatus[statusId]?.map((t) => String(t.id)) || [],
        }));
      }
    }
  };

  const handleDragOver = (event: any) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    if (active.data.current?.type === "column") return;

    // Find active task's current status
    let activeStatusId: string | null = null;
    outerLoop: for (const statusId in tasksByStatus) {
      if (tasksByStatus[statusId].some((t) => String(t.id) === activeId)) {
        activeStatusId = statusId;
        break outerLoop;
      }
    }
    if (!activeStatusId) return;

    // Find over status ID
    let overStatusId: string | null = null;
    const isOverColumn =
      overId.startsWith("status-") || overId.startsWith("column-");

    if (isOverColumn) {
      overStatusId = String(over.data.current?.status?.id || "");
    } else {
      outerLoop2: for (const statusId in tasksByStatus) {
        if (tasksByStatus[statusId].some((t) => String(t.id) === overId)) {
          overStatusId = statusId;
          break outerLoop2;
        }
      }
    }

    if (!overStatusId) return;

    // Handle same-column reordering
    if (activeStatusId === overStatusId) {
      if (isOverColumn && activeId === overId) {
        // If we hit the column itself (gap) and it's our own column, ignore to prevent jumping
        return;
      }

      setTaskOrders((prev) => {
        const currentOrder =
          prev[activeStatusId!] ||
          tasksByStatus[activeStatusId!].map((t) => String(t.id));

        const oldIndex = currentOrder.indexOf(activeId);
        const newIndex = currentOrder.indexOf(overId);

        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
          return {
            ...prev,
            [activeStatusId!]: arrayMove(currentOrder, oldIndex, newIndex),
          };
        }

        return prev;
      });
      return;
    }

    // Move to different column optimistically for the ghost effect
    setOptimisticStatusChanges((prev) => ({
      ...prev,
      [activeId]: overStatusId!,
    }));

    setTaskOrders((prev) => {
      const next = { ...prev };
      const sourceList =
        prev[activeStatusId!] ||
        tasksByStatus[activeStatusId!]?.map((t) => String(t.id)) ||
        [];
      const destList =
        prev[overStatusId!] ||
        tasksByStatus[overStatusId!]?.map((t) => String(t.id)) ||
        [];

      const isAlreadyInDest = destList.includes(activeId);

      // If we are already in this column and hit a "gap" (column hit),
      // don't move it to the end. Just keep current order to avoid flickering/jumping.
      if (isAlreadyInDest && isOverColumn) {
        return prev;
      }

      next[activeStatusId!] = sourceList.filter((id) => id !== activeId);

      const newDestList = [...destList.filter((id) => id !== activeId)];
      if (isOverColumn) {
        newDestList.push(activeId);
      } else {
        const overIndex = newDestList.indexOf(overId);
        if (overIndex !== -1) {
          newDestList.splice(overIndex, 0, activeId);
        } else {
          newDestList.push(activeId);
        }
      }

      // Only update if the order actually changed
      if (
        JSON.stringify(newDestList) === JSON.stringify(destList) &&
        JSON.stringify(next[activeStatusId!]) === JSON.stringify(sourceList)
      ) {
        return prev;
      }

      next[overStatusId!] = newDestList;
      return next;
    });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setActiveType(null);

    if (!over) {
      // Clear optimistic changes on cancel
      setOptimisticStatusChanges({});
      return;
    }

    // Handle column reordering
    if (active.data.current?.type === "column") {
      if (active.id !== over.id) {
        const oldId = String(active.id).replace("column-", "");
        const newId = String(over.id).replace("column-", "");
        const oldIndex = orderedStatusIds.indexOf(oldId);
        const newIndex = orderedStatusIds.indexOf(newId);

        if (oldIndex !== -1 && newIndex !== -1) {
          const newOrder = arrayMove(orderedStatusIds, oldIndex, newIndex);

          // 1. Update local state synchronously
          setOrderedStatusIds(newOrder);
          persistColumnOrder(newOrder);

          // 2. Notify parent to sync across views
          if (onStatusesUpdated) {
            const statusMap = new Map(statuses.map((s) => [String(s.id), s]));
            const updatedStatuses = newOrder
              .map((id) => statusMap.get(id))
              .filter((s): s is Status => !!s);
            onStatusesUpdated(updatedStatuses);
          }

          // 3. Trigger API call for reordering
          const orgId = getOrganizationId();
          if (orgId && boardId) {
            const statusOrderPayload = newOrder.map((id, index) => ({
              id: Number(id),
              status_order: index + 1,
            }));

            cmsApi
              .reorderStatuses({
                organization_id: Number(orgId),
                board_id: Number(boardId),
                statuses: statusOrderPayload,
              })
              .then((response: any) => {
                console.log("Status reorder successful:", response);
                if (response && (response.status || response.success)) {
                  toast.success(response.message || "Column order saved");
                }
              })
              .catch((error: Error) => {
                console.error("Failed to persist status order:", error);
                toast.error("Failed to save column order");
              });
          }
        }
      }
      return;
    }

    // Handle card movement
    const activeId = String(active.id);
    const overId = String(over.id);

    // Find final status ID
    let finalStatusId: string | null = null;
    if (overId.startsWith("status-") || overId.startsWith("column-")) {
      finalStatusId = overId.replace("status-", "").replace("column-", "");
    } else {
      outerLoop: for (const statusId in tasksByStatus) {
        if (tasksByStatus[statusId].some((t) => String(t.id) === overId)) {
          finalStatusId = statusId;
          break outerLoop;
        }
      }
    }

    if (!finalStatusId) {
      setOptimisticStatusChanges({});
      return;
    }

    // Handle intra-column drop (reordering)
    let finalTaskOrders = { ...taskOrders };
    if (activeId !== overId) {
      // Find source status
      let activeStatusId: string | null = null;
      outerLoop3: for (const statusId in tasksByStatus) {
        if (tasksByStatus[statusId].some((t) => String(t.id) === activeId)) {
          activeStatusId = statusId;
          break outerLoop3;
        }
      }

      const isOverColumn = over.data.current?.type === "column";

      if (activeStatusId === finalStatusId) {
        const currentOrder =
          finalTaskOrders[activeStatusId!] ||
          tasksByStatus[activeStatusId!]?.map((t) => String(t.id)) ||
          [];

        const oldIndex = currentOrder.indexOf(activeId);

        if (oldIndex !== -1) {
          const newIndex = isOverColumn
            ? oldIndex
            : currentOrder.indexOf(overId);

          if (newIndex !== -1 && oldIndex !== newIndex) {
            const newOrder = arrayMove(currentOrder, oldIndex, newIndex);
            finalTaskOrders[activeStatusId!] = newOrder;
            setTaskOrders(finalTaskOrders);
          }
        }
      }
    }

    // Persist final task orders
    persistTaskOrders(finalTaskOrders);

    // If it moved to a different column, trigger API call
    const originalStatusId = String(active.data.current?.task?.status_id || "");
    const statusChanged =
      finalStatusId !== originalStatusId &&
      optimisticStatusChanges[activeId] === finalStatusId;

    if (statusChanged) {
      try {
        await onTaskMove(activeId, finalStatusId);
        setOptimisticStatusChanges((prev) => {
          const next = { ...prev };
          delete next[activeId];
          return next;
        });
      } catch (error) {
        console.error("Failed to move task:", error);
        setOptimisticStatusChanges((prev) => {
          const next = { ...prev };
          delete next[activeId];
          return next;
        });
        toast.error("Failed to move task. Please try again.");
      }
    } else {
      // If no status change, just clear optimistic state
      setOptimisticStatusChanges({});
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
          onDragOver={handleDragOver}
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

                  // Determine if this column is being dragged over
                  let isDraggingOver = false;
                  if (activeId && activeType === "card") {
                    // Check if optimistic status change points here
                    if (optimisticStatusChanges[activeId] === statusId) {
                      isDraggingOver = true;
                    } else {
                      // Fallback: check if active task's original status matches (for same-column moves)
                      const activeTaskOriginalStatusId = String(
                        groups
                          .flatMap((g) => g.tasks)
                          .find((t) => String(t.id) === activeId)?.status_id ||
                          "",
                      );
                      if (
                        !optimisticStatusChanges[activeId] &&
                        activeTaskOriginalStatusId === statusId
                      ) {
                        isDraggingOver = true;
                      }
                    }
                  }

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
                      isDraggingOver={isDraggingOver}
                      onStatusesUpdated={onStatusesUpdated}
                      boardId={boardId}
                      statuses={statuses}
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
                onStatusesUpdated={onStatusesUpdated}
                boardId={boardId}
                statuses={statuses}
                isOverlay
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}
