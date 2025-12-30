import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { boardsApi } from "@/features/boards/boardsApi";
import type { Board } from "@/features/boards/types";
import { WorkloadBoard } from "@/shared/components/WorkloadBoard";

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
      <div className="min-h-screen flex items-center justify-center bg-[#0f172a]">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <p className="text-gray-400">Loading board...</p>
        </div>
      </div>
    );
  }

  if (error || !board) {
    return (
      <WorkloadBoard
        boardName={"Board Name"}
        boardId={boardId!}
        workspaceId={'00'}
        workspaceName="Workspace"
      />
    );
    // return <NotFound />;
  }

  return (
    <WorkloadBoard
      boardName={board.name}
      boardId={boardId!}
      workspaceId={board.workspace_id}
      workspaceName="Workspace"
    />
  );
};

export default DynamicBoard;
