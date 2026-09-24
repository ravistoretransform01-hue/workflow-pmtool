import type { Member } from "@/features/cms/types/types";
import type {
  DailyProject,
  DailyTask,
} from "@/features/workload/components/DevBoardDailyView";

interface DevBoardDailyTeamBoardProps {
  projects: DailyProject[];
  members: Member[];
  boardColors: Record<string, string>;
  searchQuery: string;
  filter: "All" | "Pending" | "Completed";
}

interface BoardCard {
  task: DailyTask;
  project: DailyProject;
}

const UNASSIGNED = "unassigned";

const HEADER_COLORS = [
  "#3b82f6",
  "#10b981",
  "#ef4444",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
];

export const getInitials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

/**
 * Saved daily plan shown as one column per team member (like Team Kanban).
 * A task assigned to several people appears in each of their columns.
 */
export function DevBoardDailyTeamBoard({
  projects,
  members,
  boardColors,
  searchQuery,
  filter,
}: DevBoardDailyTeamBoardProps) {
  const memberName = (userId: string) =>
    members.find((m) => String(m.user_id) === userId)?.name ||
    `Member #${userId}`;

  const query = searchQuery.trim().toLowerCase();
  const columns = new Map<string, BoardCard[]>();

  projects.forEach((project) =>
    project.tasks.forEach((task) => {
      if (query && !task.title.toLowerCase().includes(query)) return;
      if (filter === "Pending" && task.status !== "pending") return;
      if (filter === "Completed" && task.status !== "completed") return;

      const ids = task.assigneeIds?.length ? task.assigneeIds : [UNASSIGNED];
      ids.forEach((id) => {
        if (!columns.has(id)) columns.set(id, []);
        columns.get(id)!.push({ task, project });
      });
    }),
  );

  const columnIds = [...columns.keys()]
    .filter((id) => id !== UNASSIGNED)
    .sort((a, b) => memberName(a).localeCompare(memberName(b)));
  if (columns.has(UNASSIGNED)) columnIds.push(UNASSIGNED);

  if (columnIds.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center py-16 text-sm text-muted-foreground">
        {projects.some((p) => p.tasks.length > 0)
          ? "No tasks match the current search or filter."
          : "Nothing saved for this date yet. Add tasks in Plan and click Save."}
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-auto custom-scrollbar pb-2">
      <div className="flex w-max gap-6 pb-4 items-start">
        {columnIds.map((columnId, index) => {
          const cards = columns.get(columnId)!;
          const isUnassigned = columnId === UNASSIGNED;
          const name = isUnassigned ? "Unassigned" : memberName(columnId);
          const headerColor = HEADER_COLORS[index % HEADER_COLORS.length];

          return (
            <div
              key={columnId}
              className="flex-shrink-0 w-80 rounded-xl border flex flex-col overflow-hidden max-h-[75vh] bg-[#f8fafc] dark:bg-[#0f172a] border-slate-200 dark:border-slate-800"
            >
              {/* Column header */}
              <div className="p-4 border-b flex items-center gap-2.5 min-w-0 shadow-sm bg-[#f8fafc] dark:bg-[#0f172a] border-slate-200 dark:border-slate-800">
                <div
                  className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center border border-border/50 text-[10px] font-bold uppercase"
                  style={
                    isUnassigned
                      ? undefined
                      : {
                          backgroundColor: `${headerColor}20`,
                          color: headerColor,
                        }
                  }
                >
                  {isUnassigned ? "?" : getInitials(name)}
                </div>
                <h3
                  className="font-bold text-sm tracking-tight text-slate-900 dark:text-slate-100 truncate"
                  title={name}
                >
                  {name}
                </h3>
                <span className="text-[10px] font-black bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full min-w-[20px] text-center shrink-0">
                  {cards.length}
                </span>
              </div>

              {/* Cards */}
              <div className="p-3 space-y-3 overflow-y-auto custom-scrollbar">
                {cards.map(({ task, project }) => {
                  const assigneeNames = (task.assigneeIds ?? []).map(
                    memberName,
                  );
                  const visibleAssignees = assigneeNames.slice(0, 3);
                  const extraAssignees = assigneeNames.length - 3;
                  const projectColor =
                    (project.boardId && boardColors[project.boardId]) ||
                    "hsl(var(--primary))";
                  const isCompleted = task.status === "completed";

                  return (
                    <div
                      key={`${project.id}-${task.id}`}
                      className="bg-card border border-border rounded-lg p-3 flex flex-col gap-3 min-h-[150px]"
                    >
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider min-w-0">
                          <div
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ backgroundColor: projectColor }}
                          />
                          <span className="truncate" title={project.name}>
                            {project.name}
                          </span>
                        </div>
                        <h4
                          className={`text-sm font-bold line-clamp-2 mt-1 ${
                            isCompleted
                              ? "text-muted-foreground line-through"
                              : "text-foreground"
                          }`}
                          title={task.title}
                        >
                          {task.title}
                        </h4>
                        {task.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {task.description}
                          </p>
                        )}
                      </div>

                      <div className="text-xs text-muted-foreground">
                        Hours: {task.hours ? `${task.hours}h` : "-"}
                      </div>

                      <div className="flex flex-wrap gap-2 items-center">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-medium border ${
                            isCompleted
                              ? "border-emerald-500/40 text-emerald-500 bg-emerald-500/10"
                              : "border-amber-500/40 text-amber-500 bg-amber-500/10"
                          }`}
                        >
                          {isCompleted ? "Completed" : "Pending"}
                        </span>
                      </div>

                      <div
                        className="mt-auto pt-2 border-t border-border flex flex-wrap items-center gap-1"
                        title={assigneeNames.join(", ")}
                      >
                        {visibleAssignees.length === 0 && (
                          <span className="text-[10px] text-muted-foreground italic">
                            Unassigned
                          </span>
                        )}
                        {visibleAssignees.map((assigneeName, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-1 bg-muted/40 rounded-full pr-1.5 p-0.5 border border-border/80"
                          >
                            <span className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] bg-primary/10 text-primary uppercase font-bold">
                              {assigneeName.charAt(0)}
                            </span>
                            <span className="text-[9px] font-medium truncate max-w-[60px] text-foreground">
                              {assigneeName}
                            </span>
                          </div>
                        ))}
                        {extraAssignees > 0 && (
                          <div className="flex items-center justify-center h-4 px-1 rounded-full bg-muted border border-border text-[8px] font-medium text-muted-foreground">
                            +{extraAssignees}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
