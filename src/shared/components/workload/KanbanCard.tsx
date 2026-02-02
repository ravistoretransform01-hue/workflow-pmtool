import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import type { Task } from "./WorkloadBoard";

interface KanbanCardProps {
  task: Task;
  onClick?: () => void;
  // When rendered in a DragOverlay we don't want to apply transforms from sortable hook
  overlay?: boolean;
}

export function KanbanCard({ task, onClick, overlay = false }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = overlay
    ? { opacity: 0.95 }
    : {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={"bg-card border border-border rounded-lg p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow group" + (overlay ? " shadow-2xl" : "")}
      onClick={onClick}
      {...(!overlay ? { ...attributes, ...listeners } : {})}
    >
      <div className="flex items-start gap-2">
        <div
          className="mt-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
          {...(!overlay ? { ...attributes } : {})}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground line-clamp-2">
            {task.name}
          </p>
          {task.description && (
            <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
              {task.description}
            </p>
          )}
          {task.assigned_to_ids && task.assigned_to_ids.length > 0 && (
            <div className="mt-2 flex items-center gap-1">
              <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary">
                {task.assigned_to_ids.length}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
