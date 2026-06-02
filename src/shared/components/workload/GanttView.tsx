import { useCallback, useMemo } from "react";
import { Gantt, WillowDark } from "@svar-ui/react-gantt";
import "@svar-ui/react-gantt/all.css";
import { format, addDays, parseISO, differenceInDays } from "date-fns";
import type { TaskGroup, Task } from "./utils/workload-types";

interface GanttViewProps {
  groups: TaskGroup[];
  onEstimatedDateChange: (
    taskId: string,
    fromDate: string | null,
    toDate?: string | null,
  ) => void;
  onTaskClick: (task: Task) => void;
}

export default function GanttView({
  groups,
  onEstimatedDateChange,
  onTaskClick,
}: GanttViewProps) {
  // Helper to find a task by ID inside our groups/tasks hierarchy
  const getTaskById = useCallback(
    (id: string): Task | null => {
      for (const group of groups) {
        for (const task of group.tasks) {
          if (task.id === id) return task;
          if (task.subitems) {
            for (const sub of task.subitems) {
              if (sub.id === id) return sub;
            }
          }
        }
      }
      return null;
    },
    [groups],
  );

  // Helper to calculate duration in days between two ISO date strings (inclusive)
  const calculateDuration = (fromStr?: string, toStr?: string): number => {
    if (!fromStr || !toStr) return 1;
    try {
      const from = parseISO(fromStr);
      const to = parseISO(toStr);
      if (isNaN(from.getTime()) || isNaN(to.getTime())) return 1;
      return Math.max(1, differenceInDays(to, from) + 1);
    } catch {
      return 1;
    }
  };

  // Helper to resolve start date and duration for a task dynamically
  const getTaskDates = (task: Task): { start: Date; duration: number } => {
    let start = new Date();
    let duration = 1;

    const taskAny = task as any;
    const rawFrom =
      taskAny.estimatedDateRaw || taskAny.estimation?.estimated_date_from;
    const rawTo =
      taskAny.estimatedDateEnd || taskAny.estimation?.estimated_date_to;

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
  };

  // Map our groups and tasks to SVAR's expected format (reactive to groups prop changes)
  const mappedTasks = useMemo(() => {
    const list = [];

    for (const group of groups) {
      // 1. Map the group header row (Summary Task)
      list.push({
        id: `group-${group.id}`,
        text: group.name,
        type: "summary",
        open: true,
      });

      for (const task of group.tasks) {
        const { start: taskStart, duration: taskDuration } = getTaskDates(task);

        // 2. Map the main task row
        list.push({
          id: task.id,
          text: task.name || "Untitled Task",
          start: taskStart,
          duration: taskDuration,
          parent: `group-${group.id}`,
          progress: 0,
        });

        // 3. Map subitems if they exist
        if (task.subitems && task.subitems.length > 0) {
          for (const sub of task.subitems) {
            const { start: subStart, duration: subDuration } =
              getTaskDates(sub);

            list.push({
              id: sub.id,
              text: sub.name || "Untitled Subitem",
              start: subStart,
              duration: subDuration,
              parent: task.id,
              progress: 0,
            });
          }
        }
      }
    }
    return list;
  }, [groups]);

  // Handle SVAR Gantt actions and events
  const handleInit = useCallback(
    (api: any) => {
      // 1. Task Selection listener (clicking a task row/bar)
      api.on("select-task", (id: string) => {
        if (!id) return;
        if (id.startsWith("group-")) return; // Don't trigger for group summary rows

        const task = getTaskById(id);
        if (task) {
          onTaskClick(task);
        }
      });

      // 2. Intercept update actions (dragging or resizing task bars on the timeline)
      api.setNext({
        send: (action: string, payload: any) => {
          if (action === "update-task") {
            const { id, task } = payload;
            if (id.startsWith("group-")) return true; // Groups can't be dragged directly to update dates

            const start = task.start;
            const duration = task.duration;

            if (start && duration) {
              const fromDateStr = format(start, "yyyy-MM-dd");
              const toDateStr = format(
                addDays(start, duration - 1),
                "yyyy-MM-dd",
              );

              onEstimatedDateChange(id, fromDateStr, toDateStr);
            }
          }
          return true; // Keep visual update in Gantt UI synchronous
        },
      });
    },
    [getTaskById, onEstimatedDateChange, onTaskClick],
  );

  return (
    <div className="flex-1 w-full h-[calc(100vh-220px)] min-h-[500px] flex flex-col bg-background text-foreground border border-border rounded-lg overflow-hidden mt-4">
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
          <Gantt init={handleInit} tasks={mappedTasks} links={[]} />
        </WillowDark>
      )}
    </div>
  );
}
