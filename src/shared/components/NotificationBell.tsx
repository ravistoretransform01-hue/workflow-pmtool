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
  ChevronLeft,
  ChevronRight,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
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
  const [limit, setLimit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [serverUnreadCount, setServerUnreadCount] = useState(0);

  const refreshCounter = useSelector(
    (state: RootState) => state.ui.refreshCounter,
  );
  const user = useSelector((state: RootState) => state.auth.user);

  useEffect(() => {
    if (user?.organization_id) {
      // Just seed first page for the bell icon dot on mount
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
    if (open && user?.organization_id) {
      loadNotifications(user.organization_id, showUnreadOnly, page, limit);
    }
  }, [page, limit]);

  const loadNotifications = async (
    orgId: string | number,
    unread = false,
    currentPage = 1,
    currentLimit = 20
  ) => {
    setLoading(true);
    
    try {
      const apiFn = unread ? notificationsApi.getUnreadNotifications : notificationsApi.getAllNotifications;
      const response = await apiFn(orgId, currentPage, currentLimit);
      
      if (response.success) {
        const newData = response.data || [];
        setNotifications(newData);
        
        const metaObj = response.meta || response.pagination || response;
        if (metaObj.total_pages !== undefined) setTotalPages(metaObj.total_pages);
        else setTotalPages(newData.length === currentLimit ? currentPage + 1 : currentPage);

        if (metaObj.total_unread !== undefined) setServerUnreadCount(metaObj.total_unread);
      }
    } catch (error) {
      console.error("Error loading notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const unreadCount = serverUnreadCount !== undefined && serverUnreadCount > 0 
    ? serverUnreadCount 
    : notifications.filter((n) => String(n.is_read) === "0" || String(n.is_read) === "false").length;

  const markAsRead = async (notificationId: string) => {
    if (!notificationId) return;

    // Optimistic UI update
    setNotifications((prev) => {
      const wasUnread = prev.find(n => n.id === notificationId && (String(n.is_read) === "0" || String(n.is_read) === "false"));
      if (wasUnread) {
        setServerUnreadCount(prev => Math.max(0, prev - 1));
      }
      return prev.map((n) => (n.id === notificationId ? { ...n, is_read: "1" } : n));
    });

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
    setServerUnreadCount(0);

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

  const renderPageNumbers = () => {
    const pages = [];
    let startPage = Math.max(1, page - 1);
    let endPage = Math.min(totalPages, page + 1);

    if (page <= 2) {
      endPage = Math.min(totalPages, 3);
      startPage = 1;
    }
    if (page >= totalPages - 1) {
      startPage = Math.max(1, totalPages - 2);
      endPage = totalPages;
    }

    const Ellipsis = () => (
      <span className="relative inline-flex h-8 w-8 items-center justify-center border border-border bg-transparent text-[13px] font-medium text-blue-500 -ml-px">
        ...
      </span>
    );

    const PageBtn = ({ i }: { i: number }) => (
      <button
        onClick={() => setPage(i)}
        className={cn(
          "relative inline-flex h-8 w-8 items-center justify-center border text-[13px] font-medium -ml-px transition-colors hover:bg-muted/50",
          page === i
            ? "z-10 border-blue-500 bg-blue-50/50 text-blue-600"
            : "border-border bg-transparent text-blue-500"
        )}
      >
        {i}
      </button>
    );

    for (let i = startPage; i <= endPage; i++) {
        pages.push(<PageBtn key={i} i={i} />);
    }

    return (
        <>
            {startPage > 1 && (
                <>
                    <PageBtn i={1} />
                    {startPage > 2 && <Ellipsis />}
                </>
            )}
            {pages}
            {endPage < totalPages && (
                <>
                    {endPage < totalPages - 1 && <Ellipsis />}
                    <PageBtn i={totalPages} />
                </>
            )}
        </>
    );
  };

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
            </div>

            {/* Sticky Pagination Controls Footer */}
            {!loading && filteredNotifications.length > 0 && (
              <div className="shrink-0 flex items-center justify-between py-4 px-6 border-t border-border bg-card shadow-[0_-4px_6px_-4px_rgba(0,0,0,0.1)] gap-4">
                
                <div className="flex flex-col sm:flex-row items-center justify-between w-full gap-4">
                  {/* Show Limit Dropdown */}
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] text-muted-foreground sm:inline hidden">Show</span>
                    <Select
                      value={String(limit)}
                      onValueChange={(val) => {
                        setLimit(Number(val));
                        setPage(1);
                      }}
                    >
                      <SelectTrigger className="h-8 w-[70px] text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-[13px] text-muted-foreground sm:inline hidden">entries per page</span>
                  </div>

                  {/* Pagination Steps */}
                  <div className="inline-flex items-center overflow-x-auto pb-1 sm:pb-0 hide-scroll rounded-md shadow-sm">
                    <button
                      className="relative inline-flex h-8 w-8 items-center justify-center rounded-l-md border border-border bg-transparent text-blue-500 transition-colors hover:bg-muted/50 disabled:opacity-50 disabled:pointer-events-none"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    
                    {renderPageNumbers()}
                    
                    <button
                      className="relative inline-flex h-8 w-8 items-center justify-center rounded-r-md border border-border bg-transparent text-blue-500 transition-colors hover:bg-muted/50 disabled:opacity-50 disabled:pointer-events-none -ml-px"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
