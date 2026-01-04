import {
  ChevronDown,
  ChevronRight,
  MessageCirclePlus,
  Pencil,
  User,
} from "lucide-react";
import type { Status, Priority } from "@/features/cms/types";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover";
import { Button } from "@/shared/components/ui/button";
import { Avatar, AvatarFallback } from "../ui/avatar";

function stringToHslColor(str: string, s = 70, l = 55): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return `hsl(${h} ${s}% ${l}%)`;
}

interface Column {
  id: string;
  label: string;
  width: string;
  align: "left" | "center";
  fixed?: boolean;
  render: (task: any, isSubitem?: boolean) => React.ReactNode;
}

export const getWorkloadColumns = ({
  expandedTasks,
  toggleTask,
  onOpenComments,
  onEditTask,
  statuses = [],
  priorities = [],
  members = [],
  onStatusChange,
  onPriorityChange,
  onPersonChange,
  openPopoverId,
  setOpenPopoverId,
}: {
  expandedTasks: Record<string, boolean>;
  toggleTask: (taskId: string) => void;
  onOpenComments?: (task: any) => void;
  onEditTask?: (task: any, focus?: "name" | "description") => void;
  statuses?: Status[];
  priorities?: Priority[];
  members?: any[];
  onStatusChange?: (taskId: string, statusId: string) => void;
  onPriorityChange?: (taskId: string, priorityId: string) => void;
  onPersonChange?: (taskId: string, memberId: string) => void;
  openPopoverId?: string | null;
  setOpenPopoverId?: (id: string | null) => void;
}): Column[] => {
  // Create lookup maps for statuses and priorities
  const statusMap = new Map(statuses.map((s) => [s.id, s]));
  const priorityMap = new Map(priorities.map((p) => [p.id, p]));

  return [
    {
      id: "item",
      label: "Item",
      width: "300px",
      align: "left",
      fixed: true,
      render: (task: any, isSubitem?: boolean) => {
        if (isSubitem) {
          return (
            <div className="flex items-center gap-2 pl-8 justify-between group">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground"> {"├"}</span>
                <span className="font-medium text-foreground">{task.name}</span>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => onEditTask?.(task, "name")}
                  className="p-1 hover:bg-muted rounded"
                >
                  <Pencil className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                </button>
                <button
                  onClick={() => onOpenComments?.(task)}
                  className="p-1 hover:bg-muted rounded"
                >
                  <MessageCirclePlus className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                </button>
              </div>
            </div>
          );
        }
        return (
          <div className="flex items-center gap-2 justify-between group">
            <button
              onClick={() => toggleTask(task.id)}
              className="flex items-center gap-2 font-medium text-foreground hover:underline"
            >
              {
                // task.subitems?.length > 0 &&
                expandedTasks[task.id] ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )
              }
              {task.name}
            </button>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => onEditTask?.(task, "name")}
                className="p-1 hover:bg-muted rounded"
              >
                <Pencil className="h-4 w-4 text-muted-foreground hover:text-foreground" />
              </button>
              <button
                onClick={() => onOpenComments?.(task)}
                className="p-1 hover:bg-muted rounded"
              >
                <MessageCirclePlus className="h-4 w-4 text-muted-foreground hover:text-foreground" />
              </button>
            </div>
          </div>
        );
      },
    },
    {
      id: "status",
      label: "Status",
      width: "160px",
      align: "center",
      render: (task: any) => {
        const statusObj = statusMap.get(task.status_id);
        const popoverId = `status-${task.id}`;
        return (
          <Popover
            open={openPopoverId === popoverId}
            onOpenChange={(open) => setOpenPopoverId?.(open ? popoverId : null)}
          >
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-3 text-xs font-medium"
                style={{
                  backgroundColor: statusObj?.color_code || "#e5e7eb",
                  color: "white",
                  border: "none",
                }}
              >
                {statusObj?.name || "No Status"}
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-56 p-3 bg-card border border-border shadow-lg rounded-lg"
              align="center"
            >
              <div className="space-y-1">
                {statuses.map((status) => (
                  <button
                    key={status.id}
                    onClick={() => onStatusChange?.(task.id, status.id)}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded hover:bg-accent transition-colors text-sm font-medium"
                  >
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: status.color_code }}
                    />
                    <span>{status.name}</span>
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        );
      },
    },
    {
      id: "priority",
      label: "Priority",
      width: "160px",
      align: "center",
      render: (task: any) => {
        const priorityObj = priorityMap.get(task.priority_id);
        const popoverId = `priority-${task.id}`;
        return (
          <Popover
            open={openPopoverId === popoverId}
            onOpenChange={(open) => setOpenPopoverId?.(open ? popoverId : null)}
          >
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-3 text-xs font-medium"
                style={{
                  backgroundColor: priorityObj?.color_code || "#e5e7eb",
                  color: "white",
                  border: "none",
                }}
              >
                {priorityObj?.name || "No Priority"}
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-56 p-3 bg-card border border-border shadow-lg rounded-lg"
              align="center"
            >
              <div className="space-y-1">
                {priorities.map((priority) => (
                  <button
                    key={priority.id}
                    onClick={() => onPriorityChange?.(task.id, priority.id)}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded hover:bg-accent transition-colors text-sm font-medium"
                  >
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: priority.color_code }}
                    />
                    <span>{priority.name}</span>
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        );
      },
    },
    {
      id: "description",
      label: "Description",
      width: "250px",
      align: "left",
      render: (task: any) => {
        const description = task.description ?? "";
        const hasDescription = description.trim().length > 0;

        return (
          <button
            onClick={() => onEditTask?.(task, "description")}
            className="w-full text-left group"
            title={description}
          >
            {hasDescription ? (
              <div className="space-y-1">
                <p className="text-md text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                  {description}
                </p>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground italic group-hover:text-foreground transition-colors">
                No description
              </div>
            )}
          </button>
        );
      },
    },
    {
      id: "date",
      label: "Date",
      width: "160px",
      align: "center",
      render: (task: any) => task.estimatedDate ?? "-",
    },
    {
      id: "person",
      label: "Person",
      width: "128px",
      align: "center",
      render: (task: any) => {
        const memberObj = members.find(
          (m) => String(m.user_id) === String(task.assigned_to_id)
        );
        const popoverId = `person-${task.id}`;
        return (
          <Popover
            open={openPopoverId === popoverId}
            onOpenChange={(open) => setOpenPopoverId?.(open ? popoverId : null)}
          >
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-full px-3 text-xs font-medium flex items-center justify-center gap-2"
                title={memberObj?.name || "Unassigned"}
                aria-label={memberObj?.name ? memberObj.name : "Unassigned"}
              >
                {memberObj?.name ? (
                  <span className="truncate text-center w-full">
                    {memberObj.name}
                  </span>
                ) : (
                  <User className="h-4 w-4 text-foreground" />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-56 p-3 bg-card border border-border shadow-lg rounded-lg"
              align="center"
            >
              <div className="space-y-1">
                {members.map((member) => {
                  const name = (member?.name ?? "").trim();
                  const initials = name
                    .split(/\s+/)
                    .map((n: string) => n[0])
                    .filter(Boolean)
                    .slice(0, 2)
                    .join("")
                    .toUpperCase();

                  const bgColor = stringToHslColor(
                    name || String(member?.user_id || "usesr")
                  );

                  return (
                    <button
                      key={member.user_id}
                      onClick={() => onPersonChange?.(task.id, member.user_id)}
                      className="w-full flex items-center gap-3 px-2 py-2 rounded hover:bg-accent transition-colors text-sm font-medium text-left"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarFallback
                          style={{ background: bgColor, color: "white" }}
                        >
                          {initials || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <span>{member.name}</span>
                    </button>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>
        );
      },
    },
    {
      id: "time",
      label: "Time Spent",
      width: "128px",
      align: "center",
      render: (task: any) => task.timeSpent ?? "-",
    },
  ];
};
