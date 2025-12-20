import { useState } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Calendar, Users, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function OngoingProjects() {
  const navigate = useNavigate();
  const [filterPeriod, setFilterPeriod] = useState<"today" | "month" | "year">("today");

  // Mock data - replace with real data later
  const projects = {
    today: [
      { id: 1, name: "E-commerce Platform", client: "TechCorp", progress: 65, members: 4, deadline: "2025-12-15", status: "active" },
      { id: 2, name: "Mobile App Design", client: "StartupXYZ", progress: 45, members: 3, deadline: "2025-12-20", status: "active" },
      { id: 3, name: "CRM System", client: "Business Inc", progress: 78, members: 5, deadline: "2025-12-10", status: "active" },
    ],
    month: [
      { id: 1, name: "E-commerce Platform", client: "TechCorp", progress: 65, members: 4, deadline: "2025-12-15", status: "active" },
      { id: 2, name: "Mobile App Design", client: "StartupXYZ", progress: 45, members: 3, deadline: "2025-12-20", status: "active" },
      { id: 3, name: "CRM System", client: "Business Inc", progress: 78, members: 5, deadline: "2025-12-10", status: "active" },
      { id: 4, name: "Dashboard Analytics", client: "DataFlow", progress: 32, members: 3, deadline: "2025-12-25", status: "active" },
      { id: 5, name: "API Integration", client: "CloudBase", progress: 55, members: 2, deadline: "2025-12-18", status: "active" },
    ],
    year: [
      { id: 1, name: "E-commerce Platform", client: "TechCorp", progress: 65, members: 4, deadline: "2025-12-15", status: "active" },
      { id: 2, name: "Mobile App Design", client: "StartupXYZ", progress: 45, members: 3, deadline: "2025-12-20", status: "active" },
      { id: 3, name: "CRM System", client: "Business Inc", progress: 78, members: 5, deadline: "2025-12-10", status: "active" },
      { id: 4, name: "Dashboard Analytics", client: "DataFlow", progress: 32, members: 3, deadline: "2025-12-25", status: "active" },
      { id: 5, name: "API Integration", client: "CloudBase", progress: 55, members: 2, deadline: "2025-12-18", status: "active" },
      { id: 6, name: "Website Redesign", client: "Fashion Brand", progress: 88, members: 4, deadline: "2025-12-08", status: "active" },
      { id: 7, name: "AI Chatbot", client: "Support Pro", progress: 25, members: 3, deadline: "2026-01-05", status: "active" },
      { id: 8, name: "Payment Gateway", client: "FinTech Ltd", progress: 92, members: 2, deadline: "2025-12-05", status: "active" },
    ],
  };

  const currentProjects = projects[filterPeriod];

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
                  <h2 className="text-3xl font-bold text-foreground">Ongoing Projects</h2>
                </div>
                <Badge variant="outline" className="text-sm px-3 py-1">
                  {currentProjects.length} Projects
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {currentProjects.map((project) => (
                      <Card key={project.id} className="bg-card/50 border-border/50 hover:border-primary/50 transition-all cursor-pointer">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <CardTitle className="text-lg">{project.name}</CardTitle>
                              <p className="text-sm text-muted-foreground">{project.client}</p>
                            </div>
                            <Badge className="bg-primary/20 text-primary border-primary/30">
                              {project.status}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div>
                            <div className="flex items-center justify-between text-sm mb-2">
                              <span className="text-muted-foreground">Progress</span>
                              <span className="font-semibold text-foreground">{project.progress}%</span>
                            </div>
                            <Progress value={project.progress} className="h-2" />
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Users className="h-4 w-4" />
                              <span>{project.members} members</span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Calendar className="h-4 w-4" />
                              <span>{new Date(project.deadline).toLocaleDateString()}</span>
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
