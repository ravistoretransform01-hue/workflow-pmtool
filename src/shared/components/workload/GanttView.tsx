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
        open: group.tasks && group.tasks.length > 0,
        start: new Date(),
        duration: 1,
      });

      for (const task of group.tasks) {
        const { start: taskStart, duration: taskDuration } = getTaskDates(task);
        const hasSubitems = task.subitems && task.subitems.length > 0;

        // 2. Map the main task row
        list.push({
          id: task.id,
          text: task.name || "Untitled Task",
          start: taskStart,
          duration: taskDuration,
          parent: `group-${group.id}`,
          progress: 0,
          type: hasSubitems ? "summary" : undefined,
          open: hasSubitems ? true : undefined,
        });

        // 3. Map subitems if they exist
        if (hasSubitems) {
          for (const sub of task.subitems!) {
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

  const ganttColumns = useMemo(() => [
    { id: "text", width: 250, resize: true, header: [{ text: "Task Name" }] },
    { id: "start", width: 100, resize: true, header: [{ text: "Start Date" }] },
    { id: "duration", width: 80, resize: true, header: [{ text: "Duration" }] },
  ], []);

  const ganttTimeRange = useMemo(() => {
    let minDate = new Date();
    let maxDate = addDays(new Date(), 30);

    let hasTasks = false;
    for (const group of groups) {
      for (const task of group.tasks) {
        const { start, duration } = getTaskDates(task);
        const taskEnd = addDays(start, duration);
        if (!hasTasks) {
          minDate = start;
          maxDate = taskEnd;
          hasTasks = true;
        } else {
          if (start < minDate) minDate = start;
          if (taskEnd > maxDate) maxDate = taskEnd;
        }
      }
    }

    const start = addDays(minDate, -3);
    const end = addDays(start, Math.max(30, differenceInDays(maxDate, start) + 7));

    return { start, end };
  }, [groups]);

  return (
    <div className="flex-1 w-full h-[calc(100vh-220px)] min-h-[500px] flex flex-col bg-background text-foreground border border-border rounded-lg overflow-hidden mt-4 pm-gantt-wrapper">
      <style>{`
        /* Custom styles to match the PM tool aesthetic */
        .pm-gantt-wrapper .wx-gantt {
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
          <Gantt
            init={handleInit}
            tasks={mappedTasks}
            links={[]}
            columns={ganttColumns}
            zoom={true}
            start={ganttTimeRange.start}
            end={ganttTimeRange.end}
            cellWidth={60}
            autoScale={true}
          />
        </WillowDark>
      )}
    </div>
  );
}
