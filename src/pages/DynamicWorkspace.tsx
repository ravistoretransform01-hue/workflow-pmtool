import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Button } from "@/shared/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface Workspace {
  id: string;
  name: string;
  boards: any[];
}

export default function DynamicWorkspace() {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const [workspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Fetch workspace details from REST API
    setLoading(false);
  }, [workspaceId]);

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : workspace ? (
          <div>
            <h1 className="text-3xl font-bold mb-8">{workspace.name}</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {workspace.boards.length === 0 ? (
                <div className="col-span-full text-center py-8 text-muted-foreground">
                  <p>No boards in this workspace</p>
                </div>
              ) : (
                workspace.boards.map((board) => (
                  <div
                    key={board.id}
                    className="p-4 border rounded-lg hover:bg-accent cursor-pointer"
                    onClick={() =>
                      navigate(
                        `/workspace/${workspaceId}/board/${board.id}`
                      )
                    }
                  >
                    <h3 className="font-semibold">{board.name}</h3>
                    <p className="text-sm text-muted-foreground">Board</p>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>Workspace not found</p>
          </div>
        )}
      </div>
    </div>
  );
}
