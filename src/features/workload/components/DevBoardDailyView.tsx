import { useState, useRef } from "react";
import { format } from "date-fns";
import {
  Search,
  ChevronDown,
  Plus,
  Calendar,
  Pencil,
  Trash2,
  Circle,
  X,
  CheckCircle2,
  ClipboardList,
  FolderOpen,
  ExternalLink,
  UserPlus,
  ChevronRight,
} from "lucide-react";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { useAppSelector } from "@/hooks";
import { tasksApi } from "@/features/tasks/api/tasksApi";
import type { TaskResponse } from "@/features/tasks/types/types";
import type { Member } from "@/features/cms/types/types";
import { stringToHslColor } from "@/features/workload/utils";

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

const getInitials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

interface Project {
  id: string;
  name: string;
  boardId?: string;
  tasks: Task[];
  expanded: boolean;
}

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
  const [activeDateStr, setActiveDateStr] = useState<string | null>(null);
  const [dateMap, setDateMap] = useState<Record<string, Project[]>>({});
  const [isAddingDate, setIsAddingDate] = useState(false);
  const [newDateValue, setNewDateValue] = useState("");
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
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const [projectSearchQuery, setProjectSearchQuery] = useState("");
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

  // Organization projects (boards) for the "Add project" dropdown,
  // excluding ones already added to the active date
  const boards = useAppSelector((state) => state.boards.boards);
  const organizationId = useAppSelector(
    (state) => state.auth.user?.organization_id,
  );
  const addedProjectNames = new Set(
    projects.map((p) => p.name.toLowerCase()),
  );
  const projectOptions = boards.filter(
    (b) =>
      !addedProjectNames.has(b.name.toLowerCase()) &&
      b.name.toLowerCase().includes(projectSearchQuery.trim().toLowerCase()),
  );

  const startAddingProject = () => {
    setIsAddingProject(true);
    setIsProjectDropdownOpen(true);
  };

  const cancelAddingProject = () => {
    setIsAddingProject(false);
    setIsProjectDropdownOpen(false);
    setNewProjectName("");
    setNewProjectBoardId(null);
    setProjectSearchQuery("");
  };

  const selectProjectOption = (board: { id: string; name: string }) => {
    setNewProjectName(board.name);
    setNewProjectBoardId(String(board.id));
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
            <div className="flex items-center gap-2">
              {!activeDateStr && !isAddingDate && (
                <button
                  onClick={() => {
                    const todayStr = new Date().toISOString();
                    setDateMap((prev) => ({ ...prev, [todayStr]: [] }));
                    setActiveDateStr(todayStr);
                  }}
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

              {isAddingDate ? (
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={newDateValue}
                    onChange={(e) => setNewDateValue(e.target.value)}
                    className="h-[40px] w-[150px] [color-scheme:dark]"
                    style={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "12px",
                      color: "hsl(var(--foreground))",
                      fontSize: "13px",
                    }}
                  />
                  <button
                    onClick={() => {
                      if (newDateValue) {
                        const [y, m, d] = newDateValue.split("-");
                        const newDateObj = new Date(
                          Number(y),
                          Number(m) - 1,
                          Number(d),
                        );
                        const isoStr = newDateObj.toISOString();
                        if (!dateMap[isoStr])
                          setDateMap((prev) => ({ ...prev, [isoStr]: [] }));
                        setActiveDateStr(isoStr);
                        setIsAddingDate(false);
                        setNewDateValue("");
                      }
                    }}
                    style={{
                      background: "hsl(var(--primary))",
                      color: "hsl(var(--background))",
                      border: "none",
                      borderRadius: "12px",
                      height: "40px",
                      padding: "0 16px",
                      fontWeight: 600,
                      fontSize: "13px",
                      cursor: "pointer",
                    }}
                  >
                    Add
                  </button>
                  <button
                    onClick={() => setIsAddingDate(false)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "hsl(var(--muted-foreground))",
                      cursor: "pointer",
                      padding: "0 4px",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <X style={{ width: 16, height: 16 }} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsAddingDate(true)}
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
              )}
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

          {/* ── DATE CARD ── */}
          {activeDateStr ? (
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
                            <FolderOpen
                              style={{
                                width: 14,
                                height: 14,
                                color: "hsl(var(--primary))",
                                flexShrink: 0,
                              }}
                            />
                            <span style={{ fontWeight: 600, fontSize: "13px" }}>
                              {project.name}
                            </span>
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
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleToggleTaskStatus(
                                        project.id,
                                        task.id,
                                      );
                                    }}
                                    style={{
                                      background: "none",
                                      border: "none",
                                      cursor: "pointer",
                                      display: "flex",
                                      alignItems: "center",
                                      padding: 0,
                                    }}
                                  >
                                    {task.status === "completed" ? (
                                      <CheckCircle2
                                        style={{
                                          width: 15,
                                          height: 15,
                                          color: "hsl(var(--primary))",
                                          flexShrink: 0,
                                        }}
                                      />
                                    ) : (
                                      <Circle
                                        style={{
                                          width: 15,
                                          height: 15,
                                          color: "hsl(var(--muted-foreground))",
                                          flexShrink: 0,
                                        }}
                                      />
                                    )}
                                  </button>
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
                          if (!open) setProjectSearchQuery("");
                        }}
                      >
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className="focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#34d399]"
                            style={{
                              height: "36px",
                              width: "220px",
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
                            <span
                              style={{
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {newProjectName || "Select project..."}
                            </span>
                            <ChevronDown
                              style={{ width: 14, height: 14, flexShrink: 0 }}
                            />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent
                          align="start"
                          className="w-64 p-2 bg-card border border-border shadow-lg rounded-lg"
                          onWheel={(e) => e.stopPropagation()}
                        >
                          <div style={{ position: "relative" }}>
                            <Search
                              style={{
                                position: "absolute",
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
                                if (e.key === "Enter" && projectOptions[0]) {
                                  selectProjectOption(projectOptions[0]);
                                }
                              }}
                              placeholder="Search projects..."
                              className="h-8 pl-8 text-sm focus-visible:ring-1 focus-visible:ring-[#34d399] focus-visible:ring-offset-0"
                            />
                          </div>
                          <div
                            className="mt-2 max-h-60 overflow-y-auto space-y-0.5"
                          >
                            {projectOptions.length === 0 ? (
                              <div className="py-4 text-center text-sm text-muted-foreground">
                                No projects found
                              </div>
                            ) : (
                              projectOptions.map((board) => (
                                <button
                                  key={board.id}
                                  type="button"
                                  onClick={() => selectProjectOption(board)}
                                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-left transition-colors hover:bg-secondary ${
                                    board.name === newProjectName
                                      ? "bg-secondary text-foreground"
                                      : "text-foreground"
                                  }`}
                                >
                                  <span
                                    className="flex-shrink-0 w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold text-white"
                                    style={{
                                      background:
                                        board.icon_color ||
                                        "hsl(var(--primary))",
                                    }}
                                  >
                                    {board.name.charAt(0).toUpperCase()}
                                  </span>
                                  <span className="truncate">
                                    {board.name}
                                  </span>
                                </button>
                              ))
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
                  onClick={() => {
                    const todayStr = new Date().toISOString();
                    setDateMap((prev) => ({ ...prev, [todayStr]: [] }));
                    setActiveDateStr(todayStr);
                  }}
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
