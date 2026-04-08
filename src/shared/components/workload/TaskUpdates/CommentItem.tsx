import React, { useState } from "react";
import { format } from "date-fns";
import { Avatar, AvatarFallback } from "@/shared/components/ui/avatar";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip";
import { Badge } from "@/shared/components/ui/badge";

import {
  Pencil,
  Trash2,
  MoreHorizontal,
  X,
  ThumbsUp,
  Reply,
  FileText,
} from "lucide-react";
import { TiptapEditor } from "@/shared/components/workload/texteditor/TiptapEditor";
import { cn, parseApiDateTime, getCurrentUserId } from "@/lib/utils";
import type { TaskComment } from "@/features/tasks/types";
import {
  renderFormattedContent,
  getRelativeTimeString,
  isContentEmpty,
} from "./utils";

interface CommentItemProps {
  comment: TaskComment;
  replies?: TaskComment[];
  isReply?: boolean;
  boardId?: number | string;
  editingCommentId: string | number | null;
  setEditingCommentId: (id: string | number | null) => void;
  editCommentText: string;
  setEditCommentText: (text: string) => void;
  inlineReplyId: string | number | null;
  setInlineReplyId: (id: string | number | null) => void;
  inlineReplyText: string;
  setInlineReplyText: (text: string) => void;
  onDeleteComment: (id: string | number) => void;
  onUpdateComment: (id: string | number, text: string) => void;
  onSaveInlineReply: (parentId: string | number, text: string) => void;
  onLikeComment: (id: string | number) => void;
  onToggleSOP: (id: string | number) => void;
  onFilePreview: (src: string, name?: string) => void;
  isSaving?: boolean;
}

export const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  replies = [],
  isReply = false,
  boardId,
  editingCommentId,
  setEditingCommentId,
  editCommentText,
  setEditCommentText,
  inlineReplyId,
  setInlineReplyId,
  inlineReplyText,
  setInlineReplyText,
  onDeleteComment,
  onUpdateComment,
  onSaveInlineReply,
  onLikeComment,
  onToggleSOP,
  onFilePreview,
  isSaving,
}) => {
  const isReplyingToThis = String(inlineReplyId) === String(comment.id);
  const [isContentExpanded, setIsContentExpanded] = useState(false);
  const [showRelativeTime, setShowRelativeTime] = useState(false);
  const [showAllReplies, setShowAllReplies] = useState(false);

  // Only allow editing/deleting the current user's own comments
  const currentUserId = getCurrentUserId();
  const isOwnComment =
    currentUserId !== null &&
    (String(comment.user_id) === String(currentUserId) ||
      String(comment.user?.id) === String(currentUserId));

  // Heuristic for long content: > 800 chars of HTML or > 8 newlines
  const isLongContent =
    comment.content.length > 800 ||
    (comment.content.match(/<br/g) || []).length > 8;

  return (
    <div
      key={comment.id}
      className={cn(
        "relative transition-all duration-200",
        !isReply
          ? "p-4 border border-border/60 rounded-2xl  hover:shadow-md hover:border-border/80 space-y-0"
          : "space-y-4",
      )}
    >
      <div
        className={cn(
          "space-y-4",
          !isReply &&
            replies.length > 0 &&
            "pb-4 -mx-4 px-4 border-b border-border/60",
        )}
      >
        {/* Main Comment Row */}
        <div className="flex gap-4 group relative">
          <Avatar
            className={cn(
              "shrink-0 border border-border/50 shadow-sm relative h-10 w-10",
            )}
          >
            <AvatarFallback
              className={cn("text-primary font-medium bg-primary/10")}
            >
              {comment.user?.name?.charAt(0).toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-1.5 min-w-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={cn("font-semibold text-foreground text-sm")}>
                  {comment.user?.name || "Unknown User"}
                </span>
                <span
                  className="text-[11px] text-muted-foreground tracking-wider cursor-pointer"
                  onClick={() => setShowRelativeTime(!showRelativeTime)}
                  title={
                    showRelativeTime
                      ? "Click for exact date"
                      : "Click for relative time"
                  }
                >
                  {comment.created_at
                    ? showRelativeTime
                      ? getRelativeTimeString(comment.created_at)
                      : (() => {
                          const date = parseApiDateTime(comment.created_at);
                          return date && !isNaN(date.getTime())
                            ? format(date, "MMM d, h:mm a")
                            : "Recently";
                        })()
                    : ""}
                </span>
                {comment.sop && (
                  <Badge className="bg-slate-700/80 text-white border-none text-[10px] h-5 px-2 rounded-full font-bold uppercase tracking-wider">
                    SOP
                  </Badge>
                )}
              </div>

              {isOwnComment && (
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => onToggleSOP(comment.id)}
                      >
                        <FileText className="h-3 w-3 mr-2" />
                        {comment.sop ? "Remove From SOP" : "Add To SOP"}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setEditingCommentId(comment.id);
                          setEditCommentText(comment.content);
                        }}
                      >
                        <Pencil className="h-3 w-3 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => onDeleteComment(comment.id)}
                      >
                        <Trash2 className="h-3 w-3 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>

            <div
              className={cn(
                "relative border border-border/40 rounded-xl px-4 py-3 shadow-sm",
                editingCommentId === comment.id ? "bg-background" : "bg-card",
              )}
            >
              {editingCommentId === comment.id ? (
                <div className="space-y-3">
                  <TiptapEditor
                    value={editCommentText}
                    onChange={setEditCommentText}
                    boardId={boardId ? Number(boardId) : undefined}
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs font-semibold"
                      onClick={() => setEditingCommentId(null)}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="h-8 text-xs font-semibold"
                      onClick={() =>
                        onUpdateComment(comment.id, editCommentText)
                      }
                      disabled={isContentEmpty(editCommentText) || isSaving}
                    >
                      {isSaving ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <div
                    className={cn(
                      "text-sm text-foreground/90 whitespace-normal break-words leading-relaxed",
                      "prose prose-sm dark:prose-invert max-w-none",
                      "[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5",
                      "[&_blockquote]:border-l-4 [&_blockquote]:border-primary/30 [&_blockquote]:pl-4 [&_blockquote]:italic",
                      "[&_pre]:bg-muted [&_pre]:p-3 [&_pre]:rounded-lg [&_pre]:my-2",
                      "[&_code]:bg-muted/50 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-primary/90",
                      "[&_a]:text-primary [&_a]:font-medium [&_a]:underline-offset-4 hover:[&_a]:underline",
                      "[&_img]:rounded-lg [&_img]:my-2 [&_img]:border [&_img]:border-border/50 [&_img]:max-h-[350px] [&_img]:w-auto",
                      !isContentExpanded &&
                        isLongContent &&
                        "max-h-[300px] overflow-hidden",
                    )}
                    onClick={(e) => {
                      const target = e.target as HTMLElement;
                      if (target.tagName === "IMG") {
                        onFilePreview((target as HTMLImageElement).src);
                        return;
                      }

                      // Handle File/PDF Card Preview button
                      const previewBtn =
                        target.closest(".file-card-preview-btn") ||
                        target.closest(".pdf-card-preview-btn");
                      const openBtn =
                        target.closest(".file-card-open-btn") ||
                        target.closest(".pdf-card-open-btn");

                      if (previewBtn || openBtn) {
                        const wrapper =
                          target.closest("[data-type='file-card']") ||
                          target.closest("[data-type='pdf-card']");
                        if (wrapper) {
                          const href = wrapper.getAttribute("data-href");
                          const fileName =
                            wrapper.getAttribute("data-filename");
                          if (href) {
                            if (previewBtn) {
                              onFilePreview(href, fileName || "Document");
                              return;
                            }
                            // if openBtn, allow default (opens in new tab)
                            return;
                          }
                        }
                      }

                      const anchor = target.closest("a");
                      if (
                        anchor &&
                        !anchor.classList.contains("file-card-open-btn") &&
                        !anchor.classList.contains("pdf-card-open-btn") &&
                        (anchor.href.toLowerCase().endsWith(".pdf") ||
                          anchor.href.toLowerCase().endsWith(".docx") ||
                          anchor.href.toLowerCase().endsWith(".doc") ||
                          anchor.classList.contains("pdf-link") ||
                          (anchor.textContent &&
                            (anchor.textContent.includes("📄") ||
                              anchor.textContent.includes("📝"))))
                      ) {
                        e.preventDefault();
                        onFilePreview(
                          anchor.href,
                          anchor.textContent || "Document",
                        );
                      }
                    }}
                    dangerouslySetInnerHTML={renderFormattedContent(
                      comment.content,
                    )}
                  />

                  {isLongContent && (
                    <div
                      className={cn(
                        "mt-2",
                        !isContentExpanded &&
                          "absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-card to-transparent flex items-end justify-start pb-1",
                      )}
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-[11px] font-bold text-primary hover:bg-primary/5 tracking-tight"
                        onClick={() => setIsContentExpanded(!isContentExpanded)}
                      >
                        {isContentExpanded ? "Show less" : "...see more"}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-4 py-1">
              {comment.liked_by && comment.liked_by.length > 0 ? (
                <TooltipProvider delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => onLikeComment(comment.id)}
                        className={cn(
                          "flex items-center gap-1.5 text-sm transition-colors tracking-wider",
                          comment.is_liked_by_me
                            ? "text-primary"
                            : "text-white hover:text-primary",
                        )}
                      >
                        <ThumbsUp
                          className={cn(
                            "h-4 w-4",
                            comment.is_liked_by_me && "fill-current",
                          )}
                        />
                        {comment.total_likes && comment.total_likes > 0
                          ? `${comment.total_likes} ${comment.total_likes === 1 ? "Like" : "Likes"}`
                          : "Like"}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent
                      side="top"
                      align="start"
                      className="text-xs bg-zinc-900 text-zinc-100 border-zinc-800 px-3 py-2 shadow-xl w-48"
                    >
                      <div className="font-semibold mb-2 text-zinc-400 uppercase tracking-wider text-[10px]">
                        Liked by
                      </div>
                      <div className="flex flex-col gap-1.5">
                        {comment.liked_by.slice(0, 10).map((u) => (
                          <div key={u.id} className="truncate">
                            {u.name}
                          </div>
                        ))}
                        {comment.liked_by.length > 10 && (
                          <div className="text-zinc-500 italic mt-0.5 text-[11px]">
                            and {comment.liked_by.length - 10} more...
                          </div>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <button
                  onClick={() => onLikeComment(comment.id)}
                  className={cn(
                    "flex items-center gap-1.5 text-sm transition-colors tracking-wider",
                    comment.is_liked_by_me
                      ? "text-primary"
                      : "text-white hover:text-primary",
                  )}
                >
                  <ThumbsUp
                    className={cn(
                      "h-4 w-4",
                      comment.is_liked_by_me && "fill-current",
                    )}
                  />
                  {comment.total_likes && comment.total_likes > 0
                    ? `${comment.total_likes} ${comment.total_likes === 1 ? "Like" : "Likes"}`
                    : "Like"}
                </button>
              )}
              <button
                onClick={() => {
                  setInlineReplyId(comment.id);
                  setInlineReplyText("");
                }}
                className="flex items-center gap-1.5 text-sm   text-white hover:text-primary transition-colors uppercase tracking-wider"
              >
                <Reply className="h-4 w-4" />
                Reply
              </button>
              <button
                onClick={() => {
                  setEditingCommentId(comment.id);
                  setEditCommentText(comment.content);
                }}
                className="hidden flex items-center gap-1.5 text-sm   text-white hover:text-primary transition-colors uppercase tracking-wider"
              >
                <Pencil className="h-4 w-4" />
                Edit
              </button>
            </div>

            {/* Inline reply editor for this comment */}
            {isReplyingToThis && (
              <div className="relative mt-4 bg-background p-4 rounded-xl border border-border/50 shadow-inner animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-primary/80">
                    Replying to {comment.user?.name || "User"}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 hover:bg-background"
                    onClick={() => setInlineReplyId(null)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                <div className="mb-3">
                  <TiptapEditor
                    placeholder="Write a reply..."
                    value={inlineReplyText}
                    onChange={setInlineReplyText}
                    boardId={boardId ? Number(boardId) : undefined}
                    key={`reply-${comment.id}`}
                  />
                </div>
                <div className="mt-3 flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs px-3"
                    onClick={() => setInlineReplyId(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="h-8 text-xs px-4 font-semibold"
                    onClick={() =>
                      onSaveInlineReply(comment.id, inlineReplyText)
                    }
                    disabled={isContentEmpty(inlineReplyText) || isSaving}
                  >
                    {isSaving ? "Replying..." : "Reply"}
                  </Button>
                </div>
              </div>
            )}
          </div>{" "}
          {/* close flex-1 (117) */}
        </div>{" "}
        {/* close flex gap-4 (107) */}
      </div>{" "}
      {/* close wrapper (98) */}
      {/* Rendering flat threaded replies (only for Root comments) */}
      {!isReply && replies.length > 0 && (
        <div className="pt-4 space-y-6 relative">
          {(showAllReplies || replies.length <= 5
            ? replies
            : replies.slice(0, 4)
          ).map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              isReply={true} // Mark as reply to prevent further nesting
              replies={[]} // No nested replies for a flattened list
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
              onUpdateComment={onUpdateComment}
              onSaveInlineReply={onSaveInlineReply}
              onLikeComment={onLikeComment}
              onToggleSOP={onToggleSOP}
              onFilePreview={onFilePreview}
              isSaving={isSaving}
            />
          ))}

          {replies.length > 5 && (
            <div className="flex justify-start">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-[11px] font-bold text-primary hover:bg-primary/5 uppercase tracking-widest"
                onClick={() => setShowAllReplies(!showAllReplies)}
              >
                {showAllReplies
                  ? "See less"
                  : `See ${replies.length - 4} more replies`}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
