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
import { toast } from "sonner";
import { format } from "date-fns";
import { TiptapEditor } from "./texteditor/TiptapEditor";
import { getCurrentUserId, getOrganizationId, cn } from "@/lib/utils";
import { TaskUpdates } from "./TaskUpdates/TaskUpdates";
import { renderFormattedContent } from "./TaskUpdates/utils";
import { FilePreviewModal } from "./texteditor/FilePreviewModal";

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
  onPriorityCreated?: (newPriority: any) => void;
  onDescriptionChange?: (taskId: string, description: string) => Promise<void>;
  initialEditDescription?: boolean;
  activeTimerId?: string | null;
  timerStartTime?: number | null;
  onTimerStart?: (taskId: string | null) => void;
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
  onPriorityCreated,
  onDescriptionChange,
  initialEditDescription,
  activeTimerId,
  timerStartTime,
  onTimerStart,
  onTimerConflict,
  onTimeUpdate,
}: TaskCardDialogProps) {
  const [activeTab, setActiveTab] = useState("dev-updates");
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
  const [isEditingName, setIsEditingName] = useState(false);
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
      setIsEditingName(false);
    } else {
      setIsEditingName(false);
    }
  };

  const handleCopyLink = () => {
    if (!task?.id) return;

    // Construct the absolute URL with the task parameter
    const url = new URL(window.location.href);
    url.searchParams.set("task", task.id);

    // Copy to clipboard
    navigator.clipboard
      .writeText(url.toString())
      .then(() => {
        toast.success("Task link copied to clipboard");
      })
      .catch((err) => {
        console.error("Failed to copy link:", err);
        toast.error("Failed to copy link");
      });
  };

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setActiveTab("dev-updates");
      setOpenPopoverId(null);
    }
  }, [open]);

  // Close any open popovers when task changes (person updated)
  useEffect(() => {
    if (task) {
      setOpenPopoverId(null);
    }
  }, [task?.assigned_to_ids, task?.person]);

  // Fetch comments when dialog opens or task changes
  useEffect(() => {
    if (open && task?.id) {
      fetchComments();
    }
  }, [open, task?.id]);

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
      const createdComment = await tasksApi.createComment(task.id, {
        content: content.trim(),
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

  const onUpdateComment = async (
    commentId: string | number,
    content: string,
  ) => {
    if (!task?.id) return;
    try {
      const updated = await tasksApi.updateComment(task.id, commentId, {
        content,
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
      const createdComment = await tasksApi.createComment(task.id, {
        content: text.trim(),
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
    onPriorityCreated,
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
        className="bg-background border-border max-w-7xl p-0 h-[85vh] max-h-[900px] flex flex-col"
        hideCloseButton
      >
        {/* Header */}
        <DialogTitle className="flex items-center justify-between px-6 py-3 border-b border-border">
          <div className="flex-1 min-w-0 mr-4">
            <div className="flex items-center gap-2 group/title">
              <h2 className="text-lg font-semibold text-foreground truncate">
                {displayTask?.name}
              </h2>
              <Button
                variant="secondary"
                size="icon"
                className="h-7 w-7"
                onClick={handleCopyLink}
                title="Copy task link"
              >
                <Link2 className="h-4 w-4 text-muted-foreground" />
              </Button>
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
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 w-32 text-muted-foreground text-[13px] font-medium">
                <LayoutGrid className="h-4 w-4" />
                <span>Name</span>
              </div>
              <div
                className={cn(
                  "flex-1 rounded min-h-[36px] flex items-center transition-colors",
                  isEditingName
                    ? "bg-background"
                    : "bg-gray-500/10 cursor-pointer hover:bg-black/30",
                )}
                onClick={() => {
                  if (!isEditingName) {
                    setTempName(displayTask?.name || "");
                    setIsEditingName(true);
                  }
                }}
              >
                {isEditingName ? (
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
                          setIsEditingName(false);
                        }
                      }}
                    />
                  </div>
                ) : (
                  <span className="text-sm text-foreground/90 truncate font-medium px-2.5">
                    {displayTask?.name}
                  </span>
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

            {/* Description */}
            <div className="pt-2 border-t border-border/50">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-muted-foreground text-[13px] font-medium">
                  <AlignLeft className="h-4 w-4" />
                  <span>Description</span>
                </div>
                {!isEditingDescription && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setTempDescription(displayTask?.description || "");
                      setIsEditingDescription(true);
                    }}
                  >
                    <Pencil className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                )}
              </div>
              <div className="bg-gray-500/10 rounded overflow-hidden min-h-[100px] border border-transparent hover:border-border/50 transition-colors">
                {isEditingDescription ? (
                  <div className="flex flex-col">
                    <TiptapEditor
                      value={tempDescription}
                      onChange={setTempDescription}
                      placeholder="Add a detailed description..."
                      boardId={boardId}
                      key="dialog-description-editor"
                    />
                    <div className="flex items-center justify-end gap-2 p-2 bg-muted/20 border-t border-border/50">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => setIsEditingDescription(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        className="h-8 px-4 text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium"
                        onClick={async () => {
                          if (displayTask?.id && onDescriptionChange) {
                            await onDescriptionChange(
                              displayTask.id,
                              tempDescription,
                            );
                            setIsEditingDescription(false);
                          }
                        }}
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div
                    className="p-4 cursor-pointer"
                    onClick={() => {
                      setTempDescription(displayTask?.description || "");
                      setIsEditingDescription(true);
                    }}
                  >
                    {displayTask?.description ? (
                      <div
                        className="text-sm text-foreground/90 leading-relaxed prose prose-sm prose-invert max-w-none [&_p]:m-0"
                        dangerouslySetInnerHTML={{
                          __html: displayTask.description,
                        }}
                      />
                    ) : (
                      <span className="text-sm text-muted-foreground italic">
                        No description provided. Click to add one...
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
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
                  value="dev-updates"
                  className="flex items-center gap-2 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
                >
                  <Mail className="h-4 w-4" />
                  Dev Updates
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
                          className="flex gap-4 group relative"
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
