import { useState, useEffect } from "react";
import {
  X,
  ChevronRight,
  ChevronLeft,
  Mail,
  MessageSquare,
  AtSign,
  Paperclip,
  Smile,
  MoreHorizontal,
  Trash2,
  Pencil,
  MessageCirclePlus,
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
} from "lucide-react";
import { Dialog, DialogContent } from "@/shared/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/shared/components/ui/tabs";
import { Button } from "@/shared/components/ui/button";
// import { Textarea } from "@/shared/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/shared/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import type { Task } from "@/shared/components/workload/WorkloadBoard";
import type { Status, Priority } from "@/features/cms/types";
import type { TaskComment } from "@/features/tasks/types";
import { getWorkloadColumns } from "./WorkloadColumns";
import { DialogTitle } from "@radix-ui/react-dialog";
import { tasksApi } from "@/features/tasks/tasksApi";
import { toast } from "sonner";
import { format } from "date-fns";
import { TiptapEditor } from "./texteditor/TiptapEditor";
import { getCurrentUserId, getOrganizationId } from "@/lib/utils";

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
}: TaskCardDialogProps) {
  const [activeTab, setActiveTab] = useState("dev-updates");
  const [openPopoverId, setOpenPopoverId] = useState<string | null>(null);
  const [expandedTasks] = useState<Record<string, boolean>>({});

  const [comments, setComments] = useState<TaskComment[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [inlineReplyId, setInlineReplyId] = useState<string | number | null>(
    null,
  );
  const [inlineReplyText, setInlineReplyText] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<
    string | number | null
  >(null);
  const [editCommentText, setEditCommentText] = useState("");
  const [expandedThreads, setExpandedThreads] = useState<
    Record<string | number, boolean>
  >({});

  // Activity state
  const [activityData, setActivityData] = useState<any[]>([]);
  const [isLoadingActivity, setIsLoadingActivity] = useState(false);
  const [activityMeta, setActivityMeta] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingPage, setIsLoadingPage] = useState(false);

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

  const handleSubmitComment = async () => {
    if (!task?.id || !newComment.trim()) return;

    setIsSubmittingComment(true);
    try {
      const createdComment = await tasksApi.createComment(task.id, {
        content: newComment.trim(),
        parent_id: null,
        is_internal: 1, // Dev updates are internal
      });

      setComments((prev) => [...prev, createdComment]);
      setNewComment("");
      toast.success("Comment added");
    } catch (error) {
      console.error("Failed to create comment:", error);
      toast.error("Failed to add comment");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleSubmitClientComment = async () => {
    if (!task?.id || !newComment.trim()) return;

    setIsSubmittingComment(true);
    try {
      const createdComment = await tasksApi.createComment(task.id, {
        content: newComment.trim(),
        parent_id: null,
        is_internal: 0, // Client updates are not internal
      });

      setComments((prev) => [...prev, createdComment]);
      setNewComment("");
      toast.success("Client update added");
    } catch (error) {
      console.error("Failed to create client comment:", error);
      toast.error("Failed to add client update");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string | number) => {
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

  const handleUpdateComment = async (
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
      setEditingCommentId(null);
      toast.success("Comment updated");
    } catch (error) {
      console.error("Failed to update comment:", error);
      toast.error("Failed to update comment");
    }
  };

  const handleSaveInlineReply = async (parentId: string | number) => {
    if (!task?.id || !inlineReplyText.trim()) return;

    setIsSubmittingComment(true);
    try {
      const createdComment = await tasksApi.createComment(task.id, {
        content: inlineReplyText.trim(),
        parent_id: Number(parentId),
        is_internal: activeTab === "dev-updates" ? 1 : 0,
      });

      setComments((prev) => [...prev, createdComment]);
      setInlineReplyText("");
      setInlineReplyId(null);
      toast.success("Reply added");
    } catch (error) {
      console.error("Failed to create reply:", error);
      toast.error("Failed to add reply");
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
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="bg-card border-border max-w-5xl p-0 h-[85vh] max-h-[800px] flex flex-col"
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
            <Button
              className="bg-[#0084ff] hover:bg-[#0073e6] text-white font-medium px-4 h-8 text-sm"
              onClick={() => onOpenChange(false)}
            >
              Save
            </Button>
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
          <div className="w-1/2 border-r border-border overflow-y-auto p-4 space-y-3">
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
                className="flex-1 bg-gray-500/10 rounded px-2.5 py-1.5 min-h-[36px] flex items-center cursor-pointer hover:bg-black/30 transition-colors"
                onClick={() => {
                  onOpenChange(false); // Close dialog to edit on board? No, mockup shows it here.
                  // For now keep it as display, but stylised.
                }}
              >
                <span className="text-sm text-foreground/90 truncate font-medium">
                  {displayTask?.name}
                </span>
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
              <div className="flex items-center gap-2 mb-2 text-muted-foreground text-[13px] font-medium">
                <AlignLeft className="h-4 w-4" />
                <span>Description</span>
              </div>
              <div className="bg-gray-500/10 rounded p-3 min-h-[80px]">
                {displayTask?.description ? (
                  <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">
                    {displayTask.description}
                  </p>
                ) : (
                  <span className="text-sm text-muted-foreground italic">
                    Add a description...
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Updates Section */}
          <div className="w-1/2 flex flex-col overflow-hidden">
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
                <div className="flex flex-col h-full">
                  {/* Comments List */}
                  <div className="flex-1 overflow-y-auto p-3 space-y-4">
                    {isLoadingComments ? (
                      <div className="text-center text-sm text-muted-foreground py-4">
                        Loading comments...
                      </div>
                    ) : comments.filter((c) => !c.parent_id).length === 0 ? (
                      <div className="text-center text-sm text-muted-foreground py-4">
                        No updates yet. Be the first to add one!
                      </div>
                    ) : (
                      comments
                        .filter((c) => !c.parent_id)
                        .sort(
                          (a, b) =>
                            new Date(b.created_at).getTime() -
                            new Date(a.created_at).getTime(),
                        )
                        .map((comment) => {
                          const getDescendants = (
                            parentId: string | number,
                          ): TaskComment[] => {
                            const directChildren = comments.filter(
                              (c) => String(c.parent_id) === String(parentId),
                            );
                            let allDescendants = [...directChildren];
                            directChildren.forEach((child) => {
                              allDescendants = [
                                ...allDescendants,
                                ...getDescendants(child.id),
                              ];
                            });
                            return allDescendants;
                          };

                          const allThreadComments = getDescendants(
                            comment.id,
                          ).sort(
                            (a, b) =>
                              new Date(a.created_at).getTime() -
                              new Date(b.created_at).getTime(),
                          );

                          const isExpanded = expandedThreads[comment.id];
                          const visibleReplies = isExpanded
                            ? allThreadComments
                            : allThreadComments.length > 2
                              ? [
                                  allThreadComments[
                                    allThreadComments.length - 1
                                  ],
                                ]
                              : allThreadComments;
                          const hiddenCount =
                            allThreadComments.length - visibleReplies.length;

                          const isReplyingInThisThread =
                            inlineReplyId &&
                            (String(inlineReplyId) === String(comment.id) ||
                              allThreadComments.some(
                                (rtc) =>
                                  String(rtc.id) === String(inlineReplyId),
                              ));

                          return (
                            <div
                              key={comment.id}
                              className="space-y-3 relative"
                            >
                              {/* Main Comment */}
                              <div className="flex gap-3 group relative">
                                <Avatar className="h-8 w-8 shrink-0 border border-border/50">
                                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                                    {comment.user?.name
                                      ?.charAt(0)
                                      .toUpperCase() || "U"}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 space-y-1 min-w-0">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-semibold">
                                        {comment.user?.name || "Unknown User"}
                                      </span>
                                      <span className="text-[10px] text-muted-foreground">
                                        {comment.created_at
                                          ? format(
                                              new Date(comment.created_at),
                                              "MMM d, h:mm a",
                                            )
                                          : ""}
                                      </span>
                                    </div>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                                        >
                                          <MoreHorizontal className="h-3 w-3" />
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
                                          onClick={() => {
                                            setEditingCommentId(comment.id);
                                            setEditCommentText(comment.content);
                                          }}
                                        >
                                          Edit
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          className="text-destructive"
                                          onClick={() =>
                                            handleDeleteComment(comment.id)
                                          }
                                        >
                                          <Trash2 className="h-3 w-3 mr-2" />
                                          Delete
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                  {editingCommentId === comment.id ? (
                                    <div className="space-y-2 pt-1">
                                      <div className="border border-input rounded-md min-h-[100px]">
                                        <TiptapEditor
                                          value={editCommentText}
                                          onChange={setEditCommentText}
                                          placeholder="Edit comment..."
                                          boardId={boardId}
                                        />
                                      </div>
                                      <div className="flex gap-2">
                                        <Button
                                          size="sm"
                                          className="h-7 text-xs"
                                          onClick={() =>
                                            handleUpdateComment(
                                              comment.id,
                                              editCommentText,
                                            )
                                          }
                                        >
                                          Save
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-7 text-xs"
                                          onClick={() =>
                                            setEditingCommentId(null)
                                          }
                                        >
                                          Cancel
                                        </Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <>
                                      <div
                                        className="text-sm text-foreground/90 whitespace-normal break-words [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_h1]:text-xl [&_h1]:font-bold [&_h2]:text-lg [&_h2]:font-bold [&_h3]:text-md [&_h3]:font-bold [&_blockquote]:border-l-4 [&_blockquote]:border-primary/50 [&_blockquote]:pl-4 [&_blockquote]:italic [&_code]:bg-muted [&_code]:px-1 [&_code]:rounded [&_pre]:bg-muted [&_pre]:p-2 [&_pre]:rounded [&_a]:text-primary [&_a]:underline"
                                        dangerouslySetInnerHTML={{
                                          __html: comment.content,
                                        }}
                                      />
                                      <div className="flex items-center gap-3 pt-0.5">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 px-1.5 -ml-1.5 text-[11px] text-muted-foreground hover:text-primary"
                                          onClick={() => {
                                            setInlineReplyId(comment.id);
                                            setInlineReplyText("");
                                          }}
                                        >
                                          <MessageCirclePlus className="h-3 w-3 mr-1" />
                                          Reply
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 px-1.5 text-[11px] text-muted-foreground hover:text-primary"
                                          onClick={() => {
                                            setEditingCommentId(comment.id);
                                            setEditCommentText(comment.content);
                                          }}
                                        >
                                          <Pencil className="h-3 w-3 mr-1" />
                                          Edit
                                        </Button>
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>

                              {/* Thread Guide Line */}
                              {allThreadComments.length > 0 && (
                                <div className="absolute left-[15px] top-8 bottom-3 w-0.5 bg-muted/40 z-0" />
                              )}

                              {/* Show More Replies Button */}
                              {allThreadComments.length > 1 &&
                                hiddenCount > 0 && (
                                  <div className="pl-11 py-1 relative z-10">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 px-2 text-xs text-primary"
                                      onClick={() =>
                                        setExpandedThreads((prev) => ({
                                          ...prev,
                                          [comment.id]: true,
                                        }))
                                      }
                                    >
                                      Show {hiddenCount} more{" "}
                                      {hiddenCount === 1 ? "reply" : "replies"}
                                    </Button>
                                  </div>
                                )}

                              {/* Replies */}
                              <div className="pl-11 space-y-3 relative z-10">
                                {visibleReplies.map((reply) => (
                                  <div
                                    key={reply.id}
                                    className="flex gap-2 group relative"
                                  >
                                    <div className="absolute -left-[29px] top-4 w-4 h-0.5 bg-muted/40" />
                                    <Avatar className="h-7 w-7 shrink-0 border border-border/50">
                                      <AvatarFallback className="bg-primary/5 text-primary text-[10px]">
                                        {reply.user?.name
                                          ?.charAt(0)
                                          .toUpperCase() || "U"}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 space-y-0.5 min-w-0">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <span className="text-sm font-semibold">
                                            {reply.user?.name || "Unknown User"}
                                          </span>
                                          <span className="text-[10px] text-muted-foreground">
                                            {reply.created_at
                                              ? format(
                                                  new Date(reply.created_at),
                                                  "MMM d, h:mm a",
                                                )
                                              : ""}
                                          </span>
                                        </div>
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100"
                                            >
                                              <MoreHorizontal className="h-3 w-3" />
                                            </Button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent align="end">
                                            <DropdownMenuItem
                                              onClick={() => {
                                                setInlineReplyId(reply.id);
                                                setInlineReplyText("");
                                              }}
                                            >
                                              Reply
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                              onClick={() => {
                                                setEditingCommentId(reply.id);
                                                setEditCommentText(
                                                  reply.content,
                                                );
                                              }}
                                            >
                                              Edit
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                              className="text-destructive"
                                              onClick={() =>
                                                handleDeleteComment(reply.id)
                                              }
                                            >
                                              <Trash2 className="h-3 w-3 mr-2" />
                                              Delete
                                            </DropdownMenuItem>
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                      </div>
                                      {editingCommentId === reply.id ? (
                                        <div className="space-y-2 pt-1">
                                          {/* <Textarea
                                            value={editCommentText}
                                            onChange={(e) => setEditCommentText(e.target.value)}
                                            className="min-h-[60px] text-sm"
                                          /> */}
                                          <div className="border border-input rounded-md min-h-[100px]">
                                            <TiptapEditor
                                              value={editCommentText}
                                              onChange={setEditCommentText}
                                              placeholder="Edit reply..."
                                              boardId={boardId}
                                            />
                                          </div>
                                          <div className="flex gap-2">
                                            <Button
                                              size="sm"
                                              className="h-7 text-xs"
                                              onClick={() =>
                                                handleUpdateComment(
                                                  reply.id,
                                                  editCommentText,
                                                )
                                              }
                                            >
                                              Save
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-7 text-xs"
                                              onClick={() =>
                                                setEditingCommentId(null)
                                              }
                                            >
                                              Cancel
                                            </Button>
                                          </div>
                                        </div>
                                      ) : (
                                        <>
                                          <div
                                            className="text-sm text-foreground/80 whitespace-normal break-words [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_h1]:text-xl [&_h1]:font-bold [&_h2]:text-lg [&_h2]:font-bold [&_h3]:text-md [&_h3]:font-bold [&_blockquote]:border-l-4 [&_blockquote]:border-primary/50 [&_blockquote]:pl-4 [&_blockquote]:italic [&_code]:bg-muted [&_code]:px-1 [&_code]:rounded [&_pre]:bg-muted [&_pre]:p-2 [&_pre]:rounded [&_a]:text-primary [&_a]:underline"
                                            dangerouslySetInnerHTML={{
                                              __html: reply.content,
                                            }}
                                          />
                                          <div className="flex items-center gap-3 pt-0.5">
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-5 px-1 text-[10px] text-muted-foreground hover:text-primary"
                                              onClick={() => {
                                                setInlineReplyId(reply.id);
                                                setInlineReplyText("");
                                              }}
                                            >
                                              Reply
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-5 px-1 text-[10px] text-muted-foreground hover:text-primary"
                                              onClick={() => {
                                                setEditingCommentId(reply.id);
                                                setEditCommentText(
                                                  reply.content,
                                                );
                                              }}
                                            >
                                              Edit
                                            </Button>
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                ))}

                                {/* Inline Reply Editor */}
                                {isReplyingInThisThread && (
                                  <div className="bg-muted/30 p-3 rounded-lg border border-border/50">
                                    <div className="mb-2 flex items-center justify-between">
                                      <span className="text-[10px] font-semibold uppercase text-muted-foreground">
                                        Replying to{" "}
                                        {comments.find(
                                          (c) =>
                                            String(c.id) ===
                                            String(inlineReplyId),
                                        )?.user?.name || "User"}
                                      </span>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-5 w-5 p-0"
                                        onClick={() => setInlineReplyId(null)}
                                      >
                                        <X className="h-3 w-3" />
                                      </Button>
                                    </div>
                                    {/* <Textarea
                                      value={inlineReplyText}
                                      onChange={(e) => setInlineReplyText(e.target.value)}
                                      placeholder="Write a reply..."
                                      className="min-h-[60px] text-sm mb-2"
                                    /> */}
                                    <div className="border border-input rounded-md bg-background min-h-[100px] mb-2">
                                      <TiptapEditor
                                        value={inlineReplyText}
                                        onChange={setInlineReplyText}
                                        placeholder="Write a reply..."
                                        boardId={boardId}
                                      />
                                    </div>
                                    <div className="flex justify-end gap-2">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 text-xs"
                                        onClick={() => setInlineReplyId(null)}
                                      >
                                        Cancel
                                      </Button>
                                      <Button
                                        size="sm"
                                        className="h-7 text-xs"
                                        onClick={() =>
                                          handleSaveInlineReply(inlineReplyId!)
                                        }
                                        disabled={
                                          !inlineReplyText.trim() ||
                                          isSubmittingComment
                                        }
                                      >
                                        Reply
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })
                    )}
                  </div>

                  {/* Comment Input */}
                  <div className="border-t border-border p-3">
                    <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      <span>Update via email</span>
                      <span className="mx-1">|</span>
                      <MessageSquare className="h-3 w-3" />
                      <span>Give feedback</span>
                    </div>
                    <div className="bg-muted rounded-lg p-2">
                      {/* <Textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Write an update and mention others with @"
                        className="min-h-[80px] text-sm border-0 bg-transparent resize-none focus-visible:ring-0 focus-visible:ring-offset-0"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                            handleSubmitComment();
                          }
                        }}
                      /> */}
                      <div className="min-h-[100px]">
                        <TiptapEditor
                          value={newComment}
                          onChange={setNewComment}
                          placeholder="Write an update and mention others with @..."
                          boardId={boardId}
                        />
                      </div>
                      <div className="flex items-center justify-end mt-2 pt-2 border-t border-border">
                        <div className="hidden flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                          >
                            <AtSign className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                          >
                            <Paperclip className="h-3 w-3" />
                          </Button>
                          <span className="text-muted-foreground text-xs">
                            GIF
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                          >
                            <Smile className="h-3 w-3" />
                          </Button>
                        </div>
                        <Button
                          size="sm"
                          onClick={handleSubmitComment}
                          disabled={!newComment.trim() || isSubmittingComment}
                        >
                          {isSubmittingComment ? "Posting..." : "Post"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent
                value="client-updates"
                className="flex-1 overflow-hidden m-0"
              >
                <div className="flex flex-col h-full">
                  {/* Comments List */}
                  <div className="flex-1 overflow-y-auto p-3 space-y-4">
                    {isLoadingComments ? (
                      <div className="text-center text-sm text-muted-foreground py-4">
                        Loading comments...
                      </div>
                    ) : comments.filter(
                        (c) => !c.parent_id && Number(c.is_internal) === 0,
                      ).length === 0 ? (
                      <div className="text-center text-sm text-muted-foreground py-4">
                        No client updates yet. Be the first to add one!
                      </div>
                    ) : (
                      comments
                        .filter(
                          (c) => !c.parent_id && Number(c.is_internal) === 0,
                        )
                        .sort(
                          (a, b) =>
                            new Date(b.created_at).getTime() -
                            new Date(a.created_at).getTime(),
                        )
                        .map((comment) => {
                          const getDescendants = (
                            parentId: string | number,
                          ): TaskComment[] => {
                            const directChildren = comments.filter(
                              (c) =>
                                String(c.parent_id) === String(parentId) &&
                                Number(c.is_internal) === 0,
                            );
                            let allDescendants = [...directChildren];
                            directChildren.forEach((child) => {
                              allDescendants = [
                                ...allDescendants,
                                ...getDescendants(child.id),
                              ];
                            });
                            return allDescendants;
                          };

                          const allThreadComments = getDescendants(
                            comment.id,
                          ).sort(
                            (a, b) =>
                              new Date(a.created_at).getTime() -
                              new Date(b.created_at).getTime(),
                          );

                          const isExpanded = expandedThreads[comment.id];
                          const visibleReplies = isExpanded
                            ? allThreadComments
                            : allThreadComments.length > 2
                              ? [
                                  allThreadComments[
                                    allThreadComments.length - 1
                                  ],
                                ]
                              : allThreadComments;
                          const hiddenCount =
                            allThreadComments.length - visibleReplies.length;

                          const isReplyingInThisThread =
                            inlineReplyId &&
                            (String(inlineReplyId) === String(comment.id) ||
                              allThreadComments.some(
                                (rtc) =>
                                  String(rtc.id) === String(inlineReplyId),
                              ));

                          return (
                            <div
                              key={comment.id}
                              className="space-y-3 relative"
                            >
                              {/* Main Comment */}
                              <div className="flex gap-3 group relative">
                                <Avatar className="h-8 w-8 shrink-0 border border-border/50">
                                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                                    {comment.user?.name
                                      ?.charAt(0)
                                      .toUpperCase() || "U"}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 space-y-1 min-w-0">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-semibold">
                                        {comment.user?.name || "Unknown User"}
                                      </span>
                                      <span className="text-[10px] text-muted-foreground">
                                        {comment.created_at
                                          ? format(
                                              new Date(comment.created_at),
                                              "MMM d, h:mm a",
                                            )
                                          : ""}
                                      </span>
                                    </div>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                                        >
                                          <MoreHorizontal className="h-3 w-3" />
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
                                          onClick={() => {
                                            setEditingCommentId(comment.id);
                                            setEditCommentText(comment.content);
                                          }}
                                        >
                                          Edit
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          className="text-destructive"
                                          onClick={() =>
                                            handleDeleteComment(comment.id)
                                          }
                                        >
                                          <Trash2 className="h-3 w-3 mr-2" />
                                          Delete
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                  {editingCommentId === comment.id ? (
                                    <div className="space-y-2 pt-1">
                                      <div className="border border-input rounded-md min-h-[100px]">
                                        <TiptapEditor
                                          value={editCommentText}
                                          onChange={setEditCommentText}
                                          placeholder="Edit comment..."
                                          boardId={boardId}
                                        />
                                      </div>
                                      <div className="flex gap-2">
                                        <Button
                                          size="sm"
                                          className="h-7 text-xs"
                                          onClick={() =>
                                            handleUpdateComment(
                                              comment.id,
                                              editCommentText,
                                            )
                                          }
                                        >
                                          Save
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-7 text-xs"
                                          onClick={() =>
                                            setEditingCommentId(null)
                                          }
                                        >
                                          Cancel
                                        </Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <>
                                      <div
                                        className="text-sm text-foreground/90 whitespace-normal break-words [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_h1]:text-xl [&_h1]:font-bold [&_h2]:text-lg [&_h2]:font-bold [&_h3]:text-md [&_h3]:font-bold [&_blockquote]:border-l-4 [&_blockquote]:border-primary/50 [&_blockquote]:pl-4 [&_blockquote]:italic [&_code]:bg-muted [&_code]:px-1 [&_code]:rounded [&_pre]:bg-muted [&_pre]:p-2 [&_pre]:rounded [&_a]:text-primary [&_a]:underline"
                                        dangerouslySetInnerHTML={{
                                          __html: comment.content,
                                        }}
                                      />
                                      <div className="flex items-center gap-3 pt-0.5">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 px-1.5 -ml-1.5 text-[11px] text-muted-foreground hover:text-primary"
                                          onClick={() => {
                                            setInlineReplyId(comment.id);
                                            setInlineReplyText("");
                                          }}
                                        >
                                          <MessageCirclePlus className="h-3 w-3 mr-1" />
                                          Reply
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 px-1.5 text-[11px] text-muted-foreground hover:text-primary"
                                          onClick={() => {
                                            setEditingCommentId(comment.id);
                                            setEditCommentText(comment.content);
                                          }}
                                        >
                                          <Pencil className="h-3 w-3 mr-1" />
                                          Edit
                                        </Button>
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>

                              {/* Thread Guide Line */}
                              {allThreadComments.length > 0 && (
                                <div className="absolute left-[15px] top-8 bottom-3 w-0.5 bg-muted/40 z-0" />
                              )}

                              {/* Show More Replies Button */}
                              {allThreadComments.length > 1 &&
                                hiddenCount > 0 && (
                                  <div className="pl-11 py-1 relative z-10">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 px-2 text-xs text-primary"
                                      onClick={() =>
                                        setExpandedThreads((prev) => ({
                                          ...prev,
                                          [comment.id]: true,
                                        }))
                                      }
                                    >
                                      Show {hiddenCount} more{" "}
                                      {hiddenCount === 1 ? "reply" : "replies"}
                                    </Button>
                                  </div>
                                )}

                              {/* Replies */}
                              <div className="pl-11 space-y-3 relative z-10">
                                {visibleReplies.map((reply) => (
                                  <div
                                    key={reply.id}
                                    className="flex gap-2 group relative"
                                  >
                                    <div className="absolute -left-[29px] top-4 w-4 h-0.5 bg-muted/40" />
                                    <Avatar className="h-7 w-7 shrink-0 border border-border/50">
                                      <AvatarFallback className="bg-primary/5 text-primary text-[10px]">
                                        {reply.user?.name
                                          ?.charAt(0)
                                          .toUpperCase() || "U"}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 space-y-0.5 min-w-0">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <span className="text-sm font-semibold">
                                            {reply.user?.name || "Unknown User"}
                                          </span>
                                          <span className="text-[10px] text-muted-foreground">
                                            {reply.created_at
                                              ? format(
                                                  new Date(reply.created_at),
                                                  "MMM d, h:mm a",
                                                )
                                              : ""}
                                          </span>
                                        </div>
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100"
                                            >
                                              <MoreHorizontal className="h-3 w-3" />
                                            </Button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent align="end">
                                            <DropdownMenuItem
                                              onClick={() => {
                                                setInlineReplyId(reply.id);
                                                setInlineReplyText("");
                                              }}
                                            >
                                              Reply
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                              onClick={() => {
                                                setEditingCommentId(reply.id);
                                                setEditCommentText(
                                                  reply.content,
                                                );
                                              }}
                                            >
                                              Edit
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                              className="text-destructive"
                                              onClick={() =>
                                                handleDeleteComment(reply.id)
                                              }
                                            >
                                              <Trash2 className="h-3 w-3 mr-2" />
                                              Delete
                                            </DropdownMenuItem>
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                      </div>
                                      {editingCommentId === reply.id ? (
                                        <div className="space-y-2 pt-1">
                                          <div className="border border-input rounded-md min-h-[100px]">
                                            <TiptapEditor
                                              value={editCommentText}
                                              onChange={setEditCommentText}
                                              placeholder="Edit reply..."
                                              boardId={boardId}
                                            />
                                          </div>
                                          <div className="flex gap-2">
                                            <Button
                                              size="sm"
                                              className="h-7 text-xs"
                                              onClick={() =>
                                                handleUpdateComment(
                                                  reply.id,
                                                  editCommentText,
                                                )
                                              }
                                            >
                                              Save
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-7 text-xs"
                                              onClick={() =>
                                                setEditingCommentId(null)
                                              }
                                            >
                                              Cancel
                                            </Button>
                                          </div>
                                        </div>
                                      ) : (
                                        <>
                                          <div
                                            className="text-sm text-foreground/80 whitespace-normal break-words [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_h1]:text-xl [&_h1]:font-bold [&_h2]:text-lg [&_h2]:font-bold [&_h3]:text-md [&_h3]:font-bold [&_blockquote]:border-l-4 [&_blockquote]:border-primary/50 [&_blockquote]:pl-4 [&_blockquote]:italic [&_code]:bg-muted [&_code]:px-1 [&_code]:rounded [&_pre]:bg-muted [&_pre]:p-2 [&_pre]:rounded [&_a]:text-primary [&_a]:underline"
                                            dangerouslySetInnerHTML={{
                                              __html: reply.content,
                                            }}
                                          />
                                          <div className="flex items-center gap-3 pt-0.5">
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-5 px-1 text-[10px] text-muted-foreground hover:text-primary"
                                              onClick={() => {
                                                setInlineReplyId(reply.id);
                                                setInlineReplyText("");
                                              }}
                                            >
                                              Reply
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-5 px-1 text-[10px] text-muted-foreground hover:text-primary"
                                              onClick={() => {
                                                setEditingCommentId(reply.id);
                                                setEditCommentText(
                                                  reply.content,
                                                );
                                              }}
                                            >
                                              Edit
                                            </Button>
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                ))}

                                {/* Inline Reply Editor */}
                                {isReplyingInThisThread && (
                                  <div className="bg-muted/30 p-3 rounded-lg border border-border/50">
                                    <div className="mb-2 flex items-center justify-between">
                                      <span className="text-[10px] font-semibold uppercase text-muted-foreground">
                                        Replying to{" "}
                                        {comments.find(
                                          (c) =>
                                            String(c.id) ===
                                            String(inlineReplyId),
                                        )?.user?.name || "User"}
                                      </span>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-5 w-5 p-0"
                                        onClick={() => setInlineReplyId(null)}
                                      >
                                        <X className="h-3 w-3" />
                                      </Button>
                                    </div>
                                    <div className="border border-input rounded-md bg-background min-h-[100px] mb-2">
                                      <TiptapEditor
                                        value={inlineReplyText}
                                        onChange={setInlineReplyText}
                                        placeholder="Write a reply..."
                                        boardId={boardId}
                                      />
                                    </div>
                                    <div className="flex justify-end gap-2">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 text-xs"
                                        onClick={() => setInlineReplyId(null)}
                                      >
                                        Cancel
                                      </Button>
                                      <Button
                                        size="sm"
                                        className="h-7 text-xs"
                                        onClick={() =>
                                          handleSaveInlineReply(inlineReplyId!)
                                        }
                                        disabled={
                                          !inlineReplyText.trim() ||
                                          isSubmittingComment
                                        }
                                      >
                                        Reply
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })
                    )}
                  </div>

                  {/* Comment Input */}
                  <div className="border-t border-border p-3">
                    <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      <span>Update via email</span>
                      <span className="mx-1">|</span>
                      <MessageSquare className="h-3 w-3" />
                      <span>Give feedback</span>
                    </div>
                    <div className="bg-muted rounded-lg p-2">
                      <div className="min-h-[100px]">
                        <TiptapEditor
                          value={newComment}
                          onChange={setNewComment}
                          placeholder="Write a client update and mention others with @..."
                          boardId={boardId}
                        />
                      </div>
                      <div className=" flex items-center justify-end mt-2 pt-2 border-t border-border">
                        <div className="hidden flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                          >
                            <AtSign className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                          >
                            <Paperclip className="h-3 w-3" />
                          </Button>
                          <span className="text-muted-foreground text-xs">
                            GIF
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                          >
                            <Smile className="h-3 w-3" />
                          </Button>
                        </div>
                        <Button
                          size="sm"
                          onClick={handleSubmitClientComment}
                          disabled={!newComment.trim() || isSubmittingComment}
                        >
                          {isSubmittingComment ? "Posting..." : "Post"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
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
                                  <div className="mt-1 break-words">
                                    {activity.old_value.length > 200
                                      ? `${activity.old_value.substring(0, 200)}...`
                                      : activity.old_value}
                                  </div>
                                </div>
                              )}
                            {activity.new_value &&
                              activity.new_value !== "Task updated" &&
                              activity.new_value.trim() && (
                                <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded border-l-2 border-primary/30">
                                  <span className="font-medium">New:</span>
                                  <div className="mt-1 break-words">
                                    {activity.new_value.length > 200
                                      ? `${activity.new_value.substring(0, 200)}...`
                                      : activity.new_value}
                                  </div>
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
    </Dialog>
  );
}
