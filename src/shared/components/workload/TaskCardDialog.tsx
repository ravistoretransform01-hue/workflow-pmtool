import { useState, useEffect } from "react";
import { X, ChevronRight, Mail, MessageSquare, AtSign, Paperclip, Smile, MoreHorizontal, Trash2, Pencil, MessageCirclePlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
} from "@/shared/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
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

interface TaskCardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  boardName?: string;
  statuses?: Status[];
  priorities?: Priority[];
  members?: any[];
  onStatusChange?: (taskId: string, statusId: string) => void;
  onPriorityChange?: (taskId: string, priorityId: string) => void;
  onPersonChange?: (taskId: string, memberIds: string[]) => void;
  onRatingChange?: (taskId: string, rating: number) => void;
  onEstimatedDateChange?: (taskId: string, fromDate: string | null, toDate?: string | null) => void;
}

export function TaskCardDialog({
  open,
  onOpenChange,
  task,
  boardName = "Board",
  statuses = [],
  priorities = [],
  members = [],
  // onStatusChange,
  onPriorityChange,
  onPersonChange,
  onRatingChange,
  onEstimatedDateChange,
}: TaskCardDialogProps) {
  const [activeTab, setActiveTab] = useState("dev-updates");
  const [openPopoverId, setOpenPopoverId] = useState<string | null>(null);
  const [expandedTasks] = useState<Record<string, boolean>>({});
  
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [inlineReplyId, setInlineReplyId] = useState<string | number | null>(null);
  const [inlineReplyText, setInlineReplyText] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | number | null>(null);
  const [editCommentText, setEditCommentText] = useState("");
  const [expandedThreads, setExpandedThreads] = useState<Record<string | number, boolean>>({});

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

  const handleUpdateComment = async (commentId: string | number, content: string) => {
    if (!task?.id) return;
    
    try {
      const updated = await tasksApi.updateComment(task.id, commentId, { content });
      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? { ...c, content: updated.content } : c))
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
    // onStatusChange,
    onPriorityChange,
    onPersonChange,
    onRatingChange,
    onEstimatedDateChange,
    openPopoverId,
    setOpenPopoverId,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-5xl p-0 h-[85vh] max-h-[800px] flex flex-col" hideCloseButton>
        {/* Header */}
        <DialogTitle className="flex items-center justify-between px-6 py-3 border-b border-border">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{displayTask?.name}</h2>
            <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
              in <ChevronRight className="h-3 w-3" /> <span className="text-blue-500 font-medium">{boardName}</span> Board
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4" />
          </Button>
        </DialogTitle>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left: Fields */}
          <div className="w-1/2 border-r border-border overflow-y-auto p-3 pt-2">
            <div className="space-y-3">
              {/* Status */}
              <div className="flex items-center gap-4 bg-muted/40 rounded-lg p-3 hover:bg-muted/60 transition-colors">
                <div className="flex items-center gap-2 w-32 text-muted-foreground text-sm font-medium">
                  Status
                </div>
                <div className="flex-1 flex justify-center">
                  {columns.find(c => c.id === "status")?.render(displayTask)} 
                </div>
              </div>

              {/* Priority */}
              <div className="flex items-center gap-4 bg-muted/40 rounded-lg p-3 hover:bg-muted/60 transition-colors">
                <div className="flex items-center gap-2 w-32 text-muted-foreground text-sm font-medium">
                  Priority
                </div>
                <div className="flex-1 flex justify-center">
                  {columns.find(c => c.id === "priority")?.render(displayTask)}
                </div>
              </div>

              

              {/* People */}
              <div className="flex items-center gap-4 bg-muted/40 rounded-lg p-3 hover:bg-muted/60 transition-colors">
                <div className="flex items-center gap-2 w-32 text-muted-foreground text-sm font-medium">
                  People
                </div>
                <div className="flex-1 flex justify-center">
                  {columns.find(c => c.id === "person")?.render(displayTask)}
                </div>
              </div>

              {/* Estimated Date */}
              <div className="flex items-center gap-4 bg-muted/40 rounded-lg p-3 hover:bg-muted/60 transition-colors">
                <div className="flex items-center gap-2 w-32 text-muted-foreground text-sm font-medium">
                  Timeline
                </div>
                <div className="flex-1 flex justify-center">
                  {columns.find(c => c.id === "estimatedDate")?.render(displayTask)}
                </div>
              </div>

              {/* Rating */}
              <div className="flex items-center gap-4 bg-muted/40 rounded-lg p-3 hover:bg-muted/60 transition-colors">
                <div className="flex items-center gap-2 w-32 text-muted-foreground text-sm font-medium">
                  Rating
                </div>
                <div className="flex-1 flex justify-center">
                  {columns.find(c => c.id === "rating")?.render(displayTask)}
                </div>
              </div>

              {/* Description */}
              {displayTask?.description && (
                <div className="mt-2">
                  <label className="text-sm font-semibold text-foreground">
                    Description
                  </label>
                  <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                    {displayTask?.description}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right: Updates Section */}
          <div className="w-1/2 flex flex-col overflow-hidden">
            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
              <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent px-3 py-0">
                <TabsTrigger value="dev-updates" className="flex items-center gap-2 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                  <Mail className="h-4 w-4" />
                  Dev Updates
                </TabsTrigger>
                {/* <TabsTrigger value="client-updates" className=" flex items-center gap-2 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                  <Mail className="h-4 w-4" />
                  Client Updates
                </TabsTrigger> */}
              </TabsList>

              <TabsContent value="dev-updates" className="flex-1 overflow-hidden m-0 p-0">
                <div className="flex flex-col h-full">
                  {/* Comments List */}
                  <div className="flex-1 overflow-y-auto p-3 space-y-4">
                    {isLoadingComments ? (
                      <div className="text-center text-sm text-muted-foreground py-4">
                        Loading comments...
                      </div>
                    ) : comments.filter(c => !c.parent_id).length === 0 ? (
                      <div className="text-center text-sm text-muted-foreground py-4">
                        No updates yet. Be the first to add one!
                      </div>
                    ) : (
                      comments
                        .filter((c) => !c.parent_id)
                        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                        .map((comment) => {
                          const getDescendants = (parentId: string | number): TaskComment[] => {
                            const directChildren = comments.filter(
                              (c) => String(c.parent_id) === String(parentId)
                            );
                            let allDescendants = [...directChildren];
                            directChildren.forEach((child) => {
                              allDescendants = [...allDescendants, ...getDescendants(child.id)];
                            });
                            return allDescendants;
                          };

                          const allThreadComments = getDescendants(comment.id).sort(
                            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                          );

                          const isExpanded = expandedThreads[comment.id];
                          const visibleReplies = isExpanded
                            ? allThreadComments
                            : allThreadComments.length > 2
                              ? [allThreadComments[allThreadComments.length - 1]]
                              : allThreadComments;
                          const hiddenCount = allThreadComments.length - visibleReplies.length;

                          const isReplyingInThisThread =
                            inlineReplyId &&
                            (String(inlineReplyId) === String(comment.id) ||
                              allThreadComments.some((rtc) => String(rtc.id) === String(inlineReplyId)));

                          return (
                            <div key={comment.id} className="space-y-3 relative">
                              {/* Main Comment */}
                              <div className="flex gap-3 group relative">
                                <Avatar className="h-8 w-8 shrink-0 border border-border/50">
                                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                                    {comment.user?.name?.charAt(0).toUpperCase() || "U"}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 space-y-1 min-w-0">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-semibold">
                                        {comment.user?.name || "Unknown User"}
                                      </span>
                                      <span className="text-[10px] text-muted-foreground">
                                        {comment.created_at ? format(new Date(comment.created_at), "MMM d, h:mm a") : ""}
                                      </span>
                                    </div>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100">
                                          <MoreHorizontal className="h-3 w-3" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => { setInlineReplyId(comment.id); setInlineReplyText(""); }}>
                                          Reply
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => { setEditingCommentId(comment.id); setEditCommentText(comment.content); }}>
                                          Edit
                                        </DropdownMenuItem>
                                        <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteComment(comment.id)}>
                                          <Trash2 className="h-3 w-3 mr-2" />
                                          Delete
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                  {editingCommentId === comment.id ? (
                                    <div className="space-y-2 pt-1">
                                      <Textarea
                                        value={editCommentText}
                                        onChange={(e) => setEditCommentText(e.target.value)}
                                        className="min-h-[60px] text-sm"
                                      />
                                      <div className="flex gap-2">
                                        <Button size="sm" className="h-7 text-xs" onClick={() => handleUpdateComment(comment.id, editCommentText)}>
                                          Save
                                        </Button>
                                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setEditingCommentId(null)}>
                                          Cancel
                                        </Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <>
                                      <p className="text-sm text-foreground/90 whitespace-pre-wrap break-words">
                                        {comment.content}
                                      </p>
                                      <div className="flex items-center gap-3 pt-0.5">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 px-1.5 -ml-1.5 text-[11px] text-muted-foreground hover:text-primary"
                                          onClick={() => { setInlineReplyId(comment.id); setInlineReplyText(""); }}
                                        >
                                          <MessageCirclePlus className="h-3 w-3 mr-1" />
                                          Reply
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 px-1.5 text-[11px] text-muted-foreground hover:text-primary"
                                          onClick={() => { setEditingCommentId(comment.id); setEditCommentText(comment.content); }}
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
                              {allThreadComments.length > 1 && hiddenCount > 0 && (
                                <div className="pl-11 py-1 relative z-10">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-2 text-xs text-primary"
                                    onClick={() => setExpandedThreads((prev) => ({ ...prev, [comment.id]: true }))}
                                  >
                                    Show {hiddenCount} more {hiddenCount === 1 ? "reply" : "replies"}
                                  </Button>
                                </div>
                              )}

                              {/* Replies */}
                              <div className="pl-11 space-y-3 relative z-10">
                                {visibleReplies.map((reply) => (
                                  <div key={reply.id} className="flex gap-2 group relative">
                                    <div className="absolute -left-[29px] top-4 w-4 h-0.5 bg-muted/40" />
                                    <Avatar className="h-7 w-7 shrink-0 border border-border/50">
                                      <AvatarFallback className="bg-primary/5 text-primary text-[10px]">
                                        {reply.user?.name?.charAt(0).toUpperCase() || "U"}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 space-y-0.5 min-w-0">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <span className="text-sm font-semibold">
                                            {reply.user?.name || "Unknown User"}
                                          </span>
                                          <span className="text-[10px] text-muted-foreground">
                                            {reply.created_at ? format(new Date(reply.created_at), "MMM d, h:mm a") : ""}
                                          </span>
                                        </div>
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="sm" className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100">
                                              <MoreHorizontal className="h-3 w-3" />
                                            </Button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => { setInlineReplyId(reply.id); setInlineReplyText(""); }}>
                                              Reply
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => { setEditingCommentId(reply.id); setEditCommentText(reply.content); }}>
                                              Edit
                                            </DropdownMenuItem>
                                            <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteComment(reply.id)}>
                                              <Trash2 className="h-3 w-3 mr-2" />
                                              Delete
                                            </DropdownMenuItem>
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                      </div>
                                      {editingCommentId === reply.id ? (
                                        <div className="space-y-2 pt-1">
                                          <Textarea
                                            value={editCommentText}
                                            onChange={(e) => setEditCommentText(e.target.value)}
                                            className="min-h-[60px] text-sm"
                                          />
                                          <div className="flex gap-2">
                                            <Button size="sm" className="h-7 text-xs" onClick={() => handleUpdateComment(reply.id, editCommentText)}>
                                              Save
                                            </Button>
                                            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setEditingCommentId(null)}>
                                              Cancel
                                            </Button>
                                          </div>
                                        </div>
                                      ) : (
                                        <>
                                          <p className="text-sm text-foreground/80 whitespace-pre-wrap break-words">
                                            {reply.content}
                                          </p>
                                          <div className="flex items-center gap-3 pt-0.5">
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-5 px-1 text-[10px] text-muted-foreground hover:text-primary"
                                              onClick={() => { setInlineReplyId(reply.id); setInlineReplyText(""); }}
                                            >
                                              Reply
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-5 px-1 text-[10px] text-muted-foreground hover:text-primary"
                                              onClick={() => { setEditingCommentId(reply.id); setEditCommentText(reply.content); }}
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
                                        Replying to {comments.find((c) => String(c.id) === String(inlineReplyId))?.user?.name || "User"}
                                      </span>
                                      <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => setInlineReplyId(null)}>
                                        <X className="h-3 w-3" />
                                      </Button>
                                    </div>
                                    <Textarea
                                      value={inlineReplyText}
                                      onChange={(e) => setInlineReplyText(e.target.value)}
                                      placeholder="Write a reply..."
                                      className="min-h-[60px] text-sm mb-2"
                                    />
                                    <div className="flex justify-end gap-2">
                                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setInlineReplyId(null)}>
                                        Cancel
                                      </Button>
                                      <Button
                                        size="sm"
                                        className="h-7 text-xs"
                                        onClick={() => handleSaveInlineReply(inlineReplyId!)}
                                        disabled={!inlineReplyText.trim() || isSubmittingComment}
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
                      <Textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Write an update and mention others with @"
                        className="min-h-[80px] text-sm border-0 bg-transparent resize-none focus-visible:ring-0 focus-visible:ring-offset-0"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                            handleSubmitComment();
                          }
                        }}
                      />
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <AtSign className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <Paperclip className="h-3 w-3" />
                          </Button>
                          <span className="text-muted-foreground text-xs">GIF</span>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
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

              <TabsContent value="client-updates" className="flex-1 overflow-hidden m-0">
                <div className="flex flex-col h-full">
                  {/* Comments List */}
                  <div className="flex-1 overflow-y-auto p-3 space-y-4">
                    {isLoadingComments ? (
                      <div className="text-center text-sm text-muted-foreground py-4">
                        Loading comments...
                      </div>
                    ) : comments.filter(c => !c.parent_id && Number(c.is_internal) === 0).length === 0 ? (
                      <div className="text-center text-sm text-muted-foreground py-4">
                        No client updates yet. Be the first to add one!
                      </div>
                    ) : (
                      comments
                        .filter((c) => !c.parent_id && Number(c.is_internal) === 0)
                        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                        .map((comment) => {
                          const getDescendants = (parentId: string | number): TaskComment[] => {
                            const directChildren = comments.filter(
                              (c) => String(c.parent_id) === String(parentId) && Number(c.is_internal) === 0
                            );
                            let allDescendants = [...directChildren];
                            directChildren.forEach((child) => {
                              allDescendants = [...allDescendants, ...getDescendants(child.id)];
                            });
                            return allDescendants;
                          };

                          const allThreadComments = getDescendants(comment.id).sort(
                            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                          );

                          const isExpanded = expandedThreads[comment.id];
                          const visibleReplies = isExpanded
                            ? allThreadComments
                            : allThreadComments.length > 2
                              ? [allThreadComments[allThreadComments.length - 1]]
                              : allThreadComments;
                          const hiddenCount = allThreadComments.length - visibleReplies.length;

                          const isReplyingInThisThread =
                            inlineReplyId &&
                            (String(inlineReplyId) === String(comment.id) ||
                              allThreadComments.some((rtc) => String(rtc.id) === String(inlineReplyId)));

                          return (
                            <div key={comment.id} className="space-y-3 relative">
                              {/* Main Comment */}
                              <div className="flex gap-3 group relative">
                                <Avatar className="h-8 w-8 shrink-0 border border-border/50">
                                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                                    {comment.user?.name?.charAt(0).toUpperCase() || "U"}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 space-y-1 min-w-0">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-semibold">
                                        {comment.user?.name || "Unknown User"}
                                      </span>
                                      <span className="text-[10px] text-muted-foreground">
                                        {comment.created_at ? format(new Date(comment.created_at), "MMM d, h:mm a") : ""}
                                      </span>
                                    </div>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100">
                                          <MoreHorizontal className="h-3 w-3" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => { setInlineReplyId(comment.id); setInlineReplyText(""); }}>
                                          Reply
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => { setEditingCommentId(comment.id); setEditCommentText(comment.content); }}>
                                          Edit
                                        </DropdownMenuItem>
                                        <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteComment(comment.id)}>
                                          <Trash2 className="h-3 w-3 mr-2" />
                                          Delete
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                  {editingCommentId === comment.id ? (
                                    <div className="space-y-2 pt-1">
                                      <Textarea
                                        value={editCommentText}
                                        onChange={(e) => setEditCommentText(e.target.value)}
                                        className="min-h-[60px] text-sm"
                                      />
                                      <div className="flex gap-2">
                                        <Button size="sm" className="h-7 text-xs" onClick={() => handleUpdateComment(comment.id, editCommentText)}>
                                          Save
                                        </Button>
                                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setEditingCommentId(null)}>
                                          Cancel
                                        </Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <>
                                      <p className="text-sm text-foreground/90 whitespace-pre-wrap break-words">
                                        {comment.content}
                                      </p>
                                      <div className="flex items-center gap-3 pt-0.5">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 px-1.5 -ml-1.5 text-[11px] text-muted-foreground hover:text-primary"
                                          onClick={() => { setInlineReplyId(comment.id); setInlineReplyText(""); }}
                                        >
                                          <MessageCirclePlus className="h-3 w-3 mr-1" />
                                          Reply
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 px-1.5 text-[11px] text-muted-foreground hover:text-primary"
                                          onClick={() => { setEditingCommentId(comment.id); setEditCommentText(comment.content); }}
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
                              {allThreadComments.length > 1 && hiddenCount > 0 && (
                                <div className="pl-11 py-1 relative z-10">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-2 text-xs text-primary"
                                    onClick={() => setExpandedThreads((prev) => ({ ...prev, [comment.id]: true }))}
                                  >
                                    Show {hiddenCount} more {hiddenCount === 1 ? "reply" : "replies"}
                                  </Button>
                                </div>
                              )}

                              {/* Replies */}
                              <div className="pl-11 space-y-3 relative z-10">
                                {visibleReplies.map((reply) => (
                                  <div key={reply.id} className="flex gap-2 group relative">
                                    <div className="absolute -left-[29px] top-4 w-4 h-0.5 bg-muted/40" />
                                    <Avatar className="h-7 w-7 shrink-0 border border-border/50">
                                      <AvatarFallback className="bg-primary/5 text-primary text-[10px]">
                                        {reply.user?.name?.charAt(0).toUpperCase() || "U"}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 space-y-0.5 min-w-0">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <span className="text-sm font-semibold">
                                            {reply.user?.name || "Unknown User"}
                                          </span>
                                          <span className="text-[10px] text-muted-foreground">
                                            {reply.created_at ? format(new Date(reply.created_at), "MMM d, h:mm a") : ""}
                                          </span>
                                        </div>
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="sm" className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100">
                                              <MoreHorizontal className="h-3 w-3" />
                                            </Button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => { setInlineReplyId(reply.id); setInlineReplyText(""); }}>
                                              Reply
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => { setEditingCommentId(reply.id); setEditCommentText(reply.content); }}>
                                              Edit
                                            </DropdownMenuItem>
                                            <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteComment(reply.id)}>
                                              <Trash2 className="h-3 w-3 mr-2" />
                                              Delete
                                            </DropdownMenuItem>
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                      </div>
                                      {editingCommentId === reply.id ? (
                                        <div className="space-y-2 pt-1">
                                          <Textarea
                                            value={editCommentText}
                                            onChange={(e) => setEditCommentText(e.target.value)}
                                            className="min-h-[60px] text-sm"
                                          />
                                          <div className="flex gap-2">
                                            <Button size="sm" className="h-7 text-xs" onClick={() => handleUpdateComment(reply.id, editCommentText)}>
                                              Save
                                            </Button>
                                            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setEditingCommentId(null)}>
                                              Cancel
                                            </Button>
                                          </div>
                                        </div>
                                      ) : (
                                        <>
                                          <p className="text-sm text-foreground/80 whitespace-pre-wrap break-words">
                                            {reply.content}
                                          </p>
                                          <div className="flex items-center gap-3 pt-0.5">
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-5 px-1 text-[10px] text-muted-foreground hover:text-primary"
                                              onClick={() => { setInlineReplyId(reply.id); setInlineReplyText(""); }}
                                            >
                                              Reply
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-5 px-1 text-[10px] text-muted-foreground hover:text-primary"
                                              onClick={() => { setEditingCommentId(reply.id); setEditCommentText(reply.content); }}
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
                                        Replying to {comments.find((c) => String(c.id) === String(inlineReplyId))?.user?.name || "User"}
                                      </span>
                                      <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => setInlineReplyId(null)}>
                                        <X className="h-3 w-3" />
                                      </Button>
                                    </div>
                                    <Textarea
                                      value={inlineReplyText}
                                      onChange={(e) => setInlineReplyText(e.target.value)}
                                      placeholder="Write a reply..."
                                      className="min-h-[60px] text-sm mb-2"
                                    />
                                    <div className="flex justify-end gap-2">
                                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setInlineReplyId(null)}>
                                        Cancel
                                      </Button>
                                      <Button
                                        size="sm"
                                        className="h-7 text-xs"
                                        onClick={() => handleSaveInlineReply(inlineReplyId!)}
                                        disabled={!inlineReplyText.trim() || isSubmittingComment}
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
                      <Textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Write a client update and mention others with @"
                        className="min-h-[80px] text-sm border-0 bg-transparent resize-none focus-visible:ring-0 focus-visible:ring-offset-0"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                            handleSubmitClientComment();
                          }
                        }}
                      />
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <AtSign className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <Paperclip className="h-3 w-3" />
                          </Button>
                          <span className="text-muted-foreground text-xs">GIF</span>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
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
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
