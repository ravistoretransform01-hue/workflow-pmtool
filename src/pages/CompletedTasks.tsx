import { useState } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Calendar, FolderKanban, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function CompletedTasks() {
  const navigate = useNavigate();
  const [filterPeriod, setFilterPeriod] = useState<"today" | "month" | "year">("today");

  // Mock data - replace with real data later
  const tasks = {
    today: [
      { id: 1, title: "Setup development environment", project: "E-commerce Platform", completedDate: "2025-12-01", completedBy: "John Doe" },
      { id: 2, title: "Create database schema", project: "CRM System", completedDate: "2025-12-01", completedBy: "Jane Smith" },
      { id: 3, title: "Design logo variations", project: "Mobile App Design", completedDate: "2025-12-01", completedBy: "Mike Johnson" },
    ],
    month: [
      { id: 1, title: "Setup development environment", project: "E-commerce Platform", completedDate: "2025-12-01", completedBy: "John Doe" },
      { id: 2, title: "Create database schema", project: "CRM System", completedDate: "2025-12-01", completedBy: "Jane Smith" },
      { id: 3, title: "Design logo variations", project: "Mobile App Design", completedDate: "2025-12-01", completedBy: "Mike Johnson" },
      { id: 4, title: "Implement user registration", project: "E-commerce Platform", completedDate: "2025-11-28", completedBy: "John Doe" },
      { id: 5, title: "Create wireframes", project: "Dashboard Analytics", completedDate: "2025-11-25", completedBy: "Sarah Lee" },
      { id: 6, title: "Setup hosting", project: "Website Redesign", completedDate: "2025-11-20", completedBy: "Tom Brown" },
    ],
    year: [
      { id: 1, title: "Setup development environment", project: "E-commerce Platform", completedDate: "2025-12-01", completedBy: "John Doe" },
      { id: 2, title: "Create database schema", project: "CRM System", completedDate: "2025-12-01", completedBy: "Jane Smith" },
      { id: 3, title: "Design logo variations", project: "Mobile App Design", completedDate: "2025-12-01", completedBy: "Mike Johnson" },
      { id: 4, title: "Implement user registration", project: "E-commerce Platform", completedDate: "2025-11-28", completedBy: "John Doe" },
      { id: 5, title: "Create wireframes", project: "Dashboard Analytics", completedDate: "2025-11-25", completedBy: "Sarah Lee" },
      { id: 6, title: "Setup hosting", project: "Website Redesign", completedDate: "2025-11-20", completedBy: "Tom Brown" },
      { id: 7, title: "Write technical specs", project: "API Integration", completedDate: "2025-11-15", completedBy: "David Clark" },
      { id: 8, title: "User testing session", project: "Mobile App Design", completedDate: "2025-11-10", completedBy: "Mike Johnson" },
      { id: 9, title: "Code review", project: "Payment Gateway", completedDate: "2025-11-05", completedBy: "Jane Smith" },
      { id: 10, title: "Deploy to staging", project: "CRM System", completedDate: "2025-10-30", completedBy: "John Doe" },
    ],
  };

  const currentTasks = tasks[filterPeriod];

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
                  <h2 className="text-3xl font-bold text-foreground">Completed Tasks</h2>
                </div>
                <Badge variant="outline" className="text-sm px-3 py-1 bg-green-500/20 text-green-400 border-green-500/30">
                  {currentTasks.length} Completed
                </Badge>
              </div>

              {/* Filter Tabs */}
              <Tabs value={filterPeriod} onValueChange={(v) => setFilterPeriod(v as typeof filterPeriod)}>
                <TabsList className="bg-card border border-border">
                  <TabsTrigger value="today">Today</TabsTrigger>
                  <TabsTrigger value="month">This Month</TabsTrigger>
                  <TabsTrigger value="year">This Year</TabsTrigger>
                </TabsList>

                <TabsContent value={filterPeriod} className="mt-6">
                  <div className="space-y-3">
                    {currentTasks.map((task) => (
                      <Card key={task.id} className="bg-card/50 border-border/50 hover:border-green-500/50 transition-all cursor-pointer">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-4 flex-1">
                              <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                              <div className="flex-1 space-y-2">
                                <h3 className="font-semibold text-foreground">{task.title}</h3>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                  <div className="flex items-center gap-2">
                                    <FolderKanban className="h-4 w-4" />
                                    <span>{task.project}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4" />
                                    <span>Completed: {new Date(task.completedDate).toLocaleDateString()}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              by {task.completedBy}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
