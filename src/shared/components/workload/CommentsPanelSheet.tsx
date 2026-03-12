import { useState, useEffect } from "react";
import { format } from "date-fns";
import { parseApiDateTime } from "@/lib/utils";
import { TaskUpdates } from "./TaskUpdates/TaskUpdates";

import { renderFormattedContent } from "./TaskUpdates/utils";
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

import { FilePreviewModal } from "@/shared/components/workload/texteditor/FilePreviewModal";
import { TruncatedTaskName } from "./TruncatedTaskName";
import {
  Activity,
  Home,
  RefreshCcw,
  Pencil,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { TaskComment } from "@/features/tasks/types";
import { tasksApi } from "@/features/tasks/tasksApi";
import { getCurrentUserId, getOrganizationId } from "@/lib/utils";

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
  onTaskButtonClick?: () => void;
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
  onTaskButtonClick,
  isSaving,
  boardId,
}: CommentsPanelSheetProps) {
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange} modal={false}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-4xl p-0"
        showOverlay={false}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <div className="flex flex-col h-full">
          <SheetHeader className="px-6 py-4 border-b border-border">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-2xl font-semibold max-w-[calc(100%-48px)]">
                {/* <TruncatedTaskName
                  name={taskName || "Task Details"}
                  className="w-full"
                  side="bottom"
                /> */}
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
                  Update
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
              className="flex-1 mt-0 overflow-hidden min-h-0 data-[state=active]:flex data-[state=active]:flex-col data-[state=inactive]:hidden"
            >
              <TaskUpdates
                boardId={boardId}
                comments={comments}
                isLoadingComments={isLoadingComments}
                layout="sidebar"
                onDeleteComment={onDeleteComment}
                onUpdateComment={onUpdateComment}
                onSaveInlineReply={onSaveInlineReply}
                onSaveMainUpdate={onSaveUpdate}
                isSaving={isSaving}
                onFilePreview={handleFilePreview}
                mainUpdateText={updateText}
                onMainUpdateTextChange={onUpdateTextChange}
              />
            </TabsContent>

            {/* activity log content */}
            <TabsContent
              value="activity"
              className="flex-1 mt-0 overflow-hidden min-h-0 data-[state=active]:flex data-[state=active]:flex-col data-[state=inactive]:hidden"
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
                        className="flex gap-4 pb-4 border-b border-border/30 last:border-0 last:pb-0 group cursor-default"
                        onClick={(e: React.MouseEvent) => {
                          const target = e.target as HTMLElement;
                          if (target.tagName === "IMG") {
                            handleFilePreview((target as HTMLImageElement).src);
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
                                handleFilePreview(href, fileName || "Document");
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
