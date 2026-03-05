import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import type { Task } from "./WorkloadBoard";
import { Avatar, AvatarFallback } from "@/shared/components/ui/avatar";
import { stringToHslColor } from "./utils";

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
  members: any[];
}

export function KanbanCard({
  task,
  onClick,
  overlay = false,
  groupName,
  groupColor,
  visibleCardFields,
  statusName,
  priorityName,
  members,
}: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: {
      type: "card",
      task,
    },
  });

  const style = overlay
    ? { opacity: 0.95 }
    : {
        transform: CSS.Translate.toString(transform),
        transition,
      };

  const showGroup = visibleCardFields ? visibleCardFields.has("group") : true;
  const showStatus = visibleCardFields ? visibleCardFields.has("status") : true;
  const showPriority = visibleCardFields
    ? visibleCardFields.has("priority")
    : true;
  const showAssignees = visibleCardFields
    ? visibleCardFields.has("assignees")
    : true;

  if (isDragging && !overlay) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="bg-muted/30 border-2 border-dashed border-primary/20 rounded-lg h-[100px] w-full mb-3"
      />
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={
        "bg-card border border-border rounded-lg p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow group relative" +
        (overlay ? " shadow-2xl ring-2 ring-primary/20" : "")
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

          {showAssignees &&
            task.assigned_to_ids &&
            task.assigned_to_ids.length > 0 && (
              <div className="mt-3 flex items-center -space-x-2">
                {task.assigned_to_ids.slice(0, 3).map((memberId) => {
                  const member = members.find(
                    (m) => String(m.user_id) === String(memberId),
                  );
                  if (!member) return null;
                  const name = (member?.name || "").trim();
                  const initials = name
                    .split(/\s+/)
                    .map((n: string) => n[0])
                    .filter(Boolean)
                    .slice(0, 1)
                    .join("")
                    .toUpperCase();
                  const bgColor = stringToHslColor(
                    name || String(member?.user_id || "user"),
                  );

                  return (
                    <Avatar
                      key={memberId}
                      className="h-6 w-6 border-2 border-card ring-0"
                    >
                      <AvatarFallback
                        style={{ background: bgColor, color: "white" }}
                        className="text-[10px]  "
                      >
                        {initials || "U"}
                      </AvatarFallback>
                    </Avatar>
                  );
                })}
                {task.assigned_to_ids.length > 3 && (
                  <div className="h-6 w-6 rounded-full bg-muted border-2 border-card flex items-center justify-center">
                    <span className="text-[10px]   text-muted-foreground">
                      +{task.assigned_to_ids.length - 3}
                    </span>
                  </div>
                )}
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
