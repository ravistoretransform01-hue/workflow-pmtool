import { useState } from "react";
import { SidebarTrigger } from "@/shared/components/ui/sidebar";
import { Trash2, Settings, User, Users, LogOut, UserPlus, ChevronDown, FileText } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
// import { Avatar, AvatarFallback } from "@/shared/components/ui/avatar";
// import { useTestUser } from "@/contexts/TestUserContext";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { TrashDialog } from "@/shared/components/TrashDialog";
import { UserManagementDialog } from "@/shared/components/UserManagementDialog";
import { InviteDialog } from "@/shared/components/InviteDialog";
import { ProfileDialog } from "@/shared/components/ProfileDialog";
import { NotificationBell } from "@/shared/components/NotificationBell";
import { TemplatePickerDialog } from "@/shared/components/TemplatePickerDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";

export function Header() {
  // const { currentUser, testUsers, switchUser } = useTestUser();
  const { logout, loading } = useAuth();
  const navigate = useNavigate();
  const [trashDialogOpen, setTrashDialogOpen] = useState(false);
  const [userManagementOpen, setUserManagementOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Logged out successfully");
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
      // Still navigate to login even if there's an error
      navigate("/login");
    }
  };
  
  return (
    <header className="h-16 border-b border-border  flex items-center justify-between px-6 sticky top-0 z-10">
      <div className="flex items-center gap-4">
       <SidebarTrigger /> 
      </div>
      <div className="flex items-center gap-2">
        {/* <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 h-10">
              <Avatar className="h-8 w-8">
                <AvatarFallback style={{ backgroundColor: currentUser.avatarColor }}>
                  {currentUser.name[0]}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium">{currentUser.name}</span>
              <ChevronDown className="h-4 w-4 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Switch User</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {testUsers.map((user) => (
              <DropdownMenuItem
                key={user.id}
                onClick={() => switchUser(user.id)}
                className="flex items-center gap-2"
              >
                <Avatar className="h-6 w-6">
                  <AvatarFallback style={{ backgroundColor: user.avatarColor }}>
                    {user.name[0]}
                  </AvatarFallback>
                </Avatar>
                <span>{user.name}</span>
                {user.id === currentUser.id && <span className="ml-auto">✓</span>}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu> */}
        
        <NotificationBell />
        
        <Button 
          variant="ghost" 
          size="icon" 
          className="hover:bg-hover"
          onClick={() => setTrashDialogOpen(true)}
        >
          <Trash2 className="h-5 w-5" />
        </Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="hover:bg-hover"
            >
              <Settings className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => setProfileDialogOpen(true)}>
              <User className="mr-2 h-4 w-4" />
              <span>My profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setUserManagementOpen(true)}>
              <Users className="mr-2 h-4 w-4" />
              <span>Members</span>
            </DropdownMenuItem>
            {/* <DropdownMenuItem onClick={() => setInviteDialogOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              <span>Invite</span>
            </DropdownMenuItem> */}
            <DropdownMenuItem onClick={() => setTemplateDialogOpen(true)}>
              <FileText className="mr-2 h-4 w-4" />
              <span>Edit Templates</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleLogout} disabled={loading}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>{loading ? "Logging out..." : "Logout"}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <TrashDialog open={trashDialogOpen} onOpenChange={setTrashDialogOpen} />
      <UserManagementDialog open={userManagementOpen} onOpenChange={setUserManagementOpen} />
      <InviteDialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen} />
      <ProfileDialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen} />
      <TemplatePickerDialog 
        open={templateDialogOpen} 
        onOpenChange={setTemplateDialogOpen}
        onSelectTemplate={() => setTemplateDialogOpen(false)}
      />
    </header>
  );
}
