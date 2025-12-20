import { useState } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Calendar, FolderKanban, ArrowLeft, AlertCircle, Clock, CheckCircle2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Checkbox } from "@/components/ui/checkbox";
import { TaskDetailDialog } from "@/components/TaskDetailDialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, useSensor, useSensors, PointerSensor, closestCorners } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface KanbanTask {
  id: string;
  title: string;
  description: string;
  client_summary: string;
  project_name: string;
  priority: string;
  status: string;
  deadline: string;
  created_at: string;
}

interface SortableTaskCardProps {
  task: KanbanTask;
  getPriorityColor: (priority: string) => string;
  onTaskClick: (task: KanbanTask) => void;
}

function SortableTaskCard({ task, getPriorityColor, onTaskClick }: SortableTaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card 
      ref={setNodeRef}
      style={style}
      className="bg-background/50 border-border/30 hover:border-primary/50 transition-all cursor-grab active:cursor-grabbing"
    >
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start gap-2">
          <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing mt-1">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex-1" onClick={() => onTaskClick(task)}>
            <h4 className="font-medium text-sm text-foreground cursor-pointer hover:text-primary">{task.title}</h4>
            <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
              <span className="flex items-center gap-1">
                <FolderKanban className="h-3 w-3" />
                {task.project_name}
              </span>
            </div>
            <div className="flex items-center justify-between mt-2">
              <Badge className={`${getPriorityColor(task.priority)} text-xs`}>
                {task.priority}
              </Badge>
              <span className="text-xs text-muted-foreground">{new Date(task.deadline).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function TodoTasks() {
  const navigate = useNavigate();
  const [filterPeriod, setFilterPeriod] = useState<"today" | "month" | "year">("today");
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleTaskClick = (task: any) => {
    setSelectedTask(task);
    setDialogOpen(true);
  };

  // Mock data for today's tasks
  const todayTasks = [
    { id: "1", title: "Design landing page mockup", description: "Create high-fidelity mockups for the new e-commerce landing page", client_summary: "Client wants a modern, clean design with focus on conversion", project_name: "E-commerce Platform", priority: "high", status: "todo", deadline: "2025-12-02", time: "10:00 AM", completed: false, created_at: "2025-11-28" },
    { id: "2", title: "Fix authentication bug", description: "Users are unable to login with social accounts", client_summary: "Critical bug affecting user login", project_name: "Mobile App Design", priority: "urgent", status: "inProgress", deadline: "2025-12-01", time: "2:00 PM", completed: false, created_at: "2025-11-29" },
    { id: "3", title: "Update API documentation", description: "Add new endpoints to API docs", client_summary: "Documentation needs to be up to date for developers", project_name: "CRM System", priority: "medium", status: "todo", deadline: "2025-12-03", time: "4:00 PM", completed: false, created_at: "2025-11-30" },
    { id: "4", title: "Code review for PR #234", description: "Review and approve pull request", client_summary: "Important feature needs to be reviewed", project_name: "Dashboard Analytics", priority: "high", status: "review", deadline: "2025-12-01", time: "11:00 AM", completed: false, created_at: "2025-11-30" },
    { id: "5", title: "Team standup meeting", description: "Daily team sync", client_summary: "Regular team meeting", project_name: "General", priority: "medium", status: "done", deadline: "2025-12-01", time: "9:00 AM", completed: true, created_at: "2025-12-01" },
  ];

  // Mock data for kanban board
  const [kanbanTasks, setKanbanTasks] = useState({
    todo: [
      { id: "kb-1", title: "Design landing page mockup", description: "Create mockups", client_summary: "Modern clean design", project_name: "E-commerce Platform", priority: "high", status: "todo", deadline: "2025-12-02", created_at: "2025-11-28" },
      { id: "kb-3", title: "Update API documentation", description: "Add new endpoints", client_summary: "Keep docs updated", project_name: "CRM System", priority: "medium", status: "todo", deadline: "2025-12-03", created_at: "2025-11-30" },
      { id: "kb-6", title: "Setup testing environment", description: "Configure test env", client_summary: "Need QA environment", project_name: "API Integration", priority: "low", status: "todo", deadline: "2025-12-05", created_at: "2025-11-28" },
    ],
    inProgress: [
      { id: "kb-2", title: "Fix authentication bug", description: "Login issues", client_summary: "Critical bug", project_name: "Mobile App Design", priority: "urgent", status: "inProgress", deadline: "2025-12-01", created_at: "2025-11-29" },
      { id: "kb-4", title: "Implement payment gateway", description: "Add Stripe integration", client_summary: "Need payment processing", project_name: "E-commerce Platform", priority: "high", status: "inProgress", deadline: "2025-12-15", created_at: "2025-11-27" },
    ],
    review: [
      { id: "kb-5", title: "Create user dashboard", description: "Analytics dashboard", client_summary: "Need data visualization", project_name: "Dashboard Analytics", priority: "medium", status: "review", deadline: "2025-12-10", created_at: "2025-11-26" },
      { id: "kb-7", title: "Mobile responsive design", description: "Make site mobile friendly", client_summary: "Improve mobile UX", project_name: "Website Redesign", priority: "high", status: "review", deadline: "2025-12-08", created_at: "2025-11-25" },
    ],
    done: [
      { id: "kb-8", title: "Setup development environment", description: "Dev env setup", client_summary: "Initial setup", project_name: "E-commerce Platform", priority: "high", status: "done", deadline: "2025-11-28", created_at: "2025-11-20" },
      { id: "kb-9", title: "Create database schema", description: "Database design", client_summary: "Schema design", project_name: "CRM System", priority: "medium", status: "done", deadline: "2025-11-25", created_at: "2025-11-18" },
    ],
  });

  // Mock data - replace with real data later
  const tasks = {
    today: [
      { id: "10", title: "Design landing page mockup", description: "Create high-fidelity mockups", client_summary: "Modern clean design", project_name: "E-commerce Platform", priority: "high", status: "todo", deadline: "2025-12-02", created_at: "2025-11-28" },
      { id: "11", title: "Fix authentication bug", description: "Login issues with social auth", client_summary: "Critical bug", project_name: "Mobile App Design", priority: "urgent", status: "inProgress", deadline: "2025-12-01", created_at: "2025-11-29" },
      { id: "12", title: "Update API documentation", description: "Add new endpoints", client_summary: "Keep docs updated", project_name: "CRM System", priority: "medium", status: "todo", deadline: "2025-12-03", created_at: "2025-11-30" },
    ],
    month: [
      { id: "10", title: "Design landing page mockup", description: "Create high-fidelity mockups", client_summary: "Modern clean design", project_name: "E-commerce Platform", priority: "high", status: "todo", deadline: "2025-12-02", created_at: "2025-11-28" },
      { id: "11", title: "Fix authentication bug", description: "Login issues", client_summary: "Critical bug", project_name: "Mobile App Design", priority: "urgent", status: "inProgress", deadline: "2025-12-01", created_at: "2025-11-29" },
      { id: "12", title: "Update API documentation", description: "Add new endpoints", client_summary: "Keep docs updated", project_name: "CRM System", priority: "medium", status: "todo", deadline: "2025-12-03", created_at: "2025-11-30" },
      { id: "13", title: "Implement payment gateway", description: "Stripe integration", client_summary: "Payment processing needed", project_name: "E-commerce Platform", priority: "high", status: "inProgress", deadline: "2025-12-15", created_at: "2025-11-27" },
      { id: "14", title: "Create user dashboard", description: "Analytics dashboard", client_summary: "Data visualization", project_name: "Dashboard Analytics", priority: "medium", status: "review", deadline: "2025-12-10", created_at: "2025-11-26" },
      { id: "15", title: "Database optimization", description: "Performance improvements", client_summary: "Slow queries", project_name: "CRM System", priority: "low", status: "todo", deadline: "2025-12-20", created_at: "2025-11-25" },
    ],
    year: [
      { id: "10", title: "Design landing page mockup", description: "Create mockups", client_summary: "Modern design", project_name: "E-commerce Platform", priority: "high", status: "todo", deadline: "2025-12-02", created_at: "2025-11-28" },
      { id: "11", title: "Fix authentication bug", description: "Login issues", client_summary: "Critical bug", project_name: "Mobile App Design", priority: "urgent", status: "inProgress", deadline: "2025-12-01", created_at: "2025-11-29" },
      { id: "12", title: "Update API documentation", description: "Add endpoints", client_summary: "Docs update", project_name: "CRM System", priority: "medium", status: "todo", deadline: "2025-12-03", created_at: "2025-11-30" },
      { id: "13", title: "Implement payment gateway", description: "Payment system", client_summary: "Need payments", project_name: "E-commerce Platform", priority: "high", status: "inProgress", deadline: "2025-12-15", created_at: "2025-11-27" },
      { id: "14", title: "Create user dashboard", description: "Dashboard UI", client_summary: "Analytics view", project_name: "Dashboard Analytics", priority: "medium", status: "review", deadline: "2025-12-10", created_at: "2025-11-26" },
      { id: "15", title: "Database optimization", description: "Performance", client_summary: "Speed up", project_name: "CRM System", priority: "low", status: "todo", deadline: "2025-12-20", created_at: "2025-11-25" },
      { id: "16", title: "Mobile responsive design", description: "Mobile friendly", client_summary: "Better UX", project_name: "Website Redesign", priority: "high", status: "review", deadline: "2025-12-08", created_at: "2025-11-24" },
      { id: "17", title: "Setup CI/CD pipeline", description: "Automation", client_summary: "Deploy faster", project_name: "API Integration", priority: "medium", status: "inProgress", deadline: "2025-12-12", created_at: "2025-11-23" },
      { id: "18", title: "Write unit tests", description: "Test coverage", client_summary: "Quality assurance", project_name: "Payment Gateway", priority: "low", status: "review", deadline: "2025-12-18", created_at: "2025-11-22" },
      { id: "19", title: "Security audit", description: "Security review", client_summary: "Check vulnerabilities", project_name: "AI Chatbot", priority: "urgent", status: "inProgress", deadline: "2025-12-05", created_at: "2025-11-21" },
    ],
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Find which column the active task is in
    let sourceColumn: keyof typeof kanbanTasks | null = null;
    let activeTask: KanbanTask | null = null;

    Object.entries(kanbanTasks).forEach(([column, tasks]) => {
      const task = tasks.find((t) => t.id === activeId);
      if (task) {
        sourceColumn = column as keyof typeof kanbanTasks;
        activeTask = task;
      }
    });

    // Find which column we're dropping into
    let targetColumn: keyof typeof kanbanTasks | null = null;
    if (overId === 'todo' || overId === 'inProgress' || overId === 'review' || overId === 'done') {
      targetColumn = overId;
    } else {
      Object.entries(kanbanTasks).forEach(([column, tasks]) => {
        if (tasks.find((t) => t.id === overId)) {
          targetColumn = column as keyof typeof kanbanTasks;
        }
      });
    }

    if (!sourceColumn || !targetColumn || !activeTask) return;

    if (sourceColumn === targetColumn) {
      // Reordering within the same column
      const columnTasks = [...kanbanTasks[sourceColumn]];
      const oldIndex = columnTasks.findIndex((t) => t.id === activeId);
      const newIndex = columnTasks.findIndex((t) => t.id === overId);

      if (oldIndex !== newIndex) {
        const [removed] = columnTasks.splice(oldIndex, 1);
        columnTasks.splice(newIndex, 0, removed);

        setKanbanTasks({
          ...kanbanTasks,
          [sourceColumn]: columnTasks,
        });
      }
    } else {
      // Moving to a different column
      const sourceTasks = kanbanTasks[sourceColumn].filter((t) => t.id !== activeId);
      const targetTasks = [...kanbanTasks[targetColumn]];
      
      // Update task status
      const updatedTask = { ...activeTask, status: targetColumn };
      targetTasks.push(updatedTask);

      setKanbanTasks({
        ...kanbanTasks,
        [sourceColumn]: sourceTasks,
        [targetColumn]: targetTasks,
      });
    }
  };

  const currentTasks = tasks[filterPeriod];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      case "high":
        return "bg-orange-500/20 text-orange-400 border-orange-500/30";
      case "medium":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "low":
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <DashboardHeader />
          <main className="flex-1 p-8">
            <div className="max-w-7xl mx-auto space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <h2 className="text-3xl font-bold text-foreground">Todo Tasks</h2>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="text-sm px-3 py-1">
                    {currentTasks.length} Tasks
                  </Badge>
                  <div className="flex gap-2">
                    <Button
                      variant={viewMode === "list" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setViewMode("list")}
                    >
                      List View
                    </Button>
                    <Button
                      variant={viewMode === "kanban" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setViewMode("kanban")}
                    >
                      Kanban Board
                    </Button>
                  </div>
                </div>
              </div>

              {viewMode === "list" ? (
                <>
                  {/* Today's Task List */}
                  <div className="space-y-6">
                    <Card className="bg-card/50 border-border/50">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Clock className="h-5 w-5 text-primary" />
                          Today's Tasks
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {todayTasks.map((task) => (
                          <div
                            key={task.id}
                            onClick={() => handleTaskClick(task)}
                            className="flex items-center gap-4 p-3 rounded-lg bg-background/50 hover:bg-background/80 transition-all border border-border/30 cursor-pointer"
                          >
                            <Checkbox checked={task.completed} />
                            <div className="flex-1">
                              <h4 className={`font-medium ${task.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
                                {task.title}
                              </h4>
                              <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <FolderKanban className="h-3 w-3" />
                                  {task.project_name}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {task.time}
                                </span>
                              </div>
                            </div>
                            <Badge className={getPriorityColor(task.priority)}>
                              {task.priority === "urgent" && <AlertCircle className="h-3 w-3 mr-1" />}
                              {task.priority}
                            </Badge>
                          </div>
                        ))}
                      </CardContent>
                    </Card>

                    {/* All Tasks with Filters */}
                    <Tabs value={filterPeriod} onValueChange={(v) => setFilterPeriod(v as typeof filterPeriod)}>
                      <TabsList className="bg-card border border-border">
                        <TabsTrigger value="today">Today</TabsTrigger>
                        <TabsTrigger value="month">This Month</TabsTrigger>
                        <TabsTrigger value="year">This Year</TabsTrigger>
                      </TabsList>

                      <TabsContent value={filterPeriod} className="mt-6">
                        <ScrollArea className="h-[600px] pr-4">
                          <div className="space-y-3">
                            {currentTasks.map((task) => (
                              <Card 
                                key={task.id} 
                                onClick={() => handleTaskClick(task)}
                                className="bg-card/50 border-border/50 hover:border-accent/50 transition-all cursor-pointer"
                              >
                                <CardContent className="p-4">
                                  <div className="flex items-center justify-between gap-4">
                                    <div className="flex-1 space-y-2">
                                      <h3 className="font-semibold text-foreground">{task.title}</h3>
                                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                        <div className="flex items-center gap-2">
                                          <FolderKanban className="h-4 w-4" />
                                          <span>{task.project_name}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <Calendar className="h-4 w-4" />
                                          <span>{new Date(task.deadline).toLocaleDateString()}</span>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <Badge className={getPriorityColor(task.priority)}>
                                        {task.priority === "urgent" && <AlertCircle className="h-3 w-3 mr-1" />}
                                        {task.priority}
                                      </Badge>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </ScrollArea>
                      </TabsContent>
                    </Tabs>
                  </div>
                </>
              ) : (
                <>
                  {/* Kanban Board */}
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCorners}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                  >
                    <div className="space-y-4">
                      <h3 className="text-xl font-semibold text-foreground">Task Management Board</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* To Do Column */}
                        <Card className="bg-card/50 border-border/50">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center justify-between">
                              <span className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                                To Do
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {kanbanTasks.todo.length}
                              </Badge>
                            </CardTitle>
                          </CardHeader>
                          <ScrollArea className="h-[600px]">
                            <CardContent className="space-y-3 pr-4">
                              <SortableContext items={kanbanTasks.todo.map(t => t.id)} strategy={verticalListSortingStrategy}>
                                {kanbanTasks.todo.map((task) => (
                                  <SortableTaskCard
                                    key={task.id}
                                    task={task}
                                    getPriorityColor={getPriorityColor}
                                    onTaskClick={handleTaskClick}
                                  />
                                ))}
                              </SortableContext>
                              <div
                                id="todo"
                                className="h-4"
                                onDragOver={(e) => e.preventDefault()}
                              />
                            </CardContent>
                          </ScrollArea>
                        </Card>

                        {/* In Progress Column */}
                        <Card className="bg-card/50 border-border/50">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center justify-between">
                              <span className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-blue-400"></div>
                                In Progress
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {kanbanTasks.inProgress.length}
                              </Badge>
                            </CardTitle>
                          </CardHeader>
                          <ScrollArea className="h-[600px]">
                            <CardContent className="space-y-3 pr-4">
                              <SortableContext items={kanbanTasks.inProgress.map(t => t.id)} strategy={verticalListSortingStrategy}>
                                {kanbanTasks.inProgress.map((task) => (
                                  <SortableTaskCard
                                    key={task.id}
                                    task={task}
                                    getPriorityColor={getPriorityColor}
                                    onTaskClick={handleTaskClick}
                                  />
                                ))}
                              </SortableContext>
                              <div
                                id="inProgress"
                                className="h-4"
                                onDragOver={(e) => e.preventDefault()}
                              />
                            </CardContent>
                          </ScrollArea>
                        </Card>

                        {/* Review Column */}
                        <Card className="bg-card/50 border-border/50">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center justify-between">
                              <span className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-orange-400"></div>
                                Review
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {kanbanTasks.review.length}
                              </Badge>
                            </CardTitle>
                          </CardHeader>
                          <ScrollArea className="h-[600px]">
                            <CardContent className="space-y-3 pr-4">
                              <SortableContext items={kanbanTasks.review.map(t => t.id)} strategy={verticalListSortingStrategy}>
                                {kanbanTasks.review.map((task) => (
                                  <SortableTaskCard
                                    key={task.id}
                                    task={task}
                                    getPriorityColor={getPriorityColor}
                                    onTaskClick={handleTaskClick}
                                  />
                                ))}
                              </SortableContext>
                              <div
                                id="review"
                                className="h-4"
                                onDragOver={(e) => e.preventDefault()}
                              />
                            </CardContent>
                          </ScrollArea>
                        </Card>

                        {/* Done Column */}
                        <Card className="bg-card/50 border-border/50">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center justify-between">
                              <span className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-green-400"></div>
                                Done
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {kanbanTasks.done.length}
                              </Badge>
                            </CardTitle>
                          </CardHeader>
                          <ScrollArea className="h-[600px]">
                            <CardContent className="space-y-3 pr-4">
                              <SortableContext items={kanbanTasks.done.map(t => t.id)} strategy={verticalListSortingStrategy}>
                                {kanbanTasks.done.map((task) => (
                                  <SortableTaskCard
                                    key={task.id}
                                    task={task}
                                    getPriorityColor={getPriorityColor}
                                    onTaskClick={handleTaskClick}
                                  />
                                ))}
                              </SortableContext>
                              <div
                                id="done"
                                className="h-4"
                                onDragOver={(e) => e.preventDefault()}
                              />
                            </CardContent>
                          </ScrollArea>
                        </Card>
                      </div>
                    </div>
                  </DndContext>
                </>
              )}
            </div>
          </main>
        </div>
      </div>
      <TaskDetailDialog 
        task={selectedTask}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </SidebarProvider>
  );
}
