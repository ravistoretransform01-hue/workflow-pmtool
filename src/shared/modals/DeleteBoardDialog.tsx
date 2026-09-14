import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { boardsApi } from "@/features/boards/api/boardsApi";
import { useBoards } from "@/hooks/useBoards";
import { getOrganizationId } from "@/utils/utils";
import { toast } from "sonner";

interface DeleteBoardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  boardId: string | number | null;
  boardName: string;
  onSuccess?: () => void;
}

export function DeleteBoardDialog({
  open,
  onOpenChange,
  boardId,
  boardName,
  onSuccess,
}: DeleteBoardDialogProps) {
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const navigate = useNavigate();
  const { boardId: routeBoardId, orgId: routeOrgId } = useParams<{
    boardId?: string;
    orgId?: string;
  }>();
  const { fetchBoards } = useBoards();

  useEffect(() => {
    if (!open) {
      setConfirmText("");
      setIsDeleting(false);
    }
  }, [open]);

  const targetName = (boardName || "").trim();
  const normalizedTarget = targetName.toLowerCase();
  const normalizedInput = confirmText.trim().toLowerCase();

  // Allow confirming by typing exact board name or "delete" (case-insensitive)
  const isConfirmed =
    (Boolean(normalizedTarget) && normalizedInput === normalizedTarget) ||
    normalizedInput === "delete";

  const handleDelete = async () => {
    if (!boardId || !isConfirmed || isDeleting) return;

    setIsDeleting(true);
    try {
      await boardsApi.deleteBoard(boardId);
      toast.success(`Project "${boardName || "Board"}" deleted successfully`);

      // Refresh boards in sidebar / Redux store
      await fetchBoards();

      // If user is currently viewing this board or its dashboard, navigate back to home
      if (routeBoardId && String(routeBoardId) === String(boardId)) {
        const orgId = routeOrgId || getOrganizationId();
        navigate(`/org/${orgId}/home`);
      }

      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Delete board error:", error);
      toast.error(error.response?.data?.message || "Failed to delete project");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader className="gap-2">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold text-foreground">
                Delete project?
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                This action cannot be undone.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground leading-relaxed">
            This will permanently delete the project{" "}
            <strong className="font-semibold text-foreground">
              "{boardName}"
            </strong>{" "}
            and all of its tasks, groups, views, and data.
          </p>

          <div className="space-y-2">
            <Label
              htmlFor="confirm-delete-input"
              className="text-xs font-normal text-muted-foreground block"
            >
              To confirm, please type{" "}
              <span className="font-semibold text-foreground font-mono select-all bg-muted px-1.5 py-0.5 rounded border border-border">
                {boardName}
              </span>{" "}
              below:
            </Label>
            <Input
              id="confirm-delete-input"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={`Type "${boardName}" to confirm`}
              disabled={isDeleting}
              autoFocus
              className="h-9 text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter" && isConfirmed && !isDeleting) {
                  e.preventDefault();
                  handleDelete();
                }
              }}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={!isConfirmed || isDeleting}
            className="gap-2"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                <span>Delete Project</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
