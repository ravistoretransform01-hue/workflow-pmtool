import { useState, useRef, useEffect } from "react";
import {
  ChevronDown,
  ChevronRight,
  MessageCirclePlus,
  Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Status, Priority } from "@/features/cms/types";
import { Input } from "@/shared/components/ui/input";
import { TagsColumnCell } from "./TagsColumnCell";
import { TimerCell } from "./TimerCell";
import { ProgressBarCell } from "./ProgressBarCell";
import StatusPopoverCell from "./StatusPopoverCell";
import { PriorityPopoverCell } from "./PriorityPopoverCell";
import {
  PersonPopover,
  RatingStars,
  EstimatedDatePicker,
  EstimatedTimePicker,
} from "./cells";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  TooltipPortal,
} from "@/shared/components/ui/tooltip";
import type { Column, Task } from "./utils";

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

const TruncatedTaskName = ({
  task,
  isSubitem,
}: {
  task: Task;
  isSubitem?: boolean;
}) => {
  const [isTruncated, setIsTruncated] = useState(false);
  const textRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const checkTruncation = () => {
      if (textRef.current) {
        setIsTruncated(
          textRef.current.scrollWidth > textRef.current.clientWidth,
        );
      }
    };

    // Need a small timeout to ensure layout is settled
    const timeoutId = setTimeout(checkTruncation, 50);
    window.addEventListener("resize", checkTruncation);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("resize", checkTruncation);
    };
  }, [task.name]);

  const nameContent = (
    <span
      ref={textRef}
      className={cn(
        "truncate flex-1 text-left",
        isSubitem
          ? "group-hover/subtask:underline"
          : "group-hover/taskname:underline",
      )}
    >
      {task.name}
    </span>
  );

  const counterContent =
    !isSubitem && task.subitems && task.subitems.length > 0 ? (
      <span className="shrink-0 inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-200 rounded dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800 transition-colors group-hover/taskname:no-underline dark:group-hover/taskname:bg-blue-800/50 text-center">
        {task.subitems.length}
      </span>
    ) : null;

  if (!isTruncated) {
    return (
      <>
        {nameContent}
        {counterContent}
      </>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5 min-w-0 overflow-hidden flex-1">
            {nameContent}
            {counterContent}
          </div>
        </TooltipTrigger>
        <TooltipPortal>
          <TooltipContent
            side="top"
            className="max-w-[400px] break-words bg-slate-900 text-slate-50 border-slate-800 shadow-xl dark:bg-slate-50 dark:text-slate-900 dark:border-slate-200"
          >
            {task.name}
          </TooltipContent>
        </TooltipPortal>
      </Tooltip>
    </TooltipProvider>
  );
};

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
      maxWidth: "300px",
      align: "left",
      fixed: true,
      render: (task: Task, isSubitem?: boolean) => {
        if (isSubitem) {
          return (
            <div className="flex items-center gap-2 pl-8 justify-between group">
              <div className="flex-1 flex items-center gap-2 min-w-0">
                <span className="text-muted-foreground shrink-0"> {"├"}</span>
                {inlineEditingTaskId === task.id ? (
                  <Input
                    className="h-6 text-sm border-0 focus:ring-0 focus:border-0"
                    autoFocus
                    value={inlineEditingTaskName}
                    onChange={(e) => setInlineEditingTaskName?.(e.target.value)}
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
                    <TruncatedTaskName task={task} isSubitem={true} />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenTaskCard?.(task);
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
                  className="font-medium text-foreground cursor-pointer flex items-center gap-1.5 group/taskname min-w-0 overflow-hidden"
                >
                  <TruncatedTaskName task={task} />
                </button>
              )}
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenTaskCard?.(task);
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
        return (
          <div
            onClick={(e) => {
              e.stopPropagation();
              onOpenTaskCard?.(task, true);
            }}
            className="cursor-pointer min-h-[40px] w-full hover:bg-muted/30 rounded p-1 transition-colors group relative"
            title="Click to view/edit description"
          >
            {task.description ? (
              <div
                className="text-sm text-foreground/80 line-clamp-2 prose prose-sm prose-invert max-w-none [&_p]:m-0"
                dangerouslySetInnerHTML={{ __html: task.description }}
              />
            ) : (
              <span className="text-sm text-muted-foreground italic">
                No description
              </span>
            )}
            <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Pencil className="h-3 w-3 text-muted-foreground" />
            </div>
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
