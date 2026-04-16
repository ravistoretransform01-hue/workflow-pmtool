import React, { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { TiptapEditor } from "@/shared/components/workload/texteditor/TiptapEditor";
import { Mail, MessageSquare, X } from "lucide-react";
import { CommentItem } from "./CommentItem";
import { cn } from "@/lib/utils";
import type { TaskComment } from "@/features/tasks/types";
import { debugError } from "@/lib/debugLog";
import { isContentEmpty } from "./utils";
import { toast } from "sonner";

interface TaskUpdatesProps {
  boardId?: string | number;
  comments: TaskComment[];
  isLoadingComments: boolean;
  layout?: "sidebar" | "dialog";
  onDeleteComment: (id: string | number) => void | Promise<void>;
  onUpdateComment: (id: string | number, text: string) => void | Promise<void>;
  onSaveInlineReply: (
    parentId: string | number,
    text: string,
  ) => void | Promise<void>;
  onLikeComment: (id: string | number) => void | Promise<void>;
  onShareComment: (id: string | number) => void | Promise<void>;
  onToggleSOP: (id: string | number) => void | Promise<void>;
  onToggleIsClient: (id: string | number) => void | Promise<void>;
  onSaveMainUpdate: (text: string) => void | Promise<void>;
  isSaving?: boolean;
  onFilePreview: (src: string, name?: string) => void;
  onHighlightComplete?: () => void;
  // Optional for sidebar mode
  mainUpdateText?: string;
  onMainUpdateTextChange?: (text: string) => void;
  isInternal?: number;
  noNesting?: boolean;
  hideEditor?: boolean;
}

export const TaskUpdates: React.FC<TaskUpdatesProps> = ({
  boardId,
  comments,
  isLoadingComments,
  layout = "sidebar",
  onDeleteComment,
  onUpdateComment,
  onSaveInlineReply,
  onSaveMainUpdate,
  onLikeComment,
  onShareComment,
  onToggleSOP,
  onToggleIsClient,
  isSaving = false,
  onFilePreview,
  onHighlightComplete,
  mainUpdateText: externalUpdateText,
  onMainUpdateTextChange: externalOnUpdateTextChange,
  isInternal,
  noNesting = false,
  hideEditor = false,
}) => {
  React.useEffect(() => {
    if (isLoadingComments) return;
    const searchParams = new URLSearchParams(window.location.search);
    const commentIdFromUrl = searchParams.get("comment");
    if (commentIdFromUrl) {
      setTimeout(() => {
        const element = document.getElementById(`comment-${commentIdFromUrl}`);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
          element.classList.add(
            "ring-2",
            "ring-primary/50",
            "ring-offset-4",
            "transition-all",
            "duration-500",
          );
          setTimeout(() => {
            element.classList.remove("ring-2", "ring-primary/50", "ring-offset-4");
            if (onHighlightComplete) onHighlightComplete();
          }, 4000);
        } else if (comments.length > 0) {
          // If we have comments loaded but the specific one is missing
          toast.info("The shared comment could not be found.");
        }
      }, 600);
    }
  }, [isLoadingComments, comments.length]);

  const [localUpdateText, setLocalUpdateText] = useState("");
  const updateText =
    externalUpdateText !== undefined ? externalUpdateText : localUpdateText;
  const onUpdateTextChange = externalOnUpdateTextChange || setLocalUpdateText;

  const [editingCommentId, setEditingCommentId] = useState<
    string | number | null
  >(null);
  const [editCommentText, setEditCommentText] = useState("");
  const [inlineReplyId, setInlineReplyId] = useState<string | number | null>(
    null,
  );
  const [inlineReplyText, setInlineReplyText] = useState("");
  const [replyingTo, setReplyingTo] = useState<TaskComment | null>(null);

  const handleSaveMainUpdate = async () => {
    try {
      await onSaveMainUpdate(updateText);
      if (!externalOnUpdateTextChange) {
        setLocalUpdateText("");
      }
      setReplyingTo(null);
    } catch (error) {
      debugError("Failed to save main update:", error);
    }
  };

  const handleUpdateCommentWrapped = async (
    id: string | number,
    text: string,
  ) => {
    try {
      await onUpdateComment(id, text);
      setEditingCommentId(null);
      setEditCommentText("");
    } catch (error) {
      debugError("Failed to update comment:", error);
    }
  };

  const handleSaveInlineReplyWrapped = async (
    parentId: string | number,
    text: string,
  ) => {
    try {
      await onSaveInlineReply(parentId, text);
      setInlineReplyId(null);
      setInlineReplyText("");
    } catch (error) {
      debugError("Failed to save inline reply:", error);
    }
  };

  const commentList = (
    <div
      className={cn(
        "flex-1 overflow-auto p-4",
        layout === "sidebar" ? "p-4" : "p-3 space-y-4",
      )}
    >
      {isLoadingComments ? (
        <div className="flex items-center justify-center py-8">
          <p className="text-sm text-muted-foreground">Loading updates...</p>
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground">
            No updates yet. Be the first to add one!
          </p>
        </div>
      ) : (
        <div
          className={cn("space-y-8", layout === "dialog" && "space-y-4 pt-1")}
        >
          {(() => {
            if (noNesting) {
              return comments
                .sort(
                  (a, b) =>
                    new Date(b.created_at).getTime() -
                    new Date(a.created_at).getTime(),
                )
                .map((comment) => (
                  <CommentItem
                    key={comment.id}
                    comment={comment}
                    replies={[]}
                    boardId={boardId}
                    editingCommentId={editingCommentId}
                    setEditingCommentId={setEditingCommentId}
                    editCommentText={editCommentText}
                    setEditCommentText={setEditCommentText}
                    inlineReplyId={inlineReplyId}
                    setInlineReplyId={setInlineReplyId}
                    inlineReplyText={inlineReplyText}
                    setInlineReplyText={setInlineReplyText}
                    onDeleteComment={onDeleteComment}
                    onUpdateComment={handleUpdateCommentWrapped}
                    onSaveInlineReply={handleSaveInlineReplyWrapped}
                    onLikeComment={onLikeComment}
                    onShareComment={onShareComment}
                    onToggleSOP={onToggleSOP}
                    onToggleIsClient={onToggleIsClient}
                    onFilePreview={onFilePreview}
                    isSaving={isSaving}
                  />
                ));
            }

            const rootComments = comments
              .filter(
                (c) =>
                  !c.parent_id &&
                  (isInternal === undefined ||
                    (c.is_internal ? 1 : 0) === isInternal),
              )
              .sort(
                (a, b) =>
                  new Date(b.created_at).getTime() -
                  new Date(a.created_at).getTime(),
              );

            return rootComments.map((comment) => {
              // Find all descendants for this root
              const getThreadComments = (rootId: string | number) => {
                const result: TaskComment[] = [];
                const queue = [rootId];
                const seen = new Set([String(rootId)]);

                while (queue.length > 0) {
                  const pid = queue.shift();
                  const children = comments.filter(
                    (c) => String(c.parent_id) === String(pid),
                  );
                  for (const child of children) {
                    if (!seen.has(String(child.id))) {
                      seen.add(String(child.id));
                      result.push(child);
                      queue.push(child.id);
                    }
                  }
                }
                // Sort thread comments by date ascending (oldest first)
                return result.sort(
                  (a, b) =>
                    new Date(a.created_at).getTime() -
                    new Date(b.created_at).getTime(),
                );
              };

              const threadReplies = getThreadComments(comment.id);

              return (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  replies={threadReplies}
                  boardId={boardId}
                  editingCommentId={editingCommentId}
                  setEditingCommentId={setEditingCommentId}
                  editCommentText={editCommentText}
                  setEditCommentText={setEditCommentText}
                  inlineReplyId={inlineReplyId}
                  setInlineReplyId={setInlineReplyId}
                  inlineReplyText={inlineReplyText}
                  setInlineReplyText={setInlineReplyText}
                  onDeleteComment={onDeleteComment}
                  onUpdateComment={handleUpdateCommentWrapped}
                  onSaveInlineReply={handleSaveInlineReplyWrapped}
                  onLikeComment={onLikeComment}
                  onShareComment={onShareComment}
                  onToggleSOP={onToggleSOP}
                  onToggleIsClient={onToggleIsClient}
                  onFilePreview={onFilePreview}
                  isSaving={isSaving}
                />
              );
            });
          })()}
        </div>
      )}
    </div>
  );

  const mainEditor = (
    <div
      className={cn(
        layout === "sidebar"
          ? "p-3 border-b border-border bg-background"
          : "border-t border-border p-3",
      )}
    >
      {layout === "dialog" && (
        <div className="hidden flex items-center gap-2 mb-2 text-xs text-muted-foreground">
          <Mail className="h-3 w-3" />
          <span>Update via email</span>
          <span className="mx-1">|</span>
          <MessageSquare className="h-3 w-3" />
          <span>Give feedback</span>
        </div>
      )}

      {layout === "sidebar" && replyingTo && (
        <div className="flex items-center justify-between mb-2 text-xs text-primary bg-primary/5 px-2 py-1 rounded border border-primary/10">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="font-semibold uppercase tracking-wider shrink-0">
              Replying to {replyingTo.user?.name || "User"}:
            </span>
            <span
              className="truncate opacity-70 italic"
              dangerouslySetInnerHTML={{
                __html:
                  replyingTo.content.length > 80
                    ? replyingTo.content.substring(0, 80) + "..."
                    : replyingTo.content,
              }}
            />
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0 hover:bg-transparent"
            onClick={() => setReplyingTo(null)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      <div className={cn(layout === "sidebar" ? "" : "rounded-lg p-2")}>
        <div
          className={cn(
            layout === "sidebar" ? "min-h-[80px]" : "min-h-[100px]",
          )}
        >
          <TiptapEditor
            placeholder={
              replyingTo
                ? "Write a reply..."
                : "Write an update and mention others with @..."
            }
            value={updateText}
            onChange={onUpdateTextChange}
            boardId={boardId ? Number(boardId) : undefined}
            key="main-update-editor"
          />
        </div>

        <div
          className={cn(
            "flex items-center justify-end mt-2",
            layout === "sidebar" ? "" : "pt-2 border-t border-border",
          )}
        >
          <Button
            size="sm"
            onClick={handleSaveMainUpdate}
            disabled={isContentEmpty(updateText) || isSaving}
            className={cn(
              layout === "sidebar" ? "bg-primary hover:bg-primary/90" : "",
            )}
          >
            {isSaving && !editingCommentId && !inlineReplyId
              ? layout === "sidebar"
                ? "Saving..."
                : "Posting..."
              : layout === "sidebar"
                ? "Update"
                : "Post"}
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {layout === "sidebar" ? (
        <>
          {!hideEditor && mainEditor}
          {commentList}
        </>
      ) : (
        <>
          {commentList}
          {!hideEditor && mainEditor}
        </>
      )}
    </div>
  );
};
