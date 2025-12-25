import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Button } from "@/shared/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/shared/components/ui/tabs";
import { ArrowLeft, Settings, MoreHorizontal } from "lucide-react";

interface Board {
  id: string;
  name: string;
  workspaceId: string;
  items: any[];
}

export default function DynamicBoard() {
  const { workspaceId, boardId } = useParams();
  const navigate = useNavigate();
  const [board] = useState<Board | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Fetch board details from REST API
    setLoading(false);
  }, [boardId]);

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-full mx-auto">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/workspace/${workspaceId}`)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : board ? (
          <div>
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-3xl font-bold">{board.name}</h1>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Tabs defaultValue="board" className="space-y-4">
              <TabsList>
                <TabsTrigger value="board">Board</TabsTrigger>
                <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                <TabsTrigger value="calendar">Calendar</TabsTrigger>
              </TabsList>

              <TabsContent value="board">
                <div className="p-8 text-center text-muted-foreground">
                  Board view coming soon
                </div>
              </TabsContent>

              <TabsContent value="dashboard">
                <div className="p-8 text-center text-muted-foreground">
                  Dashboard view coming soon
                </div>
              </TabsContent>

              <TabsContent value="calendar">
                <div className="p-8 text-center text-muted-foreground">
                  Calendar view coming soon
                </div>
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>Board not found</p>
          </div>
        )}
      </div>
    </div>
  );
}
