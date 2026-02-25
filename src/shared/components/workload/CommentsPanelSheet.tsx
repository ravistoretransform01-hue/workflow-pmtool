import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/shared/components/ui/tabs";
import { Button } from "@/shared/components/ui/button";
import { Avatar, AvatarFallback } from "@/shared/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { TiptapEditor } from "@/shared/components/workload/texteditor/TiptapEditor";
import { FilePreviewModal } from "@/shared/components/workload/texteditor/FilePreviewModal";
import {
  Home,
  RefreshCcw,
  Pencil,
  Activity,
  MoreHorizontal,
  MessageCirclePlus,
  Trash2,
  // AtSign,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { TaskComment } from "@/features/tasks/types";
import { tasksApi } from "@/features/tasks/tasksApi";
import { getCurrentUserId, getOrganizationId, cn } from "@/lib/utils";

// Helper to render HTML content from Tiptap editor with proper styling
const renderFormattedContent = (content: string) => {
  if (!content) return { __html: "" };

  // Check if content is already HTML (from Tiptap)
  if (content.includes("<") && content.includes(">")) {
    // It's HTML, return as-is (Tiptap already sanitizes)
    // We'll apply styling via CSS classes in the container
    return { __html: content };
  }

  // Otherwise, treat as markdown-ish content and convert
  let safeContent = content
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

  // Restore Bold
  safeContent = safeContent.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

  // Restore Italic
  safeContent = safeContent.replace(/_(.*?)_/g, "<em>$1</em>");

  // Restore Strike
  safeContent = safeContent.replace(/~~(.*?)~~/g, "<strike>$1</strike>");

  // Newlines
  safeContent = safeContent.replace(/\n/g, "<br />");

  return { __html: safeContent };
};

interface CommentsPanelSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskName: string;
  taskId: string | null;
  comments: TaskComment[];
  isLoadingComments: boolean;
  updateText: string;
  onUpdateTextChange: (text: string) => void;
  updateFiles: Array<{ name: string; size: number; type: string; url: string }>;
  onUpdateFilesChange: (
    files: Array<{ name: string; size: number; type: string; url: string }>,
  ) => void;
  onSaveUpdate: () => void;
  onDeleteComment: (commentId: string | number) => void;
  onUpdateComment: (commentId: string | number, content: string) => void;
  onSaveInlineReply: (parentId: string | number, replyText: string) => void;
  onTaskButtonClick?: () => void;
  isSaving?: boolean;
  boardId?: string;
}

/**
 * Individual comment item component that renders recursively for nested replies
 */
const CommentItem = ({
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
  handleDeleteComment,
  updateTaskComment,
  saveInlineReply,
  renderFormattedContent,
  onFilePreview,
}: {
  comment: TaskComment;
  allComments: TaskComment[];
  depth?: number;
  boardId?: string;
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
  handleDeleteComment: (id: string | number) => void;
  updateTaskComment: (id: string | number, text: string) => void;
  saveInlineReply: (parentId: string | number) => void;
  renderFormattedContent: (content: string) => { __html: string };
  onFilePreview: (src: string, name?: string) => void;
}) => {
  // Find immediate children only for this level
  const directReplies = allComments
    .filter((c) => String(c.parent_id) === String(comment.id))
    .sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );

  const isExpanded = expandedThreads[comment.id];
  // Like Reddit: show first 2 replies, then a "Show more" button
  const visibleReplies = isExpanded
    ? directReplies
    : directReplies.length > 2
      ? directReplies.slice(0, 2)
      : directReplies;
  const hiddenCount = directReplies.length - visibleReplies.length;

  const isReplyingToThis = String(inlineReplyId) === String(comment.id);
  const [isContentExpanded, setIsContentExpanded] = useState(false);

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
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                {comment.created_at
                  ? format(new Date(comment.created_at), "MMM d, h:mm a")
                  : ""}
              </span>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 hover:bg-muted"
                  >
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => {
                      setInlineReplyId(comment.id);
                      setInlineReplyText("");
                    }}
                  >
                    Reply
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => handleDeleteComment(comment.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {editingCommentId === comment.id ? (
            <div className="space-y-3 pt-2 mr-4">
              <TiptapEditor
                value={editCommentText}
                onChange={setEditCommentText}
                placeholder="Edit your comment..."
                boardId={boardId ? parseInt(boardId) : undefined}
                key={`edit-${comment.id}`}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="h-8 text-xs px-4"
                  onClick={() => {
                    updateTaskComment(comment.id, editCommentText);
                    setEditingCommentId(null);
                  }}
                  disabled={!editCommentText.trim()}
                >
                  Save
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs px-3"
                  onClick={() => setEditingCommentId(null)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div
                className={cn(
                  "relative overflow-hidden transition-all duration-300",
                  isLongContent && !isContentExpanded && "max-h-[250px]",
                )}
              >
                <div
                  className={cn(
                    "text-foreground/90 leading-relaxed break-words pr-4",
                    depth === 0 ? "text-sm" : "text-sm text-foreground/80",
                    "[&_ul]:list-disc [&_ul]:ml-6 [&_ul]:my-2",
                    "[&_ol]:list-decimal [&_ol]:ml-6 [&_ol]:my-2",
                    "[&_li]:my-1",
                    "[&_ul_ul]:list-circle [&_ul_ul]:ml-6",
                    "[&_ol_ol]:ml-6",
                    "[&_blockquote]:border-l-4 [&_blockquote]:border-muted-foreground/30 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:my-2 [&_blockquote]:text-muted-foreground",
                    "[&_pre]:bg-muted [&_pre]:p-3 [&_pre]:rounded [&_pre]:font-mono [&_pre]:text-sm [&_pre]:my-2 [&_pre]:overflow-x-auto",
                    "[&_h1]:text-2xl [&_h1]:font-bold [&_h1]:my-2",
                    "[&_code]:bg-muted [&_code]:px-1 [&_code]:rounded [&_code]:text-sm",
                    "[&_a]:text-primary [&_a]:hover:underline [&_a]:cursor-pointer",
                    "[&_strong]:font-bold",
                    "[&_em]:italic",
                    "[&_s]:line-through",
                    "[&_hr]:my-4 [&_hr]:border-border",
                    "[&_input[type='checkbox']]:cursor-pointer [&_input[type='checkbox']]:accent-primary [&_input[type='checkbox']]:mr-2",
                    "[&_ul[data-type='taskList']]:list-none [&_ul[data-type='taskList']]:ml-0",
                    "[&_img]:cursor-zoom-in",
                    // PDF Card Styles
                    "[&_.pdf-card-wrapper]:my-3 [&_.pdf-card-wrapper]:max-w-[350px]",
                    "[&_.pdf-card-content]:flex [&_.pdf-card-content]:items-center [&_.pdf-card-content]:gap-2.5 [&_.pdf-card-content]:p-2.5 [&_.pdf-card-content]:bg-card [&_.pdf-card-content]:border [&_.pdf-card-content]:border-border [&_.pdf-card-content]:rounded-xl [&_.pdf-card-content]:transition-all [&_.pdf-card-content]:hover:border-primary/30 [&_.pdf-card-content]:shadow-md",
                    "[&_.pdf-card-icon]:flex-shrink-0 [&_.pdf-card-icon]:text-lg [&_.pdf-card-icon]:bg-background [&_.pdf-card-icon]:w-9 [&_.pdf-card-icon]:h-9 [&_.pdf-card-icon]:flex [&_.pdf-card-icon]:items-center [&_.pdf-card-icon]:justify-center [&_.pdf-card-icon]:rounded-lg [&_.pdf-card-icon]:border [&_.pdf-card-icon]:border-border",
                    "[&_.pdf-card-info]:flex-1 [&_.pdf-card-info]:min-w-0 [&_.pdf-card-info]:flex [&_.pdf-card-info]:flex-col [&_.pdf-card-info]:gap-0",
                    "[&_.pdf-card-name]:block [&_.pdf-card-name]:font-semibold [&_.pdf-card-name]:text-[11px] [&_.pdf-card-name]:truncate [&_.pdf-card-name]:text-foreground",
                    "[&_.pdf-card-type]:block [&_.pdf-card-type]:text-[9px] [&_.pdf-card-type]:text-muted-foreground [&_.pdf-card-type]:uppercase [&_.pdf-card-type]:tracking-tight",
                    "[&_.pdf-card-actions]:flex [&_.pdf-card-actions]:gap-1 [&_.pdf-card-actions]:ml-2",
                    "[&_.pdf-card-preview-btn]:px-2 [&_.pdf-card-preview-btn]:py-1 [&_.pdf-card-preview-btn]:text-[9px] [&_.pdf-card-preview-btn]:font-bold [&_.pdf-card-preview-btn]:bg-background [&_.pdf-card-preview-btn]:border [&_.pdf-card-preview-btn]:border-border [&_.pdf-card-preview-btn]:rounded-md [&_.pdf-card-preview-btn]:transition-colors [&_.pdf-card-preview-btn]:uppercase",
                    "[&_.pdf-card-open-btn]:px-2 [&_.pdf-card-open-btn]:py-1 [&_.pdf-card-open-btn]:text-[9px] [&_.pdf-card-open-btn]:font-bold [&_.pdf-card-open-btn]:bg-background [&_.pdf-card-open-btn]:border [&_.pdf-card-open-btn]:border-border [&_.pdf-card-open-btn]:rounded-md [&_.pdf-card-open-btn]:transition-colors [&_.pdf-card-open-btn]:text-foreground [&_.pdf-card-open-btn]:no-underline [&_.pdf-card-open-btn]:uppercase",
                  )}
                  dangerouslySetInnerHTML={renderFormattedContent(
                    comment.content,
                  )}
                  onClick={(e) => {
                    const target = e.target as HTMLElement;
                    if (target.tagName === "IMG") {
                      onFilePreview((target as HTMLImageElement).src);
                      return;
                    }

                    // Handle PDF Card Preview button
                    const previewBtn = target.closest(".pdf-card-preview-btn");
                    if (previewBtn) {
                      const wrapper = target.closest("[data-type='pdf-card']");
                      if (wrapper) {
                        const href = wrapper.getAttribute("data-href");
                        const fileName = wrapper.getAttribute("data-filename");
                        if (href) {
                          onFilePreview(href, fileName || "Document.pdf");
                          return;
                        }
                      }
                    }

                    const anchor = target.closest("a");
                    if (
                      anchor &&
                      !anchor.classList.contains("pdf-card-open-btn") &&
                      (anchor.href.toLowerCase().endsWith(".pdf") ||
                        anchor.classList.contains("pdf-link") ||
                        (anchor.textContent &&
                          anchor.textContent.includes("📄")))
                    ) {
                      e.preventDefault();
                      onFilePreview(
                        anchor.href,
                        anchor.textContent || "Document.pdf",
                      );
                    }
                  }}
                />
                {isLongContent && !isContentExpanded && (
                  <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-background to-transparent pointer-events-none" />
                )}
              </div>
              {isLongContent && (
                <button
                  onClick={() => setIsContentExpanded(!isContentExpanded)}
                  className="mt-1 text-xs font-semibold text-primary hover:underline focus:outline-none flex items-center"
                >
                  {isContentExpanded ? "show less" : "...see more"}
                </button>
              )}

              <div className="pt-0.5 flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 -ml-2 text-xs text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors font-medium"
                  onClick={() => {
                    setInlineReplyId(comment.id);
                    setInlineReplyText("");
                  }}
                >
                  <MessageCirclePlus className="h-3.5 w-3.5 mr-1.5" />
                  Reply
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors font-medium"
                  onClick={() => {
                    setEditingCommentId(comment.id);
                    setEditCommentText(comment.content);
                  }}
                >
                  <Pencil className="h-3 w-3 mr-1.5" />
                  Edit
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Replies Container */}
      {(directReplies.length > 0 || isReplyingToThis) && (
        <div className="pl-6 sm:pl-10 relative">
          {/* Vertical threading line */}
          <div className="absolute left-[19px] top-0 bottom-4 w-0.5 bg-muted/40 z-0" />

          <div className="space-y-4 pt-4">
            {visibleReplies.map((reply) => (
              <div key={reply.id} className="relative">
                {/* Horizontal connector */}
                <div className="absolute -left-[19px] top-5 w-4 h-0.5 bg-muted/40" />
                <CommentItem
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
                  handleDeleteComment={handleDeleteComment}
                  updateTaskComment={updateTaskComment}
                  saveInlineReply={saveInlineReply}
                  renderFormattedContent={renderFormattedContent}
                  onFilePreview={onFilePreview}
                />
              </div>
            ))}

            {/* Toggle button logic for this level */}
            {directReplies.length > 2 && (
              <div className="relative py-1">
                <div className="absolute -left-[19px] top-4 w-4 h-0.5 bg-muted/40" />
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-7 px-3 text-xs transition-colors flex items-center gap-2",
                    isExpanded
                      ? "text-muted-foreground bg-muted/5 hover:bg-muted/10"
                      : "text-primary bg-primary/5 hover:bg-primary/10",
                  )}
                  onClick={() =>
                    setExpandedThreads((prev) => ({
                      ...prev,
                      [comment.id]: !isExpanded,
                    }))
                  }
                >
                  {isExpanded ? (
                    <>
                      <div className="text-primary">Show less</div>
                    </>
                  ) : (
                    <>
                      <RefreshCcw className="h-3 w-3" />
                      Show {hiddenCount} more{" "}
                      {hiddenCount === 1 ? "reply" : "replies"}
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Inline reply editor for this comment */}
            {isReplyingToThis && (
              <div className="relative mt-4 mr-4 bg-muted/30 p-4 rounded-xl border border-border/50 shadow-inner animate-in fade-in slide-in-from-top-2 duration-200">
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
                    boardId={boardId ? parseInt(boardId) : undefined}
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
                    onClick={() => saveInlineReply(comment.id)}
                    disabled={!inlineReplyText.trim()}
                  >
                    Reply
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export function CommentsPanelSheet({
  open,
  onOpenChange,
  taskName,
  taskId,
  comments,
  isLoadingComments,
  updateText,
  onUpdateTextChange,
  // updateFiles,
  // onUpdateFilesChange,
  onSaveUpdate,
  onDeleteComment,
  onUpdateComment,
  onSaveInlineReply,
  onTaskButtonClick,
  isSaving,
  boardId,
}: CommentsPanelSheetProps) {
  const [expandedThreads, setExpandedThreads] = useState<
    Record<string | number, boolean>
  >({});
  const [editingCommentId, setEditingCommentId] = useState<
    string | number | null
  >(null);
  const [editCommentText, setEditCommentText] = useState("");
  const [inlineReplyId, setInlineReplyId] = useState<string | number | null>(
    null,
  );
  const [inlineReplyText, setInlineReplyText] = useState("");
  const [replyingTo, setReplyingTo] = useState<TaskComment | null>(null);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [previewFileName, setPreviewFileName] = useState<string | undefined>(
    undefined,
  );
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const handleFilePreview = (src: string, name?: string) => {
    setPreviewSrc(src);
    setPreviewFileName(name);
    setIsPreviewOpen(true);
  };

  // Activity state
  const [activityData, setActivityData] = useState<any[]>([]);
  const [isLoadingActivity, setIsLoadingActivity] = useState(false);
  const [activityMeta, setActivityMeta] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingPage, setIsLoadingPage] = useState(false);

  // Load activity when taskId changes or component opens
  useEffect(() => {
    if (open && taskId) {
      setCurrentPage(1); // Reset to first page when opening
      loadActivity(1);
    }
  }, [open, taskId]);

  // Keyboard navigation for pagination
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!open || !activityMeta) return;

      if (event.key === "ArrowLeft" && event.ctrlKey && currentPage > 1) {
        event.preventDefault();
        handlePreviousPage();
      } else if (
        event.key === "ArrowRight" &&
        event.ctrlKey &&
        currentPage < activityMeta.total_pages
      ) {
        event.preventDefault();
        handleNextPage();
      }
    };

    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [open, currentPage, activityMeta]);

  const loadActivity = async (page: number = currentPage) => {
    if (!taskId) return;

    // Use different loading states for initial load vs pagination
    if (page === 1) {
      setIsLoadingActivity(true);
    } else {
      setIsLoadingPage(true);
    }

    try {
      const organizationId = getOrganizationId() || 27;
      const userId = getCurrentUserId() || 19;

      const response = await tasksApi.getActivity({
        organization_id: organizationId,
        user_id: userId,
        task_id: taskId,
        page: page,
        per_page: 20, // Reduced per page for better pagination
      });

      setActivityData(response.data);
      setActivityMeta(response.meta);
      setCurrentPage(page);
    } catch (error) {
      console.error("Failed to load activity:", error);
      setActivityData([]);
    } finally {
      setIsLoadingActivity(false);
      setIsLoadingPage(false);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      loadActivity(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (activityMeta && currentPage < activityMeta.total_pages) {
      loadActivity(currentPage + 1);
    }
  };

  const handleDeleteComment = (commentId: string | number) => {
    onDeleteComment(commentId);
  };

  const updateTaskComment = (commentId: string | number, content: string) => {
    onUpdateComment(commentId, content);
  };

  const saveInlineReply = (parentId: string | number) => {
    onSaveInlineReply(parentId, inlineReplyText);
    setInlineReplyId(null);
    setInlineReplyText("");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange} modal={false}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl p-0"
        showOverlay={false}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <div className="flex flex-col h-full">
          <SheetHeader className="px-6 py-4 border-b border-border">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-2xl font-semibold">
                {taskName || "Task Details"}
              </SheetTitle>
              <div className="hidden flex items-center gap-4">
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </SheetHeader>

          <Tabs defaultValue="updates" className="flex-1 flex flex-col min-h-0">
            <div className="px-6 border-b border-border">
              <TabsList className="w-full justify-start h-12 bg-transparent p-0">
                <TabsTrigger
                  value="updates"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Dev Updates
                </TabsTrigger>

                <TabsTrigger
                  value="client-updates"
                  className="hidden rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                >
                  <RefreshCcw className="h-4 w-4 mr-2" />
                  Client Updates
                </TabsTrigger>

                <Button
                  variant="ghost"
                  className="hidden rounded-none border-b-2 border-transparent hover:bg-transparent h-auto py-3 px-4"
                  onClick={onTaskButtonClick}
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Task
                </Button>

                <TabsTrigger
                  value="activity"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                >
                  <Activity className="h-4 w-4 mr-2" />
                  Activity Log
                </TabsTrigger>
              </TabsList>
            </div>

            {/* comments content */}
            <TabsContent
              value="updates"
              className="flex-1 flex flex-col mt-0 overflow-hidden min-h-0 data-[state=inactive]:hidden"
            >
              <div className="px-2 py-2 relative z-10 flex flex-col gap-2">
                {replyingTo && (
                  <div className="flex items-center justify-between text-xs bg-muted/50 p-2 rounded border border-border">
                    <div className="flex items-center gap-2 text-muted-foreground truncate">
                      <span>
                        Replying to <strong>{replyingTo.user?.name}</strong>
                      </span>
                      <span
                        className="truncate opacity-70 italic [&_div[data-type='pdf-card']]:inline-flex [&_div[data-type='pdf-card']]:scale-75 [&_div[data-type='pdf-card']]:origin-left"
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
                {/* TODO: Replace with Tiptap editor */}
                <TiptapEditor
                  placeholder={
                    replyingTo
                      ? "Write a reply..."
                      : "Write an update and mention others with @"
                  }
                  value={updateText}
                  onChange={onUpdateTextChange}
                  boardId={boardId ? parseInt(boardId) : undefined}
                  key="main-update-editor"
                />
              </div>
              <div className="flex items-center justify-between px-2 pb-2 border-b border-border">
                <div className="flex items-center gap-2">
                  {/* <FileUploadDropdown
                    onFileSelect={(fileInfo) => {
                      onUpdateFilesChange([...updateFiles, fileInfo]);
                    }}
                  /> */}
                  {/* <GifPicker
                    onGifSelect={(gifUrl) =>
                      onUpdateTextChange(
                        updateText +
                          `<img src="${gifUrl}" alt="GIF" style="max-width: 200px; border-radius: 8px;" />`,
                      )
                    }
                  /> */}
                  {/* <EmojiPicker
                    onEmojiSelect={(emoji) =>
                      onUpdateTextChange(updateText + emoji)
                    }
                  /> */}

                  {/* <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <AtSign className="h-4 w-4 text-muted-foreground" />
                  </Button> */}
                </div>
                <Button
                  onClick={onSaveUpdate}
                  disabled={!updateText.trim() || isSaving}
                  className="bg-primary hover:bg-primary/90"
                >
                  {isSaving ? "Saving..." : "Update"}
                </Button>
              </div>

              <div className="flex-1 overflow-auto p-4">
                {isLoadingComments ? (
                  <div className="flex items-center justify-center py-8">
                    <p className="text-sm text-muted-foreground">
                      Loading updates...
                    </p>
                  </div>
                ) : comments.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground">
                      No updates yet. Be the first to add one!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {comments
                      .filter((c) => !c.parent_id)
                      .sort(
                        (a, b) =>
                          new Date(b.created_at).getTime() -
                          new Date(a.created_at).getTime(),
                      )
                      .map((comment) => (
                        <CommentItem
                          key={comment.id}
                          comment={comment}
                          allComments={comments}
                          depth={0}
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
                          handleDeleteComment={handleDeleteComment}
                          updateTaskComment={updateTaskComment}
                          saveInlineReply={saveInlineReply}
                          renderFormattedContent={renderFormattedContent}
                          onFilePreview={handleFilePreview}
                        />
                      ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* activity log content */}
            <TabsContent
              value="activity"
              className="flex-1 flex flex-col mt-0 overflow-hidden min-h-0 data-[state=inactive]:hidden"
            >
              <div className="flex-1 overflow-auto px-6 py-4 relative">
                {/* Loading overlay for pagination */}
                {isLoadingPage && (
                  <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-10 flex items-center justify-center">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      Loading page {currentPage}...
                    </div>
                  </div>
                )}

                {isLoadingActivity ? (
                  <div className="flex items-center justify-center py-8">
                    <p className="text-sm text-muted-foreground">
                      Loading activity...
                    </p>
                  </div>
                ) : activityData.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground">
                      No activity found for this task.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {activityData.map((activity) => (
                      <div
                        key={activity.id}
                        onClick={(e) => {
                          const target = e.target as HTMLElement;
                          if (target.tagName === "IMG") {
                            handleFilePreview((target as HTMLImageElement).src);
                            return;
                          }

                          // Handle PDF Card Preview button
                          const previewBtn = target.closest(
                            ".pdf-card-preview-btn",
                          );
                          if (previewBtn) {
                            const wrapper = target.closest(
                              "[data-type='pdf-card']",
                            );
                            if (wrapper) {
                              const href = wrapper.getAttribute("data-href");
                              const fileName =
                                wrapper.getAttribute("data-filename");
                              if (href) {
                                handleFilePreview(
                                  href,
                                  fileName || "Document.pdf",
                                );
                                return;
                              }
                            }
                          }

                          const anchor = target.closest("a");
                          if (
                            anchor &&
                            !anchor.classList.contains("pdf-card-open-btn") &&
                            (anchor.href.toLowerCase().endsWith(".pdf") ||
                              anchor.classList.contains("pdf-link") ||
                              (anchor.textContent &&
                                anchor.textContent.includes("📄")))
                          ) {
                            e.preventDefault();
                            handleFilePreview(
                              anchor.href,
                              anchor.textContent || "Document.pdf",
                            );
                          }
                        }}
                      >
                        <Avatar className="h-8 w-8 shrink-0 border border-border/50 shadow-sm">
                          <AvatarFallback className="bg-primary/10 text-primary font-medium text-xs">
                            {activity.user?.name?.charAt(0).toUpperCase() ||
                              "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-foreground">
                              {activity.user?.name || "Unknown User"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {activity.created_at
                                ? format(
                                    new Date(activity.created_at),
                                    "MMM d, h:mm a",
                                  )
                                : ""}
                            </span>
                          </div>
                          <div className="text-sm text-foreground/90">
                            <span className="font-medium text-primary">
                              {activity.action_label}
                            </span>
                          </div>
                          {activity.old_value && activity.old_value.trim() && (
                            <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded border-l-2 border-destructive/30">
                              <span className="font-medium">Previous:</span>
                              <div
                                className="mt-1 break-words [&_.pdf-card-wrapper]:max-w-full [&_.pdf-card-wrapper]:my-1 scale-90 origin-left [&_.pdf-card-content]:bg-card [&_.pdf-card-content]:border-border [&_.pdf-card-content]:shadow-sm [&_.pdf-card-preview-btn]:bg-background [&_.pdf-card-open-btn]:bg-background"
                                dangerouslySetInnerHTML={renderFormattedContent(
                                  activity.old_value,
                                )}
                              />
                            </div>
                          )}
                          {activity.new_value &&
                            activity.new_value !== "Task updated" &&
                            activity.new_value.trim() && (
                              <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded border-l-2 border-primary/30">
                                <span className="font-medium">New:</span>
                                <div
                                  className="mt-1 break-words [&_.pdf-card-wrapper]:max-w-full [&_.pdf-card-wrapper]:my-1 scale-90 origin-left [&_.pdf-card-content]:bg-card [&_.pdf-card-content]:border-border [&_.pdf-card-content]:shadow-sm [&_.pdf-card-preview-btn]:bg-background [&_.pdf-card-open-btn]:bg-background"
                                  dangerouslySetInnerHTML={renderFormattedContent(
                                    activity.new_value,
                                  )}
                                />
                              </div>
                            )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Fixed Pagination Controls */}
              {activityMeta && activityMeta.total_pages > 1 && (
                <div className="border-t border-border bg-background px-6 py-3 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">
                      Showing {activityMeta.count} of {activityMeta.total}{" "}
                      activities
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePreviousPage}
                        disabled={currentPage <= 1 || isLoadingPage}
                        className="h-8 px-2"
                        title="Previous page (Ctrl+←)"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-xs text-muted-foreground px-2">
                        {isLoadingPage ? (
                          <div className="w-4 h-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
                        ) : (
                          `${currentPage} of ${activityMeta.total_pages}`
                        )}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleNextPage}
                        disabled={
                          currentPage >= activityMeta.total_pages ||
                          isLoadingPage
                        }
                        className="h-8 px-2"
                        title="Next page (Ctrl+→)"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
          <FilePreviewModal
            src={previewSrc}
            isOpen={isPreviewOpen}
            onClose={() => setIsPreviewOpen(false)}
            fileName={previewFileName}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}

// import { useState } from "react";
// import { format } from "date-fns";
// import {
//   Sheet,
//   SheetContent,
//   SheetHeader,
//   SheetTitle,
// } from "@/shared/components/ui/sheet";
// import {
//   Tabs,
//   TabsContent,
//   TabsList,
//   TabsTrigger,
// } from "@/shared/components/ui/tabs";
// import { Button } from "@/shared/components/ui/button";
// import { Avatar, AvatarFallback } from "@/shared/components/ui/avatar";
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuTrigger,
// } from "@/shared/components/ui/dropdown-menu";
// import { FileUploadDropdown } from "@/shared/components/FileUploadDropdown";
// import { GifPicker } from "@/shared/components/GifPicker";
// import { EmojiPicker } from "@/shared/components/EmojiPicker";
// import { TiptapEditor } from "@/shared/components/TiptapEditor";
// import {
//   Home,
//   RefreshCcw,
//   Pencil,
//   Activity,
//   MoreHorizontal,
//   MessageCirclePlus,
//   Trash2,
//   AtSign,
//   X,
// } from "lucide-react";
// import type { TaskComment } from "@/features/tasks/types";

// // Helper to render markdown-ish content
// const renderFormattedContent = (content: string) => {
//   if (!content) return { __html: "" };

//   // Escape HTML first to prevent XSS from the raw text
//   let safeContent = content
//     .replace(/&/g, "&amp;")
//     .replace(/</g, "&lt;")
//     .replace(/>/g, "&gt;")
//     .replace(/"/g, "&quot;")
//     .replace(/'/g, "&#039;");

//   // Restore Bold
//   safeContent = safeContent.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

//   // Restore Italic
//   safeContent = safeContent.replace(/_(.*?)_/g, "<em>$1</em>");

//   // Restore Strike
//   safeContent = safeContent.replace(/~~(.*?)~~/g, "<strike>$1</strike>");

//   // Newlines
//   safeContent = safeContent.replace(/\n/g, "<br />");

//   return { __html: safeContent };
// };

// interface CommentsPanelSheetProps {
//   open: boolean;
//   onOpenChange: (open: boolean) => void;
//   taskName: string;
//   taskId: string | null;
//   comments: TaskComment[];
//   isLoadingComments: boolean;
//   updateText: string;
//   onUpdateTextChange: (text: string) => void;
//   updateFiles: Array<{ name: string; size: number; type: string; url: string }>;
//   onUpdateFilesChange: (
//     files: Array<{ name: string; size: number; type: string; url: string }>
//   ) => void;
//   onSaveUpdate: () => void;
//   onDeleteComment: (commentId: string | number) => void;
//   onUpdateComment: (commentId: string | number, content: string) => void;
//   onSaveInlineReply: (parentId: string | number, replyText: string) => void;
//   onTaskButtonClick?: () => void;
// }

// export function CommentsPanelSheet({
//   open,
//   onOpenChange,
//   taskName,
//   comments,
//   isLoadingComments,
//   updateText,
//   onUpdateTextChange,
//   updateFiles,
//   onUpdateFilesChange,
//   onSaveUpdate,
//   onDeleteComment,
//   onUpdateComment,
//   onSaveInlineReply,
//   onTaskButtonClick,
// }: CommentsPanelSheetProps) {
//   const [expandedThreads, setExpandedThreads] = useState<
//     Record<string | number, boolean>
//   >({});
//   const [editingCommentId, setEditingCommentId] = useState<
//     string | number | null
//   >(null);
//   const [editCommentText, setEditCommentText] = useState("");
//   const [inlineReplyId, setInlineReplyId] = useState<string | number | null>(
//     null
//   );
//   const [inlineReplyText, setInlineReplyText] = useState("");
//   const [replyingTo, setReplyingTo] = useState<TaskComment | null>(null);

//   const handleDeleteComment = (commentId: string | number) => {
//     onDeleteComment(commentId);
//   };

//   const updateTaskComment = (commentId: string | number, content: string) => {
//     onUpdateComment(commentId, content);
//   };

//   const saveInlineReply = (parentId: string | number) => {
//     onSaveInlineReply(parentId, inlineReplyText);
//     setInlineReplyId(null);
//     setInlineReplyText("");
//   };

//   return (
//     <Sheet open={open} onOpenChange={onOpenChange} modal={false}>
//       <SheetContent
//         side="right"
//         className="w-full sm:max-w-2xl p-0"
//         showOverlay={false}
//       >
//         <div className="flex flex-col h-full">
//           <SheetHeader className="px-6 py-4 border-b border-border">
//             <div className="flex items-center justify-between">
//               <SheetTitle className="text-2xl font-semibold">
//                 {taskName || "Task Details"}
//               </SheetTitle>
//               <div className="flex items-center gap-4">
//                 <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
//                   <MoreHorizontal className="h-4 w-4" />
//                 </Button>
//               </div>
//             </div>
//           </SheetHeader>

//           <Tabs defaultValue="updates" className="flex-1 flex flex-col min-h-0">
//             <div className="px-6 border-b border-border">
//               <TabsList className="w-full justify-start h-12 bg-transparent p-0">
//                 <TabsTrigger
//                   value="updates"
//                   className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
//                 >
//                   <Home className="h-4 w-4 mr-2" />
//                   Dev Updates
//                 </TabsTrigger>

//                 <TabsTrigger
//                   value="client-updates"
//                   className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
//                 >
//                   <RefreshCcw className="h-4 w-4 mr-2" />
//                   Client Updates
//                 </TabsTrigger>

//                 <Button
//                   variant="ghost"
//                   className="rounded-none border-b-2 border-transparent hover:bg-transparent h-auto py-3 px-4"
//                   onClick={onTaskButtonClick}
//                 >
//                   <Pencil className="h-4 w-4 mr-2" />
//                   Task
//                 </Button>

//                 <TabsTrigger
//                   value="activity"
//                   className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
//                 >
//                   <Activity className="h-4 w-4 mr-2" />
//                   Activity Log
//                 </TabsTrigger>
//               </TabsList>
//             </div>

//             <TabsContent
//               value="updates"
//               className="flex-1 flex flex-col mt-0 overflow-hidden min-h-0"
//             >
//               <div className="px-6 pt-2 pb-4 border-b border-border relative z-10 flex flex-col gap-2">
//                 {replyingTo && (
//                   <div className="flex items-center justify-between text-xs bg-muted/50 p-2 rounded border border-border">
//                     <div className="flex items-center gap-2 text-muted-foreground truncate">
//                       <span>
//                         Replying to <strong>{replyingTo.user?.name}</strong>
//                       </span>
//                       <span
//                         className="truncate opacity-70 italic"
//                         dangerouslySetInnerHTML={{
//                           __html:
//                             replyingTo.content.substring(0, 50) +
//                             (replyingTo.content.length > 50 ? "..." : ""),
//                         }}
//                       />
//                     </div>
//                     <Button
//                       variant="ghost"
//                       size="sm"
//                       className="h-5 w-5 p-0 hover:bg-transparent"
//                       onClick={() => setReplyingTo(null)}
//                     >
//                       <X className="h-3 w-3" />
//                     </Button>
//                   </div>
//                 )}
//                 {/* TODO: Replace with Tiptap editor */}
//                 <TiptapEditor
//                   placeholder={
//                     replyingTo
//                       ? "Write a reply..."
//                       : "Write an update and mention others with @"
//                   }
//                   value={updateText}
//                   onChange={onUpdateTextChange}
//                 />
//               </div>
//               <div className="flex items-center justify-between px-6 pt-3">
//                 <div className="flex items-center gap-2">
//                   <FileUploadDropdown
//                     onFileSelect={(fileInfo) => {
//                       onUpdateFilesChange([...updateFiles, fileInfo]);
//                     }}
//                   />
//                   <GifPicker
//                     onGifSelect={(gifUrl) =>
//                       onUpdateTextChange(
//                         updateText +
//                         `<img src="${gifUrl}" alt="GIF" style="max-width: 200px; border-radius: 8px;" />`
//                       )
//                     }
//                   />
//                   <EmojiPicker
//                     onEmojiSelect={(emoji) =>
//                       onUpdateTextChange(updateText + emoji)
//                     }
//                   />

//                   <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
//                     <AtSign className="h-4 w-4 text-muted-foreground" />
//                   </Button>
//                 </div>
//                 <Button
//                   onClick={onSaveUpdate}
//                   disabled={!updateText.trim()}
//                   className="bg-primary hover:bg-primary/90"
//                 >
//                   Update
//                 </Button>
//               </div>

//               <div className="flex-1 overflow-auto px-6 py-4">
//                 {isLoadingComments ? (
//                   <div className="flex items-center justify-center py-8">
//                     <p className="text-sm text-muted-foreground">
//                       Loading updates...
//                     </p>
//                   </div>
//                 ) : comments.length === 0 ? (
//                   <div className="text-center py-8">
//                     <p className="text-sm text-muted-foreground">
//                       No updates yet. Be the first to add one!
//                     </p>
//                   </div>
//                 ) : (
//                   <div className="space-y-8">
//                     {comments
//                       .filter((c) => !c.parent_id)
//                       .sort(
//                         (a, b) =>
//                           new Date(b.created_at).getTime() -
//                           new Date(a.created_at).getTime()
//                       )
//                       .map((comment) => {
//                         const getDescendants = (
//                           parentId: string | number
//                         ): TaskComment[] => {
//                           const directChildren = comments.filter(
//                             (c) => String(c.parent_id) === String(parentId)
//                           );
//                           let allDescendants = [...directChildren];
//                           directChildren.forEach((child) => {
//                             allDescendants = [
//                               ...allDescendants,
//                               ...getDescendants(child.id),
//                             ];
//                           });
//                           return allDescendants;
//                         };

//                         const allThreadComments = getDescendants(
//                           comment.id
//                         ).sort(
//                           (a, b) =>
//                             new Date(a.created_at).getTime() -
//                             new Date(b.created_at).getTime()
//                         );

//                         const isExpanded = expandedThreads[comment.id];
//                         const visibleReplies = isExpanded
//                           ? allThreadComments
//                           : allThreadComments.length > 2
//                             ? [allThreadComments[allThreadComments.length - 1]]
//                             : allThreadComments;
//                         const hiddenCount =
//                           allThreadComments.length - visibleReplies.length;

//                         const isReplyingInThisThread =
//                           inlineReplyId &&
//                           (String(inlineReplyId) === String(comment.id) ||
//                             allThreadComments.some(
//                               (rtc) => String(rtc.id) === String(inlineReplyId)
//                             ));

//                         return (
//                           <div key={comment.id} className="space-y-4 relative">
//                             {/* Main Comment */}
//                             <div className="flex gap-4 group relative z-10">
//                               <Avatar className="h-10 w-10 shrink-0 border border-border/50 shadow-sm relative z-10">
//                                 <AvatarFallback className="bg-primary/10 text-primary font-medium">
//                                   {comment.user?.name
//                                     ?.charAt(0)
//                                     .toUpperCase() || "U"}
//                                 </AvatarFallback>
//                               </Avatar>
//                               <div className="flex-1 space-y-1.5 min-w-0">
//                                 <div className="flex items-center justify-between">
//                                   <div className="flex items-center gap-2">
//                                     <span className="text-sm font-semibold text-foreground">
//                                       {comment.user?.name || "Unknown User"}
//                                     </span>
//                                     <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
//                                       {comment.created_at
//                                         ? format(
//                                           new Date(comment.created_at),
//                                           "MMM d, h:mm a"
//                                         )
//                                         : ""}
//                                     </span>
//                                   </div>
//                                   <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
//                                     <DropdownMenu>
//                                       <DropdownMenuTrigger asChild>
//                                         <Button
//                                           variant="ghost"
//                                           size="sm"
//                                           className="h-7 w-7 p-0 hover:bg-muted"
//                                         >
//                                           <MoreHorizontal className="h-3.5 w-3.5" />
//                                         </Button>
//                                       </DropdownMenuTrigger>
//                                       <DropdownMenuContent align="end">
//                                         <DropdownMenuItem
//                                           onClick={() => {
//                                             setInlineReplyId(comment.id);
//                                             setInlineReplyText("");
//                                           }}
//                                         >
//                                           Reply
//                                         </DropdownMenuItem>
//                                         <DropdownMenuItem
//                                           className="text-destructive focus:text-destructive"
//                                           onClick={() =>
//                                             handleDeleteComment(comment.id)
//                                           }
//                                         >
//                                           <Trash2 className="h-4 w-4 mr-2" />
//                                           Delete
//                                         </DropdownMenuItem>
//                                       </DropdownMenuContent>
//                                     </DropdownMenu>
//                                   </div>
//                                 </div>
//                                 {editingCommentId === comment.id ? (
//                                   <div className="space-y-3 pt-2 mr-4">
//                                     <TiptapEditor
//                                       value={editCommentText}
//                                       onChange={setEditCommentText}
//                                       placeholder="Edit your comment..."
//                                     />
//                                     <div className="flex gap-2">
//                                       <Button
//                                         size="sm"
//                                         className="h-8 text-xs px-4"
//                                         onClick={() => {
//                                           updateTaskComment(
//                                             comment.id,
//                                             editCommentText
//                                           );
//                                           setEditingCommentId(null);
//                                         }}
//                                         disabled={!editCommentText.trim()}
//                                       >
//                                         Save
//                                       </Button>
//                                       <Button
//                                         variant="ghost"
//                                         size="sm"
//                                         className="h-8 text-xs px-3"
//                                         onClick={() =>
//                                           setEditingCommentId(null)
//                                         }
//                                       >
//                                         Cancel
//                                       </Button>
//                                     </div>
//                                   </div>
//                                 ) : (
//                                   <>
//                                     <div
//                                       className="text-sm text-foreground/90 leading-relaxed break-words pr-4"
//                                       dangerouslySetInnerHTML={renderFormattedContent(comment.content)}
//                                     />

//                                     <div className="pt-0.5 flex items-center gap-4">
//                                       <Button
//                                         variant="ghost"
//                                         size="sm"
//                                         className="h-7 px-2 -ml-2 text-xs text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors font-medium"
//                                         onClick={() => {
//                                           setInlineReplyId(comment.id);
//                                           setInlineReplyText("");
//                                         }}
//                                       >
//                                         <MessageCirclePlus className="h-3.5 w-3.5 mr-1.5" />
//                                         Reply
//                                       </Button>
//                                       <Button
//                                         variant="ghost"
//                                         size="sm"
//                                         className="h-7 px-2 text-xs text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors font-medium"
//                                         onClick={() => {
//                                           setEditingCommentId(comment.id);
//                                           setEditCommentText(comment.content);
//                                         }}
//                                       >
//                                         <Pencil className="h-3 w-3 mr-1.5" />
//                                         Edit
//                                       </Button>
//                                     </div>
//                                   </>
//                                 )}
//                               </div>
//                             </div>

//                             {/* Thread Guide Line */}
//                             {allThreadComments.length > 0 && (
//                               <div className="absolute left-[19px] top-10 bottom-4 w-0.5 bg-muted/40 z-0" />
//                             )}

//                             {/* Collapse/Expand Information */}
//                             {allThreadComments.length > 1 &&
//                               hiddenCount > 0 && (
//                                 <div className="pl-14 py-1 relative z-10">
//                                   <Button
//                                     variant="ghost"
//                                     size="sm"
//                                     className="h-7 px-3 text-xs text-primary bg-primary/5 hover:bg-primary/10 transition-colors flex items-center gap-2"
//                                     onClick={() =>
//                                       setExpandedThreads((prev) => ({
//                                         ...prev,
//                                         [comment.id]: true,
//                                       }))
//                                     }
//                                   >
//                                     <RefreshCcw className="h-3 w-3" />
//                                     Show {hiddenCount} more{" "}
//                                     {hiddenCount === 1 ? "reply" : "replies"}
//                                   </Button>
//                                 </div>
//                               )}

//                             {/* Replies Container */}
//                             <div className="pl-14 space-y-4 relative z-10">
//                               {visibleReplies.map((reply) => (
//                                 <div
//                                   key={reply.id}
//                                   className="flex gap-3 group relative py-1"
//                                 >
//                                   {/* Horizontal Connection Line */}
//                                   <div className="absolute -left-[37px] top-5 w-5 h-0.5 bg-muted/40" />

//                                   <Avatar className="h-8 w-8 shrink-0 border border-border/50 shadow-sm">
//                                     <AvatarFallback className="bg-primary/5 text-primary text-[10px] font-semibold">
//                                       {reply.user?.name
//                                         ?.charAt(0)
//                                         .toUpperCase() || "U"}
//                                     </AvatarFallback>
//                                   </Avatar>
//                                   <div className="flex-1 space-y-0.5 min-w-0">
//                                     <div className="flex items-center justify-between">
//                                       <div className="flex items-center gap-2">
//                                         <span className="text-sm font-semibold text-foreground/80">
//                                           {reply.user?.name || "Unknown User"}
//                                         </span>
//                                         <span className="text-[10px] text-muted-foreground italic">
//                                           {reply.created_at
//                                             ? format(
//                                               new Date(reply.created_at),
//                                               "MMM d, h:mm a"
//                                             )
//                                             : ""}
//                                         </span>
//                                       </div>
//                                       <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
//                                         <DropdownMenu>
//                                           <DropdownMenuTrigger asChild>
//                                             <Button
//                                               variant="ghost"
//                                               size="sm"
//                                               className="h-6 w-6 p-0 hover:bg-muted"
//                                             >
//                                               <MoreHorizontal className="h-3 w-3" />
//                                             </Button>
//                                           </DropdownMenuTrigger>
//                                           <DropdownMenuContent align="end">
//                                             <DropdownMenuItem
//                                               onClick={() => {
//                                                 setInlineReplyId(reply.id);
//                                                 setInlineReplyText("");
//                                               }}
//                                             >
//                                               Reply
//                                             </DropdownMenuItem>
//                                             <DropdownMenuItem
//                                               className="text-destructive focus:text-destructive"
//                                               onClick={() =>
//                                                 handleDeleteComment(reply.id)
//                                               }
//                                             >
//                                               <Trash2 className="h-4 w-4 mr-2" />
//                                               Delete
//                                             </DropdownMenuItem>
//                                           </DropdownMenuContent>
//                                         </DropdownMenu>
//                                       </div>
//                                     </div>

//                                     {editingCommentId === reply.id ? (
//                                       <div className="space-y-3 pt-2">
//                                         <TiptapEditor
//                                           value={editCommentText}
//                                           onChange={setEditCommentText}
//                                           placeholder="Edit your reply..."
//                                         />
//                                         <div className="flex gap-2">
//                                           <Button
//                                             size="sm"
//                                             className="h-8 text-xs px-4"
//                                             onClick={() => {
//                                               updateTaskComment(
//                                                 reply.id,
//                                                 editCommentText
//                                               );
//                                               setEditingCommentId(null);
//                                             }}
//                                             disabled={!editCommentText.trim()}
//                                           >
//                                             Save
//                                           </Button>
//                                           <Button
//                                             variant="ghost"
//                                             size="sm"
//                                             className="h-8 text-xs px-3"
//                                             onClick={() =>
//                                               setEditingCommentId(null)
//                                             }
//                                           >
//                                             Cancel
//                                           </Button>
//                                         </div>
//                                       </div>
//                                     ) : (
//                                       <>
//                                         <div
//                                           className="text-sm text-foreground/80 leading-relaxed break-words"
//                                           dangerouslySetInnerHTML={renderFormattedContent(reply.content)}
//                                         />
//                                         <div className="pt-0.5 flex items-center gap-4">
//                                           <Button
//                                             variant="ghost"
//                                             size="sm"
//                                             className="h-6 px-1.5 -ml-1.5 text-[11px] text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors font-medium"
//                                             onClick={() => {
//                                               setInlineReplyId(reply.id);
//                                               setInlineReplyText("");
//                                             }}
//                                           >
//                                             Reply
//                                           </Button>
//                                           <Button
//                                             variant="ghost"
//                                             size="sm"
//                                             className="h-6 px-1.5 text-[11px] text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors font-medium"
//                                             onClick={() => {
//                                               setEditingCommentId(reply.id);
//                                               setEditCommentText(reply.content);
//                                             }}
//                                           >
//                                             Edit
//                                           </Button>
//                                         </div>
//                                       </>
//                                     )}
//                                   </div>
//                                 </div>
//                               ))}

//                               {/* Inline reply editor */}
//                               {isReplyingInThisThread && (
//                                 <div className="mt-4 mr-4 bg-muted/30 p-4 rounded-xl border border-border/50 shadow-inner relative transition-all animate-in fade-in slide-in-from-top-2 duration-200">
//                                   <div className="mb-3 flex items-center justify-between">
//                                     <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-primary/80">
//                                       Replying to{" "}
//                                       {comments.find(
//                                         (c) =>
//                                           String(c.id) === String(inlineReplyId)
//                                       )?.user?.name || "User"}
//                                     </span>
//                                     <Button
//                                       variant="ghost"
//                                       size="sm"
//                                       className="h-6 w-6 p-0 hover:bg-background"
//                                       onClick={() => setInlineReplyId(null)}
//                                     >
//                                       <X className="h-3 w-3" />
//                                     </Button>
//                                   </div>
//                                   <div className="mb-3">
//                                     <TiptapEditor
//                                       placeholder="Write a reply..."
//                                       value={inlineReplyText}
//                                       onChange={setInlineReplyText}
//                                     />
//                                   </div>
//                                   <div className="mt-3 flex justify-end gap-2">
//                                     <Button
//                                       variant="ghost"
//                                       size="sm"
//                                       className="h-8 text-xs px-3"
//                                       onClick={() => setInlineReplyId(null)}
//                                     >
//                                       Cancel
//                                     </Button>
//                                     <Button
//                                       size="sm"
//                                       className="h-8 text-xs px-4 font-semibold"
//                                       onClick={() =>
//                                         saveInlineReply(inlineReplyId!)
//                                       }
//                                       disabled={!inlineReplyText.trim()}
//                                     >
//                                       Reply
//                                     </Button>
//                                   </div>
//                                 </div>
//                               )}
//                             </div>
//                           </div>
//                         );
//                       })}
//                   </div>
//                 )}
//               </div>
//             </TabsContent>
//           </Tabs>
//         </div>
//       </SheetContent>
//     </Sheet>
//   );
// }
