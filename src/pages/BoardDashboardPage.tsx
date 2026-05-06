import { useState, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { MoreHorizontal, UserPlus, LayoutDashboard, X } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { Button } from "@/shared/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/shared/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/shared/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { boardsApi } from "@/features/boards/boardsApi";
import { BoardInviteDialog } from "@/shared/components/BoardInviteDialog";
import { getMembers, getRoles } from "@/features/cms/cmsStorage";
import { clearCMSCache } from "@/features/cms/cmsStorage";
import type { Role } from "@/features/cms/types";
import { getCurrentUserId, getOrganizationId } from "@/lib/utils";
import { debugLog } from "@/lib/debugLog";

const colorOptions = [
  { name: "Blue", value: "hsl(221, 83%, 53%)" },
  { name: "Purple", value: "hsl(262, 83%, 58%)" },
  { name: "Pink", value: "hsl(330, 81%, 60%)" },
  { name: "Red", value: "hsl(0, 72%, 51%)" },
  { name: "Orange", value: "hsl(25, 95%, 53%)" },
  { name: "Yellow", value: "hsl(48, 96%, 53%)" },
  { name: "Green", value: "hsl(142, 71%, 45%)" },
  { name: "Teal", value: "hsl(173, 80%, 40%)" },
  { name: "Cyan", value: "hsl(199, 89%, 48%)" },
  { name: "Indigo", value: "hsl(239, 84%, 67%)" },
];

export default function BoardDashboardPage() {
  const { boardId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  // State
  const [boardName, setBoardName] = useState("Loading...");
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [currentName, setCurrentName] = useState("");
  const [currentDescription, setCurrentDescription] = useState("");
  const [iconColor, setIconColor] = useState("hsl(221, 83%, 53%)");
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("user-management");

  // Refs
  const nameInputRef = useRef<HTMLInputElement>(null);
  const descriptionInputRef = useRef<HTMLTextAreaElement>(null);

  // Mock Members Data (Replace with real API)
  const [members, setMembers] = useState<
    Array<{
      id: string;
      name: string;
      email: string;
      role: string;
      role_id?: string;
      avatarColor?: string;
    }>
  >([]);

  // CMS Roles state
  const [roles, setRoles] = useState<Role[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [roleChangingUserId, setRoleChangingUserId] = useState<string | null>(
    null,
  );
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);

  useEffect(() => {
    if (boardId) {
      loadBoardData(Number(boardId));
      loadMembers(Number(boardId));
      loadRoles(Number(boardId));
    }
  }, [boardId]);

  const loadBoardData = async (id: number) => {
    try {
      const board = await boardsApi.getBoardById(String(id));
      if (board) {
        setBoardName(board.name);
        setCurrentName(board.name);
        setCurrentDescription(board.description || "");
        if (board.icon_color) setIconColor(board.icon_color);

        // Add creator to members if available
        const creator = board.creator;
        if (creator) {
          setMembers((prev) => {
            const exists = prev.some((m) => m.id === String(creator.id));
            if (exists) return prev;
            return [
              ...prev,
              {
                id: String(creator.id),
                name: creator.name,
                email: creator.email,
                role: "Project Owner",
                avatarColor: board.icon_color || "hsl(221, 83%, 53%)",
              },
            ];
          });
        }
      }
    } catch (error) {
      console.error("Failed to load board data:", error);
      toast({
        title: "Error",
        description: "Failed to Load Board Data",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  const loadMembers = async (id: number) => {
    try {
      // Get organization_id and user_id using utility functions
      const organizationId = getOrganizationId() || 2;
      const userId = getCurrentUserId() || 1;

      // Fetch members from CMS API
      const cmsMembers = await getMembers({
        organization_id: organizationId,
        board_id: id,
        user_id: userId,
      });

      // Transform CMS members to dashboard member format
      const transformedMembers = cmsMembers.map((member) => ({
        id: member.user_id,
        name: member.name,
        email: member.email || `${member.username || "user"}@example.com`,
        role: member.board_role_label || "Project Member",
        role_id: member.board_role_id
          ? String(member.board_role_id)
          : undefined,
        avatarColor: `hsl(${(parseInt(member.user_id) * 137) % 360}, 70%, 50%)`, // Generate color from user_id
      }));

      // Check if current user is in the list, if not add them
      const currentUserExists = transformedMembers.some(
        (member) => member.id === String(userId),
      );

      if (!currentUserExists) {
        // Get current user data from localStorage
        const userData = localStorage.getItem("user_data");
        if (userData) {
          const currentUser = JSON.parse(userData);
          transformedMembers.unshift({
            id: String(userId),
            name:
              currentUser.display_name || currentUser.name || "Current User",
            email: currentUser.email || "current@user.com",
            role: "Project Owner", // Default role for current user
            role_id: undefined,
            avatarColor: `hsl(${(userId * 137) % 360}, 70%, 50%)`,
          });
        }
      }

      setMembers(transformedMembers);
    } catch (e) {
      console.error("Failed to load members:", e);
      // Don't show error toast, just log it
    }
  };

  const loadRoles = async (id: number) => {
    try {
      setLoadingRoles(true);
      const organizationId = getOrganizationId() || 2;
      const userId = getCurrentUserId();

      const rolesData = await getRoles({
        organization_id: organizationId,
        board_id: id,
        user_id: userId,
      });

      setRoles(rolesData);
    } catch (error) {
      console.error("Failed to fetch roles:", error);
      toast({
        title: "Error",
        description: "Failed to load roles",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setLoadingRoles(false);
    }
  };

  const handleRoleChange = async (userId: string, newRoleId: string) => {
    if (!boardId) return;

    const organizationId = getOrganizationId() || 0;

    setRoleChangingUserId(userId);
    try {
      const response = await boardsApi.assignBoardRole({
        user_id: Number(userId),
        board_id: Number(boardId),
        organization_id: organizationId,
        role_id: Number(newRoleId),
      });

      // Check if the API returned a failed status
      if (response.status === "failed") {
        toast({
          title: "Permission Denied",
          description:
            response.message || "You don't have permission to assign roles",
          variant: "destructive",
          duration: 2000,
        });
        return;
      }

      debugLog("response", response);
      debugLog("response.data.role_label", response.message);

      // Update local state with new role_label from API response
      setMembers((prevMembers) =>
        prevMembers.map((member) =>
          member.id === userId
            ? {
                ...member,
                role: response.data.role_label,
                role_id: String(response.data.role_id),
              }
            : member,
        ),
      );

      toast({
        title: "Success",
        description: `Role updated to ${response.data.role_label}`,
      });
    } catch (error: any) {
      console.error("Failed to update role:", error);

      // Handle error response from API
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Failed to update user role";

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setRoleChangingUserId(null);
    }
  };

  const handleRemoveMember = async (memberUserId: string) => {
    setRemovingUserId(memberUserId);
    try {
      const organizationId = getOrganizationId() || 2;

      const response = await boardsApi.removeMembers({
        board_id: parseInt(boardId!),
        user_id: parseInt(memberUserId),
        role_id: 2, // Default role_id (required by API)
        organization_id: organizationId,
      });

      if (response.status === "success") {
        toast({
          title: "Member removed",
          description: "Member has been successfully removed from the board",
        });

        // Clear CMS cache to ensure fresh data is loaded
        clearCMSCache(parseInt(boardId!));

        // Reload members with a small delay to ensure API operations are complete
        setTimeout(() => {
          loadMembers(Number(boardId));
        }, 500);
      } else {
        throw new Error(response.message || "Failed to remove member");
      }
    } catch (error: any) {
      console.error("Error removing member:", error);
      toast({
        title: "Error",
        description:
          error.response?.data?.message ||
          error.message ||
          "Failed to remove member from board",
        variant: "destructive",
      });
    } finally {
      setRemovingUserId(null);
    }
  };

  // Effect handles
  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);

  useEffect(() => {
    if (isEditingDescription && descriptionInputRef.current) {
      descriptionInputRef.current.focus();
    }
  }, [isEditingDescription]);

  const handleNameBlur = async () => {
    setIsEditingName(false);
    if (!currentName.trim()) {
      setCurrentName(boardName);
      return;
    }

    if (currentName !== boardName && boardId) {
      try {
        await boardsApi.updateBoard(boardId, { name: currentName });
        setBoardName(currentName);
        toast({ title: "Success", description: "Board Name Updated" });
      } catch (error) {
        console.error(error);
        toast({
          title: "Error",
          description: "Failed to Update Board Name",
          variant: "destructive",
          duration: 3000,
        });
        setCurrentName(boardName);
      }
    }
  };

  const handleDescriptionBlur = () => {
    setIsEditingDescription(false);
    // API call to update desc would go here
  };

  return (
    <div className="h-full flex flex-col bg-background min-h-screen">
      {/* Header */}
      <div className="border-b border-border px-8 py-6">
        <Button
          variant="ghost"
          className="mb-4 pl-0 hover:bg-transparent hover:text-primary"
          onClick={() => navigate(`/org/${getOrganizationId()}/board/${boardId}`)}
        >
          ← Back to Project
        </Button>

        <div className="flex items-center gap-6">
          <Popover open={colorPickerOpen} onOpenChange={setColorPickerOpen}>
            <PopoverTrigger asChild>
              <button
                className="w-32 h-32 rounded-2xl flex items-center justify-center transition-transform hover:scale-105 cursor-pointer shadow-sm"
                style={{ backgroundColor: iconColor }}
              >
                <span className="text-6xl font-bold text-white">
                  {currentName.charAt(0)}
                </span>
              </button>
            </PopoverTrigger>
            <PopoverContent
              className="w-64 p-4 bg-popover z-50 shadow-lg border"
              align="start"
            >
              <div className="space-y-3">
                <h3 className="font-semibold text-sm">Choose icon color</h3>
                <div className="grid grid-cols-5 gap-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color.name}
                      onClick={async () => {
                        setIconColor(color.value);
                        setColorPickerOpen(false);
                        if (boardId) {
                          try {
                            await boardsApi.updateBoard(boardId, {
                              icon_color: color.value,
                            });
                          } catch (e) {
                            console.error(e);
                          }
                        }
                      }}
                      className="w-10 h-10 rounded-lg transition-transform hover:scale-110 focus:ring-2 focus:ring-primary focus:ring-offset-2"
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              {isEditingName ? (
                <Input
                  ref={nameInputRef}
                  value={currentName}
                  onChange={(e) => setCurrentName(e.target.value)}
                  onBlur={handleNameBlur}
                  className="text-4xl font-semibold h-auto py-1 px-2 mb-2 border-2 border-primary flex-1"
                />
              ) : (
                <div className="flex items-center gap-3 mb-2">
                  <h1
                    className="text-4xl font-semibold text-foreground cursor-pointer hover:text-primary transition-colors"
                    onClick={() => setIsEditingName(true)}
                  >
                    {currentName}
                  </h1>
                  <Button
                    variant="outline"
                    className="w-full sm:w-auto h-11 text-sm font-semibold rounded-lg bg-[#ffffff05] border-[#ffffff10] text-[#ffffff80] hover:text-[#fff] hover:bg-[#ffffff10] transition-colors"
                    onClick={() =>
                      navigate(`/org/${getOrganizationId()}/board/${boardId}/view/Main%20Table`)
                    }
                  >
                    View Items
                  </Button>

                  {/* Small profile icon next to board name for members */}
                  <div className="flex -space-x-2">
                    {members.slice(0, 3).map((m) => (
                      <Avatar
                        key={m.id}
                        className="w-6 h-6 border-2 border-background"
                      >
                        <AvatarFallback
                          style={{ backgroundColor: m.avatarColor }}
                          className="text-[10px] text-white"
                        >
                          {m.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                  </div>
                </div>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-2 rounded-lg hover:bg-muted transition-colors mb-2">
                    <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuItem
                    onClick={() =>
                      navigate(`/org/${getOrganizationId()}/board/${boardId}/view/Main%20Table`)
                    }
                  >
                    <LayoutDashboard className="h-4 w-4 mr-2" />
                    Go to Board
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsEditingName(true)}>
                    Rename project
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setDeleteDialogOpen(true)}
                    className="text-destructive"
                  >
                    Delete project
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {isEditingDescription ? (
              <Textarea
                ref={descriptionInputRef}
                value={currentDescription}
                onChange={(e) => setCurrentDescription(e.target.value)}
                onBlur={handleDescriptionBlur}
                placeholder="Add board description"
                className="min-h-[60px] border-2 border-primary max-w-xl"
              />
            ) : (
              <p
                className="text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                onClick={() => setIsEditingDescription(true)}
              >
                {currentDescription || "Add board description"}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-2xl grid-cols-3 mb-6">
            <TabsTrigger value="user-management">User management</TabsTrigger>
            <TabsTrigger value="permissions" className="text-amber-400" title="Coming Soon">Permissions</TabsTrigger>
            <TabsTrigger value="my-schedule" className="text-amber-400" title="Coming Soon">My Schedule</TabsTrigger>
          </TabsList>

          {/* User Management Tab */}
          <TabsContent value="user-management" className="space-y-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing: {members.length} result
                {members.length !== 1 ? "s" : ""}
              </p>
              <Button
                size="lg"
                className="gap-2"
                onClick={() => setInviteDialogOpen(true)}
              >
                <UserPlus className="h-5 w-5" />
                Invite
              </Button>
            </div>

            {/* Members Table */}
            <div className="border border-border rounded-lg overflow-hidden bg-card">
              <div className="grid grid-cols-[1fr_2fr_1fr_auto] gap-4 px-6 py-4 bg-muted/30 border-b border-border">
                <div className="text-sm font-medium text-muted-foreground">
                  Name
                </div>
                <div className="text-sm font-medium text-muted-foreground">
                  Email
                </div>
                <div className="text-sm font-medium text-muted-foreground">
                  User role
                </div>
                <div className="text-sm font-medium text-muted-foreground">
                  Actions
                </div>
              </div>

              <div className="divide-y divide-border">
                {members.length > 0 ? (
                  members.map((member) => (
                    <div
                      key={member.id}
                      className="grid grid-cols-[1fr_2fr_1fr_auto] gap-4 px-6 py-4 items-center hover:bg-muted/10 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback
                            style={{ backgroundColor: member.avatarColor }}
                          >
                            <span className="text-white text-xs font-semibold">
                              {member.name.charAt(0)}
                            </span>
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-foreground">
                          {member.name}
                        </span>
                      </div>

                      <div className="text-muted-foreground text-sm">
                        {member.email}
                      </div>

                      <Select
                        value={member.role_id || member.role}
                        onValueChange={(value) =>
                          handleRoleChange(member.id, value)
                        }
                        disabled={
                          loadingRoles ||
                          roles.length === 0 ||
                          roleChangingUserId === member.id
                        }
                      >
                        <SelectTrigger className="w-[180px] h-8">
                          <SelectValue
                            placeholder={
                              roleChangingUserId === member.id
                                ? "Updating..."
                                : "Select role"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {roles.map((role) => (
                            <SelectItem key={role.id} value={role.id}>
                              {role.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <div className="flex items-center justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveMember(member.id)}
                          disabled={removingUserId === member.id}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        >
                          {removingUserId === member.id ? (
                            <div className="w-4 h-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <X className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-6 py-8 text-center text-muted-foreground">
                    No members found.
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4">
              <Button variant="outline" size="sm">
                See and edit all project permissions
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="permissions">
            <div className="p-8 text-center text-muted-foreground border rounded-lg bg-muted/10">
              Permissions management coming soon.
            </div>
          </TabsContent>

          <TabsContent value="my-schedule">
            <div className="p-8 text-center text-muted-foreground border rounded-lg bg-muted/10">
              Schedule view coming soon.
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete project?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{currentName}"? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BoardInviteDialog
        open={inviteDialogOpen}
        onOpenChange={(open) => {
          setInviteDialogOpen(open);
          if (!open) {
            // Reload members when dialog closes to ensure main list is fresh
            if (boardId) {
              // Add a small delay to ensure API operations are complete
              setTimeout(() => {
                loadMembers(Number(boardId));
              }, 500);
            }
          }
        }}
        boardId={boardId || ""}
        currentMembers={members}
        onMembersUpdate={() => {
          if (boardId) {
            // Add a small delay to ensure API operations are complete
            setTimeout(() => {
              loadMembers(Number(boardId));
            }, 500);
          }
        }}
      />
    </div>
  );
}

// import { useParams, useNavigate } from "react-router-dom";
// import { useState, useEffect } from "react";
// import { Button } from "@/shared/components/ui/button";
// import { ArrowLeft } from "lucide-react";

// interface BoardDashboard {
//   id: string;
//   boardId: string;
//   taskCount: number;
//   completedCount: number;
//   teamMembers: number;
// }

// export default function BoardDashboardPage() {
//   const { boardId } = useParams();
//   const navigate = useNavigate();
//   const [dashboard] = useState<BoardDashboard | null>(null);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     // TODO: Fetch dashboard data from REST API
//     setLoading(false);
//   }, [boardId]);

//   return (
//     <div className="min-h-screen p-8">
//       <div className="max-w-7xl mx-auto">
//         <Button
//           variant="outline"
//           onClick={() => navigate(`/board/${boardId}/view/Main%20Table`)}
//           className="bg-transparent border-slate-700/50 hover:bg-slate-800 text-slate-300 hover:text-white"
//         >     Back
//         </Button>

//         {loading ? (
//           <div className="text-center py-8">Loading...</div>
//         ) : dashboard ? (
//           <div>
//             <h1 className="text-3xl font-bold mb-8">Board Dashboard</h1>
//             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//               <div className="p-6 border rounded-lg">
//                 <p className="text-sm text-muted-foreground">Total Tasks</p>
//                 <p className="text-3xl font-bold">{dashboard.taskCount}</p>
//               </div>
//               <div className="p-6 border rounded-lg">
//                 <p className="text-sm text-muted-foreground">Completed</p>
//                 <p className="text-3xl font-bold">{dashboard.completedCount}</p>
//               </div>
//               <div className="p-6 border rounded-lg">
//                 <p className="text-sm text-muted-foreground">Team Members</p>
//                 <p className="text-3xl font-bold">{dashboard.teamMembers}</p>
//               </div>
//             </div>
//           </div>
//         ) : (
//           <div className="text-center py-8 text-muted-foreground">
//             <p>Dashboard not found</p>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }
