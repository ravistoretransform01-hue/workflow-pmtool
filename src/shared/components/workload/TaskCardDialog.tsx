import { useState, useEffect } from "react";
import {
  X,
  ChevronRight,
  ChevronLeft,
  Mail,
  Link2,
  Activity,
  Circle,
  LayoutGrid,
  Clock,
  Calendar,
  Users,
  AlertCircle,
  Star,
  Tag,
  AlignLeft,
  Pencil,
} from "lucide-react";
import { Dialog, DialogContent } from "@/shared/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/shared/components/ui/tabs";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";

import { Avatar, AvatarFallback } from "@/shared/components/ui/avatar";

import type { Task } from "@/shared/components/workload/WorkloadBoard";
import type { Status, Priority } from "@/features/cms/types";
import type { TaskComment } from "@/features/tasks/types";
import { getWorkloadColumns } from "./WorkloadColumns";
import { DialogTitle } from "@radix-ui/react-dialog";
import { tasksApi } from "@/features/tasks/tasksApi";
import { attachmentsApi } from "@/features/tasks/attachmentsApi";
import { toast } from "sonner";
import { format } from "date-fns";
import { TiptapEditor } from "./texteditor/TiptapEditor";
import { getCurrentUserId, getOrganizationId, cn, copyToClipboard } from "@/lib/utils";
import { TaskUpdates } from "./TaskUpdates/TaskUpdates";
import { renderFormattedContent } from "./TaskUpdates/utils";
import { FilePreviewModal } from "./texteditor/FilePreviewModal";
import { TruncatedTaskName } from "./TruncatedTaskName";

interface TaskCardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  boardName?: string;
  statuses?: Status[];
  priorities?: Priority[];
  members?: any[];
  onStatusChange?: (taskId: string, statusId: string) => Promise<void>;
  onPriorityChange?: (taskId: string, priorityId: string) => Promise<void>;
  onPersonChange?: (taskId: string, memberIds: string[]) => Promise<void>;
  onRatingChange?: (taskId: string, rating: number) => Promise<void>;
  onEstimatedDateChange?: (
    taskId: string,
    fromDate: string | null,
    toDate?: string | null,
  ) => Promise<void>;
  onEstimatedTimeChange?: (
    taskId: string,
    hours: string | number | null,
  ) => Promise<void>;
  boardId?: number;
  groupName?: string;
  groupColor?: string;
  onInlineEditTaskName?: (taskId: string, newName: string) => void;
  tags?: any[];
  onTagChange?: (taskId: string, tags: any[]) => void;
  onTagCreated?: (newTag: any) => void;
  onStatusCreated?: (newStatus: any) => void;
  onStatusesUpdated?: (statuses: Status[]) => void;
  onPriorityCreated?: (newPriority: any) => void;
  onPrioritiesUpdated?: (priorities: Priority[]) => void;
  onDescriptionChange?: (taskId: string, description: string) => Promise<void>;
  initialEditDescription?: boolean;
  activeTimerId?: string | null;
  timerStartTime?: number | null;
  onTimerStart?: (
    taskId: string | null,
    taskName?: string,
    trackedTimeSeconds?: number,
  ) => void;
  onTimerConflict?: (taskId: string) => void;
  onTimeUpdate?: (taskId: string, seconds: number) => void;
}

export function TaskCardDialog({
  open,
  onOpenChange,
  task,
  boardId,
  boardName = "Board",
  statuses = [],
  priorities = [],
  members = [],
  onStatusChange,
  onPriorityChange,
  onPersonChange,
  onRatingChange,
  onEstimatedDateChange,
  onEstimatedTimeChange,
  groupName,
  groupColor,
  onInlineEditTaskName,
  tags,
  onTagChange,
  onTagCreated,
  onStatusCreated,
  onStatusesUpdated,
  onPriorityCreated,
  onPrioritiesUpdated,
  onDescriptionChange,
  initialEditDescription,
  activeTimerId,
  timerStartTime,
  onTimerStart,
  onTimerConflict,
  onTimeUpdate,
}: TaskCardDialogProps) {
  const [activeTab, setActiveTab] = useState("description");
  const [openPopoverId, setOpenPopoverId] = useState<string | null>(null);
  const [expandedTasks] = useState<Record<string, boolean>>({});

  const [comments, setComments] = useState<TaskComment[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

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
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [tempDescription, setTempDescription] = useState("");
  const [editingNameSource, setEditingNameSource] = useState<
    "header" | "sidebar" | null
  >(null);
  const [tempName, setTempName] = useState("");


  useEffect(() => {
    if (task?.description) {
      setTempDescription(task.description);
    }
    if (task?.name) {
      setTempName(task.name);
    }
  }, [task?.description, task?.name]);

  useEffect(() => {
    if (open && initialEditDescription) {
      setIsEditingDescription(true);
      if (task?.description) {
        setTempDescription(task.description);
      }
    } else if (!open) {
      setIsEditingDescription(false);
    }
  }, [open, initialEditDescription, task?.description]);

  const handleSaveName = () => {
    if (tempName.trim() && displayTask?.id && onInlineEditTaskName) {
      onInlineEditTaskName(displayTask.id, tempName.trim());
      setEditingNameSource(null);
    } else {
      setEditingNameSource(null);
    }
  };

  const handleCopyLink = async () => {
    if (!task?.id) return;

    // Construct the absolute URL with the comments parameter (sidebar view)
    const url = new URL(window.location.href);
    url.searchParams.delete("task");
    url.searchParams.set("comments", task.id);

    const successful = await copyToClipboard(url.toString());
    if (successful) {
      toast.success("Task link copied to clipboard");
    } else {
      toast.error("Failed to copy link");
    }
  };

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setActiveTab("description");
      setOpenPopoverId(null);
    }
  }, [open]);

  // Close any open popovers when task changes (person updated)
  useEffect(() => {
    if (task) {
      setOpenPopoverId(null);
    }
  }, [task?.assigned_to_ids, task?.person]);

  // Fetch comments when dialog opens or task changes, then poll every 5s for real-time updates
  // Only poll while the Update tab is active to avoid unnecessary requests on other tabs
  useEffect(() => {
    if (open && task?.id) {
      // Initial fetch with loading indicator
      fetchComments();

      // Only start polling when the Update tab is visible
      if (activeTab === "dev-updates") {
        const pollInterval = setInterval(async () => {
          if (!task?.id) return;
          try {
            const fetched = await tasksApi.getComments(task.id);
            setComments(fetched);
          } catch {
            // Silently ignore poll errors
          }
        }, 5000);

        return () => clearInterval(pollInterval);
      }
    }
  }, [open, task?.id, activeTab]);

  // Load activity when dialog opens or task changes
  useEffect(() => {
    if (open && task?.id) {
      setCurrentPage(1); // Reset to first page when opening
      loadActivity(1);
    }
  }, [open, task?.id]);

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

  const fetchComments = async () => {
    if (!task?.id) return;

    setIsLoadingComments(true);
    try {
      const fetchedComments = await tasksApi.getComments(task.id);
      setComments(fetchedComments);
    } catch (error) {
      console.error("Failed to fetch comments:", error);
      toast.error("Failed to load comments");
    } finally {
      setIsLoadingComments(false);
    }
  };

  const loadActivity = async (page: number = currentPage) => {
    if (!task?.id) return;

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
        task_id: task.id,
        page: page,
        per_page: 20,
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

  const onSaveUpdate = async (content: string, isInternalParam: number) => {
    if (!task?.id || !content.trim()) return;
    setIsSubmittingComment(true);
    try {
      const finalHtml = await attachmentsApi.uploadAndReplace(content.trim());
      const createdComment = await tasksApi.createComment(task.id, {
        content: finalHtml,
        parent_id: null,
        is_internal: isInternalParam,
      });
      setComments((prev) => [...prev, createdComment]);
      toast.success(isInternalParam ? "Update added" : "Client update added");
    } catch (error) {
      console.error("Failed to create comment:", error);
      toast.error("Failed to add update");
      throw error;
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const onDeleteComment = async (commentId: string | number) => {
    if (!task?.id) return;
    try {
      await tasksApi.deleteComment(task.id, commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      toast.success("Comment deleted");
    } catch (error) {
      console.error("Failed to delete comment:", error);
      toast.error("Failed to delete comment");
    }
  };

  const onLikeComment = async (commentId: string | number) => {
    // Optimistic Update
    const originalComments = [...comments];
    setComments((prev) =>
      prev.map((c) => {
        if (String(c.id) === String(commentId)) {
          const isLiked = !!c.is_liked_by_me;
          const currentLikes = c.total_likes || 0;
          return {
            ...c,
            is_liked_by_me: !isLiked,
            total_likes: isLiked
              ? Math.max(0, currentLikes - 1)
              : currentLikes + 1,
          };
        }
        return c;
      }),
    );

    try {
      const response = await tasksApi.likeComment(commentId);
      // Sync with server response
      setComments((prev) =>
        prev.map((c) => {
          if (String(c.id) === String(commentId)) {
            return {
              ...c,
              total_likes: response.total_likes,
              is_liked_by_me: response.is_liked_by_me,
            };
          }
          return c;
        }),
      );
    } catch (error) {
      console.error("Failed to like comment:", error);
      setComments(originalComments);
      toast.error("Failed to update like status");
    }
  };

  const onToggleSOP = async (commentId: string | number) => {
    if (!task?.id) return;
    const comment = comments.find((c) => String(c.id) === String(commentId));
    if (!comment) return;

    try {
      const response = await tasksApi.toggleSOP(
        task.id,
        commentId,
        !comment.sop,
      );
      setComments((prev) =>
        prev.map((c) =>
          String(c.id) === String(commentId) ? { ...c, sop: response.sop } : c,
        ),
      );
      toast.success(response.sop ? "Added to SOP" : "Removed from SOP");
    } catch (error) {
      console.error("Failed to toggle SOP:", error);
      toast.error("Failed to update SOP status");
    }
  };

  const onShareComment = async (commentId: string | number) => {
    if (!task?.id) return;
    const url = new URL(window.location.href);
    url.searchParams.delete("task");
    url.searchParams.set("comments", String(task.id));
    url.searchParams.set("comment", String(commentId));

    const coreUrl = url.toString();
    const successful = await copyToClipboard(coreUrl);
    if (successful) {
      toast.success("Comment link copied to clipboard");
    } else {
      toast.error("Failed to copy link");
    }
  };

  const onUpdateComment = async (
    commentId: string | number,
    content: string,
  ) => {
    if (!task?.id) return;
    try {
      const finalHtml = await attachmentsApi.uploadAndReplace(content);
      const updated = await tasksApi.updateComment(task.id, commentId, {
        content: finalHtml,
      });
      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId ? { ...c, content: updated.content } : c,
        ),
      );
      toast.success("Comment updated");
    } catch (error) {
      console.error("Failed to update comment:", error);
      toast.error("Failed to update comment");
      throw error;
    }
  };

  const onSaveInlineReply = async (
    parentId: string | number,
    text: string,
    isInternalParam: number,
  ) => {
    if (!task?.id || !text.trim()) return;
    setIsSubmittingComment(true);
    try {
      const finalHtml = await attachmentsApi.uploadAndReplace(text.trim());
      const createdComment = await tasksApi.createComment(task.id, {
        content: finalHtml,
        parent_id: Number(parentId),
        is_internal: isInternalParam,
      });
      setComments((prev) => [...prev, createdComment]);
      toast.success("Reply added");
    } catch (error) {
      console.error("Failed to create reply:", error);
      toast.error("Failed to add reply");
      throw error;
    } finally {
      setIsSubmittingComment(false);
    }
  };

  if (!task) return null;

  // Use task directly - it will update in real-time from parent
  const displayTask = task;

  // Get columns with all the interactive components
  const columns = getWorkloadColumns({
    expandedTasks,
    toggleTask: () => {},
    statuses,
    priorities,
    members,
    onStatusChange,
    onPriorityChange,
    onPersonChange,
    onRatingChange,
    onEstimatedDateChange,
    onEstimatedTimeChange,
    onTagChange,
    tags,
    onTagCreated,
    onStatusCreated,
    onStatusesUpdated,
    onPriorityCreated,
    onPrioritiesUpdated,
    onInlineEditTaskName,
    openPopoverId,
    setOpenPopoverId,
    boardId,
    activeTimerId,
    timerStartTime,
    onTimerStart,
    onTimerConflict,
    onTimeUpdate,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        id="task-card-dialog-content"
        className="bg-background border-border max-w-7xl p-0 h-[85vh] max-h-[900px] flex flex-col"
        hideCloseButton
      >
        {/* Header */}
        <DialogTitle className="flex items-center justify-between px-6 py-3 border-b border-border">
          <div className="flex-1 min-w-0 mr-4">
            <div
              className={cn(
                "flex items-center gap-2 group/title min-w-0 cursor-pointer rounded px-1 -ml-1 transition-colors",
                !editingNameSource && "hover:bg-muted/50",
              )}
              onClick={() => {
                if (!editingNameSource) {
                  setTempName(displayTask?.name || "");
                  setEditingNameSource("header");
                }
              }}
            >
              {editingNameSource === "header" ? (
                <div className="w-full">
                  <Input
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    className="h-9 mb-2 text-lg font-semibold text-foreground focus-visible:ring-1 focus-visible:ring-blue-500 w-full bg-background border-border/50"
                    autoFocus
                    onBlur={handleSaveName}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === "Tab") {
                        handleSaveName();
                      } else if (e.key === "Escape") {
                        setTempName(displayTask?.name || "");
                        setEditingNameSource(null);
                      }
                    }}
                  />
                </div>
              ) : (
                <TruncatedTaskName
                  name={displayTask?.name || ""}
                  className="text-lg font-semibold text-foreground"
                />
              )}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
              in <ChevronRight className="h-3 w-3" />{" "}
              <span className="text-blue-500 font-medium">{boardName}</span>{" "}
              Board
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* <Button
              className="bg-[#0084ff] hover:bg-[#0073e6] text-white font-medium px-4 h-8 text-sm"
              onClick={() => onOpenChange(false)}
            >
              Save
            </Button> */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogTitle>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left: Fields */}
          <div className="w-[35%] border-r border-border overflow-y-auto p-4 space-y-3">
            {/* Group */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 w-32 text-muted-foreground text-[13px] font-medium">
                <Circle className="h-4 w-4" />
                <span>Group</span>
              </div>
              <div className="flex-1 bg-gray-500/10 rounded px-2.5 py-1.5 flex items-center gap-2 min-h-[36px]">
                {groupColor && (
                  <div
                    className="h-3 w-3 rounded-full shrink-0"
                    style={{ backgroundColor: groupColor }}
                  />
                )}
                <span className="text-sm text-foreground/90">{groupName}</span>
              </div>
            </div>

            {/* Name */}
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex items-center gap-2 w-32 text-muted-foreground text-[13px] font-medium">
                <LayoutGrid className="h-4 w-4" />
                <span>Name</span>
              </div>
              <div
                className={cn(
                  "flex-1 rounded min-h-[36px] flex items-center transition-colors min-w-0 overflow-hidden",
                  editingNameSource === "sidebar"
                    ? "bg-background"
                    : "bg-gray-500/10 cursor-pointer hover:bg-black/30",
                )}
                onClick={() => {
                  if (!editingNameSource) {
                    setTempName(displayTask?.name || "");
                    setEditingNameSource("sidebar");
                  }
                }}
              >
                {editingNameSource === "sidebar" ? (
                  <div className="w-full px-1">
                    <Input
                      value={tempName}
                      onChange={(e) => setTempName(e.target.value)}
                      className="h-8 text-sm focus-visible:ring-1 focus-visible:ring-blue-500 w-full"
                      autoFocus
                      onBlur={handleSaveName}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === "Tab") {
                          handleSaveName();
                        } else if (e.key === "Escape") {
                          setTempName(displayTask?.name || "");
                          setEditingNameSource(null);
                        }
                      }}
                    />
                  </div>
                ) : (
                  <div className="flex-1 min-w-0 px-2.5">
                    <TruncatedTaskName
                      name={displayTask?.name || ""}
                      className="text-sm text-foreground/90 font-medium"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Status */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 w-32 text-muted-foreground text-[13px] font-medium">
                <LayoutGrid className="h-4 w-4" />
                <span>Status</span>
              </div>
              <div className="flex-1 bg-gray-500/10 rounded px-2.5 py-1.5 min-h-[36px] flex items-center justify-center">
                {columns.find((c) => c.id === "status")?.render(displayTask)}
              </div>
            </div>

            {/* Priority */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 w-32 text-muted-foreground text-[13px] font-medium">
                <AlertCircle className="h-4 w-4" />
                <span>Priority</span>
              </div>
              <div className="flex-1 bg-gray-500/10 rounded px-2.5 py-1.5 min-h-[36px] flex items-center justify-center">
                {columns.find((c) => c.id === "priority")?.render(displayTask)}
              </div>
            </div>

            {/* Timeline */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 w-32 text-muted-foreground text-[13px] font-medium">
                <Calendar className="h-4 w-4" />
                <span>Timeline</span>
              </div>
              <div className="flex-1 bg-gray-500/10 rounded px-2.5 py-1.5 min-h-[36px] flex items-center justify-center">
                {columns
                  .find((c) => c.id === "estimatedDate")
                  ?.render(displayTask)}
              </div>
            </div>
            {/* Estimated Time */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 w-32 text-muted-foreground text-[13px] font-medium">
                <Clock className="h-4 w-4" />
                <span>Estimated Time</span>
              </div>
              <div className="flex-1 bg-gray-500/10 rounded px-2.5 py-1.5 min-h-[36px] flex items-center justify-center">
                {columns
                  .find((c) => c.id === "estimatedTime")
                  ?.render(displayTask)}
              </div>
            </div>

            {/* People */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 w-32 text-muted-foreground text-[13px] font-medium">
                <Users className="h-4 w-4" />
                <span>People</span>
              </div>
              <div className="flex-1 bg-gray-500/10 rounded px-2.5 py-1.5 min-h-[36px] flex items-center justify-center">
                {columns.find((c) => c.id === "person")?.render(displayTask)}
              </div>
            </div>

            {/* Rating */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 w-32 text-muted-foreground text-[13px] font-medium">
                <Star className="h-4 w-4" />
                <span>Rating</span>
              </div>
              <div className="flex-1 bg-gray-500/10 rounded px-2.5 py-1.5 min-h-[36px] flex items-center justify-center">
                {columns.find((c) => c.id === "rating")?.render(displayTask)}
              </div>
            </div>

            {/* Tags */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 w-32 text-muted-foreground text-[13px] font-medium">
                <Tag className="h-4 w-4" />
                <span>Tags</span>
              </div>
              <div className="flex-1 bg-gray-500/10 rounded px-2.5 py-1.5 min-h-[36px] flex items-center justify-center">
                {columns.find((c) => c.id === "tags")?.render(displayTask)}
              </div>
            </div>

            {/* Timer / Hours */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 w-32 text-muted-foreground text-[13px] font-medium">
                <Clock className="h-4 w-4" />
                <span>Hours</span>
              </div>
              <div className="flex-1 bg-gray-500/10 rounded px-2.5 py-1.5 min-h-[36px] flex items-center justify-center">
                {columns.find((c) => c.id === "timer")?.render(displayTask)}
              </div>
            </div>

            {/* Task Content Spacer */}
            <div className="flex-1" />
          </div>

          {/* Right: Updates Section */}
          <div className="w-[65%] flex flex-col overflow-hidden">
            {/* Tabs */}
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="flex flex-col h-full"
            >
              <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent px-3 py-0">
                <TabsTrigger
                  value="description"
                  className="flex items-center gap-2 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
                >
                  <AlignLeft className="h-4 w-4" />
                  Description
                </TabsTrigger>
                <TabsTrigger
                  value="dev-updates"
                  className="flex items-center gap-2 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
                >
                  <Mail className="h-4 w-4" />
                  Update
                </TabsTrigger>
                {/* <TabsTrigger
                  value="client-updates"
                  className=" flex items-center gap-2 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
                >
                  <Mail className="h-4 w-4" />
                  Client Updates
                </TabsTrigger> */}
                <TabsTrigger
                  value="activity"
                  className=" flex items-center gap-2 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
                >
                  <Activity className="h-4 w-4" />
                  Activity Log
                </TabsTrigger>
                <Button
                  variant="ghost"
                  value="copy-link"
                  className=" flex items-center gap-2 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
                  onClick={handleCopyLink}
                >
                  <Link2 className="h-4 w-4" />
                  Copy Link
                </Button>
              </TabsList>

              <TabsContent
                value="description"
                className="flex-1 overflow-auto m-0 p-0"
              >
                <div className="h-full flex flex-col">
                  <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/10">
                    <div className="flex items-center gap-2 text-foreground font-medium">
                      <AlignLeft className="h-4 w-4 text-muted-foreground" />
                      <span>Task Description</span>
                    </div>
                    {!isEditingDescription && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs gap-1.5"
                        onClick={() => {
                          setTempDescription(displayTask?.description || "");
                          setIsEditingDescription(true);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                    )}
                  </div>

                  <div className="flex-1 overflow-auto">
                    {isEditingDescription ? (
                      <div className="flex flex-col h-full">
                        <div className="flex-1 p-6">
                          <TiptapEditor
                            value={tempDescription}
                            onChange={setTempDescription}
                            placeholder="Add a detailed description..."
                            boardId={boardId}
                            key="dialog-description-editor-tab"
                          />
                        </div>
                        <div className="flex items-center justify-between gap-2 p-4 bg-muted/20 border-t border-border/50 shrink-0">
                          <div className="flex-1" />
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-9 px-4 text-sm"
                              onClick={() => setIsEditingDescription(false)}
                            >
                              Cancel
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              className="h-9 px-6 text-sm bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm"
                              onClick={async () => {

                                if (displayTask?.id && onDescriptionChange) {
                                  const finalHtml =
                                    await attachmentsApi.uploadAndReplace(
                                      tempDescription,
                                    );
                                  await onDescriptionChange(
                                    displayTask.id,
                                    finalHtml,
                                  );
                                  setIsEditingDescription(false);
                                }
                              }}
                            >
                              Save Changes
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div
                        className="p-8 min-h-full"
                        onClick={(e) => {
                          const target = e.target as HTMLElement;
                          if (target.tagName === "IMG") {
                            handleFilePreview((target as HTMLImageElement).src);
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
                                wrapper.getAttribute("data-file-name") ||
                                undefined;
                              if (href) {
                                handleFilePreview(href, fileName);
                              }
                            }
                          }
                        }}
                      >
                        {displayTask?.description &&
                        (displayTask.description.replace(/<[^>]*>/g, "").trim()
                          .length > 0 ||
                          displayTask.description.includes("<img") ||
                          displayTask.description.includes("<iframe")) ? (
                          <div
                            className="text-base text-foreground/90 leading-relaxed prose prose-invert max-w-none prose-p:my-2 [&_img]:cursor-pointer [&_img]:transition-opacity hover:[&_img]:opacity-90 [&_.file-card]:cursor-default"
                            dangerouslySetInnerHTML={{
                              __html: displayTask.description,
                            }}
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground italic text-center">
                            <AlignLeft className="h-12 w-12 mb-4 opacity-20" />
                            <p>No description provided yet.</p>
                            <p className="text-sm mt-1 not-italic opacity-70 max-w-[200px]">
                              Hit the 'Edit' button to add more details.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent
                value="dev-updates"
                className="flex-1 overflow-hidden m-0 p-0"
              >
                <TaskUpdates
                  comments={comments}
                  boardId={boardId}
                  isLoadingComments={isLoadingComments}
                  isSaving={isSubmittingComment}
                  onSaveMainUpdate={(text) => onSaveUpdate(text, 1)}
                  onDeleteComment={onDeleteComment}
                  onUpdateComment={onUpdateComment}
                  onSaveInlineReply={(parentId, text) =>
                    onSaveInlineReply(parentId, text, 1)
                  }
                  onLikeComment={onLikeComment}
                  onShareComment={onShareComment}
                  onToggleSOP={onToggleSOP}
                  onFilePreview={handleFilePreview}
                  layout="dialog"
                  isInternal={1}
                />
              </TabsContent>

              <TabsContent
                value="client-updates"
                className="flex-1 overflow-hidden m-0 p-0"
              >
                <TaskUpdates
                  comments={comments}
                  boardId={boardId}
                  isLoadingComments={isLoadingComments}
                  isSaving={isSubmittingComment}
                  onSaveMainUpdate={(text) => onSaveUpdate(text, 0)}
                  onDeleteComment={onDeleteComment}
                  onUpdateComment={onUpdateComment}
                  onSaveInlineReply={(parentId, text) =>
                    onSaveInlineReply(parentId, text, 0)
                  }
                  onLikeComment={onLikeComment}
                  onShareComment={onShareComment}
                  onToggleSOP={onToggleSOP}
                  onFilePreview={handleFilePreview}
                  layout="dialog"
                  isInternal={0}
                />
              </TabsContent>

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
                          className="flex gap-4 group relative cursor-default"
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
                                    className="mt-1 break-words [&_.file-card-wrapper]:max-w-full [&_.pdf-card-wrapper]:max-w-full [&_.file-card-wrapper]:my-1 [&_.pdf-card-wrapper]:my-1 scale-90 origin-left [&_.file-card-content]:bg-card [&_.pdf-card-content]:bg-card [&_.file-card-content]:border-border [&_.pdf-card-content]:border-border [&_.file-card-content]:shadow-sm [&_.pdf-card-content]:shadow-sm [&_.file-card-preview-btn]:bg-background [&_.pdf-card-preview-btn]:bg-background [&_.file-card-open-btn]:bg-background [&_.pdf-card-open-btn]:bg-background"
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
          </div>
        </div>
      </DialogContent>
      <FilePreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        src={previewSrc || ""}
        fileName={previewFileName}
      />
    </Dialog>
  );
}
