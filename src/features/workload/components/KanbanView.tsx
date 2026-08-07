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
import type { Priority, Status } from "@/features/cms/types/types";
import type { Task } from "@/features/workload/components/WorkloadBoard";
import { KanbanColumn } from "@/features/workload/components/KanbanColumn";
import { KanbanCard } from "@/features/workload/components/KanbanCard";
import { TeamsBoardNavigator } from "@/features/workload/components/TeamsBoardNavigator";
import { Popover, PopoverTrigger, PopoverContent } from "@/shared/ui/popover";
import { ChevronDown, Settings, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { ColorPickerPopover } from "@/features/workload/components/ColorPickerPopover";
import { getOrganizationId } from "@/utils/utils";
import { cmsApi } from "@/features/cms/api/cmsApi";
import {
  updateStatusesOrderInCache,
  updatePrioritiesOrderInCache,
  addStatusToCache,
  addPriorityToCache,
} from "@/features/cms/services/cmsStorage";

interface KanbanViewProps {
  groups: Array<{ id: string; name: string; color: string; tasks: Task[] }>;
  statuses: Status[];
  priorities: Priority[];
  members: any[];
  boardId?: string; // used for persisting visible statuses
  onTaskMove: (
    taskId: string,
    newId: string,
    type: "status" | "priority",
  ) => Promise<void>;
  onTaskClick: (task: Task) => void;
  onAddTask: (
    name: string,
    statusId: string,
    groupId: string,
    parentId?: string,
    priorityId?: string,
  ) => Promise<void>;
  onStatusesUpdated?: (statuses: Status[]) => void;
  onPrioritiesUpdated?: (priorities: Priority[]) => void;
  onDeleteTask?: (taskId: string) => Promise<void>;
  onOpenComments?: (task: Task) => void;
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
  onPrioritiesUpdated,
  onDeleteTask,
  onOpenComments,
}: KanbanViewProps) {
  const [groupBy, setGroupBy] = useState<"status" | "priority">(() => {
    try {
      const saved = localStorage.getItem(`kanban-group-by-${boardId}`);
      return (saved as "status" | "priority") || "status";
    } catch {
      return "status";
    }
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  );

  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<"card" | "column" | null>(null);
  const [boardNode, setBoardNode] = useState<HTMLDivElement | null>(null);

  // Track optimistic status changes: taskId -> newStatusId
  const [optimisticStatusChanges, setOptimisticStatusChanges] = useState<
    Record<string, string>
  >({});

  // Local reordering: statusId -> taskId[]
  const [taskOrders, setTaskOrders] = useState<Record<string, string[]>>({});

  const [showAddColumn, setShowAddColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");
  const [newColumnColor, setNewColumnColor] = useState("#16a249"); // first color
  const [isCreatingColumn, setIsCreatingColumn] = useState(false);
  const [createColorPickerOpen, setCreateColorPickerOpen] = useState(false);

  // Column ordering for both modes
  const [orderedStatusIds, setOrderedStatusIds] = useState<string[]>(() => {
    try {
      if (!boardId) return statuses.map((s) => String(s.id));
      const raw = localStorage.getItem(`kanban-column-order-${boardId}`);
      if (raw) {
        const savedOrder = JSON.parse(raw) as string[];
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

  const [orderedPriorityIds, setOrderedPriorityIds] = useState<string[]>(() => {
    try {
      if (!boardId) return priorities.map((p) => String(p.id));
      const raw = localStorage.getItem(`kanban-priority-order-${boardId}`);
      if (raw) {
        const savedOrder = JSON.parse(raw) as string[];
        const currentIds = new Set(priorities.map((p) => String(p.id)));
        const filtered = savedOrder.filter((id) => currentIds.has(id));
        const missing = priorities
          .map((p) => String(p.id))
          .filter((id) => !new Set(filtered).has(id));
        return [...filtered, ...missing];
      }
    } catch {}
    return priorities.map((p) => String(p.id));
  });

  // Visible items for both modes
  const [visibleStatuses, setVisibleStatuses] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(`kanban-visible-statuses-${boardId}`);
      if (raw && boardId) {
        return new Set(JSON.parse(raw));
      }
    } catch {}
    return new Set(statuses.map((s) => String(s.id)));
  });

  const [visiblePriorities, setVisiblePriorities] = useState<Set<string>>(
    () => {
      try {
        const raw = localStorage.getItem(
          `kanban-visible-priorities-${boardId}`,
        );
        if (raw && boardId) {
          return new Set(JSON.parse(raw));
        }
      } catch {}
      return new Set(priorities.map((p) => String(p.id)));
    },
  );

  // Sync logic for prop changes
  useEffect(() => {
    const newOrder = statuses.map((s) => String(s.id));
    setOrderedStatusIds((prev) =>
      JSON.stringify(newOrder) !== JSON.stringify(prev) ? newOrder : prev,
    );

    // If we have statuses but none are marked as visible yet (initial load), show them all
    setVisibleStatuses((prev) => {
      if (prev.size === 0 && statuses.length > 0) {
        // Check if we already have a saved preference in localStorage
        const saved = localStorage.getItem(
          `kanban-visible-statuses-${boardId}`,
        );
        if (!saved) {
          return new Set(statuses.map((s) => String(s.id)));
        }
      }
      return prev;
    });
  }, [statuses, boardId]);

  useEffect(() => {
    const newOrder = priorities.map((p) => String(p.id));
    setOrderedPriorityIds((prev) =>
      JSON.stringify(newOrder) !== JSON.stringify(prev) ? newOrder : prev,
    );

    // If we have priorities but none are marked as visible yet (initial load), show them all
    setVisiblePriorities((prev) => {
      if (prev.size === 0 && priorities.length > 0) {
        const saved = localStorage.getItem(
          `kanban-visible-priorities-${boardId}`,
        );
        if (!saved) {
          return new Set(priorities.map((p) => String(p.id)));
        }
      }
      return prev;
    });
  }, [priorities, boardId]);

  // Combined Active State
  const activeOrderedIds =
    groupBy === "status" ? orderedStatusIds : orderedPriorityIds;
  const activeVisibleIds =
    groupBy === "status" ? visibleStatuses : visiblePriorities;

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

  const persistVisibleIds = (set: Set<string>) => {
    try {
      if (!boardId) return;
      const key =
        groupBy === "status"
          ? `kanban-visible-statuses-${boardId}`
          : `kanban-visible-priorities-${boardId}`;
      localStorage.setItem(key, JSON.stringify(Array.from(set)));
    } catch {}
  };

  const persistColumnOrder = (order: string[]) => {
    try {
      if (!boardId) return;
      const key =
        groupBy === "status"
          ? `kanban-column-order-${boardId}`
          : `kanban-priority-order-${boardId}`;
      localStorage.setItem(key, JSON.stringify(order));
    } catch {}
  };

  const toggleVisibility = (id: string) => {
    const setter =
      groupBy === "status" ? setVisibleStatuses : setVisiblePriorities;
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      persistVisibleIds(next);
      return next;
    });
  };

  const setAllVisibility = (visible: boolean) => {
    const next = new Set<string>();
    if (visible) {
      const items = groupBy === "status" ? statuses : priorities;
      items.forEach((item) => next.add(String(item.id)));
    }
    const setter =
      groupBy === "status" ? setVisibleStatuses : setVisiblePriorities;
    setter(next);
    persistVisibleIds(next);
  };

  // Optimize data structure for categories
  const categoriesTable = useMemo(() => {
    const items = groupBy === "status" ? statuses : priorities;
    return items.map((item) => ({
      ...item,
      id: String(item.id),
      name: item.name,
      color: item.color_code,
    }));
  }, [groupBy, statuses, priorities]);

  // Organize tasks by the active category (with optimistic updates applied)
  const tasksByCategory = useMemo(() => {
    const organized: Record<string, Task[]> = {};

    // Initialize all categories
    categoriesTable.forEach((cat) => {
      organized[cat.id] = [];
    });

    // Distribute tasks from all groups
    groups.forEach((group) => {
      group.tasks.forEach((task) => {
        // Process main task
        const rawValue =
          groupBy === "status"
            ? String(task.status_id || "")
            : String(task.priority_id || "");

        const effectiveId = optimisticStatusChanges[task.id]
          ? optimisticStatusChanges[task.id]
          : rawValue;

        if (organized[effectiveId]) {
          organized[effectiveId].push(task);
        }

        // Process subtasks
        if (task.subitems && task.subitems.length > 0) {
          task.subitems.forEach((subtask) => {
            const rawSubValue =
              groupBy === "status"
                ? String(subtask.status_id || "")
                : String(subtask.priority_id || "");

            const subtaskEffectiveId = optimisticStatusChanges[subtask.id]
              ? optimisticStatusChanges[subtask.id]
              : rawSubValue;

            if (organized[subtaskEffectiveId]) {
              organized[subtaskEffectiveId].push(subtask);
            }
          });
        }
      });
    });

    // Sort each list based on taskOrders
    Object.keys(organized).forEach((catId) => {
      const order = taskOrders[catId] ?? [];
      if (order.length > 0) {
        const orderMap = new Map(order.map((id, i) => [id, i]));
        organized[catId].sort((a, b) => {
          const indexA = orderMap.get(String(a.id)) ?? Number.MAX_SAFE_INTEGER;
          const indexB = orderMap.get(String(b.id)) ?? Number.MAX_SAFE_INTEGER;
          return indexA - indexB;
        });
      }
    });

    return organized;
  }, [groups, categoriesTable, groupBy, optimisticStatusChanges, taskOrders]);

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

    // Seed task order for the active category if not already present
    if (active.data.current?.type === "card") {
      const catId =
        groupBy === "status"
          ? String(active.data.current.task?.status_id || "")
          : String(active.data.current.task?.priority_id || "");

      if (catId && !taskOrders[catId]) {
        setTaskOrders((prev) => ({
          ...prev,
          [catId]: tasksByCategory[catId]?.map((t) => String(t.id)) || [],
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

    // Find active task's current category
    let activeCatId: string | null = null;
    outerLoop: for (const catId in tasksByCategory) {
      if (tasksByCategory[catId].some((t: Task) => String(t.id) === activeId)) {
        activeCatId = catId;
        break outerLoop;
      }
    }
    if (!activeCatId) return;

    // Find over category ID
    let overCatId: string | null = null;
    const isOverColumn =
      overId.startsWith("status-") || overId.startsWith("column-");

    if (isOverColumn) {
      overCatId = overId.replace("status-", "").replace("column-", "");
    } else {
      outerLoop2: for (const catId in tasksByCategory) {
        if (tasksByCategory[catId].some((t: Task) => String(t.id) === overId)) {
          overCatId = catId;
          break outerLoop2;
        }
      }
    }

    if (!overCatId) return;

    // Handle same-category reordering
    if (activeCatId === overCatId) {
      if (isOverColumn && activeId === overId) {
        return;
      }

      setTaskOrders((prev) => {
        const currentOrder =
          prev[activeCatId!] ||
          tasksByCategory[activeCatId!].map((t: Task) => String(t.id));

        const oldIndex = currentOrder.indexOf(activeId);
        const newIndex = currentOrder.indexOf(overId);

        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
          return {
            ...prev,
            [activeCatId!]: arrayMove(currentOrder, oldIndex, newIndex),
          };
        }

        return prev;
      });
      return;
    }

    // Move to different category optimistically
    setOptimisticStatusChanges((prev) => ({
      ...prev,
      [activeId]: overCatId!,
    }));

    setTaskOrders((prev) => {
      const next = { ...prev };
      const sourceList =
        prev[activeCatId!] ||
        tasksByCategory[activeCatId!]?.map((t: Task) => String(t.id)) ||
        [];
      const destList =
        prev[overCatId!] ||
        tasksByCategory[overCatId!]?.map((t: Task) => String(t.id)) ||
        [];

      const isAlreadyInDest = destList.includes(activeId);

      if (isAlreadyInDest && isOverColumn) {
        return prev;
      }

      next[activeCatId!] = sourceList.filter((id) => id !== activeId);

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

      if (
        JSON.stringify(newDestList) === JSON.stringify(destList) &&
        JSON.stringify(next[activeCatId!]) === JSON.stringify(sourceList)
      ) {
        return prev;
      }

      next[overCatId!] = newDestList;
      return next;
    });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setActiveType(null);

    if (!over) {
      setOptimisticStatusChanges({});
      return;
    }

    // Handle column reordering
    if (active.data.current?.type === "column") {
      if (active.id !== over.id) {
        const oldId = String(active.id).replace("column-", "");
        const newId = String(over.id).replace("column-", "");
        const oldIndex = activeOrderedIds.indexOf(oldId);
        const newIndex = activeOrderedIds.indexOf(newId);

        if (oldIndex !== -1 && newIndex !== -1) {
          const newOrder = arrayMove(activeOrderedIds, oldIndex, newIndex);

          // 1. Update local state
          if (groupBy === "status") {
            setOrderedStatusIds(newOrder);
          } else {
            setOrderedPriorityIds(newOrder);
          }
          persistColumnOrder(newOrder);

          // 2. Notify parent if necessary
          if (groupBy === "status" && onStatusesUpdated) {
            const statusMap = new Map(statuses.map((s) => [String(s.id), s]));
            const updated = newOrder
              .map((id) => statusMap.get(id))
              .filter((s): s is Status => !!s);
            onStatusesUpdated(updated);
          } else if (groupBy === "priority" && onPrioritiesUpdated) {
            const priorityMap = new Map(
              priorities.map((p) => [String(p.id), p]),
            );
            const updated = newOrder
              .map((id) => priorityMap.get(id))
              .filter((p): p is Priority => !!p);
            onPrioritiesUpdated(updated);
          }

          // 3. Trigger API and sync cache
          const orgId = getOrganizationId();
          if (orgId && boardId) {
            const boardIdNum = Number(boardId);
            if (groupBy === "status") {
              const payload = newOrder.map((id, index) => ({
                id: Number(id),
                status_order: index + 1,
              }));

              updateStatusesOrderInCache(boardIdNum, newOrder);

              cmsApi
                .reorderStatuses({
                  organization_id: Number(orgId),
                  board_id: boardIdNum,
                  statuses: payload,
                })
                .catch((e) => console.error("Status reorder fail", e));
            } else {
              const payload = newOrder.map((id, index) => ({
                id: Number(id),
                priority_order: index + 1,
              }));

              updatePrioritiesOrderInCache(boardIdNum, newOrder);

              cmsApi
                .reorderPriorities({
                  organization_id: Number(orgId),
                  board_id: boardIdNum,
                  priorities: payload,
                })
                .catch((e) => console.error("Priority reorder fail", e));
            }
          }
        }
      }
      return;
    }

    // Handle card movement
    const activeId = String(active.id);
    const overId = String(over.id);

    let finalCatId: string | null = null;
    if (overId.startsWith("status-") || overId.startsWith("column-")) {
      finalCatId = overId.replace("status-", "").replace("column-", "");
    } else {
      outerLoop: for (const catId in tasksByCategory) {
        if (tasksByCategory[catId].some((t) => String(t.id) === overId)) {
          finalCatId = catId;
          break outerLoop;
        }
      }
    }

    if (!finalCatId) {
      setOptimisticStatusChanges({});
      return;
    }

    // Intra-column drop
    let finalTaskOrders = { ...taskOrders };
    if (activeId !== overId) {
      let activeCatId: string | null = null;
      outerLoop3: for (const catId in tasksByCategory) {
        if (tasksByCategory[catId].some((t) => String(t.id) === activeId)) {
          activeCatId = catId;
          break outerLoop3;
        }
      }

      const isOverColumn = over.data.current?.type === "column";

      if (activeCatId === finalCatId) {
        const currentOrder =
          finalTaskOrders[activeCatId!] ||
          tasksByCategory[activeCatId!]?.map((t) => String(t.id)) ||
          [];

        const oldIndex = currentOrder.indexOf(activeId);
        if (oldIndex !== -1) {
          const newIndex = isOverColumn
            ? oldIndex
            : currentOrder.indexOf(overId);
          if (newIndex !== -1 && oldIndex !== newIndex) {
            const newOrder = arrayMove(currentOrder, oldIndex, newIndex);
            finalTaskOrders[activeCatId!] = newOrder;
            setTaskOrders(finalTaskOrders);
          }
        }
      }
    }

    persistTaskOrders(finalTaskOrders);

    // API Move
    const originalValue =
      groupBy === "status"
        ? String(active.data.current?.task?.status_id || "")
        : String(active.data.current?.task?.priority_id || "");

    const changed =
      finalCatId !== originalValue &&
      optimisticStatusChanges[activeId] === finalCatId;

    if (changed) {
      try {
        await onTaskMove(activeId, finalCatId, groupBy);
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

  const activeCategory = (() => {
    if (!activeId || activeType !== "column") return null;
    const catId = String(activeId).replace("column-", "");
    return categoriesTable.find((c) => c.id === catId);
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
  const handleAddColumn = async () => {
    if (!newColumnName.trim()) {
      toast.error("Column name is required");
      return;
    }

    const orgId = getOrganizationId();
    if (!orgId || !boardId) {
      toast.error("Missing board or organization");
      return;
    }

    setIsCreatingColumn(true);
    try {
      if (groupBy === "status") {
        const created = await cmsApi.createStatus({
          name: newColumnName.trim(),
          color_code: newColumnColor,
          organization_id: Number(orgId),
          board_id: Number(boardId),
        });

        addStatusToCache(Number(boardId), created);
        const updated = [...statuses, created];
        onStatusesUpdated?.(updated);

        // Ensure new status is visible
        setVisibleStatuses((prev) => {
          const next = new Set(prev);
          next.add(String(created.id));
          persistVisibleIds(next);
          return next;
        });
      } else {
        const created = await cmsApi.createPriority({
          name: newColumnName.trim(),
          color_code: newColumnColor,
          organization_id: Number(orgId),
          board_id: Number(boardId),
        });

        addPriorityToCache(Number(boardId), created);
        const updated = [...priorities, created];
        onPrioritiesUpdated?.(updated);

        // Ensure new priority is visible
        setVisiblePriorities((prev) => {
          const next = new Set(prev);
          next.add(String(created.id));
          persistVisibleIds(next);
          return next;
        });
      }

      setNewColumnName("");
      setShowAddColumn(false);
      toast.success("Column created successfully");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.response?.data?.message || "Failed to create column");
    } finally {
      setIsCreatingColumn(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-background overflow-hidden relative">
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <DndContext
          sensors={sensors}
          collisionDetection={collisionDetectionStrategy}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="px-6 pt-4 flex-shrink-0">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="flex items-center gap-2 px-3 py-2 rounded bg-muted border border-border text-sm">
                      <span className="font-medium">Columns</span>
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-74 p-3 bg-popover border-border z-50"
                    align="start"
                  >
                    <div className="space-y-3 max-h-64 overflow-auto pr-2">
                      {categoriesTable.map((cat) => {
                        const id = cat.id;
                        const visible = activeVisibleIds.has(id);
                        return (
                          <label
                            key={`cat-item-${id}`}
                            className="flex items-center gap-3 p-2 rounded hover:bg-muted cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={visible}
                              onChange={() => toggleVisibility(id)}
                              className="h-4 w-4"
                            />
                            <div className="flex items-center gap-3">
                              <div
                                className="w-6 h-6 rounded-full"
                                style={{ backgroundColor: cat.color }}
                              />
                              <div className="text-sm max-w-[160px] truncate">
                                {cat.name}
                              </div>
                            </div>

                            <div className="ml-auto">
                              <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary">
                                {tasksByCategory[id]?.length || 0}
                              </span>
                            </div>
                          </label>
                        );
                      })}
                    </div>

                    <div className="pt-3 border-t border-border flex items-center justify-between gap-2">
                      <div className="text-sm text-muted-foreground">
                        Select which{" "}
                        {groupBy === "status" ? "statuses" : "priorities"} show
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setAllVisibility(true)}
                          className="text-sm px-2 py-1 rounded bg-background border border-border"
                        >
                          All
                        </button>
                        <button
                          onClick={() => setAllVisibility(false)}
                          className="text-sm px-2 py-1 rounded bg-background border border-border"
                        >
                          None
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

              {/* Group By Selector Popup */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-muted-foreground hover:text-foreground"
                  >
                    <Settings className="h-5 w-5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-48 p-2 bg-popover border-border z-50"
                  align="end"
                >
                  <div className="space-y-1">
                    <div className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 border-b">
                      Group Columns By
                    </div>
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => {
                          setGroupBy("status");
                          if (boardId)
                            localStorage.setItem(
                              `kanban-group-by-${boardId}`,
                              "status",
                            );
                        }}
                        className={`flex items-center justify-between px-3 py-2 text-sm font-medium rounded transition-all ${
                          groupBy === "status"
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                      >
                        Status
                        {groupBy === "status" && (
                          <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setGroupBy("priority");
                          if (boardId)
                            localStorage.setItem(
                              `kanban-group-by-${boardId}`,
                              "priority",
                            );
                        }}
                        className={`flex items-center justify-between px-3 py-2 text-sm font-medium rounded transition-all ${
                          groupBy === "priority"
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                      >
                        Priority
                        {groupBy === "priority" && (
                          <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                        )}
                      </button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div
            ref={setBoardNode}
            className="flex-1 flex gap-4 overflow-x-auto overflow-y-hidden pt-4 px-6 pb-2 min-h-0 items-stretch custom-scrollbar scrollbar-visible scroll-shadows-x"
          >
            <SortableContext
              items={activeOrderedIds.map((id) => `column-${id}`)}
              strategy={horizontalListSortingStrategy}
            >
              {activeOrderedIds
                .filter((id) => activeVisibleIds.has(id))
                .map((catId) => {
                  const category = categoriesTable.find((c) => c.id === catId);
                  if (!category) return null;

                  let isDraggingOver = false;
                  if (activeId && activeType === "card") {
                    if (optimisticStatusChanges[activeId] === catId) {
                      isDraggingOver = true;
                    } else {
                      const activeTaskOriginalVal = String(
                        groups
                          .flatMap((g) => g.tasks)
                          .find((t) => String(t.id) === activeId)?.[
                          groupBy === "status" ? "status_id" : "priority_id"
                        ] || "",
                      );
                      if (
                        !optimisticStatusChanges[activeId] &&
                        activeTaskOriginalVal === catId
                      ) {
                        isDraggingOver = true;
                      }
                    }
                  }

                  return (
                    <KanbanColumn
                      key={catId}
                      category={category as any}
                      tasks={tasksByCategory[catId] || []}
                      onTaskClick={onTaskClick}
                      onAddTask={(name, groupId, parentId) =>
                        onAddTask(
                          name,
                          groupBy === "status"
                            ? catId
                            : statuses[0]?.id
                              ? String(statuses[0].id)
                              : "",
                          groupId,
                          parentId,
                          groupBy === "priority" ? catId : undefined,
                        )
                      }
                      groups={groups}
                      groupMap={groupMap}
                      members={members}
                      visibleCardFields={visibleCardFields}
                      statusMap={statusMap}
                      priorityMap={priorityMap}
                      isDraggingOver={isDraggingOver}
                      onStatusesUpdated={onStatusesUpdated}
                      onPrioritiesUpdated={onPrioritiesUpdated}
                      boardId={boardId}
                      statuses={statuses}
                      priorities={priorities}
                      groupBy={groupBy}
                      onDeleteTask={onDeleteTask}
                      onOpenComments={onOpenComments}
                    />
                  );
                })}
            </SortableContext>

            <div className="shrink-0 w-80 pt-1 pb-4 flex flex-col justify-start">
              {!showAddColumn ? (
                <Button
                  variant="ghost"
                  className="w-full justify-start text-muted-foreground bg-muted/50 hover:bg-muted"
                  onClick={() => setShowAddColumn(true)}
                >
                  <Plus className="w-4 h-4 mr-2" /> Add Column
                </Button>
              ) : (
                <div className="p-3 border border-border rounded bg-card flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      Add {groupBy === "status" ? "Status" : "Priority"}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAddColumn(false)}
                      className="h-6 w-6 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      autoFocus
                      placeholder="Column name"
                      value={newColumnName}
                      onChange={(e) => setNewColumnName(e.target.value)}
                      className="h-8"
                    />
                    <ColorPickerPopover
                      color={newColumnColor}
                      onColorChange={setNewColumnColor}
                      isOpen={createColorPickerOpen}
                      onOpenChange={setCreateColorPickerOpen}
                      size="w-8 h-8"
                    />
                  </div>
                  <Button
                    size="sm"
                    onClick={handleAddColumn}
                    disabled={isCreatingColumn}
                  >
                    Create
                  </Button>
                </div>
              )}
            </div>
          </div>

          <TeamsBoardNavigator
            containerNode={boardNode}
            columnsCount={
              activeOrderedIds.filter((id) => activeVisibleIds.has(id)).length
            }
          />

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
            ) : activeCategory ? (
              <KanbanColumn
                category={activeCategory as any}
                tasks={tasksByCategory[activeCategory.id] || []}
                onTaskClick={onTaskClick}
                onAddTask={async () => {}}
                groups={groups}
                groupMap={groupMap}
                members={members}
                visibleCardFields={visibleCardFields}
                statusMap={statusMap}
                priorityMap={priorityMap}
                onStatusesUpdated={onStatusesUpdated}
                onPrioritiesUpdated={onPrioritiesUpdated}
                boardId={boardId}
                priorities={priorities}
                groupBy={groupBy}
                onDeleteTask={onDeleteTask}
                onOpenComments={onOpenComments}
                isOverlay
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}
