import { useState } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Calendar, FolderKanban, ArrowLeft, Star, MessageSquare, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function ClientFeedback() {
  const navigate = useNavigate();
  const [filterPeriod, setFilterPeriod] = useState<"today" | "month" | "year">("today");

  // Mock data - replace with real data later
  const feedback = {
    today: [
      { 
        id: 1, 
        client: "TechCorp", 
        project: "E-commerce Platform", 
        rating: 5, 
        message: "Excellent work on the dashboard! The UI is very intuitive.", 
        date: "2025-12-01",
        status: "positive"
      },
      { 
        id: 2, 
        client: "StartupXYZ", 
        project: "Mobile App Design", 
        rating: 4, 
        message: "Good progress, but need some adjustments on the color scheme.", 
        date: "2025-12-01",
        status: "neutral"
      },
    ],
    month: [
      { 
        id: 1, 
        client: "TechCorp", 
        project: "E-commerce Platform", 
        rating: 5, 
        message: "Excellent work on the dashboard! The UI is very intuitive.", 
        date: "2025-12-01",
        status: "positive"
      },
      { 
        id: 2, 
        client: "StartupXYZ", 
        project: "Mobile App Design", 
        rating: 4, 
        message: "Good progress, but need some adjustments on the color scheme.", 
        date: "2025-12-01",
        status: "neutral"
      },
      { 
        id: 3, 
        client: "Business Inc", 
        project: "CRM System", 
        rating: 5, 
        message: "Amazing performance improvements! Loading time reduced by 50%.", 
        date: "2025-11-28",
        status: "positive"
      },
      { 
        id: 4, 
        client: "DataFlow", 
        project: "Dashboard Analytics", 
        rating: 3, 
        message: "The charts are nice but need more customization options.", 
        date: "2025-11-25",
        status: "neutral"
      },
    ],
    year: [
      { 
        id: 1, 
        client: "TechCorp", 
        project: "E-commerce Platform", 
        rating: 5, 
        message: "Excellent work on the dashboard! The UI is very intuitive.", 
        date: "2025-12-01",
        status: "positive"
      },
      { 
        id: 2, 
        client: "StartupXYZ", 
        project: "Mobile App Design", 
        rating: 4, 
        message: "Good progress, but need some adjustments on the color scheme.", 
        date: "2025-12-01",
        status: "neutral"
      },
      { 
        id: 3, 
        client: "Business Inc", 
        project: "CRM System", 
        rating: 5, 
        message: "Amazing performance improvements! Loading time reduced by 50%.", 
        date: "2025-11-28",
        status: "positive"
      },
      { 
        id: 4, 
        client: "DataFlow", 
        project: "Dashboard Analytics", 
        rating: 3, 
        message: "The charts are nice but need more customization options.", 
        date: "2025-11-25",
        status: "neutral"
      },
      { 
        id: 5, 
        client: "Fashion Brand", 
        project: "Website Redesign", 
        rating: 5, 
        message: "Love the new design! Conversion rate increased by 30%.", 
        date: "2025-11-20",
        status: "positive"
      },
      { 
        id: 6, 
        client: "Support Pro", 
        project: "AI Chatbot", 
        rating: 4, 
        message: "Good chatbot functionality, needs better training data.", 
        date: "2025-11-15",
        status: "neutral"
      },
    ],
  };

  const currentFeedback = feedback[filterPeriod];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "positive":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "neutral":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "negative":
        return "bg-red-500/20 text-red-400 border-red-500/30";
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
                  <h2 className="text-3xl font-bold text-foreground">Client Feedback</h2>
                </div>
                <Badge variant="outline" className="text-sm px-3 py-1">
                  {currentFeedback.length} Reviews
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
                  <div className="space-y-4">
                    {currentFeedback.map((item) => (
                      <Card key={item.id} className="bg-card/50 border-border/50 hover:border-blue-500/50 transition-all cursor-pointer">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarFallback className="bg-primary/20 text-primary">
                                  {item.client.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <h3 className="font-semibold text-foreground">{item.client}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                  <FolderKanban className="h-3 w-3 text-muted-foreground" />
                                  <span className="text-sm text-muted-foreground">{item.project}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className={getStatusColor(item.status)}>
                                {item.status}
                              </Badge>
                              <div className="flex items-center gap-1">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`h-4 w-4 ${
                                      i < item.rating
                                        ? "fill-yellow-400 text-yellow-400"
                                        : "text-gray-600"
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex items-start gap-2">
                            <MessageSquare className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                            <p className="text-foreground">{item.message}</p>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span>{new Date(item.date).toLocaleDateString()}</span>
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
