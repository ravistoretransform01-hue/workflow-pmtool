import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Loader2, AlertCircle, User, Clock, CheckCircle2, XCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { TaskDetailDialog } from "@/components/TaskDetailDialog";

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  project_name: string | null;
  assigned_to: string | null;
  created_by: string | null;
  deadline: string | null;
  completed_at: string | null;
  created_at: string;
};

export default function TeamManagement() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    checkUserRole();
    fetchAllTasks();
  }, []);

  const checkUserRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/login");
      return;
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["project_manager", "team_leader", "admin"]);

    if (!roles || roles.length === 0) {
      setError("Access denied. Only Project Managers and Team Leaders can access this page.");
      setLoading(false);
      return;
    }

    setUserRole(roles[0].role);
  };

  const fetchAllTasks = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from("tasks")
        .select("*")
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;
      setTasks(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch tasks");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      todo: "bg-secondary text-secondary-foreground",
      "in-progress": "bg-blue-500 text-white",
      done: "bg-green-500 text-white",
      blocked: "bg-red-500 text-white",
    };
    return colors[status] || "bg-muted";
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      low: "border-green-500 text-green-500",
      medium: "border-yellow-500 text-yellow-500",
      high: "border-red-500 text-red-500",
    };
    return colors[priority] || "border-muted";
  };

  const calculateTaskStats = () => {
    const total = tasks.length;
    const todo = tasks.filter((t) => t.status === "todo").length;
    const inProgress = tasks.filter((t) => t.status === "in-progress").length;
    const done = tasks.filter((t) => t.status === "done").length;
    const blocked = tasks.filter((t) => t.status === "blocked").length;

    return { total, todo, inProgress, done, blocked };
  };

  const stats = calculateTaskStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const filterTasksByStatus = (status: string) => {
    return tasks.filter((task) => task.status === status);
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="flex-1 overflow-hidden">
        <DashboardHeader />
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Team Management</h1>
              <p className="text-muted-foreground">
                {userRole === "project_manager" ? "Project Manager" : "Team Leader"} Dashboard
              </p>
            </div>
            <Badge variant="outline" className="text-lg px-4 py-2">
              {stats.total} Total Tasks
            </Badge>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>To Do</CardDescription>
                <CardTitle className="text-3xl">{stats.todo}</CardTitle>
              </CardHeader>
              <CardContent>
                <Progress value={(stats.todo / stats.total) * 100} className="h-2" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>In Progress</CardDescription>
                <CardTitle className="text-3xl">{stats.inProgress}</CardTitle>
              </CardHeader>
              <CardContent>
                <Progress value={(stats.inProgress / stats.total) * 100} className="h-2" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Completed</CardDescription>
                <CardTitle className="text-3xl">{stats.done}</CardTitle>
              </CardHeader>
              <CardContent>
                <Progress value={(stats.done / stats.total) * 100} className="h-2" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Blocked</CardDescription>
                <CardTitle className="text-3xl">{stats.blocked}</CardTitle>
              </CardHeader>
              <CardContent>
                <Progress value={(stats.blocked / stats.total) * 100} className="h-2" />
              </CardContent>
            </Card>
          </div>

          {/* Tasks Table */}
          <Tabs defaultValue="all" className="space-y-4">
            <TabsList>
              <TabsTrigger value="all">All Tasks ({stats.total})</TabsTrigger>
              <TabsTrigger value="todo">To Do ({stats.todo})</TabsTrigger>
              <TabsTrigger value="in-progress">In Progress ({stats.inProgress})</TabsTrigger>
              <TabsTrigger value="done">Done ({stats.done})</TabsTrigger>
              <TabsTrigger value="blocked">Blocked ({stats.blocked})</TabsTrigger>
            </TabsList>

            <TabsContent value="all">
              <Card>
                <CardHeader>
                  <CardTitle>All Tasks</CardTitle>
                  <CardDescription>Complete overview of all team tasks</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Task</TableHead>
                          <TableHead>Project</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Priority</TableHead>
                          <TableHead>Deadline</TableHead>
                          <TableHead>Created</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tasks.map((task) => (
                          <TableRow
                            key={task.id}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => {
                              setSelectedTask(task);
                              setIsDialogOpen(true);
                            }}
                          >
                            <TableCell className="font-medium">{task.title}</TableCell>
                            <TableCell>{task.project_name || "—"}</TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(task.status)}>{task.status}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={getPriorityColor(task.priority)}>
                                {task.priority}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {task.deadline ? format(new Date(task.deadline), "MMM dd, yyyy") : "—"}
                            </TableCell>
                            <TableCell>{format(new Date(task.created_at), "MMM dd, yyyy")}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            {["todo", "in-progress", "done", "blocked"].map((status) => (
              <TabsContent key={status} value={status}>
                <Card>
                  <CardHeader>
                    <CardTitle>{status.charAt(0).toUpperCase() + status.slice(1).replace("-", " ")} Tasks</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[500px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Task</TableHead>
                            <TableHead>Project</TableHead>
                            <TableHead>Priority</TableHead>
                            <TableHead>Deadline</TableHead>
                            <TableHead>Created</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filterTasksByStatus(status).map((task) => (
                            <TableRow
                              key={task.id}
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => {
                                setSelectedTask(task);
                                setIsDialogOpen(true);
                              }}
                            >
                              <TableCell className="font-medium">{task.title}</TableCell>
                              <TableCell>{task.project_name || "—"}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className={getPriorityColor(task.priority)}>
                                  {task.priority}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {task.deadline ? format(new Date(task.deadline), "MMM dd, yyyy") : "—"}
                              </TableCell>
                              <TableCell>{format(new Date(task.created_at), "MMM dd, yyyy")}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </main>

      {selectedTask && (
        <TaskDetailDialog
          task={selectedTask}
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
        />
      )}
    </SidebarProvider>
  );
}
