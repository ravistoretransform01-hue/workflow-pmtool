import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { switchOrganization } from "@/features/auth/services/authSlice";
import type { RootState } from "@/store";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuPortal,
} from "@/shared/ui/dropdown-menu";
import {
  Bell,
  Search,
  Loader2,
  MoreVertical,
  X as CloseIcon,
  Check,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/shared/ui/sheet";
import { Input } from "@/shared/ui/input";
import { Avatar, AvatarFallback } from "@/shared/ui/avatar";
import { ScrollArea } from "@/shared/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { stringToHslColor } from "@/features/workload/utils/workload-utils";

const stripHtml = (html: string) => {
  if (!html) return "";
  // Basic HTML stripping
  let text = html.replace(/<[^>]*>?/gm, " ");
  // Remove multiple spaces
  text = text.replace(/\s+/g, " ").trim();
  return text;
};
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/ui/tooltip";
import {
  notificationsApi,
  type Notification,
} from "@/features/notifications/api/notificationsApi";
import { cn } from "@/utils/utils";
import { timeAgoFromApiDate } from "@/utils/dates";
import { Switch } from "@/shared/ui/switch";
import { Label } from "@/shared/ui/label";

export function NotificationBell() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const refreshCounter = useSelector(
    (state: RootState) => state.ui.refreshCounter,
  );
  const user = useSelector((state: RootState) => state.auth.user);

  useEffect(() => {
    if (user?.organization_id) {
      setPage(1);
      loadNotifications(user.organization_id, false, 1);
    }
  }, [user?.organization_id]);

  useEffect(() => {
    if (open || refreshCounter > 0) {
      if (user?.organization_id) {
        setPage(1);
        loadNotifications(user.organization_id, showUnreadOnly, 1);
      }
    }
  }, [open, refreshCounter, showUnreadOnly]);

  useEffect(() => {
    if (page > 1 && user?.organization_id) {
      loadNotifications(user.organization_id, showUnreadOnly, page);
    }
  }, [page]);

  const loadNotifications = async (
    orgId: string | number,
    unread = false,
    currentPage = 1
  ) => {
    setLoading(true);
    
    try {
      const limit = 20;
      const apiFn = unread ? notificationsApi.getUnreadNotifications : notificationsApi.getAllNotifications;
      const response = await apiFn(orgId, currentPage, limit);
      
      if (response.success || response.data) {
        let newData = [];
        let count = 0;

        // Handle Laravel paginator formats correctly
        if (response.data && Array.isArray((response.data as any).data)) {
          newData = (response.data as any).data;
          count = (response.data as any).total || newData.length;
        } else if (Array.isArray(response.data)) {
          newData = response.data;
          count = response.count || (response as any).total || newData.length;
        }

        setNotifications(newData);
        setTotalCount(count);
      }
    } catch (error) {
      console.error("Error loading notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const unreadCount = notifications.filter((n) => n.is_read === "0").length;

  const markAsRead = async (notificationId: string) => {
    if (!notificationId) return;

    // Optimistic UI update
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, is_read: "1" } : n)),
    );

    try {
      await notificationsApi.markAsRead({ notificationId });
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user?.organization_id) return;

    // Optimistic UI update
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: "1" })));

    try {
      await notificationsApi.markAsRead({
        markAll: true,
        organizationId: user.organization_id,
      });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      // Optional: re-load notifications if it failed
      loadNotifications(user.organization_id);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    const taskId = notification.task_id;
    const commentId = notification.comment_id;
    // Fallback names if they differ in API
    const boardId = notification.board_id || (notification as any).boardId;

    const orgIdStr =
      notification.organization_id ||
      (notification as any).organizationId ||
      (notification as any).org_id;

    const orgId = orgIdStr ? Number(orgIdStr) : user?.organization_id;

    if (taskId && boardId && orgId) {
      // Switch organization if it's different from the current one
      if (user && user.organization_id !== orgId) {
        dispatch(switchOrganization(orgId));
      }

      // Unified URL pattern: Always open the comments panel
      let url = `/org/${orgId}/board/${boardId}/view/Main%20Table?comments=${taskId}`;

      // If it's a comment and has a specific commentId, append the highlight param
      if (notification.type === "comment" && commentId) {
        url += `&comment=${commentId}`;
      }

      navigate(url);
      setOpen(false); // Close the notification dialog
    }

    // Still mark as read when clicking the tile if it's unread
    if (notification.is_read === "0") {
      markAsRead(notification.id);
    }
  };

  const [filterTab, setFilterTab] = useState("all");

  const filteredNotifications = notifications.filter((n) => {
    // If showUnreadOnly is true, only include if is_read implies false/0
    if (showUnreadOnly && String(n.is_read) !== "0" && String(n.is_read) !== "false") return false;

    const matchesSearch =
      searchQuery === "" ||
      (n.sender_name?.toLowerCase() || "").includes(
        searchQuery.toLowerCase(),
      ) ||
      (n.message?.toLowerCase() || "").includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (filterTab === "mentioned") {
      return (
        n.type === "comment" &&
        (n.message?.toLowerCase() || "").includes("mentioned")
      );
    }

    if (filterTab === "assigned") {
      return n.type === "task";
    }

    return true;
  });

  const renderNotificationList = (
    list: Notification[],
    emptyMessage: string,
  ) => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center py-20 gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            Loading notifications...
          </span>
        </div>
      );
    }

    if (list.length === 0) {
      return (
        <div className="text-center text-muted-foreground py-12">
          <Bell className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <h3 className="text-lg font-medium">{emptyMessage}</h3>
          <p className="text-sm">You're all caught up!</p>
        </div>
      );
    }

    return (
      <div className="space-y-1 px-2 pb-4">
        {list.map((notification) => (
          <div
            key={notification.id}
            onClick={() => handleNotificationClick(notification)}
            className={cn(
              "group flex items-start gap-4 p-4 rounded-xl cursor-pointer transition-all duration-200 border border-transparent",
              String(notification.is_read) === "0" || String(notification.is_read) === "false"
                ? "bg-primary/[0.2] hover:bg-primary/[0.25] border-primary/30 shadow-md"
                : "hover:bg-muted/50",
            )}
          >
            <Avatar className="h-11 w-11 shrink-0">
              <AvatarFallback
                className="text-white font-bold text-base"
                style={{
                  backgroundColor: stringToHslColor(
                    notification.sender_name || "System",
                  ),
                }}
              >
                {notification.sender_name?.[0] || "?"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0 text-[15px] leading-snug break-words">
                  <span className="font-bold text-foreground pr-1">
                    {notification.sender_name || "System"}
                  </span>
                  <span className="text-muted-foreground whitespace-pre-wrap break-words">
                    {notification.message.split("**").map((part, i) =>
                      i % 2 === 1 ? (
                        <b key={i} className="text-foreground font-semibold">
                          {part}
                        </b>
                      ) : (
                        part
                      ),
                    )}
                  </span>

                  {notification.context && (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {notification.context.board && (
                        <div className="flex items-center min-w-0 gap-1.5 px-2 py-0.5 rounded-md bg-muted/50 border border-border/50 max-w-full">
                          <div
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{
                              backgroundColor:
                                notification.context.board.color || "#0073aa",
                            }}
                          />
                          <span className="text-[11px] font-medium text-muted-foreground truncate block">
                            {notification.context.board.name}
                          </span>
                        </div>
                      )}
                      {notification.context.task &&
                        notification.context.task.name && (
                          <div className="flex items-center min-w-0 gap-1.5 px-2 py-0.5 rounded-md bg-muted/50 border border-border/50 max-w-full">
                            <span className="text-[11px] font-medium text-muted-foreground truncate block">
                              {notification.context.task.name}
                            </span>
                          </div>
                        )}
                    </div>
                  )}

                  {notification.type === "comment" &&
                    notification.context?.comment?.content && (
                      <TooltipProvider delayDuration={300}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="mt-1.5 text-[13px] text-muted-foreground/80 line-clamp-2 leading-relaxed">
                              "{stripHtml(notification.context.comment.content)}
                              "
                            </div>
                          </TooltipTrigger>
                          <TooltipContent
                            side="bottom"
                            align="start"
                            className="max-w-[320px] p-4 bg-white text-slate-900 border border-slate-200 shadow-xl rounded-xl z-[150]"
                          >
                            <div className="space-y-2">
                              <div className="text-[14px] leading-relaxed text-slate-700 line-clamp-[7] whitespace-pre-wrap">
                                {stripHtml(
                                  notification.context.comment.content,
                                )}
                              </div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                </div>
                {(String(notification.is_read) === "0" || String(notification.is_read) === "false") && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      markAsRead(notification.id);
                    }}
                    className="shrink-0 w-2.5 h-2.5 bg-primary rounded-full mt-1.5 ring-4 ring-primary/10 hover:scale-125 transition-transform cursor-pointer"
                    title="Mark as read"
                  />
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground/70 font-medium">
                {timeAgoFromApiDate(notification.created_at)}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="relative hover:bg-hover"
        onClick={() => setOpen(true)}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
        )}
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          hideCloseButton
          className="bg-card border-l border-border p-0 flex flex-col sm:max-w-xl w-full"
        >
          <SheetHeader className="px-6 pt-6 pb-4 border-b shrink-0">
            <div className="flex items-center justify-between">
              <SheetTitle className="font-normal text-2xl">
                Notifications
              </SheetTitle>
              <div className="flex items-center gap-1">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-foreground hover:bg-muted"
                    >
                      <MoreVertical className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuPortal>
                    <DropdownMenuContent
                      align="end"
                      className="w-56 bg-[#1a2433] border-primary/20 shadow-xl z-[100]"
                    >
                      <DropdownMenuItem
                        onClick={handleMarkAllAsRead}
                        disabled={unreadCount === 0}
                        className="cursor-pointer focus:bg-primary/20 focus:text-primary-foreground py-3"
                      >
                        <Check className="mr-2 h-4 w-4 text-primary font-bold" />
                        <span className="font-semibold text-sm">
                          Mark all as read
                        </span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenuPortal>
                </DropdownMenu>

                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-foreground hover:bg-muted"
                  onClick={() => setOpen(false)}
                >
                  <CloseIcon className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </SheetHeader>

          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="px-6 shrink-0">
              <Tabs
                value={filterTab}
                onValueChange={setFilterTab}
                className="w-full"
              >
                <TabsList className="w-full h-12 bg-transparent p-0 border-b border-border/50 rounded-none justify-start gap-8">
                  <TabsTrigger
                    value="all"
                    className="h-12 rounded-none border-b-2 border-transparent bg-transparent px-1 text-[15px] font-normal data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none transition-all"
                  >
                    All
                  </TabsTrigger>
                  <TabsTrigger
                    value="mentioned"
                    className="h-12 rounded-none border-b-2 border-transparent bg-transparent px-1 text-[15px] font-normal data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none transition-all"
                  >
                    Mentioned
                  </TabsTrigger>
                  <TabsTrigger
                    value="assigned"
                    className="h-12 rounded-none border-b-2 border-transparent bg-transparent px-1 text-[15px] font-normal data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none transition-all"
                  >
                    Assigned
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="px-6 py-4 shrink-0 flex items-center justify-between gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground z-10 pointer-events-none" />
                <Input
                  placeholder="Search notifications..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-11 bg-muted/20 border border-border/60 focus-visible:ring-1 focus-visible:ring-primary/20 transition-all"
                />
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center space-x-2 bg-muted/30 px-3 py-2 rounded-lg border border-border/50">
                  <Switch
                    id="unread-only"
                    checked={showUnreadOnly}
                    onCheckedChange={setShowUnreadOnly}
                    className="data-[state=checked]:bg-blue-500 data-[state=unchecked]:bg-gray-600"
                  />
                  <Label
                    htmlFor="unread-only"
                    className="text-xs font-semibold cursor-pointer whitespace-nowrap"
                  >
                    Unread only
                  </Label>
                </div>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-hidden">
              <ScrollArea className="h-full w-full min-h-0 px-0 overflow-x-hidden [&_[data-radix-scroll-area-viewport]>div]:!block">
                {renderNotificationList(
                  filteredNotifications,
                  filterTab === "all"
                    ? "No notifications"
                    : filterTab === "mentioned"
                      ? "No mentions"
                      : "No assignments",
                )}
              </ScrollArea>

              {totalCount > 0 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-border/50 bg-card/80 backdrop-blur shrink-0 shadow-sm mt-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="h-8 transition-all hover:bg-primary hover:text-white"
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-foreground/80 font-medium">
                    Page {page} of {Math.max(1, Math.ceil(totalCount / 20))}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page >= Math.ceil(totalCount / 20)}
                    className="h-8 transition-all hover:bg-primary hover:text-white"
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
