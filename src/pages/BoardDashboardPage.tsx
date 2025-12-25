import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Button } from "@/shared/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface BoardDashboard {
  id: string;
  boardId: string;
  taskCount: number;
  completedCount: number;
  teamMembers: number;
}

export default function BoardDashboardPage() {
  const { workspaceId, boardId } = useParams();
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState<BoardDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Fetch dashboard data from REST API
    setLoading(false);
  }, [boardId]);

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/workspace/${workspaceId}/board/${boardId}`)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : dashboard ? (
          <div>
            <h1 className="text-3xl font-bold mb-8">Board Dashboard</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-6 border rounded-lg">
                <p className="text-sm text-muted-foreground">Total Tasks</p>
                <p className="text-3xl font-bold">{dashboard.taskCount}</p>
              </div>
              <div className="p-6 border rounded-lg">
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-3xl font-bold">{dashboard.completedCount}</p>
              </div>
              <div className="p-6 border rounded-lg">
                <p className="text-sm text-muted-foreground">Team Members</p>
                <p className="text-3xl font-bold">{dashboard.teamMembers}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>Dashboard not found</p>
          </div>
        )}
      </div>
    </div>
  );
}
