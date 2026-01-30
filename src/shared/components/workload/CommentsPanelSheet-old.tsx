import { useState } from "react";
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
import { MentionRichTextEditor } from "@/shared/components/MentionRichTextEditor";
import { FileUploadDropdown } from "@/shared/components/FileUploadDropdown";
import { GifPicker } from "@/shared/components/GifPicker";
import { EmojiPicker } from "@/shared/components/EmojiPicker";
import {
  Home,
  RefreshCcw,
  Pencil,
  Activity,
  MoreHorizontal,
  MessageCirclePlus,
  Trash2,
  AtSign,
  X,
} from "lucide-react";
import type { TaskComment } from "@/features/tasks/types";

// Helper to render markdown-ish content
const renderFormattedContent = (content: string) => {
  if (!content) return { __html: "" };

  // Escape HTML first to prevent XSS from the raw text
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
    files: Array<{ name: string; size: number; type: string; url: string }>
  ) => void;
  onSaveUpdate: () => void;
  onDeleteComment: (commentId: string | number) => void;
  onUpdateComment: (commentId: string | number, content: string) => void;
  onSaveInlineReply: (parentId: string | number, replyText: string) => void;
  onTaskButtonClick?: () => void;
}

export function CommentsPanelSheet({
  open,
  onOpenChange,
  taskName,
  comments,
  isLoadingComments,
  updateText,
  onUpdateTextChange,
  updateFiles,
  onUpdateFilesChange,
  onSaveUpdate,
  onDeleteComment,
  onUpdateComment,
  onSaveInlineReply,
  onTaskButtonClick,
}: CommentsPanelSheetProps) {
  const [expandedThreads, setExpandedThreads] = useState<
    Record<string | number, boolean>
  >({});
  const [editingCommentId, setEditingCommentId] = useState<
    string | number | null
  >(null);
  const [editCommentText, setEditCommentText] = useState("");
  const [inlineReplyId, setInlineReplyId] = useState<string | number | null>(
    null
  );
  const [inlineReplyText, setInlineReplyText] = useState("");
  const [replyingTo, setReplyingTo] = useState<TaskComment | null>(null);

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
      >
        <div className="flex flex-col h-full">
          <SheetHeader className="px-6 py-4 border-b border-border">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-2xl font-semibold">
                {taskName || "Task Details"}
              </SheetTitle>
              <div className="flex items-center gap-4">
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
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                >
                  <RefreshCcw className="h-4 w-4 mr-2" />
                  Client Updates
                </TabsTrigger>

                <Button
                  variant="ghost"
                  className="rounded-none border-b-2 border-transparent hover:bg-transparent h-auto py-3 px-4"
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

            <TabsContent
              value="updates"
              className="flex-1 flex flex-col mt-0 overflow-hidden min-h-0"
            >
              <div className="px-6 pt-2 pb-4 border-b border-border relative z-10 flex flex-col gap-2">
                {replyingTo && (
                  <div className="flex items-center justify-between text-xs bg-muted/50 p-2 rounded border border-border">
                    <div className="flex items-center gap-2 text-muted-foreground truncate">
                      <span>
                        Replying to <strong>{replyingTo.user?.name}</strong>
                      </span>
                      <span
                        className="truncate opacity-70 italic"
                        dangerouslySetInnerHTML={{
                          __html:
                            replyingTo.content.substring(0, 50) +
                            (replyingTo.content.length > 50 ? "..." : ""),
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
                <MentionRichTextEditor
                  placeholder={
                    replyingTo
                      ? "Write a reply..."
                      : "Write an update and mention others with @"
                  }
                  value={updateText}
                  onChange={onUpdateTextChange}
                  availablePeople={[]}
                  files={updateFiles}
                  onFilesChange={onUpdateFilesChange}
                />
              </div>
              <div className="flex items-center justify-between px-6 pt-3">
                <div className="flex items-center gap-2">
                  <FileUploadDropdown
                    onFileSelect={(fileInfo) => {
                      onUpdateFilesChange([...updateFiles, fileInfo]);
                    }}
                  />
                  <GifPicker
                    onGifSelect={(gifUrl) =>
                      onUpdateTextChange(
                        updateText +
                        `<img src="${gifUrl}" alt="GIF" style="max-width: 200px; border-radius: 8px;" />`
                      )
                    }
                  />
                  <EmojiPicker
                    onEmojiSelect={(emoji) =>
                      onUpdateTextChange(updateText + emoji)
                    }
                  />

                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <AtSign className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
                <Button
                  onClick={onSaveUpdate}
                  disabled={!updateText.trim()}
                  className="bg-primary hover:bg-primary/90"
                >
                  Update
                </Button>
              </div>

              <div className="flex-1 overflow-auto px-6 py-4">
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
                          new Date(a.created_at).getTime()
                      )
                      .map((comment) => {
                        const getDescendants = (
                          parentId: string | number
                        ): TaskComment[] => {
                          const directChildren = comments.filter(
                            (c) => String(c.parent_id) === String(parentId)
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
                          comment.id
                        ).sort(
                          (a, b) =>
                            new Date(a.created_at).getTime() -
                            new Date(b.created_at).getTime()
                        );

                        const isExpanded = expandedThreads[comment.id];
                        const visibleReplies = isExpanded
                          ? allThreadComments
                          : allThreadComments.length > 2
                            ? [allThreadComments[allThreadComments.length - 1]]
                            : allThreadComments;
                        const hiddenCount =
                          allThreadComments.length - visibleReplies.length;

                        const isReplyingInThisThread =
                          inlineReplyId &&
                          (String(inlineReplyId) === String(comment.id) ||
                            allThreadComments.some(
                              (rtc) => String(rtc.id) === String(inlineReplyId)
                            ));

                        return (
                          <div key={comment.id} className="space-y-4 relative">
                            {/* Main Comment */}
                            <div className="flex gap-4 group relative z-10">
                              <Avatar className="h-10 w-10 shrink-0 border border-border/50 shadow-sm relative z-10">
                                <AvatarFallback className="bg-primary/10 text-primary font-medium">
                                  {comment.user?.name
                                    ?.charAt(0)
                                    .toUpperCase() || "U"}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 space-y-1.5 min-w-0">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-semibold text-foreground">
                                      {comment.user?.name || "Unknown User"}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                                      {comment.created_at
                                        ? format(
                                          new Date(comment.created_at),
                                          "MMM d, h:mm a"
                                        )
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
                                          onClick={() =>
                                            handleDeleteComment(comment.id)
                                          }
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
                                    <MentionRichTextEditor
                                      value={editCommentText}
                                      onChange={setEditCommentText}
                                      placeholder="Edit your comment..."
                                      availablePeople={[]}
                                    />
                                    <div className="flex gap-2">
                                      <Button
                                        size="sm"
                                        className="h-8 text-xs px-4"
                                        onClick={() => {
                                          updateTaskComment(
                                            comment.id,
                                            editCommentText
                                          );
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
                                      className="text-sm text-foreground/90 leading-relaxed break-words pr-4"
                                      dangerouslySetInnerHTML={renderFormattedContent(comment.content)}
                                    />

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

                            {/* Thread Guide Line */}
                            {allThreadComments.length > 0 && (
                              <div className="absolute left-[19px] top-10 bottom-4 w-0.5 bg-muted/40 z-0" />
                            )}

                            {/* Collapse/Expand Information */}
                            {allThreadComments.length > 1 &&
                              hiddenCount > 0 && (
                                <div className="pl-14 py-1 relative z-10">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-3 text-xs text-primary bg-primary/5 hover:bg-primary/10 transition-colors flex items-center gap-2"
                                    onClick={() =>
                                      setExpandedThreads((prev) => ({
                                        ...prev,
                                        [comment.id]: true,
                                      }))
                                    }
                                  >
                                    <RefreshCcw className="h-3 w-3" />
                                    Show {hiddenCount} more{" "}
                                    {hiddenCount === 1 ? "reply" : "replies"}
                                  </Button>
                                </div>
                              )}

                            {/* Replies Container */}
                            <div className="pl-14 space-y-4 relative z-10">
                              {visibleReplies.map((reply) => (
                                <div
                                  key={reply.id}
                                  className="flex gap-3 group relative py-1"
                                >
                                  {/* Horizontal Connection Line */}
                                  <div className="absolute -left-[37px] top-5 w-5 h-0.5 bg-muted/40" />

                                  <Avatar className="h-8 w-8 shrink-0 border border-border/50 shadow-sm">
                                    <AvatarFallback className="bg-primary/5 text-primary text-[10px] font-semibold">
                                      {reply.user?.name
                                        ?.charAt(0)
                                        .toUpperCase() || "U"}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 space-y-0.5 min-w-0">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm font-semibold text-foreground/80">
                                          {reply.user?.name || "Unknown User"}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground italic">
                                          {reply.created_at
                                            ? format(
                                              new Date(reply.created_at),
                                              "MMM d, h:mm a"
                                            )
                                            : ""}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-6 w-6 p-0 hover:bg-muted"
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
                                              className="text-destructive focus:text-destructive"
                                              onClick={() =>
                                                handleDeleteComment(reply.id)
                                              }
                                            >
                                              <Trash2 className="h-4 w-4 mr-2" />
                                              Delete
                                            </DropdownMenuItem>
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                      </div>
                                    </div>

                                    {editingCommentId === reply.id ? (
                                      <div className="space-y-3 pt-2">
                                        <MentionRichTextEditor
                                          value={editCommentText}
                                          onChange={setEditCommentText}
                                          placeholder="Edit your reply..."
                                          availablePeople={[]}
                                        />
                                        <div className="flex gap-2">
                                          <Button
                                            size="sm"
                                            className="h-8 text-xs px-4"
                                            onClick={() => {
                                              updateTaskComment(
                                                reply.id,
                                                editCommentText
                                              );
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
                                          className="text-sm text-foreground/80 leading-relaxed break-words"
                                          dangerouslySetInnerHTML={renderFormattedContent(reply.content)}
                                        />
                                        <div className="pt-0.5 flex items-center gap-4">
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 px-1.5 -ml-1.5 text-[11px] text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors font-medium"
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
                                            className="h-6 px-1.5 text-[11px] text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors font-medium"
                                            onClick={() => {
                                              setEditingCommentId(reply.id);
                                              setEditCommentText(reply.content);
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

                              {/* Inline reply editor */}
                              {isReplyingInThisThread && (
                                <div className="mt-4 mr-4 bg-muted/30 p-4 rounded-xl border border-border/50 shadow-inner relative transition-all animate-in fade-in slide-in-from-top-2 duration-200">
                                  <div className="mb-3 flex items-center justify-between">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-primary/80">
                                      Replying to{" "}
                                      {comments.find(
                                        (c) =>
                                          String(c.id) === String(inlineReplyId)
                                      )?.user?.name || "User"}
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
                                  <MentionRichTextEditor
                                    placeholder="Write a reply..."
                                    value={inlineReplyText}
                                    onChange={setInlineReplyText}
                                    availablePeople={[]}
                                  />
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
                                        saveInlineReply(inlineReplyId!)
                                      }
                                      disabled={!inlineReplyText.trim()}
                                    >
                                      Reply
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
