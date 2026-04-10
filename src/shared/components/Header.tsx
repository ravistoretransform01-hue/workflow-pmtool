import { useState } from "react";
import { SidebarTrigger } from "@/shared/components/ui/sidebar";
import {
  Settings,
  User,
  Users,
  LogOut,
  FileText,
  UserPlus,
  Building2,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/app/hooks";
import { switchOrganization } from "@/features/auth/authSlice";
import { Button } from "@/shared/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { UserManagementDialog } from "@/shared/components/UserManagementDialog";
import { InviteDialog } from "@/shared/components/InviteDialog";
import { ProfileDialog } from "@/shared/components/ProfileDialog";
import { NotificationBell } from "@/shared/components/NotificationBell";
import { TrashButton } from "@/shared/components/TrashButton";
import { SavingSpinner } from "@/shared/components/SavingSpinner";
import { TemplatePickerDialog } from "@/shared/components/TemplatePickerDialog";
import { GlobalTimer } from "@/shared/components/GlobalTimer";
import { BoardInviteDialog } from "@/shared/components/BoardInviteDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";

export function Header() {
  const { logout, loading } = useAuth();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const { boardId } = useParams<{ boardId: string }>();
  const [userManagementOpen, setUserManagementOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [boardInviteOpen, setBoardInviteOpen] = useState(false);

  const currentOrg = user?.organizations?.find(
    (org) => org.organization_id === user.organization_id
  );

  const handleSwitchOrg = (orgId: string) => {
    dispatch(switchOrganization(parseInt(orgId, 10)));
    toast.success("Switched Organization");
    navigate(`/org/${orgId}/home`);
  };

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
        <GlobalTimer />
        <SavingSpinner />
        <NotificationBell />
        <TrashButton />

        {/* Organization Switcher / Display */}
        {user?.organization_id && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild disabled={!user?.organizations || user.organizations.length <= 1}>
              <Button
                variant="ghost"
                size="sm"
                className={`gap-2 px-3 h-9 ${user?.organizations && user.organizations.length > 1 ? 'hover:bg-hover' : 'cursor-default hover:bg-transparent'}`}
              >
                <Building2 className="h-4 w-4" />
                <span className="text-sm font-medium hidden md:inline">
                  {currentOrg?.organization_name || "Organization"}
                </span>
              </Button>
            </DropdownMenuTrigger>
            {user?.organizations && user.organizations.length > 1 && (
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Switch Organization
                </div>
                {user.organizations.map((org) => (
                  <DropdownMenuItem
                    key={org.organization_id}
                    onClick={() => handleSwitchOrg(String(org.organization_id))}
                    className={
                      user.organization_id === org.organization_id
                        ? "bg-primary/10 font-bold"
                        : ""
                    }
                  >
                    <div className="flex flex-col">
                      <span className="text-sm">{org.organization_name}</span>
                      <span className="text-[10px] opacity-60">
                        {org.role_label}
                      </span>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            )}
          </DropdownMenu>
        )}

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
            <DropdownMenuItem onClick={() => navigate(`/org/${user?.organization_id}/members`)}>
              <Users className="mr-2 h-4 w-4" />
              <span>Members</span>
            </DropdownMenuItem>
            {boardId && (
              <DropdownMenuItem onClick={() => setBoardInviteOpen(true)}>
                <UserPlus className="mr-2 h-4 w-4" />
                <span>Invite</span>
              </DropdownMenuItem>
            )}
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
      {boardId && (
        <BoardInviteDialog
          open={boardInviteOpen}
          onOpenChange={setBoardInviteOpen}
          boardId={boardId}
        />
      )}
    </header>
  );
}
