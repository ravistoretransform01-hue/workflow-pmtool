import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import type { Task } from "./WorkloadBoard";

interface KanbanCardProps {
  task: Task;
  onClick?: () => void;
  // When rendered in a DragOverlay we don't want to apply transforms from sortable hook
  overlay?: boolean;
  groupName?: string;
  groupColor?: string;
  visibleCardFields?: Set<string>;
  statusName?: string;
  statusColor?: string;
  priorityName?: string;
  priorityColor?: string;
}

export function KanbanCard({
  task,
  onClick,
  overlay = false,
  groupName,
  groupColor,
  visibleCardFields,
  statusName,
  statusColor,
  priorityName,
  priorityColor,
}: KanbanCardProps) {
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

  const showGroup = visibleCardFields ? visibleCardFields.has("group") : true;
  const showStatus = visibleCardFields ? visibleCardFields.has("status") : true;
  const showPriority = visibleCardFields
    ? visibleCardFields.has("priority")
    : true;
  const showDescription = visibleCardFields
    ? visibleCardFields.has("description")
    : true;
  const showAssignees = visibleCardFields
    ? visibleCardFields.has("assignees")
    : true;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={
        "bg-card border border-border rounded-lg p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow group relative" +
        (overlay ? " shadow-2xl" : "")
      }
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
          {showGroup && groupName && (
            <div className="flex items-center gap-1.5 mb-1.5">
              {groupColor && (
                <div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: groupColor }}
                />
              )}
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold truncate max-w-[150px]">
                {groupName}
              </span>
            </div>
          )}

          <p className="text-sm font-medium text-foreground line-clamp-2">
            {task.name}
          </p>

          {(showStatus || showPriority) && (
            <div className="mt-1.5 flex flex-col gap-0.5">
              {showStatus && statusName && (
                <p className="text-sm text-muted-foreground leading-tight">
                  <span className="font-medium">Status:</span>{" "}
                  <span className="font-medium">{statusName}</span>
                </p>
              )}
              {showPriority && priorityName && (
                <p className="text-sm text-muted-foreground leading-tight">
                  <span className="font-medium">Priority:</span>{" "}
                  <span className="font-medium">{priorityName}</span>
                </p>
              )}
            </div>
          )}

          {showDescription && task.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
              {task.description}
            </p>
          )}

          {showAssignees &&
            (task.assigned_to_ids && task.assigned_to_ids.length > 0 ? (
              <div className="mt-2 flex items-center gap-1">
                <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary">
                  {task.assigned_to_ids.length}
                </div>
              </div>
            ) : (
              <div className="mt-2 flex items-center gap-1">
                <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary">
                  0
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
