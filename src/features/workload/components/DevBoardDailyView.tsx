import React, { useState } from "react";
import { format } from "date-fns";
import {
  Search,
  ChevronDown,
  ChevronRight,
  Plus,
  Download,
  Calendar,
  Pencil,
  Trash2,
  Circle,
  X,
  CheckCircle2,
  ClipboardList,
} from "lucide-react";
import { Input } from "@/shared/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { cn } from "@/utils/utils";

interface DevBoardDailyViewProps {
  boardId: string | number;
}

interface Task {
  id: string;
  title: string;
  status: "pending" | "completed";
}

interface Project {
  id: string;
  name: string;
  tasks: Task[];
  expanded: boolean;
}

export function DevBoardDailyView({ boardId }: DevBoardDailyViewProps) {
  const [activeDateStr, setActiveDateStr] = useState<string | null>(null);
  const [dateMap, setDateMap] = useState<Record<string, Project[]>>({});

  const [isAddingDate, setIsAddingDate] = useState(false);
  const [newDateValue, setNewDateValue] = useState("");

  const [filter, setFilter] = useState<"All" | "Pending" | "Completed">("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Get current active projects
  const projects =
    activeDateStr && dateMap[activeDateStr] ? dateMap[activeDateStr] : [];

  const updateActiveProjects = (newProjects: Project[]) => {
    if (!activeDateStr) return;
    setDateMap({ ...dateMap, [activeDateStr]: newProjects });
  };

  // Edits
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editProjectName, setEditProjectName] = useState("");
  const [addingTaskToProject, setAddingTaskToProject] = useState<string | null>(
    null,
  );
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [addingProjectType, setAddingProjectType] = useState<string>("");

  const toggleProject = (id: string) => {
    updateActiveProjects(
      projects.map((p) => (p.id === id ? { ...p, expanded: !p.expanded } : p)),
    );
  };

  const handleAddProject = () => {
    if (!newProjectName.trim()) {
      return;
    }
    updateActiveProjects([
      ...projects,
      {
        id: `p${Date.now()}`,
        name: newProjectName.trim(),
        tasks: [],
        expanded: true,
      },
    ]);
    setNewProjectName("");
    setAddingProjectType("");
    setIsAddingProject(false);
  };

  const handleAddTask = (projectId: string) => {
    if (!newTaskTitle.trim()) {
      setAddingTaskToProject(null);
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
                  status: "pending",
                },
              ],
            }
          : p,
      ),
    );
    setNewTaskTitle("");
    setAddingTaskToProject(null);
  };

  const handleDeleteProject = (id: string) => {
    updateActiveProjects(projects.filter((p) => p.id !== id));
  };

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

  const handleToggleTaskStatus = (projectId: string, taskId: string) => {
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
  };

  const handleDeleteTask = (projectId: string, taskId: string) => {
    updateActiveProjects(
      projects.map((p) =>
        p.id === projectId
          ? { ...p, tasks: p.tasks.filter((t) => t.id !== taskId) }
          : p,
      ),
    );
  };

  const totalTasks = projects.reduce((acc, p) => acc + p.tasks.length, 0);
  const completedTasks = projects.reduce(
    (acc, p) => acc + p.tasks.filter((t) => t.status === "completed").length,
    0,
  );

  return (
    <div
      className="flex-1 flex flex-col w-full h-full bg-[#0a0f18] text-white p-4 md:p-8 overflow-y-auto"
      data-board-id={boardId}
    >
      <div className="max-w-[1200px] w-full mx-auto space-y-6">
        {/* Header Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 h-auto min-h-[40px]">
          {activeDateStr ? (
            <Select
              value={activeDateStr}
              onValueChange={(val) => setActiveDateStr(val)}
            >
              <SelectTrigger className="w-[280px] bg-[#131b2b] border-[#1f2937] text-gray-200 hover:bg-[#1a2333] hover:text-white h-10">
                <SelectValue placeholder="Select Date" />
              </SelectTrigger>
              <SelectContent className="bg-[#131b2b] border-[#1f2937] text-white">
                {Object.keys(dateMap).map((dateStr) => {
                  const dObj = new Date(dateStr);
                  const isTodayStr =
                    format(dObj, "yyyy-MM-dd") ===
                    format(new Date(), "yyyy-MM-dd");

                  return (
                    <SelectItem
                      key={dateStr}
                      value={dateStr}
                      className="focus:bg-[#1a2333] focus:text-white cursor-pointer"
                    >
                      {format(dObj, "EEE, MMM d, yyyy")}{" "}
                      {isTodayStr ? "(Today)" : ""}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          ) : (
            <span className="text-gray-400 font-medium ml-1">
              No date entries yet
            </span>
          )}

          <div className="flex items-center gap-2">
            {!activeDateStr && !isAddingDate && (
              <button
                onClick={() => {
                  const todayStr = new Date().toISOString();
                  setDateMap((prev) => ({ ...prev, [todayStr]: [] }));
                  setActiveDateStr(todayStr);
                }}
                className="inline-flex items-center justify-center rounded-md bg-[#34d399] hover:bg-[#10b981] text-[#0a0f18] font-medium h-10 px-4 transition-colors text-sm"
              >
                <Plus className="mr-1 w-4 h-4" /> Today
              </button>
            )}

            {isAddingDate ? (
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={newDateValue}
                  onChange={(e) => setNewDateValue(e.target.value)}
                  className="bg-[#131b2b] border-[#1f2937] text-white h-10 w-[160px] [color-scheme:dark]"
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

                      if (!dateMap[isoStr]) {
                        setDateMap((prev) => ({ ...prev, [isoStr]: [] }));
                      }
                      setActiveDateStr(isoStr);
                      setIsAddingDate(false);
                      setNewDateValue("");
                    }
                  }}
                  className="inline-flex items-center justify-center rounded-md bg-[#34d399] hover:bg-[#10b981] text-[#0a0f18] font-medium h-10 px-4 transition-colors text-sm"
                >
                  Add
                </button>
                <button
                  onClick={() => setIsAddingDate(false)}
                  className="text-gray-400 hover:text-white p-2"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsAddingDate(true)}
                className="inline-flex items-center justify-center rounded-md bg-[#131b2b] border border-[#1f2937] text-gray-200 hover:bg-[#1a2333] hover:text-white h-10 px-4 transition-colors text-sm"
              >
                <Plus className="mr-2 w-4 h-4" /> Date
              </button>
            )}
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="relative w-full sm:flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks..."
              className="bg-[#131b2b] border-[#1f2937] text-white pl-10 focus-visible:ring-1 focus-visible:ring-gray-600 placeholder:text-gray-500"
            />
          </div>

          <div className="flex items-center w-full sm:w-auto bg-[#131b2b] border border-[#1f2937] rounded-md p-1 gap-1">
            <button
              onClick={() => setFilter("All")}
              className={cn(
                "flex-1 sm:flex-none px-4 py-1.5 rounded-sm text-sm font-medium transition-colors",
                filter === "All"
                  ? "bg-[#34d399] text-[#0a0f18]"
                  : "text-gray-300 hover:text-white",
              )}
            >
              All
            </button>
            <button
              onClick={() => setFilter("Pending")}
              className={cn(
                "flex-1 sm:flex-none px-4 py-1.5 rounded-sm text-sm font-medium transition-colors",
                filter === "Pending"
                  ? "bg-[#34d399] text-[#0a0f18]"
                  : "text-gray-300 hover:text-white",
              )}
            >
              Pending
            </button>
            <button
              onClick={() => setFilter("Completed")}
              className={cn(
                "flex-1 sm:flex-none px-4 py-1.5 rounded-sm text-sm font-medium transition-colors",
                filter === "Completed"
                  ? "bg-[#34d399] text-[#0a0f18]"
                  : "text-gray-300 hover:text-white",
              )}
            >
              Completed
            </button>
          </div>
        </div>

        {/* Date Block OR Empty State */}
        {activeDateStr ? (
          <div className="bg-[#131b2b] border border-[#1f2937] rounded-lg overflow-hidden">
            {/* Block Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border-b border-[#1f2937]">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-[#34d399]" />
                <h2 className="text-lg font-semibold text-white">
                  {format(new Date(activeDateStr), "EEE, MMM d, yyyy")}
                </h2>
                {format(new Date(activeDateStr), "yyyy-MM-dd") ===
                  format(new Date(), "yyyy-MM-dd") && (
                  <span className="bg-[#34d399] text-[#0a0f18] text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-sm">
                    Today
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-400 font-medium">
                  {completedTasks}/{totalTasks} done
                </span>
                <button className="text-gray-400 hover:text-white transition-colors">
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Block Content */}
            <div className="p-4 space-y-6 flex flex-col">
              {projects.map((project, idx) => {
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

                if (
                  (searchQuery || filter !== "All") &&
                  filteredTasks.length === 0
                ) {
                  return null;
                }

                return (
                  <div key={project.id} className="space-y-3">
                    <div className="flex items-center justify-between group">
                      {editingProjectId === project.id ? (
                        <div className="flex items-center gap-2 flex-1">
                          <Input
                            autoFocus
                            value={editProjectName}
                            onChange={(e) => setEditProjectName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter")
                                handleEditProjectSave(project.id);
                              if (e.key === "Escape") setEditingProjectId(null);
                            }}
                            onBlur={() => handleEditProjectSave(project.id)}
                            className="h-8 max-w-[200px] bg-[#1a2333] border-[#1f2937] text-white"
                          />
                        </div>
                      ) : (
                        <button
                          onClick={() => toggleProject(project.id)}
                          className="flex items-center gap-2 text-white hover:text-gray-200"
                        >
                          {project.expanded ? (
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                          )}
                          <span className="font-semibold">{project.name}</span>
                          <span className="text-gray-500 font-medium">
                            ({project.tasks.length})
                          </span>
                        </button>
                      )}

                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            setEditProjectName(project.name);
                            setEditingProjectId(project.id);
                          }}
                          className="p-1.5 text-gray-400 hover:text-white hover:bg-[#1a2333] rounded"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteProject(project.id)}
                          className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-[#1a2333] rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {project.expanded && (
                      <div className="pl-6 space-y-2">
                        {filteredTasks.map((task) => (
                          <div
                            key={task.id}
                            className="flex items-center justify-between group/task py-1"
                          >
                            <button
                              onClick={() =>
                                handleToggleTaskStatus(project.id, task.id)
                              }
                              className="flex items-center gap-2.5 text-sm text-gray-200 hover:text-white transition-colors"
                            >
                              {task.status === "completed" ? (
                                <CheckCircle2 className="w-4 h-4 text-[#34d399]" />
                              ) : (
                                <Circle className="w-4 h-4 text-gray-500" />
                              )}
                              <span
                                className={
                                  task.status === "completed"
                                    ? "line-through text-gray-500"
                                    : ""
                                }
                              >
                                {task.title}
                              </span>
                            </button>

                            <button
                              onClick={() =>
                                handleDeleteTask(project.id, task.id)
                              }
                              className="opacity-0 group-hover/task:opacity-100 p-1 text-gray-500 hover:text-red-400 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}

                        {addingTaskToProject === project.id ? (
                          <div className="flex items-center gap-2 mt-2">
                            <Input
                              autoFocus
                              value={newTaskTitle}
                              onChange={(e) => setNewTaskTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter")
                                  handleAddTask(project.id);
                                if (e.key === "Escape")
                                  setAddingTaskToProject(null);
                              }}
                              onBlur={() => handleAddTask(project.id)}
                              placeholder="Enter task title..."
                              className="h-8 max-w-[300px] bg-[#1a2333] border-[#1f2937] text-white text-sm"
                            />
                          </div>
                        ) : (
                          <div className="pt-1">
                            {idx === 0 && project.tasks.length === 0 ? (
                              <button
                                onClick={() =>
                                  setAddingTaskToProject(project.id)
                                }
                                className="inline-flex items-center justify-center rounded-md bg-[#34d399] hover:bg-[#10b981] text-[#0a0f18] font-medium text-sm h-8 px-4 transition-colors"
                              >
                                <Plus className="w-4 h-4 mr-1.5" />
                                Add task
                              </button>
                            ) : (
                              <button
                                onClick={() =>
                                  setAddingTaskToProject(project.id)
                                }
                                className="flex items-center text-gray-400 hover:text-gray-200 text-sm font-medium py-1"
                              >
                                <Plus className="w-4 h-4 mr-1.5" />
                                Add task
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              <div className="pt-2 mt-2">
                {isAddingProject ? (
                  <div className="flex items-center gap-3 overflow-x-auto pb-1">
                    <Select
                      value={addingProjectType}
                      onValueChange={(val) => setAddingProjectType(val)}
                    >
                      <SelectTrigger className="w-[180px] bg-[#111827] border-[#1f2937] text-gray-200 hover:bg-[#1a2333] hover:text-white h-10 shadow-none">
                        <SelectValue placeholder="New project..." />
                      </SelectTrigger>
                      <SelectContent className="bg-[#111827] border-[#1f2937] p-0 w-[180px]">
                        <SelectItem
                          value="custom"
                          className="bg-[#22d3ee] text-black focus:bg-[#22d3ee] focus:text-black font-semibold rounded-none cursor-pointer h-10 text-sm"
                        >
                          + New project...
                        </SelectItem>
                      </SelectContent>
                    </Select>

                    {addingProjectType === "custom" && (
                      <Input
                        autoFocus
                        value={newProjectName}
                        onChange={(e) => setNewProjectName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleAddProject();
                          if (e.key === "Escape") {
                            setIsAddingProject(false);
                            setAddingProjectType("");
                            setNewProjectName("");
                          }
                        }}
                        placeholder=""
                        className="h-10 w-[220px] bg-[#0a0f18] border-[#34d399] outline-none ring-1 ring-[#34d399] focus-visible:ring-[#34d399] text-white"
                      />
                    )}

                    <button
                      onClick={handleAddProject}
                      disabled={
                        addingProjectType !== "custom" || !newProjectName.trim()
                      }
                      className={cn(
                        "inline-flex items-center justify-center rounded-md font-medium text-sm h-10 px-6 transition-colors",
                        addingProjectType === "custom" && newProjectName.trim()
                          ? "bg-[#34d399] hover:bg-[#10b981] text-[#0a0f18] cursor-pointer"
                          : "bg-[#064e3b] text-[#10b981] cursor-not-allowed opacity-90",
                      )}
                    >
                      Add
                    </button>

                    <button
                      onClick={() => {
                        setIsAddingProject(false);
                        setAddingProjectType("");
                        setNewProjectName("");
                      }}
                      className="text-white hover:text-gray-300 font-medium text-sm h-10 px-2"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsAddingProject(true)}
                    className="flex items-center text-gray-400 hover:text-gray-200 text-sm font-medium w-max px-2 py-1 -mx-2"
                  >
                    <Plus className="w-4 h-4 mr-1.5" />
                    Add project
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-32 space-y-4">
            <ClipboardList className="w-16 h-16 text-[#1f2937]" />
            <p className="text-gray-400 font-medium text-base">
              No entries yet. Click "+ Today" to begin.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
