import React from "react";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { Button } from "@/shared/components/ui/button";
import type { TaskGroup } from "../WorkloadBoard";
import { useTaskState, usePopoverState, useTaskTimer, useColumnPersistence, useTaskFilters } from "../hooks";

interface TaskTableProps {
  groups: TaskGroup[];
  expandedGroups: Record<string, boolean>;
  expandedTasks: Record<string, boolean>;
  taskState: ReturnType<typeof useTaskState>;
  popoverState: ReturnType<typeof usePopoverState>;
  timerState: ReturnType<typeof useTaskTimer>;
  columnState: ReturnType<typeof useColumnPersistence>;
  filterState: ReturnType<typeof useTaskFilters>;
  workloadColumns: any[];
  mainTableSearchQuery: string;
  getFilteredGroups: () => TaskGroup[];
  onGroupDragEnd: (event: DragEndEvent) => void;
  onAddNewGroup: () => void;
  groupsContainerRef: React.RefObject<HTMLDivElement>;
  children?: React.ReactNode;
}

export function TaskTable({
  groups,
  expandedGroups,
  expandedTasks,
  taskState,
  popoverState,
  timerState,
  columnState,
  filterState,
  workloadColumns,
  mainTableSearchQuery,
  getFilteredGroups,
  onGroupDragEnd,
  onAddNewGroup,
  groupsContainerRef,
  children,
}: TaskTableProps) {
  const groupSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const filteredGroups = getFilteredGroups();

  return (
    <div
      className="flex-1 overflow-y-auto overflow-x-hidden px-6"
      ref={groupsContainerRef}
    >
      <DndContext
        sensors={groupSensors}
        collisionDetection={closestCenter}
        onDragEnd={onGroupDragEnd}
      >
        <SortableContext
          items={filteredGroups.map((g) => g.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-6 py-4">
            {filteredGroups.length === 0 ? (
              <div className="text-center py-12">
                {mainTableSearchQuery.trim() ? (
                  <>
                    <p className="text-muted-foreground mb-4">
                      No items found matching "{mainTableSearchQuery}"
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-muted-foreground mb-4">
                      No groups yet. Create one to get started.
                    </p>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={onAddNewGroup}
                    >
                      Create First Group
                    </Button>
                  </>
                )}
              </div>
            ) : (
              children
            )}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
