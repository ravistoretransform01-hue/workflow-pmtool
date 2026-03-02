import { useState } from "react";
import { SidebarTrigger } from "@/shared/components/ui/sidebar";
import { Settings, User, Users, LogOut, FileText } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { UserManagementDialog } from "@/shared/components/UserManagementDialog";
import { InviteDialog } from "@/shared/components/InviteDialog";
import { ProfileDialog } from "@/shared/components/ProfileDialog";
import { NotificationBell } from "@/shared/components/NotificationBell";
import { TrashButton } from "@/shared/components/TrashButton";
import { SavingSpinner } from "@/shared/components/SavingSpinner";
import { TemplatePickerDialog } from "@/shared/components/TemplatePickerDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";

export function Header() {
  const { logout, loading } = useAuth();
  const navigate = useNavigate();
  const [userManagementOpen, setUserManagementOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Logged Out Successfully");
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
      // Still navigate to login even if there's an error
      navigate("/login");
    }
  };

  const handleOpenProfile = () => {
    setProfileDialogOpen(true);
  };

  return (
    <header
      className="h-16 border-b border-border flex items-center justify-between px-6 sticky top-0 z-10"
      style={{ backgroundColor: "hsl(222, 47%, 11%)" }}
    >
      <div className="flex items-center gap-4">
        <SidebarTrigger />
      </div>
      <div className="flex items-center gap-2">
        <SavingSpinner />
        <NotificationBell />
        <TrashButton />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="hover:bg-hover">
              <Settings className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={handleOpenProfile}>
              <User className="mr-2 h-4 w-4" />
              <span>My profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/members")}>
              <Users className="mr-2 h-4 w-4" />
              <span>Members</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="hidden"
              onClick={() => setTemplateDialogOpen(true)}
            >
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

      <UserManagementDialog
        open={userManagementOpen}
        onOpenChange={setUserManagementOpen}
      />
      <InviteDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
      />
      <ProfileDialog
        open={profileDialogOpen}
        onOpenChange={setProfileDialogOpen}
      />
      <TemplatePickerDialog
        open={templateDialogOpen}
        onOpenChange={setTemplateDialogOpen}
        onSelectTemplate={() => setTemplateDialogOpen(false)}
      />
    </header>
  );
}
