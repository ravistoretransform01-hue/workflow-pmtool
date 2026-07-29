import {
  ChevronDown,
  ChevronRight,
  MessageCircle,
  MessageCirclePlus,
  Pencil,
} from "lucide-react";
import type { Status, Priority } from "@/features/cms/types/types";
import { Input } from "@/shared/ui/input";
import { TagsColumnCell } from "@/features/workload/components/TagsColumnCell";
import { TimerCell } from "@/features/workload/components/TimerCell";
import { ProgressBarCell } from "@/features/workload/components/ProgressBarCell";
import StatusPopoverCell from "@/features/workload/components/StatusPopoverCell";
import { PriorityPopoverCell } from "@/features/workload/components/PriorityPopoverCell";
import {
  PersonPopover,
  RatingStars,
  EstimatedDatePicker,
  EstimatedTimePicker,
} from "@/features/workload/components/cells";
import { TruncatedTaskName } from "@/features/workload/components/TruncatedTaskName";
import type { Column, Task } from "@/features/workload/utils";

interface ColumnDefinitionProps {
  expandedTasks: Record<string, boolean>;
  toggleTask: (taskId: string) => void;
  onOpenComments?: (task: any) => void;
  onOpenTaskCard?: (task: any, initialEditDescription?: boolean) => void;
  statuses?: Status[];
  priorities?: Priority[];
  members?: any[];
  tags?: any[];
  onStatusChange?: (taskId: string, statusId: string) => Promise<void>;
  onPriorityChange?: (taskId: string, priorityId: string) => void;
  onPersonChange?: (taskId: string, memberIds: string[]) => void;
  onRatingChange?: (taskId: string, rating: number) => void;
  onEstimatedDateChange?: (
    taskId: string,
    fromDate: string | null,
    toDate?: string | null,
  ) => void;
  onEstimatedTimeChange?: (
    taskId: string,
    hours: string | number | null,
  ) => void;
  onTagChange?: (taskId: string, tags: any[]) => void;
  onTagToggle?: (
    taskId: string,
    cmsTag: any,
    isCurrentlySelected: boolean,
  ) => Promise<void>;
  checkedTasks?: Record<string, boolean>;
  openPopoverId?: string | null;
  setOpenPopoverId?: (id: string | null) => void;
  boardId?: string | number;
  onTagCreated?: (newTag: any) => void;
  onStatusCreated?: (newStatus: Status) => void;
  onStatusesUpdated?: (statuses: Status[]) => void;
  onPriorityCreated?: (newPriority: Priority) => void;
  onPrioritiesUpdated?: (priorities: Priority[]) => void;
  inlineEditingTaskId?: string | null;
  setInlineEditingTaskId?: (id: string | null) => void;
  inlineEditingTaskName?: string;
  setInlineEditingTaskName?: (name: string) => void;
  onInlineEditTaskName?: (taskId: string, newName: string) => void;
  activeTimerId?: string | null;
  timerStartTime?: number | null;
  onTimerStart?: (
    taskId: string | null,
    taskName?: string,
    trackedTimeSeconds?: number,
  ) => void;
  onTimerConflict?: (taskId: string) => void;
  onTimeUpdate?: (taskId: string, seconds: number) => void;
}

// Local component removed, using shared TruncatedTaskName from ./TruncatedTaskName

export const getWorkloadColumns = ({
  expandedTasks,
  toggleTask,
  onOpenComments,
  onOpenTaskCard,
  statuses = [],
  priorities = [],
  members = [],
  tags = [],
  onStatusChange,
  onPriorityChange,
  onPersonChange,
  onRatingChange,
  onEstimatedDateChange,
  onEstimatedTimeChange,
  onTagChange,
  openPopoverId,
  setOpenPopoverId,
  boardId,
  onTagCreated,
  onStatusCreated,
  onStatusesUpdated,
  onPriorityCreated,
  onPrioritiesUpdated,
  inlineEditingTaskId,
  setInlineEditingTaskId,
  inlineEditingTaskName,
  setInlineEditingTaskName,
  onInlineEditTaskName,
  activeTimerId,
  timerStartTime,
  onTimerStart,
  onTimerConflict,
  onTimeUpdate,
  onTagToggle,
  checkedTasks,
}: ColumnDefinitionProps): Column[] => {
  // Create lookup maps for statuses and priorities
  // Ensure keys are strings to match task.status_id (which is stored as string)
  const statusMap = new Map(statuses.map((s) => [String(s.id), s]));
  const priorityMap = new Map(priorities.map((p) => [String(p.id), p]));

  return [
    {
      id: "item",
      label: "Item",
      width: "300px",
      minWidth: "300px",
      maxWidth: "800px",
      align: "left",
      fixed: true,
      render: (task: Task, isSubitem?: boolean) => {
        if (isSubitem) {
          return (
            <div
              onClick={() => onOpenComments?.(task)}
              className="flex items-center gap-2 pl-8 justify-between group cursor-pointer w-full h-full min-h-[36px]"
            >
              <div className="flex-1 flex items-center gap-2 min-w-0">
                <span className="text-muted-foreground shrink-0"> {"├"}</span>
                {inlineEditingTaskId === task.id ? (
                  <Input
                    className="h-6 text-sm border-0 focus:ring-0 focus:border-0"
                    autoFocus
                    value={inlineEditingTaskName}
                    onChange={(e) => setInlineEditingTaskName?.(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => {
                      const isSubmitKey = e.key === "Enter" || e.key === "Tab";

                      if (isSubmitKey && inlineEditingTaskName?.trim()) {
                        e.preventDefault(); // prevent losing value before save
                        onInlineEditTaskName?.(task.id, inlineEditingTaskName);
                        setInlineEditingTaskId?.(null);
                        setInlineEditingTaskName?.("");
                      }
                      if (e.key === "Escape") {
                        setInlineEditingTaskId?.(null);
                        setInlineEditingTaskName?.("");
                      }
                    }}
                    onBlur={() => {
                      setInlineEditingTaskId?.(null);
                      setInlineEditingTaskName?.("");
                    }}
                  />
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setInlineEditingTaskId?.(task.id);
                      setInlineEditingTaskName?.(task.name);
                    }}
                    className="font-medium text-foreground cursor-pointer truncate flex-1 text-left min-w-0 group/subtask"
                  >
                    <TruncatedTaskName name={task.name} />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenTaskCard?.(task, true);
                  }}
                  className="p-1 rounded"
                >
                  <Pencil className="h-4 w-4 text-muted-foreground" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenComments?.(task);
                  }}
                  className="p-1 rounded group/commentbtn"
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
              </div>
            </div>
          );
        }
        return (
          <div
            onClick={() => onOpenComments?.(task)}
            className="flex items-center gap-2 justify-between group cursor-pointer w-full h-full min-h-[36px]"
          >
            <div className="flex-1 flex items-center gap-2 min-w-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleTask(task.id);
                }}
                className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
              >
                {expandedTasks[task.id] ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
              {inlineEditingTaskId === task.id ? (
                <Input
                  className="h-6 text-sm border-0 focus:ring-0 focus:border-0"
                  autoFocus
                  value={inlineEditingTaskName}
                  onChange={(e) => setInlineEditingTaskName?.(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    const isSubmitKey = e.key === "Enter" || e.key === "Tab";

                    if (isSubmitKey && inlineEditingTaskName?.trim()) {
                      e.preventDefault(); // prevent losing value before save
                      onInlineEditTaskName?.(task.id, inlineEditingTaskName);
                      setInlineEditingTaskId?.(null);
                      setInlineEditingTaskName?.("");
                    }
                    if (e.key === "Escape") {
                      setInlineEditingTaskId?.(null);
                      setInlineEditingTaskName?.("");
                    }
                  }}
                  onBlur={() => {
                    setInlineEditingTaskId?.(null);
                    setInlineEditingTaskName?.("");
                  }}
                />
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setInlineEditingTaskId?.(task.id);
                    setInlineEditingTaskName?.(task.name);
                  }}
                  className="font-medium text-foreground cursor-pointer flex items-center gap-1.5 group/taskname min-w-0 overflow-hidden text-left"
                >
                  <TruncatedTaskName
                    name={task.name}
                    subitemsCount={task.subitems?.length}
                  />
                </button>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenTaskCard?.(task, true);
                }}
                className="p-1 rounded"
              >
                <Pencil className="h-5 w-5 text-muted-foreground" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenComments?.(task);
                }}
                className="p-1 rounded group/commentbtn"
              >
                {task.comment_count ? (
                  <div className="relative">
                    <MessageCircle className="h-5 w-5 text-muted-foreground group-hover/commentbtn:text-foreground transition-colors" />
                    <span className="absolute -bottom-1 -right-1 bg-muted-foreground text-background text-[9px] font-bold h-3.5 min-w-[14px] px-[2px] flex items-center justify-center rounded-full border border-background">
                      {task.comment_count}
                    </span>
                  </div>
                ) : (
                  <MessageCirclePlus className="h-5 w-5 text-muted-foreground group-hover/commentbtn:text-foreground transition-colors" />
                )}
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
      render: (task: Task) => {
        const statusObj = statusMap.get(task.status_id || "");
        const popoverId = `status-${task.id}`;
        return (
          <StatusPopoverCell
            task={task}
            statuses={statuses}
            statusObj={statusObj}
            popoverId={popoverId}
            openPopoverId={openPopoverId}
            setOpenPopoverId={setOpenPopoverId}
            onStatusChange={onStatusChange}
            onStatusCreated={onStatusCreated}
            onStatusesUpdated={onStatusesUpdated}
            boardId={boardId}
          />
        );
      },
    },
    {
      id: "priority",
      label: "Priority",
      width: "160px",
      align: "center",
      render: (task: Task) => {
        const priorityObj = priorityMap.get(task.priority_id || "");
        const popoverId = `priority-${task.id}`;
        return (
          <PriorityPopoverCell
            task={task}
            priorities={priorities}
            priorityObj={priorityObj}
            popoverId={popoverId}
            openPopoverId={openPopoverId}
            setOpenPopoverId={setOpenPopoverId}
            onPriorityChange={onPriorityChange}
            onPriorityCreated={onPriorityCreated}
            onPrioritiesUpdated={onPrioritiesUpdated}
            boardId={boardId}
          />
        );
      },
    },
    {
      id: "description",
      label: "Description",
      width: "250px",
      align: "left",
      render: (task: Task) => {
        const hasDescription =
          task.description &&
          (task.description.replace(/<[^>]*>/g, "").trim().length > 0 ||
            task.description.includes("<img") ||
            task.description.includes("<iframe"));

        return (
          <div
            onClick={(e) => {
              e.stopPropagation();
              onOpenTaskCard?.(task, true);
            }}
            className="cursor-pointer min-h-[40px] flex items-center w-full max-w-[230px] hover:bg-muted/30 rounded px-2 transition-colors group relative overflow-hidden"
            title="Click to view/edit description"
          >
            {hasDescription ? (
              <span className="text-sm text-primary font-medium hover:underline truncate w-full block text-left">
                Show description
              </span>
            ) : (
              <span className="text-sm text-muted-foreground italic truncate w-full block text-left">
                Add description
              </span>
            )}
          </div>
        );
      },
    },
    {
      id: "rating",
      label: "Rating",
      width: "140px",
      align: "center",
      render: (task: Task) => {
        const rating = Number(task.rating) || 0;
        const ratingCount = task.ratingCount || 0;
        const popoverId = `rating-${task.id}`;
        const hasAssignee =
          task.assigned_to_ids && task.assigned_to_ids.length > 0;

        const statusObj = statusMap.get(task.status_id || "");
        const isDone = statusObj?.name === "Done";

        return (
          <RatingStars
            task={task}
            rating={rating}
            ratingCount={ratingCount}
            popoverId={popoverId}
            openPopoverId={openPopoverId}
            setOpenPopoverId={setOpenPopoverId}
            onRatingChange={onRatingChange}
            hasAssignee={hasAssignee}
            isDone={isDone}
          />
        );
      },
    },
    {
      id: "estimatedDate",
      label: "Estimated Date",
      width: "180px",
      align: "center",
      render: (task: Task) => {
        const estimatedDate = task.estimatedDate ?? "-";
        const popoverId = `estimatedDate-${task.id}`;

        return (
          <EstimatedDatePicker
            task={task}
            estimatedDate={estimatedDate}
            estimatedDateEnd={null}
            popoverId={popoverId}
            openPopoverId={openPopoverId}
            setOpenPopoverId={setOpenPopoverId}
            onEstimatedDateChange={onEstimatedDateChange}
          />
        );
      },
    },
    {
      id: "estimatedTime",
      label: "Estimated Time",
      width: "140px",
      align: "center",
      render: (task: Task) => {
        const estimatedHours = task.estimatedHours ?? "-";
        const hasEstimatedDate = !!(
          task.estimatedDate && task.estimatedDate !== "-"
        );
        const popoverId = `estimatedTime-${task.id}`;

        return (
          <EstimatedTimePicker
            task={task}
            estimatedHours={estimatedHours}
            hasEstimatedDate={hasEstimatedDate}
            popoverId={popoverId}
            openPopoverId={openPopoverId}
            setOpenPopoverId={setOpenPopoverId}
            onEstimatedTimeChange={onEstimatedTimeChange}
          />
        );
      },
    },
    {
      id: "progress",
      label: "Progress",
      width: "180px",
      align: "center",
      render: (task: Task) => {
        const estimatedHours = task.estimatedHours ?? "-";
        const estimatedDate = task.estimatedDate ?? "-";
        return (
          <ProgressBarCell
            taskId={task.id}
            trackedTimeSeconds={task.tracked_time_seconds || 0}
            activeTimerId={activeTimerId || null}
            timerStartTime={timerStartTime}
            estimatedHours={estimatedHours}
            estimatedDate={estimatedDate}
          />
        );
      },
    },
    {
      id: "person",
      label: "Person",
      width: "128px",
      align: "center",
      render: (task: Task) => {
        const selectedMemberIds = (task.assigned_to_ids ||
          (task.assigned_to_id
            ? [String(task.assigned_to_id)]
            : [])) as string[];
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
      id: "tags",
      label: "Tags",
      width: "180px",
      align: "center",
      render: (task: Task) => (
        <TagsColumnCell
          task={task}
          tags={tags}
          openPopoverId={openPopoverId}
          setOpenPopoverId={setOpenPopoverId}
          onTagChange={onTagChange}
          onTagCreated={onTagCreated}
          boardId={boardId}
          onTagToggle={onTagToggle}
          checkedTasks={checkedTasks}
        />
      ),
    },
    {
      id: "timer",
      label: "Timer",
      width: "180px",
      align: "center",
      render: (task: Task) => {
        const hasAssignee =
          task.assigned_to_ids && task.assigned_to_ids.length > 0;
        const estimatedHours = task.estimatedHours ?? "-";
        const estimatedDate = task.estimatedDate ?? "-";
        return (
          <TimerCell
            taskId={task.id}
            trackedTimeSeconds={task.tracked_time_seconds || 0}
            activeTimerId={activeTimerId || null}
            timerStartTime={timerStartTime}
            onTimerStart={onTimerStart || (() => {})}
            onTimerConflict={onTimerConflict || (() => {})}
            onTimeUpdate={onTimeUpdate}
            hasAssignee={hasAssignee}
            estimatedHours={estimatedHours}
            taskName={task.name}
            assignedToIds={task.assigned_to_ids || []}
            estimatedDate={estimatedDate}
          />
        );
      },
    },
  ];
};
