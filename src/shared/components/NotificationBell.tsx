import { useState, useEffect } from "react";
import { Bell, Search, Settings as SettingsIcon } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/shared/components/ui/avatar";
import { ScrollArea } from "@/shared/components/ui/scroll-area";
// import { supabase } from "@/integrations/supabase/client";
import { useTestUser } from "@/contexts/TestUserContext";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";

interface Notification {
  id: string;
  sender_test_user_id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  created_at: string;
}

export function NotificationBell() {
  const { currentUser, testUsers } = useTestUser();
  const [open, setOpen] = useState(false);
  // const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notifications] = useState<Notification[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const navigate = useNavigate();

  useEffect(() => {
    loadNotifications();

    // Subscribe to new notifications
    // const channel = supabase
    //   .channel('notifications')
    //   .on(
    //     'postgres_changes',
    //     {
    //       event: 'INSERT',
    //       schema: 'public',
    //       table: 'notifications',
    //       filter: `recipient_test_user_id=eq.${currentUser.id}`
    //     },
    //     () => {
    //       loadNotifications();
    //     }
    //   )
    //   .subscribe();

    // return () => {
    //   supabase.removeChannel(channel);
    // };
  }, [currentUser.id]);

  const loadNotifications = async () => {
    // const { data, error } = await supabase
    //   .from('notifications')
    //   .select('*')
    //   .eq('recipient_test_user_id', currentUser.id)
    //   .order('created_at', { ascending: false });

    // if (!error && data) {
    //   setNotifications(data);
    // }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const getSenderInfo = (senderId: string) => {
    return testUsers.find(u => u.id === senderId) || {
      name: "Unknown User",
      avatarColor: "#gray"
    };
  };

  const markAsRead = async (notificationId: string) => {
    if(notificationId === null) return;


    // await supabase
    //   .from('notifications')
    //   .update({ read: true })
    //   .eq('id', notificationId);
    
    // loadNotifications();
  };

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    if (notification.link) {
      setOpen(false);
      navigate(notification.link);
    }
  };

  const filteredNotifications = notifications.filter(n => {
    const sender = getSenderInfo(n.sender_test_user_id);
    const matchesSearch = searchQuery === "" || 
      sender.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.message.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesTab = 
      activeTab === "all" ||
      (activeTab === "mentioned" && n.type === "mention") ||
      (activeTab === "assigned" && n.type === "assigned") ||
      (activeTab === "board_invite" && n.type === "board_invite");

    return matchesSearch && matchesTab;
  });

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
        <DialogContent className="max-w-3xl h-[80vh] p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-2xl">Notifications</DialogTitle>
              <Button variant="ghost" size="icon">
                <SettingsIcon className="h-5 w-5" />
              </Button>
            </div>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <div className="px-6 pt-2">
              <TabsList className="w-full justify-start border-b rounded-none bg-transparent p-0">
                <TabsTrigger 
                  value="all" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                >
                  All
                </TabsTrigger>
                <TabsTrigger 
                  value="mentioned"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                >
                  Mentioned
                </TabsTrigger>
                <TabsTrigger 
                  value="assigned"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                >
                  Assigned to me
                </TabsTrigger>
                <TabsTrigger 
                  value="board_invite"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                >
                  Board Invites
                </TabsTrigger>
              </TabsList>

              <div className="mt-4 mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search notifications by people, boards, and more..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            <TabsContent value="all" className="flex-1 mt-0">
              <ScrollArea className="h-full px-6">
                {filteredNotifications.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    No notifications
                  </div>
                ) : (
                  <div className="space-y-1 pb-4">
                    <div className="text-sm font-semibold text-muted-foreground mb-2">Today</div>
                    {filteredNotifications.map((notification) => {
                      const sender = getSenderInfo(notification.sender_test_user_id);
                      return (
                        <div
                          key={notification.id}
                          onClick={() => handleNotificationClick(notification)}
                          className={cn(
                            "flex items-start gap-3 p-3 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors",
                            !notification.read && "bg-primary/5"
                          )}
                        >
                          <Avatar className="h-10 w-10 mt-1">
                            <AvatarFallback style={{ backgroundColor: sender.avatarColor }}>
                              {sender.name[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm">
                              <span className="font-semibold">{sender.name}</span>{" "}
                              <span className="text-muted-foreground">{notification.message}</span>
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="mentioned" className="flex-1 mt-0">
              <ScrollArea className="h-full px-6">
                {filteredNotifications.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    No mentions
                  </div>
                ) : (
                  <div className="space-y-1 pb-4">
                    <div className="text-sm font-semibold text-muted-foreground mb-2">Today</div>
                    {filteredNotifications.map((notification) => {
                      const sender = getSenderInfo(notification.sender_test_user_id);
                      return (
                        <div
                          key={notification.id}
                          onClick={() => handleNotificationClick(notification)}
                          className={cn(
                            "flex items-start gap-3 p-3 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors",
                            !notification.read && "bg-primary/5"
                          )}
                        >
                          <Avatar className="h-10 w-10 mt-1">
                            <AvatarFallback style={{ backgroundColor: sender.avatarColor }}>
                              {sender.name[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm">
                              <span className="font-semibold">{sender.name}</span>{" "}
                              <span className="text-muted-foreground">{notification.message}</span>
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="assigned" className="flex-1 mt-0">
              <ScrollArea className="h-full px-6">
                {filteredNotifications.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    No assignments
                  </div>
                ) : (
                  <div className="space-y-1 pb-4">
                    <div className="text-sm font-semibold text-muted-foreground mb-2">Today</div>
                    {filteredNotifications.map((notification) => {
                      const sender = getSenderInfo(notification.sender_test_user_id);
                      return (
                        <div
                          key={notification.id}
                          onClick={() => handleNotificationClick(notification)}
                          className={cn(
                            "flex items-start gap-3 p-3 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors",
                            !notification.read && "bg-primary/5"
                          )}
                        >
                          <Avatar className="h-10 w-10 mt-1">
                            <AvatarFallback style={{ backgroundColor: sender.avatarColor }}>
                              {sender.name[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm">
                              <span className="font-semibold">{sender.name}</span>{" "}
                              <span className="text-muted-foreground">{notification.message}</span>
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="board_invite" className="flex-1 mt-0">
              <ScrollArea className="h-full px-6">
                {filteredNotifications.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    No board invites
                  </div>
                ) : (
                  <div className="space-y-1 pb-4">
                    <div className="text-sm font-semibold text-muted-foreground mb-2">Today</div>
                    {filteredNotifications.map((notification) => {
                      const sender = getSenderInfo(notification.sender_test_user_id);
                      return (
                        <div
                          key={notification.id}
                          onClick={() => handleNotificationClick(notification)}
                          className={cn(
                            "flex items-start gap-3 p-3 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors",
                            !notification.read && "bg-primary/5"
                          )}
                        >
                          <Avatar className="h-10 w-10 mt-1">
                            <AvatarFallback style={{ backgroundColor: sender.avatarColor }}>
                              {sender.name[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm">
                              <span className="font-semibold">{sender.name}</span>{" "}
                              <span className="text-muted-foreground">{notification.message}</span>
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
