import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { boardsApi } from "@/features/boards/api/boardsApi";
import type { Board } from "@/features/boards/types/types";
import { WorkloadBoard } from "@/features/workload/components/WorkloadBoard";

const DynamicBoard = () => {
  const { boardId } = useParams<{ boardId: string }>();
  const [board, setBoard] = useState<Board | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!boardId) return;

    const fetchBoard = async () => {
      setLoading(true);
      setError(null);
      try {
        const boardData = await boardsApi.getBoardById(boardId);
        setBoard(boardData);
      } catch (err) {
        console.error("Failed to fetch board:", err);
        setError("Failed to load board");
      } finally {
        setLoading(false);
      }
    };

    fetchBoard();
  }, [boardId]);

  if (loading) {
    return (
      <div className="h-full w-full flex-1 flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading board...</p>
        </div>
      </div>
    );
  }

  if (error || !board) {
    return (
      <div className="h-full w-full flex-1 flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-2">
          <p className="text-muted-foreground">No Board Found.</p>
        </div>
      </div>
    );
  }

  return (
    <WorkloadBoard
      key={boardId}
      boardName={board.name}
      boardId={boardId!}
      workspaceId={board.workspace_id}
      workspaceName="Workspace"
    />
  );
};

export default DynamicBoard;
