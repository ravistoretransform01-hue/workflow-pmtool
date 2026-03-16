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

import {
  Pencil,
  Trash2,
  MoreHorizontal,
  X,
  ThumbsUp,
  Reply,
} from "lucide-react";
import { TiptapEditor } from "@/shared/components/workload/texteditor/TiptapEditor";
import { cn, parseApiDateTime } from "@/lib/utils";
import type { TaskComment } from "@/features/tasks/types";
import { renderFormattedContent, getRelativeTimeString } from "./utils";

interface CommentItemProps {
  comment: TaskComment;
  allComments: TaskComment[];
  depth?: number;
  boardId?: number | string;
  expandedThreads: Record<string | number, boolean>;
  setExpandedThreads: React.Dispatch<
    React.SetStateAction<Record<string | number, boolean>>
  >;
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
  onFilePreview: (src: string, name?: string) => void;
  isSaving?: boolean;
}

export const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  allComments,
  depth = 0,
  boardId,
  expandedThreads,
  setExpandedThreads,
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
  onFilePreview,
  isSaving,
}) => {
  // Find immediate children only for this level
  const directReplies = allComments
    .filter((c) => String(c.parent_id) === String(comment.id))
    .sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );

  const isExpanded = expandedThreads[comment.id];
  // Show first 2 replies, then a "Show more" button
  const visibleReplies = isExpanded
    ? directReplies
    : directReplies.length > 2
      ? directReplies.slice(0, 2)
      : directReplies;
  const hiddenCount = directReplies.length - visibleReplies.length;

  const isReplyingToThis = String(inlineReplyId) === String(comment.id);
  const [isContentExpanded, setIsContentExpanded] = useState(false);
  const [showRelativeTime, setShowRelativeTime] = useState(false);

  // Heuristic for long content: > 800 chars of HTML or > 8 newlines
  const isLongContent =
    comment.content.length > 800 ||
    (comment.content.match(/<br/g) || []).length > 8;

  return (
    <div key={comment.id} className="space-y-4 relative">
      {/* Main Comment Row */}
      <div className="flex gap-4 group relative">
        <Avatar
          className={cn(
            "shrink-0 border border-border/50 shadow-sm relative",
            depth === 0 ? "h-10 w-10" : "h-8 w-8",
          )}
        >
          <AvatarFallback
            className={cn(
              "text-primary font-medium",
              depth === 0 ? "bg-primary/10" : "bg-primary/5 text-[10px]",
            )}
          >
            {comment.user?.name?.charAt(0).toUpperCase() || "U"}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-1.5 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "font-semibold text-foreground",
                  depth === 0 ? "text-sm" : "text-sm text-foreground/80",
                )}
              >
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
            </div>

            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
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
                    onClick={() => onUpdateComment(comment.id, editCommentText)}
                    disabled={isSaving}
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
                        const fileName = wrapper.getAttribute("data-filename");
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
            <div className="relative mt-4 mr-4 bg-background p-4 rounded-xl border border-border/50 shadow-inner animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="absolute -left-[19px] top-8 w-4 h-0.5 bg-muted/40" />
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
                  onClick={() => onSaveInlineReply(comment.id, inlineReplyText)}
                  disabled={!inlineReplyText.trim() || isSaving}
                >
                  {isSaving ? "Replying..." : "Reply"}
                </Button>
              </div>
            </div>
          )}

          {/* Rendering nested replies */}
          {visibleReplies.length > 0 && (
            <div className="mt-6 ml-2 pl-6 border-l-2 border-primary/10 space-y-6 relative">
              <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary/10 via-primary/5 to-transparent" />
              {visibleReplies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  allComments={allComments}
                  depth={depth + 1}
                  boardId={boardId}
                  expandedThreads={expandedThreads}
                  setExpandedThreads={setExpandedThreads}
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
                  onFilePreview={onFilePreview}
                  isSaving={isSaving}
                />
              ))}

              {isExpanded
                ? directReplies.length > 2 && (
                    <Button
                      variant="link"
                      size="sm"
                      className="text-xs h-6 p-0 font-bold text-primary/70 hover:text-primary uppercase tracking-tight"
                      onClick={() =>
                        setExpandedThreads((prev) => ({
                          ...prev,
                          [comment.id]: false,
                        }))
                      }
                    >
                      Hide replies
                    </Button>
                  )
                : hiddenCount > 0 && (
                    <Button
                      variant="link"
                      size="sm"
                      className="text-xs h-6 p-0 font-bold text-primary/70 hover:text-primary uppercase tracking-tight"
                      onClick={() =>
                        setExpandedThreads((prev) => ({
                          ...prev,
                          [comment.id]: true,
                        }))
                      }
                    >
                      Show {hiddenCount} more{" "}
                      {hiddenCount === 1 ? "reply" : "replies"}...
                    </Button>
                  )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
