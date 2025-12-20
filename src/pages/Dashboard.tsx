import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { FolderKanban, CheckCircle2, Clock, MessageSquare } from "lucide-react";

export default function Dashboard() {
  const navigate = useNavigate();
  const [filterPeriod, setFilterPeriod] = useState<"today" | "month" | "year">("today");

  // Mock data - replace with real data later
  const stats = {
    today: {
      ongoingProjects: 5,
      todoTasks: 12,
      completedTasks: 8,
      clientFeedback: 3,
    },
    month: {
      ongoingProjects: 15,
      todoTasks: 45,
      completedTasks: 32,
      clientFeedback: 12,
    },
    year: {
      ongoingProjects: 48,
      todoTasks: 180,
      completedTasks: 156,
      clientFeedback: 45,
    },
  };

  const currentStats = stats[filterPeriod];
  const completionRate = Math.round(
    (currentStats.completedTasks / (currentStats.todoTasks + currentStats.completedTasks)) * 100
  );

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <DashboardHeader />
          <main className="flex-1 p-8">
            <div className="max-w-7xl mx-auto space-y-8">
              <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold text-foreground">Dashboard Overview</h2>
                <Badge variant="outline" className="text-sm px-3 py-1">
                  Developer
                </Badge>
              </div>

              {/* Filter Tabs */}
              <Tabs value={filterPeriod} onValueChange={(v) => setFilterPeriod(v as typeof filterPeriod)}>
                <TabsList className="bg-card border border-border">
                  <TabsTrigger value="today">Today</TabsTrigger>
                  <TabsTrigger value="month">This Month</TabsTrigger>
                  <TabsTrigger value="year">This Year</TabsTrigger>
                </TabsList>

                <TabsContent value={filterPeriod} className="mt-6 space-y-6">
                  {/* Stats Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Ongoing Projects */}
                    <Card 
                      className="bg-card/50 border-border/50 hover:border-primary/50 transition-all cursor-pointer"
                      onClick={() => navigate("/projects/ongoing")}
                    >
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          Ongoing Projects
                        </CardTitle>
                        <FolderKanban className="h-5 w-5 text-primary" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-foreground">
                          {currentStats.ongoingProjects}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">Active projects in progress</p>
                      </CardContent>
                    </Card>

                    {/* Todo Tasks */}
                    <Card 
                      className="bg-card/50 border-border/50 hover:border-accent/50 transition-all cursor-pointer"
                      onClick={() => navigate("/tasks/todo")}
                    >
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          Todo Tasks
                        </CardTitle>
                        <Clock className="h-5 w-5 text-accent" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-foreground">
                          {currentStats.todoTasks}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">Pending tasks to complete</p>
                      </CardContent>
                    </Card>

                    {/* Completed Tasks */}
                    <Card 
                      className="bg-card/50 border-border/50 hover:border-green-500/50 transition-all cursor-pointer"
                      onClick={() => navigate("/tasks/completed")}
                    >
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          Completed Tasks
                        </CardTitle>
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-foreground">
                          {currentStats.completedTasks}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">Successfully finished</p>
                      </CardContent>
                    </Card>

                    {/* Client Feedback */}
                    <Card 
                      className="bg-card/50 border-border/50 hover:border-blue-500/50 transition-all cursor-pointer"
                      onClick={() => navigate("/feedback")}
                    >
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          Client Feedback
                        </CardTitle>
                        <MessageSquare className="h-5 w-5 text-blue-500" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-foreground">
                          {currentStats.clientFeedback}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">Feedback received</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Task Completion Progress */}
                  <Card className="bg-card/50 border-border/50">
                    <CardHeader>
                      <CardTitle className="text-lg">Task Completion Rate</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {currentStats.completedTasks} of {currentStats.completedTasks + currentStats.todoTasks} tasks completed
                        </span>
                        <span className="font-bold text-foreground">{completionRate}%</span>
                      </div>
                      <Progress value={completionRate} className="h-3" />
                      <div className="flex items-center gap-6 text-xs text-muted-foreground pt-2">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-primary"></div>
                          <span>Completed</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-secondary"></div>
                          <span>Remaining</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
