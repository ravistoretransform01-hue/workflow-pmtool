import { useState, useRef } from "react";
import { format } from "date-fns";
import {
  Search,
  ChevronDown,
  Plus,
  Calendar,
  Pencil,
  Trash2,
  X,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  UserPlus,
  ChevronRight,
  Save,
  List,
  LayoutGrid,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { Calendar as DatePickerCalendar } from "@/shared/ui/calendar";
import { Checkbox } from "@/shared/ui/checkbox";
import { useAppSelector } from "@/hooks";
import { tasksApi } from "@/features/tasks/api/tasksApi";
import type { TaskResponse } from "@/features/tasks/types/types";
import { groupsApi } from "@/features/groups/api/groupsApi";
import type { Group } from "@/features/groups/types/types";
import type { Member } from "@/features/cms/types/types";
import { stringToHslColor } from "@/features/workload/utils";
import { useBeforeUnload } from "@/features/workload/hooks/useBeforeUnload";
import {
  DevBoardDailyTeamBoard,
  getInitials,
} from "@/features/workload/components/DevBoardDailyTeamBoard";

interface DevBoardDailyViewProps {
  boardId: string | number;
  members?: Member[];
}

interface Task {
  id: string;
  title: string;
  status: "pending" | "completed";
  description?: string;
  hours?: string;
  assigneeIds?: string[];
}

interface Project {
  id: string;
  name: string;
  boardId?: string;
  groupId?: string;
  color?: string;
  tasks: Task[];
  expanded: boolean;
}

export type DailyTask = Task;
export type DailyProject = Project;

type DateMap = Record<string, Project[]>;

/* ─── localStorage persistence (no API yet) ─── */
const getStorageKey = (boardId: string | number) =>
  `devboard-daily:${boardId}`;

const loadSavedDateMap = (boardId: string | number): DateMap => {
  try {
    const raw = localStorage.getItem(getStorageKey(boardId));
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed?.dateMap && typeof parsed.dateMap === "object"
      ? parsed.dateMap
      : {};
  } catch {
    return {};
  }
};

// Compare plans ignoring UI-only state (expanded/collapsed projects)
const serializeDateMap = (map: DateMap) =>
  JSON.stringify(map, (key, value) =>
    key === "expanded" ? undefined : value,
  );

const toDayKey = (dateStr: string) => format(new Date(dateStr), "yyyy-MM-dd");

// Today's entry if saved, otherwise the most recent date
const pickInitialDate = (map: DateMap): string | null => {
  const dates = Object.keys(map);
  const todayKey = format(new Date(), "yyyy-MM-dd");
  return (
    dates.find((d) => toDayKey(d) === todayKey) ??
    dates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ??
    null
  );
};

/* ─── tiny CSS-in-JS for keyframe animation ─── */
const collapseStyle = `
@keyframes slideDown {
  from { opacity: 0; transform: translateY(-6px); }
  to   { opacity: 1; transform: translateY(0); }
}
.anim-slide-down { animation: slideDown 150ms ease-out forwards; }
`;

export function DevBoardDailyView({
  boardId,
  members = [],
}: DevBoardDailyViewProps) {
  const [savedDateMap, setSavedDateMap] = useState<DateMap>(() =>
    loadSavedDateMap(boardId),
  );
  const [dateMap, setDateMap] = useState<DateMap>(savedDateMap);
  const [activeDateStr, setActiveDateStr] = useState<string | null>(() =>
    pickInitialDate(savedDateMap),
  );
  const [viewMode, setViewMode] = useState<"plan" | "board">(() =>
    Object.keys(savedDateMap).length > 0 ? "board" : "plan",
  );
  const [isAddingDate, setIsAddingDate] = useState(false);
  const [filter, setFilter] = useState<"All" | "Pending" | "Completed">("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editProjectName, setEditProjectName] = useState("");
  const [addingTaskToProject, setAddingTaskToProject] = useState<string | null>(
    null,
  );
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskHours, setNewTaskHours] = useState("");
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectBoardId, setNewProjectBoardId] = useState<string | null>(
    null,
  );
  const [newProjectGroup, setNewProjectGroup] = useState<{
    id: string;
    color?: string;
  } | null>(null);
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const [projectSearchQuery, setProjectSearchQuery] = useState("");
  // Groups of the current project (board) for the "Add project" dropdown
  const [groupOptions, setGroupOptions] = useState<{
    loading: boolean;
    groups: Group[];
  } | null>(null);
  const [assigningTaskId, setAssigningTaskId] = useState<string | null>(null);
  const [assignSearchQuery, setAssignSearchQuery] = useState("");
  const [isTaskDropdownOpen, setIsTaskDropdownOpen] = useState(false);
  const [taskSearchQuery, setTaskSearchQuery] = useState("");
  const [boardTasks, setBoardTasks] = useState<
    Record<string, { loading: boolean; tasks: TaskResponse[] }>
  >({});
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskTitle, setEditingTaskTitle] = useState("");
  const [editingTaskDescription, setEditingTaskDescription] = useState("");
  const [editingTaskHours, setEditingTaskHours] = useState("");
  const stickyRef = useRef<HTMLDivElement>(null);

  const projects =
    activeDateStr && dateMap[activeDateStr] ? dateMap[activeDateStr] : [];

  // The "Add project" dropdown lists only the current project's (board's)
  // groups; groups already added to the active date are hidden
  const boards = useAppSelector((state) => state.boards.boards);
  const organizationId = useAppSelector(
    (state) => state.auth.user?.organization_id,
  );
  const currentBoard = boards.find((b) => String(b.id) === String(boardId));
  const addedGroupIds = new Set(
    projects.map((p) => p.groupId).filter(Boolean),
  );
  const availableGroups = (groupOptions?.groups ?? []).filter(
    (g) => !addedGroupIds.has(String(g.id)),
  );
  const visibleGroups = availableGroups.filter((g) =>
    (g.name || "")
      .toLowerCase()
      .includes(projectSearchQuery.trim().toLowerCase()),
  );

  const loadGroupOptions = async () => {
    if (groupOptions) return;
    setGroupOptions({ loading: true, groups: [] });
    try {
      const groups = await groupsApi.getGroupsByBoard(Number(boardId));
      setGroupOptions({
        loading: false,
        groups: [...groups].sort((a, b) =>
          (a.name || "").localeCompare(b.name || "", undefined, {
            sensitivity: "base",
          }),
        ),
      });
    } catch {
      toast.error("Failed to load groups");
      // Clear so opening the dropdown again retries
      setGroupOptions(null);
    }
  };

  const startAddingProject = () => {
    setIsAddingProject(true);
    setIsProjectDropdownOpen(true);
    loadGroupOptions();
  };

  const cancelAddingProject = () => {
    setIsAddingProject(false);
    setIsProjectDropdownOpen(false);
    setNewProjectName("");
    setNewProjectBoardId(null);
    setNewProjectGroup(null);
    setProjectSearchQuery("");
  };

  const selectGroupOption = (group: Group) => {
    setNewProjectName(group.name);
    setNewProjectBoardId(String(boardId));
    setNewProjectGroup({ id: String(group.id), color: group.color });
    setProjectSearchQuery("");
    setIsProjectDropdownOpen(false);
  };

  // Tasks of a project's board, fetched once per board for the "Add task" dropdown
  const loadBoardTasks = async (boardId: string) => {
    if (boardTasks[boardId]) return;
    setBoardTasks((prev) => ({
      ...prev,
      [boardId]: { loading: true, tasks: [] },
    }));
    try {
      const tasks = await tasksApi.getTasksByBoardId(boardId, organizationId);
      setBoardTasks((prev) => ({
        ...prev,
        [boardId]: { loading: false, tasks },
      }));
    } catch {
      // Drop the entry so reopening the form retries
      setBoardTasks((prev) => {
        const next = { ...prev };
        delete next[boardId];
        return next;
      });
    }
  };

  const startAddingTask = (project: Project) => {
    setAddingTaskToProject(project.id);
    setIsTaskDropdownOpen(true);
    if (project.boardId) loadBoardTasks(project.boardId);
  };

  const getTaskOptions = (project: Project) => {
    const addedTitles = new Set(
      project.tasks.map((t) => t.title.toLowerCase()),
    );
    const query = taskSearchQuery.trim().toLowerCase();
    return (project.boardId ? boardTasks[project.boardId]?.tasks ?? [] : [])
      .filter(
        (t) =>
          !t.parent_id &&
          (!project.groupId || String(t.group_id) === project.groupId) &&
          !addedTitles.has(t.name.toLowerCase()) &&
          t.name.toLowerCase().includes(query),
      );
  };

  const filteredMembers = members.filter((m) =>
    (m.name ?? "")
      .toLowerCase()
      .includes(assignSearchQuery.trim().toLowerCase()),
  );

  const closeAssignDropdown = () => {
    setAssigningTaskId(null);
    setAssignSearchQuery("");
  };

  const setTaskAssignees = (
    projectId: string,
    taskId: string,
    assigneeIds: string[],
  ) =>
    updateActiveProjects(
      projects.map((p) =>
        p.id === projectId
          ? {
              ...p,
              tasks: p.tasks.map((t) =>
                t.id === taskId ? { ...t, assigneeIds } : t,
              ),
            }
          : p,
      ),
    );

  const toggleTaskAssignee = (
    projectId: string,
    task: Task,
    userId: string,
  ) => {
    const current = task.assigneeIds ?? [];
    setTaskAssignees(
      projectId,
      task.id,
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId],
    );
  };

  const selectTaskOption = (title: string) => {
    setNewTaskTitle(title);
    setTaskSearchQuery("");
    setIsTaskDropdownOpen(false);
  };

  const updateActiveProjects = (newProjects: Project[]) => {
    if (!activeDateStr) return;
    setDateMap({ ...dateMap, [activeDateStr]: newProjects });
  };

  const toggleProject = (id: string) =>
    updateActiveProjects(
      projects.map((p) => (p.id === id ? { ...p, expanded: !p.expanded } : p)),
    );

  const handleAddProject = () => {
    if (!newProjectName.trim()) return;
    updateActiveProjects([
      ...projects,
      {
        id: `p${Date.now()}`,
        name: newProjectName.trim(),
        boardId: newProjectBoardId ?? undefined,
        groupId: newProjectGroup?.id,
        color: newProjectGroup?.color,
        tasks: [],
        expanded: true,
      },
    ]);
    cancelAddingProject();
  };

  const resetTaskForm = () => {
    setNewTaskTitle("");
    setNewTaskDescription("");
    setNewTaskHours("");
    setAddingTaskToProject(null);
    setIsTaskDropdownOpen(false);
    setTaskSearchQuery("");
  };

  const handleAddTask = (projectId: string) => {
    if (!newTaskTitle.trim()) {
      resetTaskForm();
      return;
    }
    updateActiveProjects(
      projects.map((p) =>
        p.id === projectId
          ? {
              ...p,
              tasks: [
                ...p.tasks,
                {
                  id: `t${Date.now()}`,
                  title: newTaskTitle.trim(),
                  description: newTaskDescription.trim(),
                  hours: newTaskHours.trim(),
                  status: "pending",
                },
              ],
            }
          : p,
      ),
    );
    resetTaskForm();
  };

  const handleDeleteProject = (id: string) =>
    updateActiveProjects(projects.filter((p) => p.id !== id));

  const handleEditProjectSave = (id: string) => {
    if (!editProjectName.trim()) {
      setEditingProjectId(null);
      return;
    }
    updateActiveProjects(
      projects.map((p) =>
        p.id === id ? { ...p, name: editProjectName.trim() } : p,
      ),
    );
    setEditingProjectId(null);
    setEditProjectName("");
  };

  const handleEditTaskSave = (projectId: string, taskId: string) => {
    if (!editingTaskTitle.trim()) {
      setEditingTaskId(null);
      return;
    }
    updateActiveProjects(
      projects.map((p) =>
        p.id === projectId
          ? {
              ...p,
              tasks: p.tasks.map((t) =>
                t.id === taskId
                  ? {
                      ...t,
                      title: editingTaskTitle.trim(),
                      description: editingTaskDescription.trim(),
                      hours: editingTaskHours.trim(),
                    }
                  : t,
              ),
            }
          : p,
      ),
    );
    setEditingTaskId(null);
  };

  const handleToggleTaskStatus = (projectId: string, taskId: string) =>
    updateActiveProjects(
      projects.map((p) =>
        p.id === projectId
          ? {
              ...p,
              tasks: p.tasks.map((t) =>
                t.id === taskId
                  ? {
                      ...t,
                      status: t.status === "pending" ? "completed" : "pending",
                    }
                  : t,
              ),
            }
          : p,
      ),
    );

  const handleDeleteTask = (projectId: string, taskId: string) =>
    updateActiveProjects(
      projects.map((p) =>
        p.id === projectId
          ? { ...p, tasks: p.tasks.filter((t) => t.id !== taskId) }
          : p,
      ),
    );

  const totalTasks = projects.reduce((acc, p) => acc + p.tasks.length, 0);
  const completedTasks = projects.reduce(
    (acc, p) => acc + p.tasks.filter((t) => t.status === "completed").length,
    0,
  );
  const progressPct =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const filterLabels: Array<"All" | "Pending" | "Completed"> = [
    "All",
    "Pending",
    "Completed",
  ];

  const hasUnsavedChanges =
    serializeDateMap(dateMap) !== serializeDateMap(savedDateMap);

  useBeforeUnload(hasUnsavedChanges, {
    message: "Your daily plan has unsaved changes.",
  });

  const savedProjects =
    activeDateStr && savedDateMap[activeDateStr]
      ? savedDateMap[activeDateStr]
      : [];

  const boardColors = Object.fromEntries(
    boards.map((b) => [String(b.id), b.icon_color]),
  );

  // Open a date for planning, reusing an existing entry for the same day
  const openDate = (date: Date) => {
    const dayKey = format(date, "yyyy-MM-dd");
    const existing = Object.keys(dateMap).find((d) => toDayKey(d) === dayKey);
    const dateStr = existing ?? date.toISOString();
    if (!existing) setDateMap((prev) => ({ ...prev, [dateStr]: [] }));
    setActiveDateStr(dateStr);
    setViewMode("plan");
  };

  const handleSave = () => {
    try {
      localStorage.setItem(
        getStorageKey(boardId),
        JSON.stringify({ dateMap, savedAt: new Date().toISOString() }),
      );
      setSavedDateMap(dateMap);
      setViewMode("board");
      toast.success("Daily plan saved");
    } catch {
      toast.error("Could not save", {
        description: "Browser storage is unavailable or full.",
      });
    }
  };

  return (
    <>
      <style>{collapseStyle}</style>
      <div
        className="flex-1 flex flex-col w-full h-full overflow-hidden"
        style={{
          background: "hsl(var(--background))",
          color: "hsl(var(--foreground))",
        }}
        data-board-id={boardId}
      >
        <div className="max-w-[1600px] w-full mx-auto px-6 md:px-10 py-6 flex flex-col h-full min-h-0 space-y-6">
          {/* ── HEADER ROW ── */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Left: date selector */}
            <div className="flex items-center gap-3">
              {activeDateStr ? (
                <div className="relative">
                  <select
                    value={activeDateStr}
                    onChange={(e) => setActiveDateStr(e.target.value)}
                    style={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      color: "hsl(var(--foreground))",
                      borderRadius: "12px",
                      height: "40px",
                      padding: "0 36px 0 14px",
                      fontSize: "13px",
                      fontWeight: 500,
                      appearance: "none",
                      outline: "none",
                      cursor: "pointer",
                      minWidth: "220px",
                    }}
                  >
                    {Object.keys(dateMap).map((dateStr) => {
                      const dObj = new Date(dateStr);
                      const isToday =
                        format(dObj, "yyyy-MM-dd") ===
                        format(new Date(), "yyyy-MM-dd");
                      return (
                        <option key={dateStr} value={dateStr}>
                          {format(dObj, "EEE, MMM d, yyyy")}
                          {isToday ? " (Today)" : ""}
                        </option>
                      );
                    })}
                  </select>
                  <ChevronDown
                    className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{
                      width: 14,
                      height: 14,
                      color: "hsl(var(--muted-foreground))",
                    }}
                  />
                </div>
              ) : (
                <span
                  style={{
                    color: "hsl(var(--muted-foreground))",
                    fontSize: "13px",
                    fontWeight: 500,
                  }}
                >
                  No date entries yet
                </span>
              )}
            </div>

            {/* Right: action buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              {activeDateStr && (
                <div
                  style={{
                    display: "flex",
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "12px",
                    padding: "3px",
                    gap: "2px",
                    height: "40px",
                  }}
                >
                  {(
                    [
                      { mode: "plan", label: "Plan", Icon: List },
                      { mode: "board", label: "Team Board", Icon: LayoutGrid },
                    ] as const
                  ).map(({ mode, label, Icon }) => (
                    <button
                      key={mode}
                      onClick={() => setViewMode(mode)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "0 14px",
                        borderRadius: "9px",
                        border: "none",
                        cursor: "pointer",
                        fontWeight: 600,
                        fontSize: "12px",
                        whiteSpace: "nowrap",
                        transition: "background 150ms, color 150ms",
                        background:
                          viewMode === mode
                            ? "hsl(var(--primary))"
                            : "transparent",
                        color:
                          viewMode === mode
                            ? "hsl(var(--background))"
                            : "hsl(var(--muted-foreground))",
                      }}
                    >
                      <Icon style={{ width: 13, height: 13 }} />
                      {label}
                    </button>
                  ))}
                </div>
              )}

              {activeDateStr && (
                <button
                  onClick={handleSave}
                  disabled={!hasUnsavedChanges}
                  title={
                    hasUnsavedChanges
                      ? "Save to this browser"
                      : "All changes saved"
                  }
                  style={{
                    position: "relative",
                    background: hasUnsavedChanges
                      ? "hsl(var(--primary))"
                      : "hsl(var(--card))",
                    color: hasUnsavedChanges
                      ? "hsl(var(--background))"
                      : "hsl(var(--muted-foreground))",
                    border: hasUnsavedChanges
                      ? "none"
                      : "1px solid hsl(var(--border))",
                    borderRadius: "12px",
                    height: "40px",
                    padding: "0 18px",
                    fontWeight: 600,
                    fontSize: "13px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    cursor: hasUnsavedChanges ? "pointer" : "default",
                    boxShadow: hasUnsavedChanges
                      ? "0 2px 12px hsl(var(--primary) / 0.25)"
                      : "none",
                  }}
                >
                  <Save style={{ width: 15, height: 15 }} />
                  {hasUnsavedChanges ? "Save" : "Saved"}
                  {hasUnsavedChanges && (
                    <span
                      className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 ring-2 ring-background"
                      aria-label="Unsaved changes"
                    />
                  )}
                </button>
              )}

              {!activeDateStr && (
                <button
                  onClick={() => openDate(new Date())}
                  style={{
                    background: "hsl(var(--primary))",
                    color: "hsl(var(--background))",
                    border: "none",
                    borderRadius: "12px",
                    height: "40px",
                    padding: "0 18px",
                    fontWeight: 600,
                    fontSize: "13px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    cursor: "pointer",
                    transition: "transform 150ms, box-shadow 150ms",
                    boxShadow: "0 2px 12px hsl(var(--primary) / 0.25)",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.transform =
                      "translateY(-1px)";
                    (e.currentTarget as HTMLButtonElement).style.boxShadow =
                      "0 4px 18px hsl(var(--primary) / 0.35)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.transform =
                      "translateY(0)";
                    (e.currentTarget as HTMLButtonElement).style.boxShadow =
                      "0 2px 12px hsl(var(--primary) / 0.25)";
                  }}
                >
                  <Plus style={{ width: 15, height: 15 }} /> Today
                </button>
              )}

              <Popover open={isAddingDate} onOpenChange={setIsAddingDate}>
                <PopoverTrigger asChild>
                  <button
                    style={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "12px",
                      color: "hsl(var(--muted-foreground))",
                      height: "40px",
                      padding: "0 16px",
                      fontWeight: 500,
                      fontSize: "13px",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      cursor: "pointer",
                      transition:
                        "background 150ms, color 150ms, transform 150ms, box-shadow 150ms",
                    }}
                    onMouseEnter={(e) => {
                      const el = e.currentTarget as HTMLButtonElement;
                      el.style.background = "hsl(var(--accent))";
                      el.style.color = "hsl(var(--foreground))";
                      el.style.transform = "translateY(-1px)";
                      el.style.boxShadow = "0 4px 12px rgba(0,0,0,0.3)";
                    }}
                    onMouseLeave={(e) => {
                      const el = e.currentTarget as HTMLButtonElement;
                      el.style.background = "hsl(var(--card))";
                      el.style.color = "hsl(var(--muted-foreground))";
                      el.style.transform = "translateY(0)";
                      el.style.boxShadow = "none";
                    }}
                  >
                    <Plus style={{ width: 15, height: 15 }} /> New Date
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  align="end"
                  className="w-auto p-0 bg-card border border-border rounded-xl shadow-lg"
                >
                  <DatePickerCalendar
                    mode="single"
                    selected={
                      activeDateStr ? new Date(activeDateStr) : undefined
                    }
                    defaultMonth={
                      activeDateStr ? new Date(activeDateStr) : new Date()
                    }
                    onSelect={(date) => {
                      if (!date) return;
                      openDate(date);
                      setIsAddingDate(false);
                    }}
                    modifiers={{
                      hasPlan: Object.keys(dateMap).map((d) => new Date(d)),
                    }}
                    modifiersClassNames={{
                      hasPlan: "font-bold text-primary",
                    }}
                  />
                  <div className="flex items-center justify-between gap-3 border-t border-border px-3 py-2">
                    <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <span className="font-bold text-primary">12</span>
                      has a plan
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        openDate(new Date());
                        setIsAddingDate(false);
                      }}
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      Today
                    </button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* ── STICKY TOOLBAR ── */}
          <div
            ref={stickyRef}
            className="flex flex-col sm:flex-row items-center gap-3"
            style={{
              position: "sticky",
              top: 0,
              zIndex: 20,
              background: "hsl(var(--background))",
              paddingTop: "4px",
              paddingBottom: "8px",
            }}
          >
            {/* Search */}
            <div style={{ position: "relative", flex: 1, width: "100%" }}>
              <Search
                style={{
                  position: "absolute",
                  zIndex: 1,
                  pointerEvents: "none",
                  left: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: 15,
                  height: 15,
                  color: "hsl(var(--muted-foreground))",
                }}
              />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tasks..."
                className="focus-visible:ring-1 focus-visible:ring-[#34d399] focus-visible:ring-offset-0"
                style={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "12px",
                  color: "hsl(var(--foreground))",
                  paddingLeft: "36px",
                  height: "40px",
                  fontSize: "13px",
                  width: "100%",
                }}
              />
            </div>

            {/* Segmented filter */}
            <div
              style={{
                display: "flex",
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "12px",
                padding: "3px",
                gap: "2px",
                flexShrink: 0,
              }}
            >
              {filterLabels.map((label) => (
                <button
                  key={label}
                  onClick={() => setFilter(label)}
                  style={{
                    padding: "5px 16px",
                    borderRadius: "9px",
                    border: "none",
                    cursor: "pointer",
                    fontWeight: 600,
                    fontSize: "12px",
                    transition: "background 150ms, color 150ms",
                    background:
                      filter === label ? "hsl(var(--primary))" : "transparent",
                    color:
                      filter === label
                        ? "hsl(var(--background))"
                        : "hsl(var(--muted-foreground))",
                    whiteSpace: "nowrap",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* ── TEAM BOARD (saved data) / DATE CARD ── */}
          {activeDateStr && viewMode === "board" ? (
            <DevBoardDailyTeamBoard
              projects={savedProjects}
              members={members}
              boardColors={boardColors}
              searchQuery={searchQuery}
              filter={filter}
            />
          ) : activeDateStr ? (
            <div
              style={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "16px",
                boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                flex: 1,
                minHeight: 0,
              }}
            >
              {/* Card Header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "20px 32px",
                  borderBottom: "1px solid hsl(var(--border))",
                  gap: "12px",
                  flexWrap: "wrap",
                  flexShrink: 0,
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "12px" }}
                >
                  <Calendar
                    style={{
                      width: 20,
                      height: 20,
                      color: "hsl(var(--primary))",
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontWeight: 700,
                      fontSize: "18px",
                      color: "hsl(var(--foreground))",
                    }}
                  >
                    {format(new Date(activeDateStr), "EEE, MMM d, yyyy")}
                  </span>
                  {format(new Date(activeDateStr), "yyyy-MM-dd") ===
                    format(new Date(), "yyyy-MM-dd") && (
                    <span
                      style={{
                        background: "hsl(var(--primary) / 0.15)",
                        color: "hsl(var(--primary))",
                        fontSize: "10px",
                        fontWeight: 700,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        padding: "2px 8px",
                        borderRadius: "6px",
                        border: "1px solid hsl(var(--primary) / 0.2)",
                      }}
                    >
                      Today
                    </span>
                  )}
                </div>

                {/* Progress */}
                <div
                  style={{ display: "flex", alignItems: "center", gap: "12px" }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <div
                      style={{
                        width: "80px",
                        height: "4px",
                        background: "hsl(var(--border))",
                        borderRadius: "2px",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${progressPct}%`,
                          height: "100%",
                          background: "hsl(var(--primary))",
                          borderRadius: "2px",
                          transition: "width 300ms ease",
                        }}
                      />
                    </div>
                    <span
                      style={{
                        fontSize: "12px",
                        color: "hsl(var(--muted-foreground))",
                        fontWeight: 500,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {completedTasks}/{totalTasks} done
                    </span>
                  </div>
                </div>
              </div>

              {/* Card Content */}
              <div
                className="custom-scrollbar"
                style={{
                  padding: "24px 32px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  flex: 1,
                  overflowY: "auto",
                  minHeight: 0,
                }}
              >
                {projects.map((project) => {
                  const filteredTasks = project.tasks.filter((t) => {
                    if (
                      searchQuery &&
                      !t.title.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                      return false;
                    if (filter === "Pending" && t.status !== "pending")
                      return false;
                    if (filter === "Completed" && t.status !== "completed")
                      return false;
                    return true;
                  });
                  const isAddingTaskHere = addingTaskToProject === project.id;
                  const taskOptions = isAddingTaskHere
                    ? getTaskOptions(project)
                    : [];
                  const isLoadingTaskOptions =
                    isAddingTaskHere &&
                    !!project.boardId &&
                    !!boardTasks[project.boardId]?.loading;
                  const trimmedTaskQuery = taskSearchQuery.trim();
                  const showCustomTaskOption =
                    !!trimmedTaskQuery &&
                    !taskOptions.some(
                      (t) =>
                        t.name.toLowerCase() === trimmedTaskQuery.toLowerCase(),
                    );

                  if (
                    (searchQuery || filter !== "All") &&
                    filteredTasks.length === 0
                  )
                    return null;

                  return (
                    <div key={project.id} style={{ marginBottom: "4px" }}>
                      {/* Project Header */}
                      <div
                        className="group"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "8px 10px",
                          borderRadius: "10px",
                          transition: "background 150ms",
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLDivElement).style.background =
                            "hsl(var(--accent))";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLDivElement).style.background =
                            "transparent";
                        }}
                      >
                        {editingProjectId === project.id ? (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              flex: 1,
                            }}
                          >
                            <Input
                              autoFocus
                              value={editProjectName}
                              onChange={(e) =>
                                setEditProjectName(e.target.value)
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter")
                                  handleEditProjectSave(project.id);
                                if (e.key === "Escape")
                                  setEditingProjectId(null);
                              }}
                              onBlur={() => handleEditProjectSave(project.id)}
                              style={{
                                height: "32px",
                                maxWidth: "200px",
                                background: "hsl(var(--background))",
                                border: "1px solid hsl(var(--primary) / 0.4)",
                                borderRadius: "8px",
                                color: "hsl(var(--foreground))",
                                fontSize: "13px",
                              }}
                            />
                          </div>
                        ) : (
                          <button
                            onClick={() => toggleProject(project.id)}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              color: "hsl(var(--foreground))",
                              padding: 0,
                            }}
                          >
                            <span
                              style={{
                                transition: "transform 150ms",
                                transform: project.expanded
                                  ? "rotate(0deg)"
                                  : "rotate(-90deg)",
                                display: "flex",
                                color: "hsl(var(--muted-foreground))",
                              }}
                            >
                              <ChevronDown style={{ width: 15, height: 15 }} />
                            </span>
                            <span
                              className="h-5 w-5 rounded flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                              style={{
                                backgroundColor:
                                  project.color ||
                                  (project.boardId &&
                                    boardColors[project.boardId]) ||
                                  "hsl(221, 83%, 53%)",
                              }}
                            >
                              {project.name.charAt(0).toUpperCase()}
                            </span>
                            <span style={{ fontWeight: 600, fontSize: "13px" }}>
                              {project.name}
                            </span>
                            {project.groupId &&
                              project.boardId &&
                              project.boardId !== String(boardId) && (
                              <span className="text-[11px] text-muted-foreground truncate max-w-[160px]">
                                {
                                  boards.find(
                                    (b) => String(b.id) === project.boardId,
                                  )?.name
                                }
                              </span>
                            )}
                            <span
                              style={{
                                background: "hsl(var(--primary) / 0.12)",
                                color: "hsl(var(--primary))",
                                border: "1px solid hsl(var(--primary) / 0.2)",
                                fontSize: "10px",
                                fontWeight: 700,
                                padding: "1px 7px",
                                borderRadius: "20px",
                              }}
                            >
                              {project.tasks.length}
                            </span>
                          </button>
                        )}

                        {/* Project actions (hover) */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          {/* + Add Task button visible always when expanded */}
                          {project.expanded &&
                            addingTaskToProject !== project.id && (
                              <button
                                onClick={() => startAddingTask(project)}
                                style={{
                                  background: "hsl(var(--primary))",
                                  color: "hsl(var(--background))",
                                  border: "none",
                                  borderRadius: "8px",
                                  height: "28px",
                                  padding: "0 10px",
                                  fontWeight: 600,
                                  fontSize: "11px",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  cursor: "pointer",
                                  transition:
                                    "transform 150ms, box-shadow 150ms",
                                  opacity: 0,
                                }}
                                className="group-hover-task-btn"
                                onMouseEnter={(e) => {
                                  const el =
                                    e.currentTarget as HTMLButtonElement;
                                  el.style.transform = "translateY(-1px)";
                                  el.style.boxShadow =
                                    "0 3px 10px hsl(var(--primary) / 0.3)";
                                }}
                                onMouseLeave={(e) => {
                                  const el =
                                    e.currentTarget as HTMLButtonElement;
                                  el.style.transform = "translateY(0)";
                                  el.style.boxShadow = "none";
                                }}
                                ref={(el) => {
                                  if (el) {
                                    el.closest(".group")?.addEventListener(
                                      "mouseenter",
                                      () => {
                                        el.style.opacity = "1";
                                      },
                                    );
                                    el.closest(".group")?.addEventListener(
                                      "mouseleave",
                                      () => {
                                        el.style.opacity = "0";
                                      },
                                    );
                                  }
                                }}
                              >
                                <Plus style={{ width: 11, height: 11 }} /> Task
                              </button>
                            )}
                          <button
                            onClick={() => {
                              setEditProjectName(project.name);
                              setEditingProjectId(project.id);
                            }}
                            style={{
                              background: "none",
                              border: "none",
                              color: "hsl(var(--muted-foreground))",
                              cursor: "pointer",
                              padding: "4px",
                              borderRadius: "6px",
                              display: "flex",
                              alignItems: "center",
                              transition: "color 150ms, background 150ms",
                              opacity: 0,
                            }}
                            ref={(el) => {
                              if (el) {
                                el.closest(".group")?.addEventListener(
                                  "mouseenter",
                                  () => {
                                    el.style.opacity = "1";
                                  },
                                );
                                el.closest(".group")?.addEventListener(
                                  "mouseleave",
                                  () => {
                                    el.style.opacity = "0";
                                  },
                                );
                              }
                            }}
                            onMouseEnter={(e) => {
                              const el = e.currentTarget as HTMLButtonElement;
                              el.style.color = "hsl(var(--muted-foreground))";
                              el.style.background = "hsl(var(--accent))";
                            }}
                            onMouseLeave={(e) => {
                              const el = e.currentTarget as HTMLButtonElement;
                              el.style.color = "hsl(var(--muted-foreground))";
                              el.style.background = "none";
                            }}
                          >
                            <Pencil style={{ width: 12, height: 12 }} />
                          </button>
                          <button
                            onClick={() => handleDeleteProject(project.id)}
                            style={{
                              background: "none",
                              border: "none",
                              color: "hsl(var(--muted-foreground))",
                              cursor: "pointer",
                              padding: "4px",
                              borderRadius: "6px",
                              display: "flex",
                              alignItems: "center",
                              transition: "color 150ms, background 150ms",
                              opacity: 0,
                            }}
                            ref={(el) => {
                              if (el) {
                                el.closest(".group")?.addEventListener(
                                  "mouseenter",
                                  () => {
                                    el.style.opacity = "1";
                                  },
                                );
                                el.closest(".group")?.addEventListener(
                                  "mouseleave",
                                  () => {
                                    el.style.opacity = "0";
                                  },
                                );
                              }
                            }}
                            onMouseEnter={(e) => {
                              const el = e.currentTarget as HTMLButtonElement;
                              el.style.color = "hsl(var(--destructive))";
                              el.style.background =
                                "hsl(var(--destructive) / 0.15)";
                            }}
                            onMouseLeave={(e) => {
                              const el = e.currentTarget as HTMLButtonElement;
                              el.style.color = "hsl(var(--muted-foreground))";
                              el.style.background = "none";
                            }}
                          >
                            <Trash2 style={{ width: 12, height: 12 }} />
                          </button>
                        </div>
                      </div>

                      {/* Project Tasks */}
                      {project.expanded && (
                        <div
                          className="anim-slide-down"
                          style={{
                            paddingLeft: "34px",
                            display: "flex",
                            flexDirection: "column",
                            gap: "2px",
                          }}
                        >
                          {filteredTasks.map((task) =>
                            editingTaskId === task.id ? (
                              <div
                                key={task.id}
                                className="anim-slide-down"
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: "8px",
                                  marginTop: "2px",
                                  padding: "12px",
                                  background: "hsl(var(--accent))",
                                  border: "1px solid hsl(var(--border))",
                                  borderRadius: "10px",
                                }}
                              >
                                <Input
                                  autoFocus
                                  value={editingTaskTitle}
                                  onChange={(e) =>
                                    setEditingTaskTitle(e.target.value)
                                  }
                                  placeholder="Task title..."
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter")
                                      handleEditTaskSave(project.id, task.id);
                                    if (e.key === "Escape")
                                      setEditingTaskId(null);
                                  }}
                                  className="focus-visible:ring-1 focus-visible:ring-[#34d399] focus-visible:ring-offset-0"
                                  style={{
                                    height: "36px",
                                    background: "hsl(var(--background))",
                                    border: "1px solid hsl(var(--border))",
                                    borderRadius: "8px",
                                    color: "hsl(var(--foreground))",
                                    fontSize: "13px",
                                  }}
                                />
                                <div
                                  style={{
                                    display: "flex",
                                    gap: "8px",
                                    alignItems: "center",
                                    flexWrap: "wrap",
                                  }}
                                >
                                  <Textarea
                                    value={editingTaskDescription}
                                    onChange={(e) =>
                                      setEditingTaskDescription(e.target.value)
                                    }
                                    placeholder="Description (optional)..."
                                    className="focus-visible:ring-1 focus-visible:ring-[#34d399] focus-visible:ring-offset-0 resize-none"
                                    style={{
                                      flex: 1,
                                      minHeight: "36px",
                                      background: "hsl(var(--background))",
                                      border: "1px solid hsl(var(--border))",
                                      borderRadius: "8px",
                                      color: "hsl(var(--foreground))",
                                      fontSize: "13px",
                                    }}
                                  />
                                  <Input
                                    value={editingTaskHours}
                                    onChange={(e) =>
                                      setEditingTaskHours(e.target.value)
                                    }
                                    placeholder="Hours"
                                    className="focus-visible:ring-1 focus-visible:ring-[#34d399] focus-visible:ring-offset-0"
                                    style={{
                                      height: "36px",
                                      width: "90px",
                                      background: "hsl(var(--background))",
                                      border: "1px solid hsl(var(--border))",
                                      borderRadius: "8px",
                                      color: "hsl(var(--foreground))",
                                      fontSize: "13px",
                                    }}
                                  />
                                </div>
                                <div
                                  style={{
                                    display: "flex",
                                    gap: "8px",
                                    alignItems: "center",
                                  }}
                                >
                                  <button
                                    onClick={() =>
                                      handleEditTaskSave(project.id, task.id)
                                    }
                                    disabled={!editingTaskTitle.trim()}
                                    style={{
                                      background: editingTaskTitle.trim()
                                        ? "hsl(var(--primary))"
                                        : "hsl(var(--primary) / 0.15)",
                                      color: editingTaskTitle.trim()
                                        ? "hsl(var(--background))"
                                        : "hsl(var(--primary))",
                                      border: "none",
                                      borderRadius: "8px",
                                      height: "33px",
                                      padding: "0 18px",
                                      fontWeight: 600,
                                      fontSize: "12px",
                                      cursor: editingTaskTitle.trim()
                                        ? "pointer"
                                        : "not-allowed",
                                      transition: "background 150ms",
                                    }}
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() => setEditingTaskId(null)}
                                    style={{
                                      background: "none",
                                      border: "none",
                                      color: "hsl(var(--muted-foreground))",
                                      fontSize: "12px",
                                      fontWeight: 500,
                                      cursor: "pointer",
                                      height: "33px",
                                      padding: "0 10px",
                                    }}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div
                                key={task.id}
                                className="group/task"
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  padding: "6px 10px",
                                  borderRadius: "8px",
                                  transition: "background 150ms",
                                }}
                                onMouseEnter={(e) => {
                                  (
                                    e.currentTarget as HTMLDivElement
                                  ).style.background = "hsl(var(--accent))";
                                }}
                                onMouseLeave={(e) => {
                                  (
                                    e.currentTarget as HTMLDivElement
                                  ).style.background = "transparent";
                                }}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "10px",
                                    cursor: "pointer",
                                    flex: 1, // Let this grow so the whole row is clickable
                                    minWidth: 0, // Prevent overflow if text is long
                                  }}
                                  onClick={() => {
                                    setEditingTaskId(task.id);
                                    setEditingTaskTitle(task.title);
                                    setEditingTaskDescription(
                                      task.description || "",
                                    );
                                    setEditingTaskHours(task.hours || "");
                                  }}
                                >
                                  <Checkbox
                                    checked={task.status === "completed"}
                                    onClick={(e) => e.stopPropagation()}
                                    onCheckedChange={() =>
                                      handleToggleTaskStatus(
                                        project.id,
                                        task.id,
                                      )
                                    }
                                    aria-label={
                                      task.status === "completed"
                                        ? "Mark as pending"
                                        : "Mark as completed"
                                    }
                                    className="h-4 w-4 rounded-[4px] border-muted-foreground/60 transition-colors hover:border-primary data-[state=checked]:bg-primary data-[state=checked]:border-primary [&_svg]:h-3 [&_svg]:w-3"
                                  />
                                  <span
                                    style={{
                                      color:
                                        task.status === "completed"
                                          ? "hsl(var(--muted-foreground))"
                                          : "hsl(var(--muted-foreground))",
                                      fontSize: "13px",
                                      fontWeight:
                                        task.status === "completed" ? 400 : 500,
                                      textDecoration:
                                        task.status === "completed"
                                          ? "line-through"
                                          : "none",
                                      transition: "color 150ms",
                                    }}
                                  >
                                    {task.title}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <div className="flex items-center gap-2">
                                    <button
                                      style={{
                                        background: "none",
                                        border: "none",
                                        color: "hsl(var(--primary))",
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        padding: "4px",
                                      }}
                                    >
                                      <ExternalLink
                                        style={{ width: 14, height: 14 }}
                                      />
                                    </button>
                                  </div>

                                  {task.hours && (
                                    <span
                                      style={{
                                        fontSize: "12px",
                                        color: "hsl(var(--primary))",
                                        background:
                                          "hsl(var(--primary) / 0.15)",
                                        padding: "3px 8px",
                                        borderRadius: "6px",
                                        border:
                                          "1px solid hsl(var(--primary) / 0.3)",
                                        fontWeight: 500,
                                      }}
                                    >
                                      {task.hours}h
                                    </span>
                                  )}

                                  <div className="flex items-center gap-2">
                                    {(() => {
                                      const assigneeIds =
                                        task.assigneeIds ?? [];
                                      const assignees = members.filter((m) =>
                                        assigneeIds.includes(String(m.user_id)),
                                      );
                                      const hasAssignees = assignees.length > 0;
                                      const MAX_AVATARS = 3;
                                      return (
                                        <Popover
                                          open={assigningTaskId === task.id}
                                          onOpenChange={(open) =>
                                            open
                                              ? setAssigningTaskId(task.id)
                                              : closeAssignDropdown()
                                          }
                                        >
                                          <PopoverTrigger asChild>
                                            <button
                                              type="button"
                                              title={assignees
                                                .map((m) => m.name)
                                                .join(", ")}
                                              style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "6px",
                                                maxWidth: "180px",
                                                color: hasAssignees
                                                  ? "hsl(var(--foreground))"
                                                  : "hsl(var(--muted-foreground))",
                                                background: "transparent",
                                                border: hasAssignees
                                                  ? "1px solid hsl(var(--border))"
                                                  : "1px dashed hsl(var(--border))",
                                                borderRadius: "999px",
                                                padding: hasAssignees
                                                  ? "2px 10px 2px 3px"
                                                  : "3px 10px",
                                                fontSize: "12px",
                                                cursor: "pointer",
                                                transition:
                                                  "color 150ms, border-color 150ms",
                                              }}
                                              onMouseEnter={(e) => {
                                                const el = e.currentTarget;
                                                el.style.color =
                                                  "hsl(var(--foreground))";
                                                el.style.borderColor =
                                                  "hsl(var(--muted-foreground))";
                                              }}
                                              onMouseLeave={(e) => {
                                                const el = e.currentTarget;
                                                el.style.color = hasAssignees
                                                  ? "hsl(var(--foreground))"
                                                  : "hsl(var(--muted-foreground))";
                                                el.style.borderColor =
                                                  "hsl(var(--border))";
                                              }}
                                            >
                                              {hasAssignees ? (
                                                <>
                                                  <span className="flex items-center -space-x-1.5 flex-shrink-0">
                                                    {assignees
                                                      .slice(0, MAX_AVATARS)
                                                      .map((m) => (
                                                        <span
                                                          key={m.user_id}
                                                          className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-semibold text-white ring-2 ring-card"
                                                          style={{
                                                            background:
                                                              stringToHslColor(
                                                                m.name ||
                                                                  m.user_id,
                                                              ),
                                                          }}
                                                        >
                                                          {getInitials(
                                                            m.name ?? "",
                                                          )}
                                                        </span>
                                                      ))}
                                                  </span>
                                                  <span className="truncate">
                                                    {assignees.length === 1
                                                      ? assignees[0].name
                                                      : assignees.length >
                                                          MAX_AVATARS
                                                        ? `+${assignees.length - MAX_AVATARS}`
                                                        : `${assignees.length} people`}
                                                  </span>
                                                </>
                                              ) : (
                                                <>
                                                  <UserPlus
                                                    style={{
                                                      width: 12,
                                                      height: 12,
                                                    }}
                                                  />
                                                  assign
                                                </>
                                              )}
                                            </button>
                                          </PopoverTrigger>
                                          <PopoverContent
                                            align="end"
                                            className="w-60 p-2 bg-card border border-border shadow-lg rounded-lg"
                                            onWheel={(e) => e.stopPropagation()}
                                          >
                                            <div
                                              style={{ position: "relative" }}
                                            >
                                              <Search
                                                style={{
                                                  position: "absolute",
                                                  zIndex: 1,
                                                  pointerEvents: "none",
                                                  left: 10,
                                                  top: "50%",
                                                  transform: "translateY(-50%)",
                                                  width: 14,
                                                  height: 14,
                                                  color:
                                                    "hsl(var(--muted-foreground))",
                                                }}
                                              />
                                              <Input
                                                autoFocus
                                                value={assignSearchQuery}
                                                onChange={(e) =>
                                                  setAssignSearchQuery(
                                                    e.target.value,
                                                  )
                                                }
                                                onKeyDown={(e) => {
                                                  if (
                                                    e.key === "Enter" &&
                                                    filteredMembers[0]
                                                  ) {
                                                    toggleTaskAssignee(
                                                      project.id,
                                                      task,
                                                      String(
                                                        filteredMembers[0]
                                                          .user_id,
                                                      ),
                                                    );
                                                    setAssignSearchQuery("");
                                                  }
                                                }}
                                                placeholder="Search team..."
                                                className="h-8 pl-8 text-sm focus-visible:ring-1 focus-visible:ring-[#34d399] focus-visible:ring-offset-0"
                                              />
                                            </div>
                                            <div className="mt-2 max-h-60 overflow-y-auto space-y-0.5">
                                              {hasAssignees && (
                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    setTaskAssignees(
                                                      project.id,
                                                      task.id,
                                                      [],
                                                    )
                                                  }
                                                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-left text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                                                >
                                                  <X className="w-3.5 h-3.5 flex-shrink-0" />
                                                  Clear all ({assignees.length})
                                                </button>
                                              )}
                                              {filteredMembers.length === 0 ? (
                                                <div className="py-4 text-center text-sm text-muted-foreground">
                                                  No team members found
                                                </div>
                                              ) : (
                                                filteredMembers.map((m) => {
                                                  const isSelected =
                                                    assigneeIds.includes(
                                                      String(m.user_id),
                                                    );
                                                  return (
                                                    <button
                                                      key={m.user_id}
                                                      type="button"
                                                      onClick={() =>
                                                        toggleTaskAssignee(
                                                          project.id,
                                                          task,
                                                          String(m.user_id),
                                                        )
                                                      }
                                                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-left text-foreground transition-colors hover:bg-secondary ${
                                                        isSelected
                                                          ? "bg-secondary"
                                                          : ""
                                                      }`}
                                                    >
                                                      <span
                                                        className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold text-white"
                                                        style={{
                                                          background:
                                                            stringToHslColor(
                                                              m.name ||
                                                                m.user_id,
                                                            ),
                                                        }}
                                                      >
                                                        {getInitials(
                                                          m.name ?? "",
                                                        )}
                                                      </span>
                                                      <span className="truncate flex-1">
                                                        {m.name}
                                                      </span>
                                                      {isSelected && (
                                                        <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 text-primary" />
                                                      )}
                                                    </button>
                                                  );
                                                })
                                              )}
                                            </div>
                                          </PopoverContent>
                                        </Popover>
                                      );
                                    })()}

                                    <div className="flex items-center gap-1 border-l border-white/5 pl-2 ml-1">
                                      <button
                                        onClick={() => {
                                          setEditingTaskId(task.id);
                                          setEditingTaskTitle(task.title);
                                          setEditingTaskDescription(
                                            task.description || "",
                                          );
                                          setEditingTaskHours(task.hours || "");
                                        }}
                                        style={{
                                          background: "none",
                                          border: "none",
                                          color: "hsl(var(--muted-foreground))",
                                          cursor: "pointer",
                                          padding: "4px",
                                          borderRadius: "6px",
                                          display: "flex",
                                          alignItems: "center",
                                          transition:
                                            "color 150ms, background 150ms",
                                        }}
                                        onMouseEnter={(e) => {
                                          const el = e.currentTarget;
                                          el.style.color =
                                            "hsl(var(--foreground))";
                                          el.style.background =
                                            "hsl(var(--accent))";
                                        }}
                                        onMouseLeave={(e) => {
                                          const el = e.currentTarget;
                                          el.style.color =
                                            "hsl(var(--muted-foreground))";
                                          el.style.background = "none";
                                        }}
                                      >
                                        <Pencil
                                          style={{ width: 14, height: 14 }}
                                        />
                                      </button>
                                      <button
                                        onClick={() =>
                                          handleDeleteTask(project.id, task.id)
                                        }
                                        style={{
                                          background: "none",
                                          border: "none",
                                          color: "hsl(var(--muted-foreground))",
                                          cursor: "pointer",
                                          padding: "4px",
                                          borderRadius: "6px",
                                          display: "flex",
                                          alignItems: "center",
                                          transition:
                                            "color 150ms, background 150ms",
                                        }}
                                        onMouseEnter={(e) => {
                                          const el = e.currentTarget;
                                          el.style.color =
                                            "hsl(var(--destructive))";
                                          el.style.background =
                                            "hsl(var(--destructive) / 0.15)";
                                        }}
                                        onMouseLeave={(e) => {
                                          const el = e.currentTarget;
                                          el.style.color =
                                            "hsl(var(--muted-foreground))";
                                          el.style.background = "none";
                                        }}
                                      >
                                        <Trash2
                                          style={{ width: 14, height: 14 }}
                                        />
                                      </button>
                                      <button
                                        style={{
                                          background: "none",
                                          border: "none",
                                          color: "hsl(var(--muted-foreground))",
                                          cursor: "pointer",
                                          padding: "4px",
                                          display: "flex",
                                          alignItems: "center",
                                        }}
                                      >
                                        <ChevronRight
                                          style={{ width: 16, height: 16 }}
                                        />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ),
                          )}

                          {/* Add task inline form */}
                          {addingTaskToProject === project.id ? (
                            <div
                              className="anim-slide-down"
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "8px",
                                marginTop: "6px",
                                padding: "12px",
                                background: "hsl(var(--accent))",
                                border: "1px solid hsl(var(--border))",
                                borderRadius: "10px",
                              }}
                            >
                              <Popover
                                open={isTaskDropdownOpen}
                                onOpenChange={(open) => {
                                  setIsTaskDropdownOpen(open);
                                  if (!open) setTaskSearchQuery("");
                                }}
                              >
                                <PopoverTrigger asChild>
                                  <button
                                    type="button"
                                    className="focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#34d399]"
                                    style={{
                                      height: "36px",
                                      width: "100%",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "space-between",
                                      gap: "8px",
                                      padding: "0 12px",
                                      background: "hsl(var(--background))",
                                      border: "1px solid hsl(var(--border))",
                                      borderRadius: "8px",
                                      color: newTaskTitle
                                        ? "hsl(var(--foreground))"
                                        : "hsl(var(--muted-foreground))",
                                      fontSize: "13px",
                                      cursor: "pointer",
                                      textAlign: "left",
                                    }}
                                  >
                                    <span
                                      style={{
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                      }}
                                    >
                                      {newTaskTitle || "Select task..."}
                                    </span>
                                    <ChevronDown
                                      style={{
                                        width: 14,
                                        height: 14,
                                        flexShrink: 0,
                                      }}
                                    />
                                  </button>
                                </PopoverTrigger>
                                <PopoverContent
                                  align="start"
                                  className="w-[var(--radix-popover-trigger-width)] min-w-64 p-2 bg-card border border-border shadow-lg rounded-lg"
                                  onWheel={(e) => e.stopPropagation()}
                                >
                                  <div style={{ position: "relative" }}>
                                    <Search
                                      style={{
                                        position: "absolute",
                                        zIndex: 1,
                                        pointerEvents: "none",
                                        left: 10,
                                        top: "50%",
                                        transform: "translateY(-50%)",
                                        width: 14,
                                        height: 14,
                                        color: "hsl(var(--muted-foreground))",
                                      }}
                                    />
                                    <Input
                                      autoFocus
                                      value={taskSearchQuery}
                                      onChange={(e) =>
                                        setTaskSearchQuery(e.target.value)
                                      }
                                      onKeyDown={(e) => {
                                        if (e.key !== "Enter") return;
                                        if (taskOptions[0]) {
                                          selectTaskOption(taskOptions[0].name);
                                        } else if (showCustomTaskOption) {
                                          selectTaskOption(trimmedTaskQuery);
                                        }
                                      }}
                                      placeholder="Search tasks..."
                                      className="h-8 pl-8 text-sm focus-visible:ring-1 focus-visible:ring-[#34d399] focus-visible:ring-offset-0"
                                    />
                                  </div>
                                  <div className="mt-2 max-h-60 overflow-y-auto space-y-0.5">
                                    {isLoadingTaskOptions ? (
                                      <div className="py-4 text-center text-sm text-muted-foreground">
                                        Loading tasks...
                                      </div>
                                    ) : (
                                      <>
                                        {taskOptions.map((t) => (
                                          <button
                                            key={t.id}
                                            type="button"
                                            onClick={() =>
                                              selectTaskOption(t.name)
                                            }
                                            className={`w-full px-2 py-1.5 rounded-md text-sm text-left truncate transition-colors hover:bg-secondary ${
                                              t.name === newTaskTitle
                                                ? "bg-secondary text-foreground"
                                                : "text-foreground"
                                            }`}
                                          >
                                            {t.name}
                                          </button>
                                        ))}
                                        {showCustomTaskOption && (
                                          <button
                                            type="button"
                                            onClick={() =>
                                              selectTaskOption(trimmedTaskQuery)
                                            }
                                            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-left text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                                          >
                                            <Plus className="w-3.5 h-3.5 flex-shrink-0" />
                                            <span className="truncate">
                                              Use "{trimmedTaskQuery}"
                                            </span>
                                          </button>
                                        )}
                                        {taskOptions.length === 0 &&
                                          !showCustomTaskOption && (
                                            <div className="py-4 text-center text-sm text-muted-foreground">
                                              No tasks found
                                            </div>
                                          )}
                                      </>
                                    )}
                                  </div>
                                </PopoverContent>
                              </Popover>
                              <div
                                style={{
                                  display: "flex",
                                  gap: "8px",
                                  alignItems: "center",
                                  flexWrap: "wrap",
                                }}
                              >
                                <Textarea
                                  value={newTaskDescription}
                                  onChange={(e) =>
                                    setNewTaskDescription(e.target.value)
                                  }
                                  placeholder="Description (optional)..."
                                  className="focus-visible:ring-1 focus-visible:ring-[#34d399] focus-visible:ring-offset-0 resize-none"
                                  style={{
                                    flex: 1,
                                    minHeight: "36px",
                                    background: "hsl(var(--background))",
                                    border: "1px solid hsl(var(--border))",
                                    borderRadius: "8px",
                                    color: "hsl(var(--foreground))",
                                    fontSize: "13px",
                                  }}
                                />
                                <Input
                                  value={newTaskHours}
                                  onChange={(e) =>
                                    setNewTaskHours(e.target.value)
                                  }
                                  placeholder="Hours"
                                  className="focus-visible:ring-1 focus-visible:ring-[#34d399] focus-visible:ring-offset-0"
                                  style={{
                                    height: "36px",
                                    width: "90px",
                                    background: "hsl(var(--background))",
                                    border: "1px solid hsl(var(--border))",
                                    borderRadius: "8px",
                                    color: "hsl(var(--foreground))",
                                    fontSize: "13px",
                                  }}
                                />
                              </div>
                              <div
                                style={{
                                  display: "flex",
                                  gap: "8px",
                                  alignItems: "center",
                                }}
                              >
                                <button
                                  onClick={() => handleAddTask(project.id)}
                                  disabled={!newTaskTitle.trim()}
                                  style={{
                                    background: newTaskTitle.trim()
                                      ? "hsl(var(--primary))"
                                      : "hsl(var(--primary) / 0.15)",
                                    color: newTaskTitle.trim()
                                      ? "hsl(var(--background))"
                                      : "hsl(var(--primary))",
                                    border: "none",
                                    borderRadius: "8px",
                                    height: "33px",
                                    padding: "0 18px",
                                    fontWeight: 600,
                                    fontSize: "12px",
                                    cursor: newTaskTitle.trim()
                                      ? "pointer"
                                      : "not-allowed",
                                    transition: "background 150ms",
                                  }}
                                >
                                  Add Task
                                </button>
                                <button
                                  onClick={resetTaskForm}
                                  style={{
                                    background: "none",
                                    border: "none",
                                    color: "hsl(var(--muted-foreground))",
                                    fontSize: "12px",
                                    fontWeight: 500,
                                    cursor: "pointer",
                                    height: "33px",
                                    padding: "0 10px",
                                  }}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => startAddingTask(project)}
                              style={{
                                background: "none",
                                border: "none",
                                color: "hsl(var(--muted-foreground))",
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                                fontSize: "12px",
                                fontWeight: 500,
                                padding: "6px 10px",
                                borderRadius: "7px",
                                transition: "color 150ms, background 150ms",
                                marginTop: "2px",
                              }}
                              onMouseEnter={(e) => {
                                const el = e.currentTarget as HTMLButtonElement;
                                el.style.color = "hsl(var(--muted-foreground))";
                                el.style.background = "hsl(var(--accent))";
                              }}
                              onMouseLeave={(e) => {
                                const el = e.currentTarget as HTMLButtonElement;
                                el.style.color = "hsl(var(--muted-foreground))";
                                el.style.background = "none";
                              }}
                            >
                              <Plus style={{ width: 13, height: 13 }} /> Add
                              task
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* ── Add Project ── */}
                <div
                  style={{
                    marginTop: "12px",
                    paddingTop: "12px",
                    borderTop: "1px solid hsl(var(--accent))",
                  }}
                >
                  {isAddingProject ? (
                    <div
                      className="anim-slide-down"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        flexWrap: "wrap",
                      }}
                    >
                      <Popover
                        open={isProjectDropdownOpen}
                        onOpenChange={(open) => {
                          setIsProjectDropdownOpen(open);
                          if (open) loadGroupOptions();
                          else setProjectSearchQuery("");
                        }}
                      >
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            title={newProjectName || undefined}
                            className="focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#34d399]"
                            style={{
                              height: "36px",
                              width: "240px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: "8px",
                              padding: "0 12px",
                              background: "hsl(var(--background))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "10px",
                              color: newProjectName
                                ? "hsl(var(--foreground))"
                                : "hsl(var(--muted-foreground))",
                              fontSize: "13px",
                              cursor: "pointer",
                            }}
                          >
                            <span className="flex items-center gap-2 min-w-0">
                              {newProjectGroup && (
                                <span
                                  className="h-2 w-2 rounded-full shrink-0"
                                  style={{
                                    backgroundColor:
                                      newProjectGroup.color || "#3b82f6",
                                  }}
                                />
                              )}
                              <span className="truncate">
                                {newProjectName || "Select project..."}
                              </span>
                            </span>
                            <ChevronDown
                              style={{ width: 14, height: 14, flexShrink: 0 }}
                            />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent
                          align="start"
                          className="w-72 p-2 bg-card border border-border shadow-lg rounded-lg"
                          onWheel={(e) => e.stopPropagation()}
                        >
                          {currentBoard && (
                            <div className="flex items-center gap-2 px-1 pb-2 mb-2 border-b border-border">
                              <span
                                className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                                style={{
                                  background:
                                    currentBoard.icon_color ||
                                    "hsl(221, 83%, 53%)",
                                }}
                              >
                                {currentBoard.name.charAt(0).toUpperCase()}
                              </span>
                              <span className="text-sm font-semibold text-foreground truncate">
                                {currentBoard.name}
                              </span>
                            </div>
                          )}
                          <div style={{ position: "relative" }}>
                            <Search
                              style={{
                                position: "absolute",
                                zIndex: 1,
                                pointerEvents: "none",
                                left: 10,
                                top: "50%",
                                transform: "translateY(-50%)",
                                width: 14,
                                height: 14,
                                color: "hsl(var(--muted-foreground))",
                              }}
                            />
                            <Input
                              autoFocus
                              value={projectSearchQuery}
                              onChange={(e) =>
                                setProjectSearchQuery(e.target.value)
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && visibleGroups[0]) {
                                  selectGroupOption(visibleGroups[0]);
                                }
                              }}
                              placeholder="Search groups..."
                              className="h-8 pl-8 text-sm focus-visible:ring-1 focus-visible:ring-[#34d399] focus-visible:ring-offset-0"
                            />
                          </div>
                          <div className="mt-2 max-h-72 overflow-y-auto space-y-0.5 pr-0.5">
                            {!groupOptions || groupOptions.loading ? (
                              <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                Loading groups...
                              </div>
                            ) : groupOptions.groups.length === 0 ? (
                              <div className="py-4 text-center text-sm text-muted-foreground">
                                No groups in this project
                              </div>
                            ) : visibleGroups.length === 0 ? (
                              <div className="py-4 text-center text-sm text-muted-foreground">
                                {availableGroups.length === 0
                                  ? "All groups already added"
                                  : "No matching groups"}
                              </div>
                            ) : (
                              visibleGroups.map((group) => {
                                const isSelected =
                                  newProjectGroup?.id === String(group.id);
                                return (
                                  <button
                                    key={group.id}
                                    type="button"
                                    onClick={() => selectGroupOption(group)}
                                    title={group.name}
                                    className={`w-full h-8 flex items-center gap-2 px-2 rounded-md text-sm text-left text-foreground transition-colors hover:bg-secondary ${
                                      isSelected ? "bg-secondary" : ""
                                    }`}
                                  >
                                    <span
                                      className="h-2 w-2 rounded-full shrink-0"
                                      style={{
                                        backgroundColor:
                                          group.color || "#3b82f6",
                                      }}
                                    />
                                    <span className="truncate flex-1">
                                      {group.name}
                                    </span>
                                    {isSelected && (
                                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-primary" />
                                    )}
                                  </button>
                                );
                              })
                            )}
                          </div>
                        </PopoverContent>
                      </Popover>
                      <button
                        onClick={handleAddProject}
                        disabled={!newProjectName.trim()}
                        style={{
                          background: newProjectName.trim()
                            ? "hsl(var(--primary))"
                            : "hsl(var(--primary) / 0.12)",
                          color: newProjectName.trim()
                            ? "hsl(var(--background))"
                            : "hsl(var(--primary))",
                          border: "none",
                          borderRadius: "10px",
                          height: "36px",
                          padding: "0 18px",
                          fontWeight: 600,
                          fontSize: "12px",
                          cursor: newProjectName.trim()
                            ? "pointer"
                            : "not-allowed",
                        }}
                      >
                        Add
                      </button>
                      <button
                        onClick={cancelAddingProject}
                        style={{
                          background: "none",
                          border: "none",
                          color: "hsl(var(--muted-foreground))",
                          fontSize: "12px",
                          cursor: "pointer",
                          height: "36px",
                          padding: "0 8px",
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={startAddingProject}
                      style={{
                        background: "transparent",
                        border: "1px dashed hsl(var(--border))",
                        borderRadius: "10px",
                        color: "hsl(var(--muted-foreground))",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "7px",
                        fontSize: "12px",
                        fontWeight: 600,
                        padding: "6px 16px",
                        transition:
                          "border-color 150ms, color 150ms, background 150ms",
                      }}
                      onMouseEnter={(e) => {
                        const el = e.currentTarget as HTMLButtonElement;
                        el.style.borderColor = "hsl(var(--primary) / 0.35)";
                        el.style.color = "hsl(var(--primary))";
                        el.style.background = "hsl(var(--primary) / 0.05)";
                      }}
                      onMouseLeave={(e) => {
                        const el = e.currentTarget as HTMLButtonElement;
                        el.style.borderColor = "hsl(var(--border))";
                        el.style.color = "hsl(var(--muted-foreground))";
                        el.style.background = "transparent";
                      }}
                    >
                      <Plus style={{ width: 13, height: 13 }} /> Add Project
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* ── Empty State ── */
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "80px 0",
                gap: "16px",
              }}
            >
              <div
                style={{
                  width: "64px",
                  height: "64px",
                  background: "hsl(var(--primary) / 0.08)",
                  border: "1px solid hsl(var(--primary) / 0.15)",
                  borderRadius: "18px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ClipboardList
                  style={{
                    width: 28,
                    height: 28,
                    color: "hsl(var(--primary))",
                  }}
                />
              </div>
              <p
                style={{
                  color: "hsl(var(--muted-foreground))",
                  fontSize: "14px",
                  fontWeight: 500,
                  textAlign: "center",
                }}
              >
                No entries yet.{" "}
                <button
                  onClick={() => openDate(new Date())}
                  style={{
                    background: "none",
                    border: "none",
                    color: "hsl(var(--primary))",
                    cursor: "pointer",
                    fontWeight: 600,
                    fontSize: "14px",
                    padding: 0,
                    textDecoration: "underline",
                    textDecorationStyle: "dotted",
                    textUnderlineOffset: "3px",
                  }}
                >
                  Click here to start today's plan.
                </button>
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
