
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { Status } from "@/features/cms/types";
import type { Task } from "./WorkloadBoard";
import { KanbanCard } from "./KanbanCard";
import { useDroppable } from "@dnd-kit/core";

interface KanbanColumnProps {
  status: Status;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

export function KanbanColumn({
  status,
  tasks,
  onTaskClick,
}: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({
    id: `status-${status.id}`,
  });

  return (
    <div
      ref={setNodeRef}
      className="flex-shrink-0 w-80 bg-muted rounded-lg border border-border flex flex-col"
    >
      {/* Column Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2 mb-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: status.color_code }}
          />
          <h3 className="font-semibold text-sm">{status.name}</h3>
          <span className="ml-auto text-xs text-muted-foreground bg-background px-2 py-1 rounded">
            {tasks.length}
          </span>
        </div>
      </div>

      {/* Tasks Container */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-hide">
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task) => (
            <KanbanCard
              key={task.id}
              task={task}
              onClick={() => onTaskClick(task)}
            />
          ))}
        </SortableContext>


      </div>
    </div>
  );
}
