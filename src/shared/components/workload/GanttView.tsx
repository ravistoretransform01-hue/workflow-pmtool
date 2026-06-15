import { useCallback, useMemo, useState, useRef, useEffect } from "react";
import { Gantt, WillowDark, Tooltip } from "@svar-ui/react-gantt";
import "@svar-ui/react-gantt/all.css";
import { format, addDays, parseISO, differenceInCalendarDays, startOfMonth, endOfMonth } from "date-fns";
import type { TaskGroup, Task } from "./utils/workload-types";
import { cn } from "@/lib/utils";
import { Plus, Loader2 } from "lucide-react";
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
          <span className="text-slate-200 font-medium">{startStr && endStr ? `${startStr} – ${endStr}` : "Unscheduled"}</span>
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
            <span className={cn(
              "px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider",
              data.priority.toLowerCase() === "high" ? "bg-red-500/20 text-red-400 border border-red-500/30" :
              data.priority.toLowerCase() === "medium" ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" :
              "bg-slate-500/20 text-slate-400 border border-slate-500/30"
            )}>
              {data.priority}
            </span>
          </div>
        )}
        {data.status && (
          <div className="flex items-center justify-between gap-4">
            <span>Status:</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30 uppercase tracking-wider">
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
const StartDateCell = ({ row }: { row: any }) => {
  if (!row || !row.start || row.unscheduled) {
    return <span className="text-muted-foreground/60">-</span>;
  }
  try {
    const d = new Date(row.start);
    if (isNaN(d.getTime())) return <span className="text-muted-foreground/60">-</span>;
    return <span>{format(d, "MMM d, yyyy")}</span>;
  } catch {
    return <span className="text-muted-foreground/60">-</span>;
  }
};

const EndDateCell = ({ row }: { row: any }) => {
  if (!row || !row.start || !row.duration || row.unscheduled) {
    return <span className="text-muted-foreground/60">-</span>;
  }
  try {
    const start = new Date(row.start);
    const end = addDays(start, row.duration - 1);
    return <span>{format(end, "MMM d, yyyy")}</span>;
  } catch {
    return <span className="text-muted-foreground/60">-</span>;
  }
};

interface GanttViewProps {
  groups: TaskGroup[];
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
  ) => Promise<void>;
}

export default function GanttView({
  groups,
  onEstimatedDateChange,
  onTaskClick,
  onAddTask,
}: GanttViewProps) {
  const [scaleMode, setScaleMode] = useState<"day" | "week">("day");
  const [ganttApi, setGanttApi] = useState<any>(null);

  const [isAddPopoverOpen, setIsAddPopoverOpen] = useState(false);
  const [newTaskName, setNewTaskName] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [parentTaskId, setParentTaskId] = useState("none");
  const [startDateStr, setStartDateStr] = useState("");
  const [endDateStr, setEndDateStr] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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

    setIsSubmitting(true);
    try {
      if (onAddTask) {
        await onAddTask(
          newTaskName.trim(),
          selectedGroupId,
          startDateStr || undefined,
          endDateStr || undefined,
          parentTaskId !== "none" ? parentTaskId : undefined
        );
      }
      // Reset form
      setNewTaskName("");
      setStartDateStr("");
      setEndDateStr("");
      setParentTaskId("none");
      setIsAddPopoverOpen(false);
    } catch (err) {
      console.error("Failed to add task:", err);
    } finally {
      setIsSubmitting(false);
    }
  }, [newTaskName, selectedGroupId, startDateStr, endDateStr, parentTaskId, onAddTask]);

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
          priority: task.priority,
          status: task.status,
          estimatedHours: task.estimatedHours,
        });

        // 2. Map subitems if they exist under the main task parent
        if (hasSubitems) {
          for (const sub of task.subitems!) {
            const { start: subStart, duration: subDuration } =
              getTaskDates(sub);
            const isSubScheduled = hasEstimation(sub);

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
              priority: sub.priority,
              status: sub.status,
              estimatedHours: sub.estimatedHours,
            });
          }
        }
      }
    }
    return list;
  }, [groups, hasEstimation, getTaskDates]);

  // Handle SVAR Gantt actions and events
  const handleInit = useCallback(
    (api: any) => {
      setGanttApi(api);
      // 1. Intercept select-task to open the custom task dialog/card, returning false to prevent persistent selection background
      api.intercept("select-task", (payload: any) => {
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
      { id: "text", width: 250, resize: true, header: [{ text: "Task Name" }] },
      {
        id: "start",
        width: 110,
        resize: true,
        header: [{ text: "Start Date" }],
        cell: StartDateCell,
      },
      {
        id: "end",
        width: 110,
        resize: true,
        header: [{ text: "End Date" }],
        cell: EndDateCell,
      },
    ],
    [],
  );

  const ganttTimeRange = useMemo(() => {
    const now = new Date();
    // Default range is 6 months before and 6 months after the current month
    let minDate = addDays(startOfMonth(now), -180);
    let maxDate = addDays(endOfMonth(now), 180);

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
  }, [groups, hasEstimation, getTaskDates]);

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
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="startDate" className="text-slate-300 text-xs">Start Date (Opt)</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={startDateStr}
                      onChange={(e) => setStartDateStr(e.target.value)}
                      className="bg-slate-950 border-slate-800 focus-visible:ring-primary text-white scheme-dark text-xs h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="endDate" className="text-slate-300 text-xs">End Date (Opt)</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={endDateStr}
                      onChange={(e) => setEndDateStr(e.target.value)}
                      className="bg-slate-950 border-slate-800 focus-visible:ring-primary text-white scheme-dark text-xs h-9"
                    />
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
