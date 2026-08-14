import React, { useState } from "react";
import { format, isToday } from "date-fns";
import {
  Search,
  ChevronDown,
  ChevronRight,
  Plus,
  Download,
  Calendar,
  Pencil,
  Trash2,
} from "lucide-react";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
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
  const [currentDate] = useState(new Date("2026-08-14T00:00:00"));
  const [filter, setFilter] = useState<"All" | "Pending" | "Completed">("All");
  const [searchQuery, setSearchQuery] = useState("");

  const [projects, setProjects] = useState<Project[]>([
    {
      id: "p1",
      name: "Test",
      tasks: [],
      expanded: true,
    },
    {
      id: "p2",
      name: "Test",
      tasks: [],
      expanded: true,
    },
  ]);

  const toggleProject = (id: string) => {
    setProjects(
      projects.map((p) => (p.id === id ? { ...p, expanded: !p.expanded } : p)),
    );
  };

  const totalTasks = projects.reduce((acc, p) => acc + p.tasks.length, 0);
  const completedTasks = projects.reduce(
    (acc, p) => acc + p.tasks.filter((t) => t.status === "completed").length,
    0,
  );

  return (
    <div
      className="flex-1 flex flex-col w-full h-full bg-[#0a0f18] text-white p-6 overflow-y-auto"
      data-board-id={boardId}
    >
      <div className="max-w-4xl w-full mx-auto space-y-6">
        {/* Header Controls */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            className="bg-[#131b2b] border-[#1f2937] text-gray-200 hover:bg-[#1a2333] hover:text-white"
          >
            {format(currentDate, "EEE, MMM d, yyyy")} (Today)
            <ChevronDown className="ml-2 w-4 h-4 text-gray-400" />
          </Button>

          <Button
            variant="outline"
            className="bg-[#131b2b] border-[#1f2937] text-gray-200 hover:bg-[#1a2333] hover:text-white"
          >
            <Plus className="mr-2 w-4 h-4" /> Date
          </Button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks..."
              className="bg-[#131b2b] border-[#1f2937] text-white pl-10 focus-visible:ring-1 focus-visible:ring-gray-600 placeholder:text-gray-500"
            />
          </div>

          <div className="flex items-center bg-[#131b2b] border border-[#1f2937] rounded-md p-1 gap-1">
            <button
              onClick={() => setFilter("All")}
              className={cn(
                "px-4 py-1.5 rounded-sm text-sm font-medium transition-colors",
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
                "px-4 py-1.5 rounded-sm text-sm font-medium transition-colors",
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
                "px-4 py-1.5 rounded-sm text-sm font-medium transition-colors",
                filter === "Completed"
                  ? "bg-[#34d399] text-[#0a0f18]"
                  : "text-gray-300 hover:text-white",
              )}
            >
              Completed
            </button>
          </div>
        </div>

        {/* Date Block */}
        <div className="bg-[#131b2b] border border-[#1f2937] rounded-lg overflow-hidden">
          {/* Block Header */}
          <div className="flex items-center justify-between p-4 border-b border-[#1f2937]">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-[#34d399]" />
              <h2 className="text-lg font-semibold text-white">
                {format(currentDate, "EEE, MMM d, yyyy")}
              </h2>
              <span className="bg-[#34d399] text-[#0a0f18] text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-sm">
                Today
              </span>
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
          <div className="p-4 space-y-6">
            {projects.map((project, idx) => (
              <div key={project.id} className="space-y-3">
                <div className="flex items-center justify-between group">
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

                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-1.5 text-gray-400 hover:text-white hover:bg-[#1a2333] rounded">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-[#1a2333] rounded">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {project.expanded && (
                  <div className="pl-6">
                    {/* Add Task Button */}
                    {idx === 0 ? (
                      <Button className="bg-[#22d3ee] hover:bg-[#06b6d4] text-[#083344] font-medium text-sm h-8 px-4">
                        <Plus className="w-4 h-4 mr-1.5" />
                        Add task
                      </Button>
                    ) : (
                      <button className="flex items-center text-gray-400 hover:text-gray-200 text-sm font-medium py-1">
                        <Plus className="w-4 h-4 mr-1.5" />
                        Add task
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* Add Project Button */}
            <div className="pt-2 border-t border-transparent">
              <button className="flex items-center text-gray-400 hover:text-gray-200 text-sm font-medium">
                <Plus className="w-4 h-4 mr-1.5" />
                Add project
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
