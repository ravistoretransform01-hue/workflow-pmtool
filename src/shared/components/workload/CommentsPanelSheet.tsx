import { useState, useEffect } from "react";
import { format } from "date-fns";
import { parseApiDateTime, cn } from "@/lib/utils";
import { TaskUpdates } from "./TaskUpdates/TaskUpdates";

import { renderFormattedContent } from "./TaskUpdates/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/shared/components/ui/sheet";
import { Input } from "@/shared/components/ui/input";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/shared/components/ui/tabs";
import { Button } from "@/shared/components/ui/button";
import { Avatar, AvatarFallback } from "@/shared/components/ui/avatar";

import { FilePreviewModal } from "@/shared/components/workload/texteditor/FilePreviewModal";
// import { TruncatedTaskName } from "./TruncatedTaskName";
import {
  Activity,
  Home,
  RefreshCcw,
  Pencil,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import type { TaskComment } from "@/features/tasks/types";
import { tasksApi } from "@/features/tasks/tasksApi";
import { getCurrentUserId, getOrganizationId, isClientRole } from "@/lib/utils";
import { getMembers } from "@/features/cms/cmsStorage";

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
  onDeleteComment: (commentId: string | number) => void | Promise<void>;
  onUpdateComment: (
    commentId: string | number,
    content: string,
  ) => void | Promise<void>;
  onSaveInlineReply: (
    parentId: string | number,
    replyText: string,
  ) => void | Promise<void>;
  onLikeComment: (commentId: string | number) => void | Promise<void>;
  onShareComment: (commentId: string | number) => void | Promise<void>;
  onToggleSOP: (commentId: string | number) => void | Promise<void>;
  onToggleIsClient: (commentId: string | number) => void | Promise<void>;
  onTaskButtonClick?: () => void;
  onInlineEditTaskName?: (taskId: string, newName: string) => void;
  onHighlightComplete?: () => void;
  isSaving?: boolean;
  boardId?: string;
}

/**
 * Individual comment item component that renders recursively for nested replies
 */

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
  onLikeComment,
  onShareComment,
  onToggleSOP,
  onToggleIsClient,
  onTaskButtonClick,
  onInlineEditTaskName,
  onHighlightComplete,
  isSaving,
  boardId,
}: CommentsPanelSheetProps) {
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [previewFileName, setPreviewFileName] = useState<string | undefined>(
    undefined,
  );
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [activeCommentsTab, setActiveCommentsTab] = useState("updates");
  const [clientComments, setClientComments] = useState<TaskComment[]>([]);
  const [isLoadingClientComments, setIsLoadingClientComments] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [isLoadingRole, setIsLoadingRole] = useState(true);

  useEffect(() => {
    if (open && boardId) {
      setIsLoadingRole(true);
      const loadUserRole = async () => {
        try {
          const organizationId = getOrganizationId() || 2;
          const currentUserId = getCurrentUserId();
          if (!currentUserId) {
            setIsLoadingRole(false);
            return;
          }

          const cmsMembers = await getMembers({
            organization_id: organizationId,
            board_id: Number(boardId),
            user_id: currentUserId,
          });

          const currentMember = cmsMembers.find(
            (m) => String(m.user_id) === String(currentUserId),
          );

          if (currentMember) {
            setCurrentUserRole(currentMember.board_role_label || null);
          }
        } catch (error) {
          console.error("Failed to load user role:", error);
        } finally {
          setIsLoadingRole(false);
        }
      };

      loadUserRole();
    } else if (!open) {
      setIsLoadingRole(true);
      setCurrentUserRole(null);
    }
  }, [open, boardId]);

  const isClient = isClientRole(currentUserRole);

  useEffect(() => {
    if (currentUserRole) {
      if (isClientRole(currentUserRole)) {
        setActiveCommentsTab("client-updates");
      } else {
        setActiveCommentsTab("updates");
      }
    }
  }, [currentUserRole]);

  useEffect(() => {
    if (open && activeCommentsTab === "client-updates" && taskId) {
      fetchClientComments();
    }
  }, [open, activeCommentsTab, taskId]);

  useEffect(() => {
    // Clear client comments when task changes or panel closes or standard comments change
    // to ensure they stay somewhat in sync or at least don't show stale data
    setClientComments([]);
  }, [taskId, open]);

  const fetchClientComments = async () => {
    if (!taskId) return;
    setIsLoadingClientComments(true);
    try {
      const fetched = await tasksApi.getClientComments(taskId);
      setClientComments(fetched);
    } catch (error) {
      console.error("Failed to fetch client comments:", error);
    } finally {
      setIsLoadingClientComments(false);
    }
  };

  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState("");

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

  const handleSaveName = () => {
    if (tempName.trim() && taskId && onInlineEditTaskName) {
      onInlineEditTaskName(taskId, tempName.trim());
      setIsEditingName(false);
    } else {
      setIsEditingName(false);
    }
  };

  const [sheetWidth, setSheetWidth] = useState(() =>
    typeof window !== "undefined"
      ? Math.min(896, window.innerWidth * 0.99)
      : 896,
  );
  const [isResizing, setIsResizing] = useState(false);

  // Update sheet width when window resizes to prevent it going off-screen
  useEffect(() => {
    const handleWindowResize = () => {
      setSheetWidth((prev) => {
        const maxAllowed = window.innerWidth * 0.99;
        if (window.innerWidth > 800) {
          // On desktop, ensure minimum width is 800px, but don't exceed maxAllowed
          return Math.min(Math.max(prev, 800), maxAllowed);
        } else {
          // On mobile, take up full allowed width
          return maxAllowed;
        }
      });
    };
    window.addEventListener("resize", handleWindowResize);
    return () => window.removeEventListener("resize", handleWindowResize);
  }, []);

  const startResizing = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  const stopResizing = () => {
    setIsResizing(false);
  };

  const resize = (e: MouseEvent) => {
    if (isResizing) {
      const minW = Math.min(800, window.innerWidth * 0.9);
      const newWidth = Math.min(
        Math.max(minW, window.innerWidth - e.clientX),
        window.innerWidth * 0.99,
      );
      setSheetWidth(newWidth);
    }
  };

  useEffect(() => {
    if (isResizing) {
      window.addEventListener("mousemove", resize);
      window.addEventListener("mouseup", stopResizing);
    } else {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    }
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [isResizing]);

  const handleDoubleClick = () => {
    const minWidth = Math.min(800, window.innerWidth * 0.9);
    const maxWidth = window.innerWidth * 0.99;

    // Toggle logic: If at min -> go to max. Otherwise (if > min or at max) -> go to min.
    if (Math.abs(sheetWidth - minWidth) < 10) {
      setSheetWidth(maxWidth);
    } else {
      setSheetWidth(minWidth);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange} modal={false}>
      <SheetContent
        id="comments-sheet-content"
        side="right"
        className={cn(
          "p-0 transition-all duration-300",
          isResizing ? "select-none transition-none" : "",
        )}
        style={{ width: `${sheetWidth}px`, maxWidth: "100vw" }}
        showOverlay={false}
        hideCloseButton={true}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        {/* Resize Handle */}
        <div
          className={cn(
            "group absolute left-0 top-0 bottom-0 w-4 cursor-col-resize z-50 flex items-center justify-center transition-colors hover:bg-blue-500/10",
            isResizing ? "bg-blue-500/20 w-3" : "",
          )}
          onMouseDown={startResizing}
          onDoubleClick={handleDoubleClick}
        >
          <div
            className={cn(
              "w-1.5 h-16 rounded-full bg-blue-500/50 opacity-0 transition-all group-hover:opacity-100 group-hover:h-20",
              isResizing ? "opacity-100 bg-blue-500 h-32" : "",
            )}
          />
        </div>
        <div className="flex flex-col h-full w-full overflow-hidden bg-background">
          <SheetHeader className="px-6 py-4 border-b border-border text-left">
            <div className="flex items-center gap-6">
              <SheetClose className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary">
                <X className="h-6 w-6" />
                <span className="sr-only">Close</span>
              </SheetClose>
              <SheetTitle className="text-2xl font-normal flex-1 overflow-hidden text-left">
                {isEditingName ? (
                  <Input
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    className="h-9 m-1 w-full text-2xl font-semibold text-foreground focus-visible:ring-1 focus-visible:ring-blue-500 bg-background border-border/50 pr-4"
                    autoFocus
                    onBlur={handleSaveName}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === "Tab") {
                        handleSaveName();
                      } else if (e.key === "Escape") {
                        setTempName(taskName || "");
                        setIsEditingName(false);
                      }
                    }}
                  />
                ) : (
                  <div
                    className={cn(
                      "cursor-pointer hover:bg-muted/50 rounded px-1 -ml-1 transition-colors line-clamp-2",
                    )}
                    onClick={() => {
                      setTempName(taskName || "");
                      setIsEditingName(true);
                    }}
                  >
                    {taskName || "Task Details"}
                  </div>
                )}
              </SheetTitle>
              <div className="hidden flex items-center gap-4">
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </SheetHeader>

          <Tabs
            value={activeCommentsTab}
            onValueChange={setActiveCommentsTab}
            className="flex-1 flex flex-col min-h-0"
          >
            <div className="px-6 border-b border-border">
              <TabsList className="w-full justify-start h-12 bg-transparent p-0">
                {isLoadingRole ? (
                  <div className="flex gap-4 items-center h-full">
                    <div className="h-4 w-20 bg-muted animate-pulse rounded" />
                    <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                  </div>
                ) : (
                  <>
                    {!isClient && (
                      <TabsTrigger
                        value="updates"
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                      >
                        <Home className="h-4 w-4 mr-2" />
                        Update
                      </TabsTrigger>
                    )}

                    <TabsTrigger
                      value="client-updates"
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                    >
                      <RefreshCcw className="h-4 w-4 mr-2" />
                      Client Updates
                    </TabsTrigger>

                    {!isClient && (
                      <Button
                        variant="ghost"
                        className="hidden rounded-none border-b-2 border-transparent hover:bg-transparent h-auto py-3 px-4"
                        onClick={onTaskButtonClick}
                      >
                        <Pencil className="h-4 w-4 mr-2" />
                        Task
                      </Button>
                    )}

                    {!isClient && (
                      <TabsTrigger
                        value="activity"
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                      >
                        <Activity className="h-4 w-4 mr-2" />
                        Activity Log
                      </TabsTrigger>
                    )}
                  </>
                )}
              </TabsList>
            </div>

            {isLoadingRole ? (
              <div className="flex-1 flex items-center justify-center p-8">
                <div className="flex flex-col items-center gap-2">
                  <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-muted-foreground animate-pulse">
                    Loading details...
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* comments content */}
                {!isClient && (
                  <TabsContent
                    value="updates"
                    className="flex-1 mt-0 overflow-hidden min-h-0 data-[state=active]:flex data-[state=active]:flex-col data-[state=inactive]:hidden"
                  >
                    <div className="w-full max-w-[800px] mx-auto flex-1 flex flex-col min-h-0">
                      <TaskUpdates
                        boardId={boardId}
                        comments={comments}
                        isLoadingComments={isLoadingComments}
                        layout="sidebar"
                        onDeleteComment={onDeleteComment}
                        onUpdateComment={onUpdateComment}
                        onSaveInlineReply={onSaveInlineReply}
                        onLikeComment={onLikeComment}
                        onShareComment={onShareComment}
                        onToggleSOP={onToggleSOP}
                        onToggleIsClient={onToggleIsClient}
                        onSaveMainUpdate={onSaveUpdate}
                        onHighlightComplete={onHighlightComplete}
                        isSaving={isSaving}
                        onFilePreview={handleFilePreview}
                        mainUpdateText={updateText}
                        onMainUpdateTextChange={onUpdateTextChange}
                        isClient={isClient}
                      />
                    </div>
                  </TabsContent>
                )}

                {/* client updates content */}
                <TabsContent
                  value="client-updates"
                  className="flex-1 mt-0 overflow-hidden min-h-0 data-[state=active]:flex data-[state=active]:flex-col data-[state=inactive]:hidden"
                >
                  <div className="w-full max-w-[800px] mx-auto flex-1 flex flex-col min-h-0">
                    <TaskUpdates
                      boardId={boardId}
                      comments={clientComments}
                      isLoadingComments={isLoadingClientComments}
                      layout="sidebar"
                      onDeleteComment={async (id) => {
                        await onDeleteComment(id);
                        fetchClientComments();
                      }}
                      onUpdateComment={async (id, content) => {
                        await onUpdateComment(id, content);
                        fetchClientComments();
                      }}
                      onSaveInlineReply={async (pid, txt) => {
                        await onSaveInlineReply(pid, txt);
                        fetchClientComments();
                      }}
                      onLikeComment={async (id) => {
                        await onLikeComment(id);
                        fetchClientComments();
                      }}
                      onShareComment={onShareComment}
                      onToggleSOP={async (id) => {
                        await onToggleSOP(id);
                        fetchClientComments();
                      }}
                      onToggleIsClient={async (id) => {
                        await onToggleIsClient(id);
                        fetchClientComments();
                      }}
                      onSaveMainUpdate={async (_text) => {
                        // The parent onSaveUpdate uses the internal updateText state from Board
                        // but it will be cleared after successful save.
                        await onSaveUpdate();
                        fetchClientComments();
                      }}
                      onHighlightComplete={onHighlightComplete}
                      noNesting={true}
                      hideEditor={false}
                      isSaving={isSaving}
                      onFilePreview={handleFilePreview}
                      mainUpdateText={updateText}
                      onMainUpdateTextChange={onUpdateTextChange}
                      isClient={isClient}
                      isClientUpdatesTab={true}
                    />
                  </div>
                </TabsContent>

                {/* activity log content */}
                {!isClient && (
                  <TabsContent
                    value="activity"
                    className="flex-1 mt-0 overflow-hidden min-h-0 data-[state=active]:flex data-[state=active]:flex-col data-[state=inactive]:hidden"
                  >
                    <div className="w-full max-w-[800px] mx-auto flex-1 flex flex-col min-h-0">
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
                                className="flex gap-4 pb-4 border-b border-border/30 last:border-0 last:pb-0 group cursor-default"
                                onClick={(e: React.MouseEvent) => {
                                  const target = e.target as HTMLElement;
                                  if (target.tagName === "IMG") {
                                    handleFilePreview(
                                      (target as HTMLImageElement).src,
                                    );
                                    return;
                                  }

                                  // Handle File/PDF Card Preview button
                                  const previewBtn =
                                    target.closest(".file-card-preview-btn") ||
                                    target.closest(".pdf-card-preview-btn");
                                  if (previewBtn) {
                                    const wrapper =
                                      target.closest("[data-type='file-card']") ||
                                      target.closest("[data-type='pdf-card']");
                                    if (wrapper) {
                                      const href = wrapper.getAttribute("data-href");
                                      const fileName =
                                        wrapper.getAttribute("data-filename");
                                      if (href) {
                                        handleFilePreview(
                                          href,
                                          fileName || "Document",
                                        );
                                        return;
                                      }
                                    }
                                  }

                                  const anchor = target.closest("a");
                                  if (
                                    anchor &&
                                    !anchor.classList.contains(
                                      "file-card-open-btn",
                                    ) &&
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
                                    handleFilePreview(
                                      anchor.href,
                                      anchor.textContent || "Document",
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
                                            parseApiDateTime(activity.created_at) ||
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
                                  {activity.old_value &&
                                    activity.old_value.trim() && (
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
                                          className="mt-1 break-words [&_.file-card-wrapper]:max-w-full [&_.pdf-card-wrapper]:max-w-full [&_.file-card-wrapper]:my-1 [&_.pdf-card-wrapper]:my-1 scale-90 origin-left [&_.file-card-content]:bg-card [&_.pdf-card-content]:bg-card [&_.file-card-content]:border-border [&_.pdf-card-content]:border-border [&_.file-card-content]:shadow-sm [&_.pdf-card-content]:shadow-sm [&_.file-card-preview-btn]:bg-background [&_.pdf-card-preview-btn]:bg-background [&_.file-card-open-btn]:bg-background [&_.pdf-card-open-btn]:bg-background"
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
                    </div>
                  </TabsContent>
                )}
              </>
            )}
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
