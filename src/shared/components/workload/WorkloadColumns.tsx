import { useState, useEffect } from "react";
import {
  ChevronDown,
  ChevronRight,
  MessageCirclePlus,
  Pencil,
  X,
  Search,
  Play,
  Pause,
} from "lucide-react";
import type { Status, Priority } from "@/features/cms/types";
import { tasksApi } from "@/features/tasks/tasksApi";
import { toast } from "sonner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover";
import { Button } from "@/shared/components/ui/button";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Calendar } from "@/shared/components/ui/calendar";
import { Input } from "@/shared/components/ui/input";
import { format, parseISO, parse } from "date-fns";

function stringToHslColor(str: string, s = 70, l = 55): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return `hsl(${h} ${s}% ${l}%)`;
}

// Component for timer/stopwatch
function Timer({
  taskId,
  boardId,
  activeTimerId,
  onTimerStart,
  onTimerConflict,
}: {
  taskId: string;
  boardId: string;
  activeTimerId: string | null;
  onTimerStart: (taskId: string | null) => void;
  onTimerConflict?: (taskId: string) => void;
}) {
  const [seconds, setSeconds] = useState(0);
  const isRunning = activeTimerId === taskId;

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isRunning) {
      interval = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const handlePlayPause = () => {
    if (isRunning) {
      // Pause
      console.log({
        taskId,
        boardId,
        timestamp: new Date().toISOString(),
        action: "stop",
      });
      onTimerStart(null as any); // Pass null to stop the timer
    } else {
      // Play
      if (activeTimerId && activeTimerId !== taskId) {
        console.log({
          taskId,
          boardId,
          timestamp: new Date().toISOString(),
          action: "conflict",
        });
        onTimerConflict?.(activeTimerId);
        return;
      }
      console.log({
        taskId,
        boardId,
        timestamp: new Date().toISOString(),
        action: "play",
      });
      onTimerStart(taskId);
    }
  };

  // const handleReset = () => {
  //   setSeconds(0);
  //   console.log({
  //     taskId,
  //     boardId,
  //     timestamp: new Date().toISOString(),
  //     action: "reset",
  //   });
  // };

  // Determine background color based on timer state
  let bgColor = "bg-blue-500/50"; // Default: blue
  if (isRunning) {
    bgColor = "bg-green-500/50"; // Running: green
  }
  // TODO: Add red for overtime when estimatedSeconds is available
  // if (isOverTime) {
  //   bgColor = "bg-red-500/50"; // Overtime: red
  // }

  return (
    <div
      className={`flex items-center justify-center gap-2 w-full h-full ${bgColor} rounded`}
    >
      <button
        onClick={handlePlayPause}
        className="p-2 hover:bg-muted rounded transition-colors"
        title={isRunning ? "Pause" : "Start"}
      >
        {isRunning ? (
          <Pause className="h-4 w-4 text-foreground" />
        ) : (
          <Play className="h-4 w-4 text-foreground" />
        )}
      </button>
      <div className="rounded px-3 py-1 min-w-14 text-center">
        <span className="text-sm font-medium">{formatTime(seconds)}</span>
      </div>
      {/* <button
        onClick={handleReset}
        className="p-1 hover:bg-muted rounded transition-colors"
        title="Reset"
      >
        <RotateCcw className="h-4 w-4 text-foreground" />
      </button> */}
    </div>
  );
}

// Component for person selection with search
function PersonPopover({
  task,
  members,
  selectedMemberIds,
  popoverId,
  openPopoverId,
  setOpenPopoverId,
  onPersonChange,
}: {
  task: any;
  members: any[];
  selectedMemberIds?: string[];
  popoverId: string;
  openPopoverId?: string | null;
  setOpenPopoverId?: (id: string | null) => void;
  onPersonChange?: (taskId: string, memberIds: string[]) => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [localSelected, setLocalSelected] = useState<string | null>(
    selectedMemberIds?.[0] || null
  );

  const filteredMembers = members.filter((member) =>
    (member?.name ?? "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleMemberSelect = (memberId: string) => {
    setLocalSelected(memberId);
  };

  const handleUpdateAssignees = () => {
    // Send selected member (or empty array if none selected)
    onPersonChange?.(task.id, localSelected ? [localSelected] : []);
    setOpenPopoverId?.(null);
  };

  return (
    <Popover
      open={openPopoverId === popoverId}
      onOpenChange={(open) => setOpenPopoverId?.(open ? popoverId : null)}
    >
      <PopoverTrigger asChild>
        <button
          className="w-full flex justify-center hover:opacity-80 transition-opacity cursor-pointer"
          onClick={(e) => e.stopPropagation()}
        >
          {!localSelected ? (
            <span className="text-muted-foreground text-xs">+ Add</span>
          ) : (
            <div className="flex justify-center">
              {(() => {
                const member = members.find(
                  (m) => String(m.user_id) === String(localSelected)
                );
                if (!member) return null;
                const name = (member?.name ?? "").trim();
                const initials = name
                  .split(/\s+/)
                  .map((n: string) => n[0])
                  .filter(Boolean)
                  .slice(0, 2)
                  .join("")
                  .toUpperCase();
                const bgColor = stringToHslColor(
                  name || String(member?.user_id || "user")
                );
                return (
                  <Avatar className="h-8 w-8 border-2 border-background">
                    <AvatarFallback
                      style={{ background: bgColor, color: "white" }}
                      className="text-[10px] font-semibold"
                    >
                      {initials || "U"}
                    </AvatarFallback>
                  </Avatar>
                );
              })()}
            </div>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-56 p-3 bg-card border border-border shadow-lg rounded-lg flex flex-col"
        align="center"
      >
        <div className="space-y-2 flex flex-col">
          {/* Search Input */}
          <div className="relative flex-shrink-0">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10 pointer-events-none" />
            <Input
              placeholder="Search members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>

          {/* Members List - Show 2.5 items, rest scrollable */}
          <div
            className="space-y-1 overflow-y-auto"
            style={{
              maxHeight: "calc(4 * 40px)",
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            }}
          >
            {filteredMembers.length === 0 ? (
              <div className="text-center py-4 text-sm text-muted-foreground">
                No members found
              </div>
            ) : (
              filteredMembers.map((member) => {
                const name = (member?.name ?? "").trim();
                const initials = name
                  .split(/\s+/)
                  .map((n: string) => n[0])
                  .filter(Boolean)
                  .slice(0, 2)
                  .join("")
                  .toUpperCase();

                const bgColor = stringToHslColor(
                  name || String(member?.user_id || "user")
                );

                const isSelected = localSelected === String(member.user_id);

                return (
                  <button
                    key={member.user_id}
                    onClick={() => handleMemberSelect(String(member.user_id))}
                    className="w-full flex items-center gap-3 px-2 py-2 rounded transition-colors text-sm font-medium text-left hover:bg-muted"
                  >
                    <input
                      type="radio"
                      checked={isSelected}
                      onChange={() => {}}
                      className="h-4 w-4 accent-primary cursor-pointer"
                    />
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
              })
            )}
          </div>

          {/* Update Button */}
          <div className="flex-shrink-0 pt-2 border-t border-border">
            <Button
              onClick={handleUpdateAssignees}
              className="w-full h-8 text-sm"
              size="sm"
            >
              Update
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
function RatingStars({
  task,
  rating,
  ratingCount,
  popoverId,
  openPopoverId,
  setOpenPopoverId,
  onRatingChange,
}: {
  task: any;
  rating: number;
  ratingCount?: number;
  popoverId: string;
  openPopoverId?: string | null;
  setOpenPopoverId?: (id: string | null) => void;
  onRatingChange?: (taskId: string, rating: number) => void;
}) {
  const [hoveredRating, setHoveredRating] = useState(0);

  return (
    <Popover
      open={openPopoverId === popoverId}
      onOpenChange={(open) => setOpenPopoverId?.(open ? popoverId : null)}
    >
      <PopoverTrigger asChild>
        <button
          className="w-full h-8 flex items-center justify-center gap-1"
          aria-label={`Rating ${rating}${
            ratingCount
              ? ` (${ratingCount} rating${ratingCount !== 1 ? "s" : ""})`
              : ""
          }`}
          onClick={(e) => e.stopPropagation()}
          title={
            ratingCount
              ? `${ratingCount} rating${ratingCount !== 1 ? "s" : ""}`
              : "No ratings"
          }
        >
          {[1, 2, 3, 4, 5].map((i) => (
            <svg
              key={i}
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className={`h-4 w-4 ${
                i <= rating ? "text-yellow-400" : "text-muted-foreground"
              }`}
            >
              <path
                d="M12 .587l3.668 7.431L23.5 9.753l-5.75 5.601L19.334 24 12 20.202 4.666 24l1.584-8.646L.5 9.753l7.832-1.735L12 .587z"
                fill="currentColor"
              />
            </svg>
          ))}
          {/* {ratingCount ? (
            <span className="text-xs text-muted-foreground ml-1">({ratingCount})</span>
          ) : null} */}
        </button>
      </PopoverTrigger>

      <PopoverContent
        className="w-60 p-3 bg-card border border-border shadow-lg rounded-lg"
        align="center"
      >
        <div className="space-y-3">
          <div className="flex gap-2 justify-center">
            {[1, 2, 3, 4, 5].map((i) => (
              <button
                key={i}
                onClick={() => {
                  setOpenPopoverId?.(null);
                  onRatingChange?.(task.id, i);
                }}
                onMouseEnter={() => setHoveredRating(i)}
                onMouseLeave={() => setHoveredRating(0)}
                className="p-1"
                aria-label={`Set rating ${i}`}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className={`h-6 w-6 transition-colors ${
                    i <= (hoveredRating || rating)
                      ? "text-yellow-400"
                      : "text-muted-foreground"
                  }`}
                >
                  <path
                    d="M12 .587l3.668 7.431L23.5 9.753l-5.75 5.601L19.334 24 12 20.202 4.666 24l1.584-8.646L.5 9.753l7.832-1.735L12 .587z"
                    fill="currentColor"
                  />
                </svg>
              </button>
            ))}
          </div>
          {/* {ratingCount ? (
            <div className="text-center text-xs text-muted-foreground">
              {ratingCount} rating{ratingCount !== 1 ? 's' : ''}
            </div>
          ) : null} */}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Component for estimated date picker
function EstimatedDatePicker({
  task,
  estimatedDate,
  estimatedDateEnd,
  popoverId,
  openPopoverId,
  setOpenPopoverId,
  onEstimatedDateChange,
}: {
  task: any;
  estimatedDate: string;
  estimatedDateEnd: string | null;
  popoverId: string;
  openPopoverId?: string | null;
  setOpenPopoverId?: (id: string | null) => void;
  onEstimatedDateChange?: (
    taskId: string,
    fromDate: string | null,
    toDate?: string | null
  ) => void;
}) {
  // Initialize date range from task.estimation object or formatted estimatedDate string
  const getInitialDateRange = (): { from?: Date; to?: Date } | undefined => {
    try {
      // First priority: use task.estimation as the source of truth
      if (task.estimation?.estimated_date_from) {
        const from = parseISO(task.estimation.estimated_date_from);
        const to = task.estimation.estimated_date_to
          ? parseISO(task.estimation.estimated_date_to)
          : from;
        return { from, to };
      }

      // Fallback: parse the formatted estimatedDate string (e.g., "15 Jan, 2026  -  19 Jan, 2026")
      if (estimatedDate && estimatedDate !== "-") {
        const parts = estimatedDate.split("  -  ");
        if (parts.length === 2) {
          // Range format: "15 Jan, 2026  -  19 Jan, 2026"
          try {
            const from = parse(parts[0].trim(), "dd MMM, yyyy", new Date());
            const to = parse(parts[1].trim(), "dd MMM, yyyy", new Date());
            return { from, to };
          } catch {
            return undefined;
          }
        } else if (parts.length === 1) {
          // Single date format
          try {
            const from = parse(parts[0].trim(), "dd MMM, yyyy", new Date());
            return { from, to: from };
          } catch {
            return undefined;
          }
        }
      }

      // No estimation exists yet
      return undefined;
    } catch (error) {
      // If parsing fails, return undefined (user will select dates fresh)
      console.warn("Failed to parse estimated date:", error);
      return undefined;
    }
  };

  const [dateRange, setDateRange] = useState<
    { from?: Date; to?: Date } | undefined
  >(getInitialDateRange());

  // Update dateRange when task.estimation changes (e.g., when popover opens)
  useEffect(() => {
    if (openPopoverId === popoverId) {
      setDateRange(getInitialDateRange());
    }
  }, [openPopoverId, popoverId, task.estimation]);

  const handleDateRangeChange = (
    range: { from?: Date; to?: Date } | undefined
  ) => {
    setDateRange(range);
  };

  const formatDateDisplay = () => {
    console.log(`estimatedDate "${estimatedDate}"`);
    if (estimatedDate === "-") return "-";
    // estimatedDate already contains the full formatted range (e.g., "15 Jan, 2026 - 19 Jan, 2026")
    // so just return it as-is
    return estimatedDate;
  };

  return (
    <Popover
      open={openPopoverId === popoverId}
      onOpenChange={(open) => setOpenPopoverId?.(open ? popoverId : null)}
    >
      <PopoverTrigger asChild>
        <div className="w-full" onClick={(e) => e.stopPropagation()}>
          <button className="w-full bg-muted text-muted-foreground px-3 py-1.5 rounded text-sm hover:bg-accent transition-colors truncate">
            {formatDateDisplay()}
          </button>
        </div>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-4 bg-card border border-border shadow-lg rounded-lg"
        align="center"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-sm">Select Date Range</h3>
            <button
              onClick={() => setOpenPopoverId?.(null)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <Calendar
            mode="range"
            selected={
              dateRange?.from
                ? { from: dateRange.from, to: dateRange.to }
                : undefined
            }
            onSelect={handleDateRangeChange}
            disabled={(date) =>
              date < new Date(new Date().setHours(0, 0, 0, 0))
            }
          />
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setDateRange(undefined);
                onEstimatedDateChange?.(task.id, null);
                setOpenPopoverId?.(null);
              }}
            >
              Clear
            </Button>
            <Button
              size="sm"
              onClick={async () => {
                if (dateRange?.from) {
                  const fromDate = format(dateRange.from, "yyyy-MM-dd");
                  const toDate = dateRange.to
                    ? format(dateRange.to, "yyyy-MM-dd")
                    : fromDate;

                  try {
                    // Check if estimation already exists by checking if estimatedDate is not "-"
                    const hasEstimation = estimatedDate && estimatedDate !== "-";

                    if (hasEstimation) {
                      // Update existing estimation
                      await tasksApi.updateEstimatedDate({
                        task_id: task.id,
                        estimated_date_from: fromDate,
                        estimated_date_to: toDate,
                      });
                    } else {
                      // Create new estimation
                      await tasksApi.createEstimatedDate({
                        task_id: task.id,
                        estimated_date_from: fromDate,
                        estimated_date_to: toDate,
                      });
                    }

                    // Update local state
                    onEstimatedDateChange?.(task.id, fromDate, toDate);
                    setOpenPopoverId?.(null);
                    toast.success("Estimated date updated successfully");
                  } catch (error) {
                    console.error("Failed to update estimated date:", error);
                    toast.error("Failed to update estimated date");
                  }
                }
              }}
            >
              Done
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
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
  onRatingChange,
  onEstimatedDateChange,
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
  onPersonChange?: (taskId: string, memberIds: string[]) => void;
  onRatingChange?: (taskId: string, rating: number) => void;
  onEstimatedDateChange?: (
    taskId: string,
    fromDate: string | null,
    toDate?: string | null
  ) => void;
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
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditTask?.(task, "name");
                  }}
                  className="p-1 hover:bg-muted rounded"
                >
                  <Pencil className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenComments?.(task);
                  }}
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
              onClick={(e) => {
                e.stopPropagation();
                toggleTask(task.id);
              }}
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
                onClick={(e) => {
                  e.stopPropagation();
                  onEditTask?.(task, "name");
                }}
                className="p-1 hover:bg-muted rounded"
              >
                <Pencil className="h-4 w-4 text-muted-foreground hover:text-foreground" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenComments?.(task);
                }}
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
                onClick={(e) => e.stopPropagation()}
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
                onClick={(e) => e.stopPropagation()}
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
            onClick={(e) => {
              e.stopPropagation();
              onEditTask?.(task, "description");
            }}
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
      id: "rating",
      label: "Rating",
      width: "140px",
      align: "center",
      render: (task: any) => {
        const rating = Number(task.rating) || 0;
        const ratingCount = task.ratingCount || 0;
        const popoverId = `rating-${task.id}`;

        return (
          <RatingStars
            task={task}
            rating={rating}
            ratingCount={ratingCount}
            popoverId={popoverId}
            openPopoverId={openPopoverId}
            setOpenPopoverId={setOpenPopoverId}
            onRatingChange={onRatingChange}
          />
        );
      },
    },
    {
      id: "estimatedDate",
      label: "Estimated Date",
      width: "180px",
      align: "center",
      render: (task: any) => {
        const estimatedDate = task.estimatedDate ?? "-";
        const estimatedDateEnd = task.estimatedDateEnd ?? null;
        const popoverId = `estimatedDate-${task.id}`;

        return (
          <EstimatedDatePicker
            task={task}
            estimatedDate={estimatedDate}
            estimatedDateEnd={estimatedDateEnd}
            popoverId={popoverId}
            openPopoverId={openPopoverId}
            setOpenPopoverId={setOpenPopoverId}
            onEstimatedDateChange={onEstimatedDateChange}
          />
        );
      },
    },
    // {
    //   id: "timer",
    //   label: "Timer",
    //   width: "160px",
    //   align: "center",
    //   render: (task: any) => task.estimatedDate ?? "-",
    // },
    {
      id: "date",
      label: "Date",
      width: "160px",
      align: "center",
      render: (task: any) => task.date ?? "-",
    },
    {
      id: "person",
      label: "Person",
      width: "128px",
      align: "center",
      render: (task: any) => {
        const selectedMemberIds =
          task.assigned_to_ids ||
          (task.assigned_to_id ? [task.assigned_to_id] : []);
        const popoverId = `person-${task.id}`;
        return (
          <PersonPopover
            task={task}
            members={members}
            selectedMemberIds={selectedMemberIds}
            popoverId={popoverId}
            openPopoverId={openPopoverId}
            setOpenPopoverId={setOpenPopoverId}
            onPersonChange={onPersonChange}
          />
        );
      },
    },

    {
      id: "timer",
      label: "Timer",
      width: "160px",
      align: "center",
      render: (task: any) => (
        <Timer
          taskId={task.id}
          boardId={task.boardId}
          activeTimerId={task.activeTimerId}
          onTimerStart={task.onTimerStart}
          onTimerConflict={task.onTimerConflict}
        />
      ),
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
