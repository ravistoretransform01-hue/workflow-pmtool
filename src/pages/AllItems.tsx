import { useState, useEffect } from "react";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/shared/components/ui/tabs";
import { Badge } from "@/shared/components/ui/badge";
import { Filter, Settings2 } from "lucide-react";

interface AllItem {
  id: string;
  name: string;
  boardName: string;
  status: string;
  priority?: string;
  assignedTo?: string[];
  dueDate?: string;
}

export default function AllItems() {
  const [items] = useState<AllItem[]>([]);

  useEffect(() => {
    // TODO: Fetch all items from REST API
  }, []);

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">All Items</h1>

        <Tabs defaultValue="list" className="space-y-4">
          <TabsList>
            <TabsTrigger value="list">List</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
            <TabsTrigger value="kanban">Kanban</TabsTrigger>
            <TabsTrigger value="gantt">Gantt</TabsTrigger>
            <TabsTrigger value="workload">Workload</TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="space-y-4">
            <div className="flex gap-4">
              <Input placeholder="Search items..." className="max-w-sm" />
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm">
                <Settings2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-2">
              {items.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No items found</p>
                </div>
              ) : (
                items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground">{item.boardName}</p>
                      <div className="flex gap-2 mt-2">
                        <Badge variant="secondary">{item.status}</Badge>
                        {item.priority && <Badge variant="outline">{item.priority}</Badge>}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="calendar">
            <div className="p-8 text-center text-muted-foreground">
              Calendar view coming soon
            </div>
          </TabsContent>

          <TabsContent value="kanban">
            <div className="p-8 text-center text-muted-foreground">
              Kanban view coming soon
            </div>
          </TabsContent>

          <TabsContent value="gantt">
            <div className="p-8 text-center text-muted-foreground">
              Gantt view coming soon
            </div>
          </TabsContent>

          <TabsContent value="workload">
            <div className="p-8 text-center text-muted-foreground">
              Workload view coming soon
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
