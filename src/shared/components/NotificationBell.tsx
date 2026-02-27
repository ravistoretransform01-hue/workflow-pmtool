import { useState, useEffect } from "react";
import { Bell, Search, Settings as SettingsIcon, Loader2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/shared/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/shared/components/ui/avatar";
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import {
  notificationsApi,
  type Notification,
} from "@/features/notifications/notificationsApi";
import { cn } from "@/lib/utils";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    if (open) {
      loadNotifications();
    }
  }, [open]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const response = await notificationsApi.getAllNotifications();
      if (response.success) {
        setNotifications(response.data || []);
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
      await notificationsApi.markAsRead(notificationId);
    } catch (error) {
      console.error("Error marking notification as read:", error);
      // Revert if API fail? For now, we keep it as is to avoid flickers
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (notification.is_read === "0") {
      markAsRead(notification.id);
    }
    // Future navigation logic based on task_id/comment_id can be added here
  };

  const filteredNotifications = notifications.filter((n) => {
    const matchesSearch =
      searchQuery === "" ||
      n.sender_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.message.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesTab =
      activeTab === "all" ||
      (activeTab === "mentioned" && n.type === "mention") ||
      (activeTab === "assigned" && n.type === "assigned") ||
      (activeTab === "board_invite" && n.type === "board_invite");

    return matchesSearch && matchesTab;
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

    const avatarColors = [
      "bg-blue-500",
      "bg-rose-500",
      "bg-amber-500",
      "bg-emerald-500",
      "bg-indigo-500",
    ];

    return (
      <div className="space-y-1 pb-4">
        {list.map((notification, index) => (
          <div
            key={notification.id}
            onClick={() => handleNotificationClick(notification)}
            className={cn(
              "group flex items-start gap-4 p-4 rounded-xl cursor-pointer transition-all duration-200",
              notification.is_read === "0"
                ? "bg-[#1a2433] hover:bg-[#1e2a3b] shadow-sm"
                : "hover:bg-muted/50",
            )}
          >
            <Avatar className="h-11 w-11 shrink-0">
              <AvatarFallback
                className={cn(
                  "text-white font-bold text-base",
                  avatarColors[index % avatarColors.length],
                )}
              >
                {notification.sender_name?.[0] || "?"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0 space-y-0.5">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[15px] leading-snug">
                  <span className="font-bold text-foreground pr-1">
                    {notification.sender_name}
                  </span>
                  <span className="text-muted-foreground">
                    {notification.message}
                  </span>
                </p>
                {notification.is_read === "0" && (
                  <div className="shrink-0 w-2.5 h-2.5 bg-primary rounded-full mt-1.5 ring-4 ring-primary/10" />
                )}
              </div>
              <p className="text-xs text-muted-foreground/70 font-medium">
                {formatDistanceToNow(new Date(notification.created_at), {
                  addSuffix: true,
                })}
              </p>
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
        className="relative"
        onClick={() => setOpen(true)}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card border-border max-w-3xl p-0 h-[80vh] max-h-[800px] flex flex-col overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-2xl font-bold">
                Notifications
              </DialogTitle>
              <Button
                variant="ghost"
                size="icon"
                className="hidden text-muted-foreground hover:text-foreground"
              >
                <SettingsIcon className="h-5 w-5" />
              </Button>
            </div>
          </DialogHeader>

          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex-1 flex flex-col min-h-0"
          >
            <div className="px-6 pt-2 shrink-0">
              <TabsList className="w-full justify-start border-b rounded-none bg-transparent p-0 gap-6">
                <TabsTrigger
                  value="all"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 pb-3 text-sm font-semibold transition-none"
                >
                  All
                </TabsTrigger>
                <TabsTrigger
                  value="mentioned"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 pb-3 text-sm font-semibold transition-none"
                >
                  Mentioned
                </TabsTrigger>
                <TabsTrigger
                  value="assigned"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 pb-3 text-sm font-semibold transition-none"
                >
                  Assigned to me
                </TabsTrigger>
                <TabsTrigger
                  value="board_invite"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 pb-3 text-sm font-semibold transition-none"
                >
                  Board Invites
                </TabsTrigger>
              </TabsList>

              <div className="mt-4 mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground z-10 pointer-events-none" />
                  <Input
                    placeholder="Search notifications..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-11 bg-muted/30 border-none focus-visible:ring-1 focus-visible:ring-primary/20"
                  />
                </div>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-hidden">
              <TabsContent
                value="all"
                className="h-full mt-0 focus-visible:ring-0"
              >
                <ScrollArea className="h-full px-6">
                  {renderNotificationList(
                    filteredNotifications,
                    "No notifications",
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent
                value="mentioned"
                className="h-full mt-0 focus-visible:ring-0"
              >
                <ScrollArea className="h-full px-6">
                  {renderNotificationList(filteredNotifications, "No mentions")}
                </ScrollArea>
              </TabsContent>

              <TabsContent
                value="assigned"
                className="h-full mt-0 focus-visible:ring-0"
              >
                <ScrollArea className="h-full px-6">
                  {renderNotificationList(
                    filteredNotifications,
                    "No assignments",
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent
                value="board_invite"
                className="h-full mt-0 focus-visible:ring-0"
              >
                <ScrollArea className="h-full px-6">
                  {renderNotificationList(
                    filteredNotifications,
                    "No board invites",
                  )}
                </ScrollArea>
              </TabsContent>
            </div>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
}
