import { useCallback, useMemo, useState, useRef, useEffect } from "react";
import { Gantt, WillowDark, Tooltip } from "@svar-ui/react-gantt";
import "@svar-ui/react-gantt/all.css";
import { format, addDays, parseISO, differenceInCalendarDays, startOfMonth, endOfMonth } from "date-fns";
import type { TaskGroup, Task } from "./utils/workload-types";
import type { Status, Priority } from "@/features/cms/types";
import { cn } from "@/lib/utils";
import { Plus, Loader2, Settings, Check, CalendarDays, ChevronDown, X } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Avatar, AvatarFallback } from "@/shared/components/ui/avatar";
import { stringToHslColor } from "./utils";
import { Calendar } from "@/shared/components/ui/calendar";
import { EstimatedDatePicker } from "./cells";
import { toast } from "sonner";


// Robust helper to parse dates from various formats (Date, timestamp, or ISO string)
const parseDate = (val: any): Date | null => {
  if (!val) return null;
  if (val instanceof Date) return val;
  if (typeof val === "number") return new Date(val);
  if (typeof val === "string") {
    const parsed = parseISO(val);
    return isNaN(parsed.getTime()) ? new Date(val) : parsed;
  }
  return null;
};

// Custom template component for Gantt hover tooltips
const CustomTooltipContent = ({ data }: { data: any }) => {
  if (!data) return null;
  const startStr = data.start ? format(new Date(data.start), "MMM d, yyyy") : "";
  const endStr = (data.start && data.duration) ? format(addDays(new Date(data.start), data.duration - 1), "MMM d, yyyy") : "";

  return (
    <div className="p-3 bg-slate-950/90 border border-slate-800 text-slate-100 rounded-lg shadow-xl backdrop-blur-md max-w-xs flex flex-col gap-2 pointer-events-none select-none font-sans text-xs">
      <div className="font-semibold text-sm text-white border-b border-slate-800/80 pb-1.5 leading-snug">
        {data.text}
      </div>
      
      <div className="flex flex-col gap-1.5 text-slate-400">
        <div className="flex items-center justify-between gap-4">
          <span>Schedule:</span>
          <span className="text-slate-200 font-medium">{startStr && endStr ? `${startStr} - ${endStr}` : "Unscheduled"}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span>Duration:</span>
          <span className="text-slate-200 font-medium">{data.duration ? `${data.duration} day${data.duration > 1 ? 's' : ''}` : "-"}</span>
        </div>
        {data.estimatedHours && data.estimatedHours !== "-" && (
          <div className="flex items-center justify-between gap-4">
            <span>Est. Hours:</span>
            <span className="text-slate-200 font-medium">{data.estimatedHours}</span>
          </div>
        )}
        {data.priority && (
          <div className="flex items-center justify-between gap-4 mt-0.5">
            <span>Priority:</span>
            <span 
              className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border"
              style={{
                backgroundColor: data.priority_color ? `${data.priority_color}20` : "rgba(255, 255, 255, 0.05)",
                color: data.priority_color || "rgb(148, 163, 184)",
                borderColor: data.priority_color ? `${data.priority_color}30` : "rgba(255, 255, 255, 0.1)"
              }}
            >
              {data.priority}
            </span>
          </div>
        )}
        {data.status && (
          <div className="flex items-center justify-between gap-4">
            <span>Status:</span>
            <span 
              className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border"
              style={{
                backgroundColor: data.status_color ? `${data.status_color}20` : "rgba(59, 130, 246, 0.2)",
                color: data.status_color || "rgb(96, 165, 250)",
                borderColor: data.status_color ? `${data.status_color}30` : "rgba(59, 130, 246, 0.3)"
              }}
            >
              {data.status}
            </span>
          </div>
        )}
        {data.assignees && data.assignees.length > 0 && (
          <div className="flex flex-col gap-1 mt-1 border-t border-slate-800/85 pt-1.5">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Assignees</span>
            <div className="flex flex-wrap gap-1.5 mt-0.5">
              {data.assignees.map((name: string, i: number) => {
                const initials = name.trim().charAt(0).toUpperCase();
                return (
                  <div key={i} className="flex items-center gap-1 bg-slate-900 border border-slate-850 px-1.5 py-0.5 rounded text-[11px] text-slate-300">
                    <div className="w-3.5 h-3.5 rounded-full bg-primary/20 text-primary-foreground font-semibold flex items-center justify-center text-[9px]">
                      {initials}
                    </div>
                    <span>{name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};// Custom cell renderers for grid columns to provide premium and consistent date formatting
const StatusCell = ({ row }: { row: any }) => {
  if (!row || !row.status) {
    return <span className="text-muted-foreground/60">-</span>;
  }
  const color = row.status_color || "#334155";
  return (
    <div className="flex items-center justify-center w-full h-full px-1">
      <span
        className="px-2 py-0.5 rounded text-[11px] font-medium text-white truncate max-w-full block"
        style={{ backgroundColor: color }}
      >
        {row.status}
      </span>
    </div>
  );
};

const PriorityCell = ({ row }: { row: any }) => {
  if (!row || !row.priority) {
    return <span className="text-muted-foreground/60">-</span>;
  }
  const color = row.priority_color || "#334155";
  return (
    <div className="flex items-center justify-center w-full h-full px-1">
      <span
        className="px-2 py-0.5 rounded text-[11px] font-medium text-white truncate max-w-full block"
        style={{ backgroundColor: color }}
      >
        {row.priority}
      </span>
    </div>
  );
};

const GanttEstimatedDateCell = ({
  row,
  onEstimatedDateChange,
}: {
  row: any;
  onEstimatedDateChange: any;
}) => {
  const task = row.originalTask;
  const estimatedDate = task?.estimatedDate ?? "-";
  const popoverId = `estimatedDate-gantt-${row.id}`;
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="flex items-center justify-center w-full h-full px-1">
      {task ? (
        <EstimatedDatePicker
          task={task}
          estimatedDate={estimatedDate}
          estimatedDateEnd={null}
          popoverId={popoverId}
          openPopoverId={isOpen ? popoverId : null}
          setOpenPopoverId={(id) => setIsOpen(id !== null)}
          onEstimatedDateChange={onEstimatedDateChange}
          customTrigger={
            <Button
              type="button"
              variant="outline"
              className="estimated-date-trigger w-full bg-[#1e293b] text-slate-200 border-[#334155] hover:bg-[#334155] hover:text-white h-7 px-2 text-xs truncate font-normal"
            >
              {estimatedDate === "-" ? "Set Date" : estimatedDate}
            </Button>
          }
        />
      ) : (
        <span className="text-muted-foreground/60">-</span>
      )}
    </div>
  );
};

interface GanttViewProps {
  groups: TaskGroup[];
  statuses: Status[];
  priorities: Priority[];
  members: any[];
  onEstimatedDateChange: (
    taskId: string,
    fromDate: string | null,
    toDate?: string | null,
  ) => void;
  onTaskClick?: (task: Task) => void;
  onAddTask?: (
    name: string,
    groupId: string,
    fromDate?: string,
    toDate?: string,
    parentId?: string,
    assigneeIds?: number[],
  ) => Promise<void>;
}
const MONTHS = [
  { value: "0", label: "January" },
  { value: "1", label: "February" },
  { value: "2", label: "March" },
  { value: "3", label: "April" },
  { value: "4", label: "May" },
  { value: "5", label: "June" },
  { value: "6", label: "July" },
  { value: "7", label: "August" },
  { value: "8", label: "September" },
  { value: "9", label: "October" },
  { value: "10", label: "November" },
  { value: "11", label: "December" },
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 11 }, (_, i) => {
  const y = currentYear - 5 + i;
  return { value: String(y), label: String(y) };
});

export default function GanttView({
  groups,
  statuses,
  priorities,
  members,
  onEstimatedDateChange,
  onTaskClick,
  onAddTask,
}: GanttViewProps) {
  const [scaleMode, setScaleMode] = useState<"day" | "week">("day");
  const [ganttApi, setGanttApi] = useState<any>(null);
  const [colorBy, setColorBy] = useState<"status" | "priority">("status");

  const [isAddPopoverOpen, setIsAddPopoverOpen] = useState(false);
  const [newTaskName, setNewTaskName] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [parentTaskId, setParentTaskId] = useState("none");
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<number[]>([]);
  const [assigneeSearchQuery, setAssigneeSearchQuery] = useState("");
  const [startDateStr, setStartDateStr] = useState("");
  const [endDateStr, setEndDateStr] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customJumpDate, setCustomJumpDate] = useState<Date | null>(null);
  const [scrollTargetDate, setScrollTargetDate] = useState<Date | null>(null);
  const [jumpMonth, setJumpMonth] = useState<number>(new Date().getMonth());
  const [jumpYear, setJumpYear] = useState<number>(new Date().getFullYear());
  const [isJumpPopoverOpen, setIsJumpPopoverOpen] = useState(false);
  const [tempStartDate, setTempStartDate] = useState<Date | undefined>(undefined);
  const [tempEndDate, setTempEndDate] = useState<Date | undefined>(undefined);
  const [isStartPopoverOpen, setIsStartPopoverOpen] = useState(false);
  const [isEndPopoverOpen, setIsEndPopoverOpen] = useState(false);

  const statusColorMap = useMemo(() => {
    const map = new Map<string, string>();
    if (statuses) {
      statuses.forEach((s) => {
        if (s.id && s.color_code) {
          map.set(String(s.id), s.color_code);
          map.set(s.name.toLowerCase(), s.color_code);
        }
      });
    }
    return map;
  }, [statuses]);

  const statusNameMap = useMemo(() => {
    const map = new Map<string, string>();
    if (statuses) {
      statuses.forEach((s) => {
        if (s.id && s.name) {
          map.set(String(s.id), s.name);
        }
      });
    }
    return map;
  }, [statuses]);

  const priorityNameMap = useMemo(() => {
    const map = new Map<string, string>();
    if (priorities) {
      priorities.forEach((p) => {
        if (p.id && p.name) {
          map.set(String(p.id), p.name);
        }
      });
    }
    return map;
  }, [priorities]);

  const priorityColorMap = useMemo(() => {
    const map = new Map<string, string>();
    if (priorities) {
      priorities.forEach((p) => {
        if (p.id && p.color_code) {
          map.set(String(p.id), p.color_code);
          map.set(p.name.toLowerCase(), p.color_code);
        }
      });
    }
    return map;
  }, [priorities]);

  const getTaskStatusColor = useCallback(
    (taskStatusId?: string, taskStatusName?: string): string | null => {
      if (taskStatusId) {
        const color = statusColorMap.get(String(taskStatusId));
        if (color) return color;
      }
      if (taskStatusName) {
        const color = statusColorMap.get(taskStatusName.toLowerCase());
        if (color) return color;
      }
      return null;
    },
    [statusColorMap]
  );

  const getTaskPriorityColor = useCallback(
    (taskPriorityId?: string, taskPriorityName?: string): string | null => {
      if (taskPriorityId) {
        const color = priorityColorMap.get(String(taskPriorityId));
        if (color) return color;
      }
      if (taskPriorityName) {
        const color = priorityColorMap.get(taskPriorityName.toLowerCase());
        if (color) return color;
      }
      return null;
    },
    [priorityColorMap]
  );

  // Set default group when modal opens or groups change
  useEffect(() => {
    if (groups && groups.length > 0 && !selectedGroupId) {
      setSelectedGroupId(String(groups[0].id));
    }
  }, [groups, selectedGroupId]);

  const parentTaskOptions = useMemo(() => {
    if (!selectedGroupId) return [];
    const group = groups.find((g) => String(g.id) === String(selectedGroupId));
    if (!group) return [];
    return group.tasks || [];
  }, [groups, selectedGroupId]);

  // Reset parent task selection when group changes
  useEffect(() => {
    setParentTaskId("none");
  }, [selectedGroupId]);

  const handleCreateTask = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskName.trim() || !selectedGroupId) return;

    if (startDateStr && endDateStr && new Date(endDateStr) < new Date(startDateStr)) {
      toast.error("End date must be on or after start date");
      return;
    }

    setIsSubmitting(true);
    try {
      if (onAddTask) {
        await onAddTask(
          newTaskName.trim(),
          selectedGroupId,
          startDateStr || undefined,
          endDateStr || undefined,
          parentTaskId !== "none" ? parentTaskId : undefined,
          selectedAssigneeIds.length > 0 ? selectedAssigneeIds : undefined
        );
      }
      // Reset form
      setNewTaskName("");
      setStartDateStr("");
      setEndDateStr("");
      setParentTaskId("none");
      setSelectedAssigneeIds([]);
      setAssigneeSearchQuery("");
      setIsAddPopoverOpen(false);
    } catch (err) {
      console.error("Failed to add task:", err);
    } finally {
      setIsSubmitting(false);
    }
  }, [newTaskName, selectedGroupId, startDateStr, endDateStr, parentTaskId, selectedAssigneeIds, onAddTask]);

  const latestRef = useRef<any>(null);

  const timescaleConfig = useMemo(() => {
    switch (scaleMode) {
      case "week":
        return {
          scales: [
            {
              unit: "month",
              step: 1,
              format: (date: Date) => format(date, "MMMM yyyy"),
            },
            {
              unit: "week",
              step: 1,
              format: (date: Date) => `Wk ${format(date, "w")}`,
            },
          ],
          cellWidth: 80,
        };
      case "day":
      default:
        return {
          scales: [
            {
              unit: "month",
              step: 1,
              format: (date: Date) => format(date, "MMMM yyyy"),
            },
            { unit: "day", step: 1, format: (date: Date) => format(date, "d") },
          ],
          cellWidth: 50,
        };
    }
  }, [scaleMode]);

  const ganttTaskTypes = useMemo(
    () => [
      { id: "task", label: "Task" },
      { id: "summary", label: "Summary" },
      { id: "milestone", label: "Milestone" },
      { id: "parent-task", label: "Parent Task" },
      { id: "hidden", label: "Hidden" },
    ],
    [],
  );
  // Helper to find a task by ID inside our groups/tasks hierarchy (robust type casting)
  const getTaskById = useCallback(
    (id: string): Task | null => {
      for (const group of groups) {
        for (const task of group.tasks) {
          if (String(task.id) === String(id)) return task;
          if (task.subitems) {
            for (const sub of task.subitems) {
              if (String(sub.id) === String(id)) return sub;
            }
          }
        }
      }
      return null;
    },
    [groups],
  );

  // Helper to calculate duration in days between two ISO date strings (inclusive)
  const calculateDuration = useCallback((fromStr?: string, toStr?: string): number => {
    if (!fromStr || !toStr) return 1;
    try {
      const from = parseISO(fromStr);
      const to = parseISO(toStr);
      if (isNaN(from.getTime()) || isNaN(to.getTime())) return 1;
      return Math.max(1, differenceInCalendarDays(to, from) + 1);
    } catch {
      return 1;
    }
  }, []);

  // Helper to resolve start date and duration for a task dynamically, including subitems
  const getTaskDates = useCallback((task: Task): { start: Date; duration: number } => {
    let start = new Date();
    let duration = 1;

    const taskAny = task as any;
    const rawFrom = taskAny.estimation?.estimated_date_from;
    const rawTo = taskAny.estimation?.estimated_date_to;

    // Fallback: If no direct estimation, try to derive from scheduled subitems
    if (!rawFrom && !rawTo && task.subitems && task.subitems.length > 0) {
      let minStart: Date | null = null;
      let maxEnd: Date | null = null;

      for (const sub of task.subitems) {
        const subAny = sub as any;
        const subFrom = subAny.estimation?.estimated_date_from;
        const subTo = subAny.estimation?.estimated_date_to;
        if (subFrom && subTo) {
          try {
            const s = parseISO(subFrom);
            const e = parseISO(subTo);
            if (!isNaN(s.getTime()) && !isNaN(e.getTime())) {
              if (!minStart || s < minStart) minStart = s;
              if (!maxEnd || e > maxEnd) maxEnd = e;
            }
          } catch {}
        }
      }

      if (minStart && maxEnd) {
        return {
          start: minStart,
          duration: Math.max(1, differenceInCalendarDays(maxEnd, minStart) + 1),
        };
      }
    }

    if (rawFrom) {
      try {
        const parsed = parseISO(rawFrom);
        if (!isNaN(parsed.getTime())) {
          start = parsed;
        }
      } catch (e) {
        console.warn("Failed to parse start date:", rawFrom, e);
      }
    }

    if (rawFrom && rawTo) {
      duration = calculateDuration(rawFrom, rawTo);
    }

    return { start, duration };
  }, [calculateDuration]);

  // Helper to check if a task has estimated dates defined or has scheduled subitems
  const hasEstimation = useCallback((task: Task): boolean => {
    const taskAny = task as any;
    const rawFrom = taskAny.estimation?.estimated_date_from;
    const rawTo = taskAny.estimation?.estimated_date_to;
    if (rawFrom && rawTo) {
      try {
        const from = parseISO(rawFrom);
        const to = parseISO(rawTo);
        return !isNaN(from.getTime()) && !isNaN(to.getTime());
      } catch {
        return false;
      }
    }

    // Also consider parent task scheduled if any subitem has estimation
    if (task.subitems && task.subitems.length > 0) {
      return task.subitems.some((sub) => {
        const subAny = sub as any;
        const subFrom = subAny.estimation?.estimated_date_from;
        const subTo = subAny.estimation?.estimated_date_to;
        if (!subFrom || !subTo) return false;
        try {
          const from = parseISO(subFrom);
          const to = parseISO(subTo);
          return !isNaN(from.getTime()) && !isNaN(to.getTime());
        } catch {
          return false;
        }
      });
    }

    return false;
  }, []);

  latestRef.current = {
    getTaskById,
    getTaskDates,
    onEstimatedDateChange,
    onTaskClick,
  };

  // Map our tasks to SVAR's expected format (reactive to groups prop changes)
  const mappedTasks = useMemo(() => {
    const list = [];

    for (const group of groups) {
      for (const task of group.tasks) {
        const { start: taskStart, duration: taskDuration } = getTaskDates(task);
        const hasSubitems = task.subitems && task.subitems.length > 0;
        const isScheduled = hasEstimation(task);

        const resolvedStatus = task.status_id ? (statusNameMap.get(task.status_id) || task.status) : task.status;
        const resolvedPriority = task.priority_id ? (priorityNameMap.get(task.priority_id) || task.priority) : task.priority;

        // 1. Map the main task row as top-level (no parent)
        list.push({
          id: task.id,
          text: task.name || "Untitled Task",
          start: isScheduled ? taskStart : undefined,
          duration: isScheduled ? taskDuration : undefined,
          progress: 0,
          type: isScheduled
            ? hasSubitems
              ? "parent-task"
              : undefined
            : "hidden",
          open: hasSubitems ? true : undefined,
          unscheduled: !isScheduled,
          assignees: task.assignee_names,
          priority: resolvedPriority,
          priority_color: getTaskPriorityColor(task.priority_id, resolvedPriority) || undefined,
          status: resolvedStatus,
          status_id: task.status_id,
          status_color: getTaskStatusColor(task.status_id, resolvedStatus) || undefined,
          estimatedHours: task.estimatedHours,
          originalTask: task,
        });

        // 2. Map subitems if they exist under the main task parent
        if (hasSubitems) {
          for (const sub of task.subitems!) {
            const { start: subStart, duration: subDuration } =
              getTaskDates(sub);
            const isSubScheduled = hasEstimation(sub);

            const resolvedSubStatus = sub.status_id ? (statusNameMap.get(sub.status_id) || sub.status) : sub.status;
            const resolvedSubPriority = sub.priority_id ? (priorityNameMap.get(sub.priority_id) || sub.priority) : sub.priority;

            list.push({
              id: sub.id,
              text: sub.name || "Untitled Subitem",
              start: isSubScheduled ? subStart : undefined,
              duration: isSubScheduled ? subDuration : undefined,
              parent: task.id,
              progress: 0,
              type: isSubScheduled ? undefined : "hidden",
              unscheduled: !isSubScheduled,
              assignees: sub.assignee_names,
              priority: resolvedSubPriority,
              priority_color: getTaskPriorityColor(sub.priority_id, resolvedSubPriority) || undefined,
              status: resolvedSubStatus,
              status_id: sub.status_id,
              status_color: getTaskStatusColor(sub.status_id, resolvedSubStatus) || undefined,
              estimatedHours: sub.estimatedHours,
              originalTask: sub,
            });
          }
        }
      }
    }
    return list;
  }, [groups, hasEstimation, getTaskDates, getTaskStatusColor, getTaskPriorityColor, statusNameMap, priorityNameMap]);

  // Handle SVAR Gantt actions and events
  const handleInit = useCallback(
    (api: any) => {
      setGanttApi(api);
      // 1. Intercept select-task to open the custom task dialog/card, returning false to prevent persistent selection background
      api.intercept("select-task", (payload: any) => {
        // If the user is clicking on an estimated date trigger button or its active popover/portaled content,
        // intercept and ignore the selection event. This prevents parent re-renders and stops the popover from blinking.
        const event = window.event as any;
        if (event) {
          const target = event.target as HTMLElement;
          if (
            target &&
            (target.closest(".estimated-date-trigger") ||
              target.closest("[data-radix-portal]") ||
              target.closest(".SelectContent") ||
              target.closest(".PopoverContent") ||
              target.closest('[role="dialog"]'))
          ) {
            return false;
          }
        }

        if (payload) {
          const rawId = typeof payload === "object" ? payload.id : payload;
          if (rawId) {
            const stringId = String(rawId);
            if (!stringId.startsWith("group-")) {
              const task = latestRef.current.getTaskById(stringId);
              if (task && latestRef.current.onTaskClick) {
                latestRef.current.onTaskClick(task);
              }
            }
          }
        }
        return false;
      });

      // 2. Intercept show-editor to prevent default SVAR Gantt editor from opening
      api.intercept("show-editor", () => {
        return false;
      });

      // 3. Listen to task updates after they are completed in the Gantt store
      api.on("update-task", (payload: any) => {
        const { id, inProgress } = payload;
        const idStr = String(id);
        if (idStr.startsWith("group-")) return;

        // If inProgress is true, the drag/resize is still active, so we don't save to parent yet
        if (inProgress) return;

        // Retrieve the fully updated task directly from the SVAR Gantt store
        const updatedTask = api.getTask(id);
        if (!updatedTask) {
          console.warn("[GanttView] Could not retrieve updated task from store:", idStr);
          return;
        }

        const start = parseDate(updatedTask.start);
        const duration = updatedTask.duration;

        if (start && duration) {
          const fromDateStr = format(start, "yyyy-MM-dd");
          // Calculate the inclusive end date for the database
          const toDate = addDays(start, duration - 1);
          const toDateStr = format(toDate, "yyyy-MM-dd");

          latestRef.current.onEstimatedDateChange(idStr, fromDateStr, toDateStr);
        }
      });

      // 4. Prevent creation of dependency links
      api.intercept("add-link", () => {
        return false;
      });
    },
    [getTaskById, onEstimatedDateChange, onTaskClick, getTaskDates, setGanttApi],
  );

  const ganttColumns = useMemo(
    () => [
      { id: "text", width: 220, resize: true, header: [{ text: "Task Name" }] },
      {
        id: "estimatedDate",
        width: 140,
        resize: true,
        header: [{ text: "Est. Date" }],
        cell: (props: any) => (
          <GanttEstimatedDateCell
            {...props}
            onEstimatedDateChange={onEstimatedDateChange}
          />
        ),
      },
      {
        id: "status",
        width: 110,
        resize: true,
        header: [{ text: "Status" }],
        cell: StatusCell,
      },
      {
        id: "priority",
        width: 110,
        resize: true,
        header: [{ text: "Priority" }],
        cell: PriorityCell,
      },
    ],
    [onEstimatedDateChange],
  );

  const ganttTimeRange = useMemo(() => {
    const now = new Date();
    // Default range is 6 months before and 6 months after the current month
    let minDate = addDays(startOfMonth(now), -180);
    let maxDate = addDays(endOfMonth(now), 180);

    if (customJumpDate) {
      if (customJumpDate < minDate) minDate = customJumpDate;
      if (customJumpDate > maxDate) maxDate = customJumpDate;
    }

    for (const group of groups) {
      for (const task of group.tasks) {
        // Evaluate main task dates
        if (hasEstimation(task)) {
          const { start: tStart, duration: tDuration } = getTaskDates(task);
          const tEnd = addDays(tStart, tDuration);
          if (tStart < minDate) minDate = tStart;
          if (tEnd > maxDate) maxDate = tEnd;
        }

        // Evaluate subitem dates
        if (task.subitems) {
          for (const sub of task.subitems) {
            if (hasEstimation(sub)) {
              const { start: sStart, duration: sDuration } = getTaskDates(sub);
              const sEnd = addDays(sStart, sDuration);
              if (sStart < minDate) minDate = sStart;
              if (sEnd > maxDate) maxDate = sEnd;
            }
          }
        }
      }
    }

    // Pad start and end to start/end of the month and add some buffer
    const start = addDays(startOfMonth(minDate), -7);
    const end = addDays(endOfMonth(maxDate), 7);

    return { start, end };
  }, [groups, hasEstimation, getTaskDates, customJumpDate]);

  const scrollToCurrentMonth = useCallback((apiInstance: any) => {
    if (!apiInstance) return;
    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    const daysDiff = differenceInCalendarDays(currentMonthStart, ganttTimeRange.start);
    
    let leftOffset = 0;
    if (scaleMode === "day") {
      leftOffset = daysDiff * 50; // cellWidth is 50
    } else {
      leftOffset = (daysDiff / 7) * 80; // cellWidth is 80
    }
    
    apiInstance.exec("scroll-chart", { left: Math.max(0, leftOffset) });
  }, [ganttTimeRange.start, scaleMode]);

  useEffect(() => {
    if (ganttApi) {
      const timer = setTimeout(() => {
        scrollToCurrentMonth(ganttApi);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [scaleMode, ganttApi, scrollToCurrentMonth]);

  const scrollToDate = useCallback((targetDate: Date) => {
    if (!ganttApi) return;
    
    // Sanitize year to prevent browser-hanging ranges (e.g. year 0132 or 9999)
    const year = targetDate.getFullYear();
    if (year < 2000 || year > 2100) return;
    
    // If target date is outside current range, update customJumpDate state
    let needsRangeUpdate = false;
    if (ganttTimeRange.start && targetDate < ganttTimeRange.start) needsRangeUpdate = true;
    if (ganttTimeRange.end && targetDate > ganttTimeRange.end) needsRangeUpdate = true;
    
    if (needsRangeUpdate) {
      setCustomJumpDate(targetDate);
      // Let the useEffect scroll to it after rendering
      setScrollTargetDate(targetDate);
    } else {
      const daysDiff = differenceInCalendarDays(targetDate, ganttTimeRange.start);
      let leftOffset = 0;
      if (scaleMode === "day") {
        leftOffset = daysDiff * 50;
      } else {
        leftOffset = (daysDiff / 7) * 80;
      }
      ganttApi.exec("scroll-chart", { left: Math.max(0, leftOffset) });
    }
  }, [ganttApi, ganttTimeRange.start, ganttTimeRange.end, scaleMode]);

  const handleGoToToday = useCallback(() => {
    const today = new Date();
    setJumpMonth(today.getMonth());
    setJumpYear(today.getFullYear());
    scrollToDate(today);
    setIsJumpPopoverOpen(false);
  }, [scrollToDate]);

  useEffect(() => {
    if (ganttApi && scrollTargetDate) {
      const timer = setTimeout(() => {
        const daysDiff = differenceInCalendarDays(scrollTargetDate, ganttTimeRange.start);
        let leftOffset = 0;
        if (scaleMode === "day") {
          leftOffset = daysDiff * 50;
        } else {
          leftOffset = (daysDiff / 7) * 80;
        }
        ganttApi.exec("scroll-chart", { left: Math.max(0, leftOffset) });
        setScrollTargetDate(null);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [scrollTargetDate, ganttApi, ganttTimeRange.start, scaleMode]);

  const dynamicStyles = useMemo(() => {
    let stylesStr = "";
    mappedTasks.forEach((t) => {
      const activeColor = colorBy === "priority" ? t.priority_color : t.status_color;
      if (activeColor) {
        stylesStr += `
          .pm-gantt-wrapper .wx-bar[data-id="${t.id}"],
          .pm-gantt-wrapper .wx-bar[data-id=":${t.id}"] {
            background-color: ${activeColor} !important;
            --wx-gantt-task-color: ${activeColor} !important;
            --wx-gantt-task-fill-color: ${activeColor} !important;
            border-color: transparent !important;
          }
          .pm-gantt-wrapper .wx-bar[data-id="${t.id}"] .wx-progress-percent,
          .pm-gantt-wrapper .wx-bar[data-id=":${t.id}"] .wx-progress-percent {
            background-color: rgba(0, 0, 0, 0.2) !important;
          }
          .pm-gantt-wrapper .wx-bar.wx-parent-task[data-id="${t.id}"],
          .pm-gantt-wrapper .wx-bar.parent-task[data-id="${t.id}"],
          .pm-gantt-wrapper .wx-bar.wx-parent-task[data-id=":${t.id}"],
          .pm-gantt-wrapper .wx-bar.parent-task[data-id=":${t.id}"] {
            background-color: ${activeColor} !important;
            border-color: transparent !important;
          }
        `;
      }
    });
    return stylesStr;
  }, [mappedTasks, colorBy]);

  return (
    <div className="flex-1 w-[calc(100%-1.5rem)] h-[calc(100vh-220px)] min-h-[500px] flex flex-col mt-4 ml-6">
      {/* Customized View / Horizontal Toolbar for Scale Control and Future Filters */}
      <div className="flex items-center justify-end mb-4 pr-6 select-none">
        {onAddTask && (
          <Popover open={isAddPopoverOpen} onOpenChange={setIsAddPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                className="mr-3 h-9 px-4 text-xs font-semibold rounded-md shadow-sm gap-1.5 flex items-center bg-primary hover:bg-primary/95 text-primary-foreground"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Task
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              className="w-[350px] p-4 bg-slate-900 border-slate-800 text-slate-100 shadow-2xl rounded-lg z-[9999] max-h-[90vh] overflow-y-auto"
              onInteractOutside={(e) => {
                const target = e.target as HTMLElement;
                if (
                  target.closest('[role="listbox"]') ||
                  target.closest('[data-radix-select-viewport]') ||
                  target.closest('.SelectContent') ||
                  target.closest('[data-radix-portal]')
                ) {
                  e.preventDefault();
                }
              }}
            >
              <div className="space-y-1 mb-3">
                <h3 className="font-semibold text-sm text-white leading-none">Create New Task</h3>
                <p className="text-xs text-muted-foreground">Add a new task or subtask to the board</p>
              </div>
              <form onSubmit={handleCreateTask} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="taskName" className="text-slate-300">Task Name</Label>
                  <Input
                    id="taskName"
                    value={newTaskName}
                    onChange={(e) => setNewTaskName(e.target.value)}
                    placeholder="Enter task name"
                    required
                    className="bg-slate-950 border-slate-800 focus-visible:ring-primary text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="taskGroup" className="text-slate-300">Group</Label>
                  <Select
                    value={selectedGroupId}
                    onValueChange={setSelectedGroupId}
                  >
                    <SelectTrigger id="taskGroup" className="w-full bg-[#1e293b] border-[#334155] text-white focus:ring-primary">
                      <SelectValue placeholder="Select a group" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1e293b] border-[#334155] text-white z-[10000]">
                      {groups.map((group) => (
                        <SelectItem key={group.id} value={String(group.id)} className="text-white focus:bg-[#334155] focus:text-white">
                          {group.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="parentTask" className="text-slate-300">Parent Task (Optional)</Label>
                  <Select
                    value={parentTaskId}
                    onValueChange={setParentTaskId}
                  >
                    <SelectTrigger id="parentTask" className="w-full bg-[#1e293b] border-[#334155] text-white focus:ring-primary">
                      <SelectValue placeholder="Select a parent task (optional)" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1e293b] border-[#334155] text-white z-[10000]">
                      <SelectItem value="none" className="text-white focus:bg-[#334155] focus:text-white">
                        None (Create as Main Task)
                      </SelectItem>
                      {parentTaskOptions.map((task) => (
                        <SelectItem key={task.id} value={String(task.id)} className="text-white focus:bg-[#334155] focus:text-white">
                          {task.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Assignees (Optional)</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full bg-[#1e293b] border-[#334155] text-white focus:ring-primary hover:bg-[#2e3e56] hover:text-white h-9 px-3 flex items-center justify-between font-normal text-xs"
                      >
                        {selectedAssigneeIds.length === 0 ? (
                          <span className="text-slate-400">Select assignees (optional)</span>
                        ) : (
                          <div className="flex items-center gap-1.5 overflow-hidden">
                            <div className="flex -space-x-1.5 overflow-hidden">
                              {selectedAssigneeIds.slice(0, 3).map((id) => {
                                const member = members.find((m) => Number(m.user_id) === id);
                                if (!member) return null;
                                const initials = (member.name || "")
                                  .split(/\s+/)
                                  .map((n: string) => n[0])
                                  .filter(Boolean)
                                  .slice(0, 2)
                                  .join("")
                                  .toUpperCase();
                                const bgColor = stringToHslColor(member.name || String(id));
                                return (
                                  <Avatar key={id} className="h-5 w-5 border border-slate-900 shrink-0">
                                    <AvatarFallback
                                      style={{ background: bgColor, color: "white" }}
                                      className="text-[8px] font-semibold flex items-center justify-center"
                                    >
                                      {initials || "U"}
                                    </AvatarFallback>
                                  </Avatar>
                                );
                              })}
                            </div>
                            <span className="truncate text-xs">
                              {selectedAssigneeIds.length === 1
                                ? members.find((m) => Number(m.user_id) === selectedAssigneeIds[0])?.name
                                : `${selectedAssigneeIds.length} assignees selected`}
                            </span>
                          </div>
                        )}
                        <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      align="start"
                      className="w-[318px] p-2 bg-[#1e293b] border-[#334155] text-slate-100 shadow-xl rounded-md z-[10000] flex flex-col"
                    >
                      <div className="p-1 shrink-0">
                        <Input
                          placeholder="Search members..."
                          value={assigneeSearchQuery}
                          onChange={(e) => setAssigneeSearchQuery(e.target.value)}
                          className="h-8 bg-slate-950 border-slate-800 text-xs text-white focus-visible:ring-primary mb-2"
                        />
                      </div>
                      <div className="max-h-48 overflow-y-auto space-y-0.5 pr-1">
                        {members
                          .filter((m) =>
                            (m.name || "").toLowerCase().includes(assigneeSearchQuery.toLowerCase())
                          )
                          .map((member) => {
                            const memberIdNum = Number(member.user_id);
                            const isSelected = selectedAssigneeIds.includes(memberIdNum);
                            const initials = (member.name || "")
                              .split(/\s+/)
                              .map((n: string) => n[0])
                              .filter(Boolean)
                              .slice(0, 2)
                              .join("")
                              .toUpperCase();
                            const bgColor = stringToHslColor(member.name || String(member.user_id));
                            return (
                              <button
                                key={member.user_id}
                                type="button"
                                onClick={() => {
                                  setSelectedAssigneeIds((prev) =>
                                    isSelected
                                      ? prev.filter((id) => id !== memberIdNum)
                                      : [...prev, memberIdNum]
                                  );
                                }}
                                className="w-full flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-slate-800 text-xs text-left cursor-pointer transition-colors"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <Avatar className="h-6 w-6 shrink-0">
                                    <AvatarFallback
                                      style={{ background: bgColor, color: "white" }}
                                      className="text-[10px] font-semibold flex items-center justify-center"
                                    >
                                      {initials || "U"}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="truncate">{member.name}</span>
                                </div>
                                {isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                              </button>
                            );
                          })}
                        {members.filter((m) =>
                          (m.name || "").toLowerCase().includes(assigneeSearchQuery.toLowerCase())
                        ).length === 0 && (
                          <div className="text-center py-2 text-xs text-slate-400">
                            No members found
                          </div>
                        )}
                      </div>
                      {selectedAssigneeIds.length > 0 && (
                        <div className="pt-2 mt-1 border-t border-slate-800 shrink-0">
                          <button
                            type="button"
                            onClick={() => setSelectedAssigneeIds([])}
                            className="w-full text-center py-1 rounded-md text-[11px] font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                          >
                            Clear Selection
                          </button>
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5 flex flex-col">
                    <Label htmlFor="startDate" className="text-slate-300 text-xs">Start Date (Opt)</Label>
                    <Popover
                      open={isStartPopoverOpen}
                      onOpenChange={(open) => {
                        setIsStartPopoverOpen(open);
                        if (open) {
                          setTempStartDate(startDateStr ? new Date(startDateStr) : undefined);
                        }
                      }}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          id="startDate"
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal bg-slate-950 border-slate-800 hover:bg-slate-900 hover:text-white h-9 px-3 text-xs text-white relative pr-8",
                            !startDateStr && "text-slate-400"
                          )}
                        >
                          <CalendarDays className="mr-2 h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">
                            {startDateStr ? format(new Date(startDateStr), "MMM d, yyyy") : "Pick start date"}
                          </span>
                          {startDateStr && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setStartDateStr("");
                              }}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 rounded-full hover:bg-slate-800"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-3 bg-slate-900 border-slate-800 z-[10000] flex flex-col gap-3" align="start">
                        <Calendar
                          mode="single"
                          selected={tempStartDate}
                          onSelect={setTempStartDate}
                          disabled={(date) => {
                            const refDate = tempEndDate || (endDateStr ? parseISO(endDateStr) : null);
                            if (!refDate) return false;
                            const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
                            const r = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate());
                            return d > r;
                          }}
                          initialFocus
                        />
                        <div className="flex justify-end gap-2 border-t border-slate-850 pt-2 shrink-0">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setIsStartPopoverOpen(false)}
                            className="border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white h-7 px-2.5 text-xs font-medium"
                          >
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => {
                              if (tempStartDate) {
                                setStartDateStr(format(tempStartDate, "yyyy-MM-dd"));
                              } else {
                                setStartDateStr("");
                              }
                              setIsStartPopoverOpen(false);
                            }}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground h-7 px-2.5 text-xs font-medium"
                          >
                            Done
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-1.5 flex flex-col">
                    <Label htmlFor="endDate" className="text-slate-300 text-xs">End Date (Opt)</Label>
                    <Popover
                      open={isEndPopoverOpen}
                      onOpenChange={(open) => {
                        setIsEndPopoverOpen(open);
                        if (open) {
                          setTempEndDate(endDateStr ? new Date(endDateStr) : undefined);
                        }
                      }}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          id="endDate"
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal bg-slate-950 border-slate-800 hover:bg-slate-900 hover:text-white h-9 px-3 text-xs text-white relative pr-8",
                            !endDateStr && "text-slate-400"
                          )}
                        >
                          <CalendarDays className="mr-2 h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">
                            {endDateStr ? format(new Date(endDateStr), "MMM d, yyyy") : "Pick end date"}
                          </span>
                          {endDateStr && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEndDateStr("");
                              }}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 rounded-full hover:bg-slate-800"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-3 bg-slate-900 border-slate-800 z-[10000] flex flex-col gap-3" align="start">
                        <Calendar
                          mode="single"
                          selected={tempEndDate}
                          onSelect={setTempEndDate}
                          disabled={(date) => {
                            const refDate = tempStartDate || (startDateStr ? parseISO(startDateStr) : null);
                            if (!refDate) return false;
                            const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
                            const r = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate());
                            return d < r;
                          }}
                          initialFocus
                        />
                        <div className="flex justify-end gap-2 border-t border-slate-850 pt-2 shrink-0">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setIsEndPopoverOpen(false)}
                            className="border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white h-7 px-2.5 text-xs font-medium"
                          >
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => {
                              if (tempEndDate) {
                                setEndDateStr(format(tempEndDate, "yyyy-MM-dd"));
                              } else {
                                setEndDateStr("");
                              }
                              setIsEndPopoverOpen(false);
                            }}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground h-7 px-2.5 text-xs font-medium"
                          >
                            Done
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <div className="pt-3 border-t border-slate-800/60 flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAddPopoverOpen(false)}
                    className="border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white h-8 px-3 text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting || !newTaskName.trim()}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium h-8 px-3 text-xs"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin mr-1.5" />
                        Creating...
                      </>
                    ) : (
                      "Create"
                    )}
                  </Button>
                </div>
              </form>
            </PopoverContent>
          </Popover>
        )}
        <div className="flex items-center bg-muted/40 p-1 rounded-md border border-border/40 gap-1">
          {(["day", "week"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setScaleMode(mode)}
              className={cn(
                "px-3 py-1.5 rounded-sm text-xs font-medium transition-all capitalize",
                scaleMode === mode
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/80",
              )}
            >
              {mode === "day" ? "Days" : "Weeks"}
            </button>
          ))}
        </div>
        <Popover open={isJumpPopoverOpen} onOpenChange={setIsJumpPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="ml-2 h-9 gap-1.5 bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850 hover:text-white"
            >
              <CalendarDays className="w-4 h-4 text-slate-400" />
              <span>Jump to...</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            className="w-72 p-3 bg-slate-900 border-slate-800 text-slate-100 shadow-2xl rounded-lg z-[9999]"
          >
            <div className="space-y-3">
              <div className="border-b border-slate-800/80 pb-1.5 select-none">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Jump to Date</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-slate-400 text-[10px] uppercase font-semibold">Month</Label>
                  <Select
                    value={String(jumpMonth)}
                    onValueChange={(val) => {
                      setJumpMonth(parseInt(val));
                    }}
                  >
                    <SelectTrigger className="w-full bg-[#1e293b] border-[#334155] text-white focus:ring-primary h-9 text-xs">
                      <SelectValue placeholder="Month" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1e293b] border-[#334155] text-white z-[10000] max-h-48 overflow-y-auto">
                      {MONTHS.map((m) => (
                        <SelectItem key={m.value} value={m.value} className="text-white focus:bg-[#334155] focus:text-white text-xs">
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-slate-400 text-[10px] uppercase font-semibold">Year</Label>
                  <Select
                    value={String(jumpYear)}
                    onValueChange={(val) => {
                      setJumpYear(parseInt(val));
                    }}
                  >
                    <SelectTrigger className="w-full bg-[#1e293b] border-[#334155] text-white focus:ring-primary h-9 text-xs">
                      <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1e293b] border-[#334155] text-white z-[10000] max-h-48 overflow-y-auto">
                      {YEARS.map((y) => (
                        <SelectItem key={y.value} value={y.value} className="text-white focus:bg-[#334155] focus:text-white text-xs">
                          {y.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="border-t border-slate-850 pt-2 flex flex-col gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    scrollToDate(new Date(jumpYear, jumpMonth, 1));
                    setIsJumpPopoverOpen(false);
                  }}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium h-8 text-xs"
                >
                  Jump
                </Button>
                <button
                  type="button"
                  onClick={handleGoToToday}
                  className="w-full text-left px-2 py-1.5 rounded text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition-colors flex items-center justify-between"
                >
                  <span>Go to Today</span>
                  <span className="text-[10px] text-slate-500 font-mono">Today</span>
                </button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="ml-2 h-9 w-9 bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850 hover:text-white"
            >
              <Settings className="w-4 h-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            className="w-48 p-2 bg-slate-900 border-slate-800 text-slate-100 shadow-2xl rounded-lg z-[9999]"
          >
            <div className="px-2 py-1.5 border-b border-slate-800/80 mb-1 select-none">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Color Bars By</span>
            </div>
            <div className="space-y-1">
              {(["status", "priority"] as const).map((option) => (
                <button
                  key={option}
                  onClick={() => setColorBy(option)}
                  type="button"
                  className={cn(
                    "w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-all capitalize",
                    colorBy === option
                      ? "bg-primary/20 text-white font-semibold"
                      : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                  )}
                >
                  <span>{option}</span>
                  {colorBy === option && <Check className="w-3.5 h-3.5 text-primary" />}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Gantt Wrapper */}
      <div className="flex-1 min-h-0 flex flex-col bg-background text-foreground border border-border rounded-lg overflow-hidden pm-gantt-wrapper">
        <style>{`
          /* Custom styles to match the PM tool aesthetic */
          .pm-gantt-wrapper > div,
          .pm-gantt-wrapper .wx-gantt-theme-willow-dark,
          .pm-gantt-wrapper .wx-willow-dark-theme {
            height: 100%;
            width: 100%;
            display: flex;
            flex-direction: column;
            flex: 1;
          }

          .pm-gantt-wrapper .wx-gantt {
            height: 100% !important;
            overflow: auto !important;

            --wx-gantt-border-color: hsl(215, 28%, 20%);
            --wx-gantt-border: 1px solid hsl(215, 28%, 20%);
            
            --wx-background: hsl(222, 47%, 11%);
            --wx-background-alt: hsl(215, 28%, 17%);
            
            --wx-color-font: hsl(210, 40%, 98%);
            --wx-color-primary: hsl(217, 91%, 60%);
            
            --wx-gantt-icon-color: hsl(217, 10%, 65%);
            --wx-gantt-select-color: hsla(217, 91%, 60%, 0.15);
            
            /* Grid header */
            --wx-grid-header-font: 500 13px 'Poppins', sans-serif;
            --wx-grid-header-font-color: hsl(217, 10%, 65%);
            --wx-grid-header-shadow: none;
            
            /* Grid body */
            --wx-grid-body-font: 400 13px 'Poppins', sans-serif;
            --wx-grid-body-font-color: hsl(210, 40%, 98%);
            --wx-grid-body-row-border: 1px solid hsl(215, 28%, 20%);
            
            /* Timescale */
            --wx-timescale-font: 500 12px 'Poppins', sans-serif;
            --wx-timescale-font-color: hsl(217, 10%, 65%);
            --wx-timescale-border: 1px solid hsl(215, 28%, 20%);
            --wx-timescale-shadow: none;
            
            /* Task bar styling */
            --wx-gantt-task-color: hsl(217, 91%, 60%);
            --wx-gantt-task-fill-color: hsl(217, 91%, 50%);
            --wx-gantt-task-border-color: transparent;
            --wx-gantt-task-font-color: #ffffff;
            --wx-gantt-bar-border-radius: 6px;
            
            /* Summary task bar styling */
            --wx-gantt-summary-color: hsl(142, 71%, 45%);
            --wx-gantt-summary-fill-color: hsl(142, 71%, 40%);
            --wx-gantt-summary-border-color: transparent;
            --wx-gantt-summary-font-color: #ffffff;

            /* Parent task bar styling (custom type) */
            --wx-gantt-parent-task-color: hsl(142, 71%, 45%);
            --wx-gantt-parent-task-fill-color: hsl(142, 71%, 40%);
            --wx-gantt-parent-task-border-color: transparent;
            --wx-gantt-parent-task-font-color: #ffffff;
            
            /* Weekends */
            --wx-gantt-holiday-background: hsla(215, 28%, 17%, 0.3);
            --wx-gantt-holiday-color: hsl(217, 10%, 50%);
          }

          /* Adjust row headers and cell borders */
          .pm-gantt-wrapper .wx-table-container {
            background-color: hsl(222, 47%, 11%) !important;
            border-right: 1px solid hsl(215, 28%, 20%) !important;
          }

          .pm-gantt-wrapper .wx-scale {
            background-color: hsl(222, 47%, 11%) !important;
            border-bottom: 1px solid hsl(215, 28%, 20%) !important;
          }

          .pm-gantt-wrapper .wx-cell {
            border-right: 1px solid hsl(215, 28%, 20%) !important;
          }

          .pm-gantt-wrapper .wx-row {
            border-bottom: 1px solid hsl(215, 28%, 20%) !important;
          }

          .pm-gantt-wrapper .wx-body .wx-row:hover {
            background-color: hsla(217, 91%, 60%, 0.05) !important;
          }

          .pm-gantt-wrapper .wx-layout {
            background-color: hsl(222, 47%, 11%) !important;
          }

          /* Hide unscheduled task bars in timeline */
          .pm-gantt-wrapper .wx-bar.wx-hidden {
            display: none !important;
          }

          /* Hide the link handles and interactive areas for linking */
          .pm-gantt-wrapper .wx-link,
          .pm-gantt-wrapper .wx-link-handle,
          .pm-gantt-wrapper .wx-link-control,
          .pm-gantt-wrapper .wx-gantt-link-control,
          .pm-gantt-wrapper [data-bind-property="link"] {
            display: none !important;
          }

          /* Custom parent task styles if the library doesn't automatically map the CSS vars */
          .pm-gantt-wrapper .wx-bar.wx-parent-task,
          .pm-gantt-wrapper .wx-bar.parent-task {
            background-color: hsl(142, 71%, 40%) !important;
            border-color: transparent !important;
            color: #ffffff !important;
            border-radius: 6px !important;
          }
          
          /* Make scrollbars thin and match theme */
          .pm-gantt-wrapper ::-webkit-scrollbar {
            width: 8px;
            height: 8px;
          }
          .pm-gantt-wrapper ::-webkit-scrollbar-track {
            background: hsl(222, 47%, 11%);
          }
          .pm-gantt-wrapper ::-webkit-scrollbar-thumb {
            background: hsl(215, 28%, 20%);
            border-radius: 4px;
          }
          .pm-gantt-wrapper ::-webkit-scrollbar-thumb:hover {
            background: hsl(217, 91%, 60%);
          }
          /* Override SVAR Gantt default tooltip wrapper styles */
          .wx-tooltip {
            background-color: transparent !important;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
          }

          ${dynamicStyles}
          `}</style>
        {mappedTasks.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8">
            <p className="text-lg">
              No tasks found matching the current filters.
            </p>
            <p className="text-sm">
              Try clearing some filters to see tasks in the timeline.
            </p>
          </div>
        ) : (
          <WillowDark>
            <Tooltip api={ganttApi} content={CustomTooltipContent}>
              <Gantt
                init={handleInit}
                tasks={mappedTasks}
                links={[]}
                columns={ganttColumns}
                zoom={true}
                start={ganttTimeRange.start}
                end={ganttTimeRange.end}
                cellWidth={timescaleConfig.cellWidth}
                scales={timescaleConfig.scales}
                autoScale={false}
                unscheduledTasks={false}
                taskTypes={ganttTaskTypes}
              />
            </Tooltip>
          </WillowDark>
        )}
      </div>


    </div>
  );
}
