import React, { useState, useMemo } from "react";
import { isToday, isTomorrow, isThisWeek, addDays, startOfDay } from "date-fns";
import { ChevronRight, ChevronDown } from "lucide-react";
import { cn } from "@/utils/utils";
import type { Status, Priority } from "@/features/cms/types/types";
import { getWorkloadColumns } from "@/features/workload/components/WorkloadColumns";
import type { Task } from "@/features/workload/types/workload-types";

interface ListViewProps {
  groups: Array<{ id: string; name: string; color: string; tasks: Task[] }>;
  statuses: Status[];
  priorities: Priority[];
  members: any[];
  tags: any[];
  onTaskClick: (task: Task) => void;

  // Handlers and state for columns
  expandedTasks: Record<string, boolean>;
  toggleTask: (taskId: string) => void;
  onOpenComments: (task: any) => void;
  onOpenTaskCard: (task: any, initialEditDescription?: boolean) => void;
  onStatusChange: (taskId: string, statusId: string) => Promise<void>;
  onPriorityChange: (taskId: string, priorityId: string) => void;
  onPersonChange: (taskId: string, memberIds: string[]) => void;
  onRatingChange: (taskId: string, rating: number) => void;
  onEstimatedDateChange: (
    taskId: string,
    fromDate: string | null,
    toDate?: string | null,
  ) => void;
  onEstimatedTimeChange: (
    taskId: string,
    hours: string | number | null,
  ) => void;
  onTagChange: (taskId: string, tags: any[]) => void;
  openPopoverId: string | null;
  setOpenPopoverId: (id: string | null) => void;
  boardId: string | number;
  onTagCreated: (newTag: any) => void;
  onStatusCreated: (newStatus: Status) => void;
  onStatusesUpdated: (statuses: Status[]) => void;
  onPriorityCreated: (newPriority: Priority) => void;
  onPrioritiesUpdated: (priorities: Priority[]) => void;
  inlineEditingTaskId: string | null;
  setInlineEditingTaskId: (id: string | null) => void;
  inlineEditingTaskName: string;
  setInlineEditingTaskName: (name: string) => void;
  onInlineEditTaskName: (taskId: string, newName: string) => void;
  activeTimerId: string | null;
  onTimerStart: (
    taskId: string | null,
    taskName?: string,
    trackedTimeSeconds?: number,
  ) => void;
  onTimerConflict: (taskId: string) => void;
  onTimeUpdate: (taskId: string, seconds: number) => void;
  workloadColumns?: any[]; // Allow passing pre-filtered columns from parent
}

interface ListViewTask extends Task {
  groupColor: string;
  estimatedDateRaw?: string;
  recurrence?: any;
}

// Categorize by raw ISO date and properties
function categorizeTask(task: ListViewTask): string {
  if (task.recurrence) return "recurring";

  const rawDate = task.estimatedDateRaw;
  if (!rawDate || rawDate === "-") return "noDate";
  const d = new Date(rawDate);
  if (isNaN(d.getTime())) return "noDate";

  const today = startOfDay(new Date());
  const dateDay = startOfDay(d);

  if (dateDay < today) return "overdue";
  if (isToday(d)) return "today";
  if (isTomorrow(d)) return "tomorrow";
  if (isThisWeek(d, { weekStartsOn: 1 })) return "thisWeek";
  if (d < addDays(today, 14)) return "nextWeek";
  return "later";
}

const SECTIONS = [
  { key: "overdue", label: "Overdue", color: "#a855f7" },
  { key: "today", label: "Today", color: "#4ade80" },
  { key: "tomorrow", label: "Tomorrow", color: "#60a5fa" },
  { key: "thisWeek", label: "This week", color: "#a855f7" },
  { key: "nextWeek", label: "Next week", color: "#22d3ee" },
  { key: "later", label: "Later", color: "#facc15" },
  { key: "recurring", label: "Recurring", color: "#3b82f6" },
  { key: "noDate", label: "Without a date", color: "#6b7280" },
];

export function ListView(props: ListViewProps) {
  const {
    groups,
    onTaskClick,
    expandedTasks,
    workloadColumns: propsColumns,
    onOpenComments,
  } = props;

  // Initialize shared columns - use props columns if available, otherwise generate them
  const workloadColumns = useMemo(() => {
    return propsColumns || getWorkloadColumns(props);
  }, [props, propsColumns]);

  // Flatten all tasks from groups (main tasks only; subitems rendered inline)
  const allTasks = useMemo<ListViewTask[]>(() => {
    return groups.flatMap((group) =>
      group.tasks.map((t) => ({
        ...t,
        groupColor: group.color,
      })),
    );
  }, [groups]);

  // Expand state for sections
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({
    overdue: false,
    today: false,
    tomorrow: false,
    thisWeek: false,
    nextWeek: false,
    later: false,
    recurring: false,
    noDate: false,
  });

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Filter and categorize tasks
  const categorizedTasks = useMemo(() => {
    const categories: Record<string, ListViewTask[]> = {
      overdue: [],
      today: [],
      tomorrow: [],
      thisWeek: [],
      nextWeek: [],
      later: [],
      recurring: [],
      noDate: [],
    };

    allTasks.forEach((task) => {
      const cat = categorizeTask(task);
      categories[cat].push(task);
    });

    return categories;
  }, [allTasks]);

  const totalTasks = allTasks.length;

  return (
    <div className="flex-1 overflow-auto bg-background/50">
      <table className="w-full border-collapse table-fixed min-w-[1200px]">
        {/* Single global sticky header */}
        <thead className="sticky top-0 z-20 bg-background shadow-sm">
          <tr className="border-b border-border bg-muted/30">
            {workloadColumns.map((col) => (
              <th
                key={col.id}
                className={cn(
                  "p-4 text-xs font-medium text-muted-foreground border-r border-border",
                  col.align === "center" ? "text-center" : "text-left",
                )}
                style={{
                  width: col.width,
                  minWidth: col.minWidth || col.width,
                  maxWidth: col.maxWidth || col.width,
                }}
              >
                {col.label}
              </th>
            ))}
            <th className="border-none w-auto" />
          </tr>
        </thead>

        <tbody>
          {totalTasks === 0 && (
            <tr>
              <td
                colSpan={workloadColumns.length + 1}
                className="py-1 text-center text-muted-foreground text-sm"
              >
                No tasks found.
              </td>
            </tr>
          )}

          {SECTIONS.map((section) => {
            const tasks = categorizedTasks[section.key] || [];
            const isExpanded = expandedSections[section.key];

            return (
              <React.Fragment key={section.key}>
                {/* Section Group Header Row */}
                <tr
                  className="cursor-pointer hover:bg-hover transition-colors shadow-sm"
                  onClick={() => toggleSection(section.key)}
                >
                  <td
                    colSpan={workloadColumns.length + 1}
                    className="px-6 py-3"
                    style={{ borderLeftColor: section.color }}
                  >
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronDown
                          className="h-6 w-6 shrink-0 transition-transform"
                          style={{ color: section.color }}
                        />
                      ) : (
                        <ChevronRight
                          className="h-6 w-6 shrink-0 transition-transform"
                          style={{ color: section.color }}
                        />
                      )}
                      <span
                        className="font-bold text-2xl tracking-tight"
                        style={{ color: section.color }}
                      >
                        {section.label}
                      </span>
                      <span className="text-xl text-muted-foreground/60 font-medium">
                        {tasks.length} items
                      </span>
                    </div>
                  </td>
                </tr>

                {/* Task Rows */}
                {isExpanded &&
                  tasks.map((task) => {
                    const hasSubitems =
                      task.subitems && task.subitems.length > 0;
                    const isTaskExpanded = expandedTasks[task.id];

                    return (
                      <React.Fragment key={task.id}>
                        {/* Main Task Row */}
                        <tr
                          onClick={() => onTaskClick(task)}
                          className={cn(
                            "border-b border-border hover:bg-primary/5 cursor-pointer transition-colors group",
                            "border-l-4",
                          )}
                          style={{ borderLeftColor: task.groupColor }}
                        >
                          {workloadColumns.map((col) => (
                            <td
                              key={col.id}
                              className={cn(
                                "p-4 border-r border-border hover:bg-muted/30 hover:ring-1 hover:ring-inset hover:ring-primary/40 transition-all hover:relative hover:z-20",
                                col.align === "center" && "text-center",
                              )}
                              style={{
                                width: col.width,
                                minWidth: col.minWidth || col.width,
                                maxWidth: col.maxWidth || col.width,
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (col.id === "item") {
                                  onOpenComments(task);
                                }
                              }}
                            >
                              {col.render(task)}
                            </td>
                          ))}
                          <td className="bg-muted/5" />
                        </tr>

                        {/* Subitem Rows */}
                        {hasSubitems &&
                          isTaskExpanded &&
                          task.subitems!.map((sub) => {
                            return (
                              <tr
                                key={sub.id}
                                onClick={() => onTaskClick(sub)}
                                className="border-b border-border/30 hover:bg-primary/5 cursor-pointer transition-colors bg-muted/10"
                              >
                                {workloadColumns.map((col) => (
                                  <td
                                    key={col.id}
                                    className={cn(
                                      "p-4 border-r border-border hover:bg-muted/30 hover:ring-1 hover:ring-inset hover:ring-primary/40 transition-all hover:relative hover:z-20",
                                      col.align === "center" && "text-center",
                                    )}
                                    style={{
                                      width: col.width,
                                      minWidth: col.minWidth || col.width,
                                      maxWidth: col.maxWidth || col.width,
                                    }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (col.id === "item") {
                                        onOpenComments(sub);
                                      }
                                    }}
                                  >
                                    {col.render(sub, true)}
                                  </td>
                                ))}
                                <td />
                              </tr>
                            );
                          })}
                      </React.Fragment>
                    );
                  })}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
