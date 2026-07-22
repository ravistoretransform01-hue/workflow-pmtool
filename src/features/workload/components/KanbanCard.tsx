import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, MoreVertical, Trash2, MessageCircle, MessageCirclePlus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import type { Task } from "@/features/workload/components/WorkloadBoard";
import { Avatar, AvatarFallback } from "@/shared/ui/avatar";
import { stringToHslColor } from "@/features/workload/utils";

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
  onDeleteTask?: (taskId: string) => Promise<void>;
  onOpenComments?: (task: Task) => void;
  disableDrag?: boolean;
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
  onDeleteTask,
  onOpenComments,
  disableDrag = false,
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
    disabled: disableDrag,
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
        "bg-card border border-border rounded-lg p-3 transition-shadow group relative" +
        (!disableDrag ? " cursor-grab active:cursor-grabbing hover:shadow-md" : " hover:shadow-md") +
        (overlay ? " shadow-2xl ring-2 ring-primary/20" : "")
      }
      onClick={onClick}
      {...(!overlay && !disableDrag ? { ...attributes, ...listeners } : {})}
    >
      <div className="flex items-start gap-2">
        {!disableDrag && (
          <div
            className="mt-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
            {...(!overlay ? { ...attributes } : {})}
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
        <div className="flex-1 min-w-0 pr-5">
          {showGroup && groupName && (
            <div className="flex items-center gap-1.5 mb-1.5 mt-0.5">
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
            {!overlay && (
              <div onClick={(e) => e.stopPropagation()} className="absolute top-2.5 right-2 flex items-center">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenComments?.(task);
                  }}
                  className="h-6 w-6 flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground transition-all shrink-0 opacity-0 group-hover:opacity-100 group/commentbtn"
                >
                  {task.comment_count ? (
                    <div className="relative">
                      <MessageCircle className="h-4 w-4 text-muted-foreground group-hover/commentbtn:text-foreground transition-colors" />
                      <span className="absolute -bottom-1 -right-1 bg-muted-foreground text-background text-[9px] font-bold h-3.5 min-w-[14px] px-[2px] flex items-center justify-center rounded-full border border-background">
                        {task.comment_count}
                      </span>
                    </div>
                  ) : (
                    <MessageCirclePlus className="h-4 w-4 text-muted-foreground group-hover/commentbtn:text-foreground transition-colors" />
                  )}
                </button>
                {onDeleteTask && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="h-6 w-6 flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground transition-all shrink-0 opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100">
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-36">
                      <DropdownMenuItem
                        className="text-red-600 focus:text-red-600 cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteTask(task.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            )}

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
