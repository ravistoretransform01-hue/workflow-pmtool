import { useState } from "react";
import { X, Search, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "@/app/store";
// import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
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
import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover";
import { Avatar, AvatarFallback } from "@/shared/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Checkbox } from "@/shared/components/ui/checkbox";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/shared/components/ui/tabs";
import { useTestUser, testUserEmails } from "@/contexts/TestUserContext";
import { BOARD_PERMISSION_CATEGORIES } from "@/lib/permissions";
import { toast } from "@/hooks/use-toast";
import { useBoards } from "@/hooks/useBoards";
import { debugLog } from "@/lib/debugLog";

interface AddBoardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddBoard?: (
    name: string,
    iconColor: string,
    members: BoardMember[],
    templateId?: string | null
  ) => void;
  onBoardCreated?: () => void;
  templateId?: string | null;
  workspaceId?: number;
  organizationId?: number;
}

interface BoardMember {
  test_user_id: string;
  role: string;
}

const PRESET_COLORS = [
  "#16a249", // green
  "#3c83f6", // blue
  "#a855f7", // purple
  "#dc2828", // red
  "#facc14", // yellow
  "#ff8400", // orange
];

export function AddBoardDialog({
  open,
  onOpenChange,
  onAddBoard,
  onBoardCreated,
  templateId,
  workspaceId = 1,
  organizationId,
}: AddBoardDialogProps) {
    const navigate = useNavigate();
  const { testUsers, currentUser: testCurrentUser } = useTestUser();
  const { createBoard, loading } = useBoards();
  
  // Get actual logged-in user from Redux
  const currentUser = useSelector((state: RootState) => state.auth.user);
  
  const [boardName, setBoardName] = useState("");

  const [iconColor, setIconColor] = useState(PRESET_COLORS[0]);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [members, setMembers] = useState<BoardMember[]>([]);
  const [activeTab, setActiveTab] = useState("user-management");
  const [selectedRole, setSelectedRole] = useState("admin");
  const [rolePermissions, setRolePermissions] = useState(() => {
    const initialPermissions: Record<string, Record<string, boolean>> = {};

    // Board Owner - all permissions
    const ownerPerms: Record<string, boolean> = {};
    BOARD_PERMISSION_CATEGORIES.forEach((category) => {
      category.permissions.forEach((permission) => {
        ownerPerms[permission.id] = true;
      });
    });
    initialPermissions["owner"] = ownerPerms;

    // Board Project Manager - only invite members by default
    const pmPerms: Record<string, boolean> = {};
    BOARD_PERMISSION_CATEGORIES.forEach((category) => {
      category.permissions.forEach((permission) => {
        // Only enable "invite-members-board" permission
        pmPerms[permission.id] = permission.id === "invite-members-board";
      });
    });
    initialPermissions["projectmanager"] = pmPerms;

    // Board Architect (admin) - all permissions by default
    const adminPerms: Record<string, boolean> = {};
    BOARD_PERMISSION_CATEGORIES.forEach((category) => {
      category.permissions.forEach((permission) => {
        adminPerms[permission.id] = true;
      });
    });
    initialPermissions["admin"] = adminPerms;

    // Board Client - no permissions by default
    const clientPerms: Record<string, boolean> = {};
    BOARD_PERMISSION_CATEGORIES.forEach((category) => {
      category.permissions.forEach((permission) => {
        clientPerms[permission.id] = false;
      });
    });
    initialPermissions["client"] = clientPerms;

    // Board Developer - no permissions by default
    const devPerms: Record<string, boolean> = {};
    BOARD_PERMISSION_CATEGORIES.forEach((category) => {
      category.permissions.forEach((permission) => {
        devPerms[permission.id] = false;
      });
    });
    initialPermissions["developer"] = devPerms;

    // Board Viewer - only view permission
    const viewerPerms: Record<string, boolean> = {};
    BOARD_PERMISSION_CATEGORIES.forEach((category) => {
      category.permissions.forEach((permission) => {
        viewerPerms[permission.id] = permission.id === "view-workspace";
      });
    });
    initialPermissions["viewer"] = viewerPerms;

    return initialPermissions;
  });
  const [createRoleDialogOpen, setCreateRoleDialogOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");

  // Default hidden items per role
  const [roleHiddenItems, setRoleHiddenItems] = useState<
    Record<string, Record<string, boolean>>
  >(() => {
    const defaultHidden: Record<string, Record<string, boolean>> = {};
    const roles = [
      "owner",
      "projectmanager",
      "admin",
      "client",
      "developer",
      "viewer",
    ];

    roles.forEach((role) => {
      // For client role, hide everything except Client Updates by default
      // For viewer role, hide most things by default
      if (role === "client") {
        defaultHidden[role] = {
          "dev-updates": true,
          "client-updates": false,
          "task-tab": true,
          "activity-feed": true,
          groups: true,
          tasks: true,
          columns: true,
          "board-tabs": true,
        };
      } else {
        defaultHidden[role] = {
          "dev-updates": false,
          "client-updates": false,
          "task-tab": false,
          "activity-feed": false,
          groups: false,
          tasks: false,
          columns: role === "viewer",
          "board-tabs": role === "viewer",
        };
      }
    });

    return defaultHidden;
  });

  // Default view-only items per role
  const [roleViewOnlyItems, setRoleViewOnlyItems] = useState<
    Record<string, Record<string, boolean>>
  >(() => {
    const defaultViewOnly: Record<string, Record<string, boolean>> = {};
    const roles = [
      "owner",
      "projectmanager",
      "admin",
      "client",
      "developer",
      "viewer",
    ];

    roles.forEach((role) => {
      // For viewer role, make most things view-only by default
      defaultViewOnly[role] = {
        "dev-updates": role === "viewer",
        "client-updates": role === "viewer",
        "task-tab": role === "viewer",
        "activity-feed": false,
        groups: role === "viewer",
        tasks: role === "viewer",
        columns: role === "viewer",
        "board-tabs": role === "viewer",
      };
    });

    return defaultViewOnly;
  });

  // Default view & edit access items per role
  const [roleViewEditItems, setRoleViewEditItems] = useState<
    Record<string, Record<string, boolean>>
  >(() => {
    const defaultViewEdit: Record<string, Record<string, boolean>> = {};
    const roles = [
      "owner",
      "projectmanager",
      "admin",
      "client",
      "developer",
      "viewer",
    ];

    roles.forEach((role) => {
      // For owner/admin/projectmanager, enable view & edit by default
      const hasFullAccess = ["owner", "admin", "projectmanager"].includes(role);
      // For client role, only enable Client Updates for view & edit
      if (role === "client") {
        defaultViewEdit[role] = {
          "dev-updates": false,
          "client-updates": true,
          "task-tab": false,
          "activity-feed": false,
          groups: false,
          tasks: false,
          columns: false,
          "board-tabs": false,
        };
      } else {
        defaultViewEdit[role] = {
          "dev-updates": hasFullAccess || role === "developer",
          "client-updates": hasFullAccess,
          "task-tab": hasFullAccess,
          "activity-feed": hasFullAccess,
          groups: hasFullAccess,
          tasks: hasFullAccess || role === "developer",
          columns: hasFullAccess,
          "board-tabs": hasFullAccess,
        };
      }
    });

    return defaultViewEdit;
  });

  const VISIBILITY_OPTIONS = [
    { id: "dev-updates", label: "Dev Updates" },
    { id: "client-updates", label: "Client Updates" },
    { id: "task-tab", label: "Task Tab" },
    { id: "activity-feed", label: "Activity Feed" },
    { id: "groups", label: "Groups" },
    { id: "tasks", label: "Tasks" },
    { id: "columns", label: "Columns" },
    { id: "main-table-tab", label: "Main Table Tab" },
    { id: "dashboard-tab", label: "Dashboard Tab" },
    { id: "gantt-tab", label: "Gantt Tab" },
    { id: "kanban-tab", label: "Kanban Tab" },
    { id: "list-tab", label: "List Tab" },
    { id: "calendar-tab", label: "Calendar Tab" },
    { id: "workload-tab", label: "Workload Tab" },
    { id: "sop-tab", label: "SOP Tab" },
    { id: "recurring-tab", label: "Recurring Tab" },
    { id: "time-tab", label: "Time Tab" },
    { id: "updates-tab", label: "Updates Tab" },
    { id: "completed-tab", label: "Completed Tab" },
    { id: "doc-tab", label: "Doc Tab" },
  ];

  // Helper function to get initials from name
  const getUserInitials = (name: string) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Helper function to generate avatar color based on user ID
  const getAvatarColor = (userId: number) => {
    const colors = [
      "#16a249", // green
      "#3c83f6", // blue
      "#a855f7", // purple
      "#dc2828", // red
      "#facc14", // yellow
      "#ff8400", // orange
    ];
    return colors[userId % colors.length];
  };

  const currentHiddenItems = roleHiddenItems[selectedRole] || {};
  const currentViewOnlyItems = roleViewOnlyItems[selectedRole] || {};
  const currentViewEditItems = roleViewEditItems[selectedRole] || {};

  // Check if an item is enabled in another visibility section
  const getItemConflict = (
    itemId: string,
    excludeSection: "hidden" | "viewOnly" | "viewEdit"
  ) => {
    const hidden = currentHiddenItems[itemId] || false;
    const viewOnly = currentViewOnlyItems[itemId] || false;
    const viewEdit = currentViewEditItems[itemId] || false;

    if (excludeSection !== "hidden" && hidden) return "Default Hidden";
    if (excludeSection !== "viewOnly" && viewOnly) return "Default View Only";
    if (excludeSection !== "viewEdit" && viewEdit)
      return "Default View & Edit Access";
    return null;
  };

  const isItemDisabledForHidden = (itemId: string) => {
    return (
      currentViewOnlyItems[itemId] ||
      false ||
      currentViewEditItems[itemId] ||
      false
    );
  };

  const isItemDisabledForViewOnly = (itemId: string) => {
    return (
      currentHiddenItems[itemId] ||
      false ||
      currentViewEditItems[itemId] ||
      false
    );
  };

  const isItemDisabledForViewEdit = (itemId: string) => {
    return (
      currentHiddenItems[itemId] ||
      false ||
      currentViewOnlyItems[itemId] ||
      false
    );
  };

  const updateRoleHiddenItem = (itemId: string, value: boolean) => {
    if (value) {
      const conflict = getItemConflict(itemId, "hidden");
      if (conflict) {
        toast({
          title: "Selection Conflict",
          description: `This Item Is Already Enabled In "${conflict}". Please Disable It There First.`,
          variant: "destructive",
        });
        return;
      }
    }
    setRoleHiddenItems((prev) => ({
      ...prev,
      [selectedRole]: {
        ...prev[selectedRole],
        [itemId]: value,
      },
    }));
  };

  const updateRoleViewOnlyItem = (itemId: string, value: boolean) => {
    if (value) {
      const conflict = getItemConflict(itemId, "viewOnly");
      if (conflict) {
        toast({
          title: "Selection Conflict",
          description: `This Item Is Already Enabled in "${conflict}". Please disable it there first.`,
          variant: "destructive",
        });
        return;
      }
    }
    setRoleViewOnlyItems((prev) => ({
      ...prev,
      [selectedRole]: {
        ...prev[selectedRole],
        [itemId]: value,
      },
    }));
  };

  const updateRoleViewEditItem = (itemId: string, value: boolean) => {
    if (value) {
      const conflict = getItemConflict(itemId, "viewEdit");
      if (conflict) {
        toast({
          title: "Selection Conflict",
          description: `This item is already enabled in "${conflict}". Please disable it there first.`,
          variant: "destructive",
        });
        return;
      }
    }
    setRoleViewEditItems((prev) => ({
      ...prev,
      [selectedRole]: {
        ...prev[selectedRole],
        [itemId]: value,
      },
    }));
  };

  const getInitial = () => {
    return boardName.trim().charAt(0).toUpperCase();
  };

  const currentPermissions =
    rolePermissions[selectedRole as keyof typeof rolePermissions];

  const updateRolePermission = (permission: string, value: boolean) => {
    setRolePermissions((prev) => ({
      ...prev,
      [selectedRole]: {
        ...prev[selectedRole as keyof typeof prev],
        [permission]: value,
      },
    }));
  };

  const handleSavePermissions = () => {
    debugLog("Saving permissions:", rolePermissions);
  };

  // Filter out current user (board creator) and already added members
  const availableUsers = testUsers.filter(
    (user) =>
      user.id !== testCurrentUser.id &&
      !members.some((m) => m.test_user_id === user.id)
  );

  const filteredAvailableUsers = availableUsers.filter((user) => {
    const email = testUserEmails[user.id] || "";
    return (
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const handleAddMember = (userId: string) => {
    setMembers([...members, { test_user_id: userId, role: "member" }]);
    setSearchQuery("");
  };

  const handleRoleChange = (userId: string, newRole: string) => {
    setMembers(
      members.map((m) =>
        m.test_user_id === userId ? { ...m, role: newRole } : m
      )
    );
  };

  const handleRemoveMember = (userId: string) => {
    setMembers(members.filter((m) => m.test_user_id !== userId));
  };

  const handleSubmit = async () => {
    // Validate board name
    if (!boardName.trim()) {
      toast({
        title: "Validation error",
        description: "Board name is required",
        variant: "destructive",
      });
      return;
    }

    if (
      organizationId === null ||
      organizationId === undefined ||
      organizationId === -1
    ) {
      toast({
        title: "Something went wrong",
        description: "Organization not found",
        variant: "destructive",
      });
      return;
    }

    debugLog({
      name: boardName.trim(),
      organization_id: organizationId,
      workspace_id: workspaceId,
      icon_type: "letter",
      icon_value: boardName.charAt(0).toUpperCase(),
      icon_color: iconColor,
    });

    try {
      // Call API to create board
      const result = await createBoard({
        name: boardName.trim(),
        organization_id: organizationId,
        workspace_id: workspaceId,
        icon_type: "letter",
        icon_value: boardName.charAt(0).toUpperCase(),
        icon_color: iconColor,
      });

      if (result.type === "boards/createBoard/fulfilled") {
        
        // Call the parent callback with board details
        const membersWithCreator = [
          { test_user_id: testCurrentUser.id, role: "owner" },
          ...members,
        ];
        onAddBoard?.(boardName, iconColor, membersWithCreator, templateId);
        
        // Call the board created callback to refresh the board list
        onBoardCreated?.();
        
        onOpenChange(false);
        toast({
          title: "Success",
          description: "Board created successfully!",
        });
        // Reset form
        setBoardName("New Board");
        setIconColor(PRESET_COLORS[0]);
        setMembers([]);
        setSearchQuery("");

        // navigate to the created board if the API returned an id
        const payload = result.payload as any;
        const createdBoardId =
          payload?.id || payload?.board?.id || payload?.board_id || payload?.boardId;
        if (createdBoardId) {
          navigate(`/board/${createdBoardId}`);
        } else {
          console.warn("createBoard fulfilled but no board id returned", payload);
        }
      } else if (result.type === "boards/createBoard/rejected") {
        toast({
          title: "Error",
          description:
            typeof result.payload === "string"
              ? result.payload
              : "Failed to create board",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
    // Reset form
    setBoardName("New Board");
    setIconColor(PRESET_COLORS[0]);
    setMembers([]);
    setSearchQuery("");
  };

  const handleCreateCustomRole = () => {
    if (!newRoleName.trim()) {
      return;
    }

    // Add the new custom role to rolePermissions
    const roleKey = newRoleName.toLowerCase().replace(/\s+/g, "_");
    setRolePermissions((prev) => ({
      ...prev,
      [roleKey]: {},
    }));

    // Select the newly created role
    setSelectedRole(roleKey);

    // Close dialog and reset
    setCreateRoleDialogOpen(false);
    setNewRoleName("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto bg-[#1e293b] border-[#334155] text-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-normal">
            Add new project
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-6 py-6">
          {/* Icon with Color Picker */}
          <Popover open={colorPickerOpen} onOpenChange={setColorPickerOpen}>
            <PopoverTrigger asChild>
              <button
                className="relative h-32 w-32 rounded-3xl flex items-center justify-center text-white text-6xl font-light transition-transform hover:scale-105 cursor-pointer"
                style={{ backgroundColor: iconColor }}
              >
                {getInitial()}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-3 bg-[#1e293b] border-[#334155]">
              <div className="grid grid-cols-3 gap-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    className="h-10 w-10 rounded-lg transition-transform hover:scale-110 border-2 border-transparent hover:border-white"
                    style={{ backgroundColor: color }}
                    onClick={() => {
                      setIconColor(color);
                      setColorPickerOpen(false);
                    }}
                  />
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Board Name */}
          <div className="w-full space-y-2">
            <Label htmlFor="board-name" className="text-white text-base">
              Board name
            </Label>
            <Input
              id="board-name"
              value={boardName}
              placeholder="New Board"
              onChange={(e) => setBoardName(e.target.value)}
              className="bg-[#0f172a] border-[#3b82f6] text-white placeholder:text-gray-400 focus-visible:ring-[#3b82f6]"
            />
          </div>

          {/* Permissions Section */}
          <div className="w-full space-y-2">
            <Label className="text-white text-base">Permissions</Label>
            <p className="text-gray-400 text-sm">
              Invite team members to this board
            </p>
          </div>

          {/* Tabs */}
          <div className="w-full">
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2 bg-[#0f172a] border border-[#334155]">
                <TabsTrigger
                  value="user-management"
                  className="data-[state=active]:bg-[#1e293b] data-[state=active]:text-white"
                >
                  User management
                </TabsTrigger>
                <TabsTrigger
                  value="permissions"
                  className="data-[state=active]:bg-[#1e293b] data-[state=active]:text-white"
                >
                  Permissions
                </TabsTrigger>
              </TabsList>

              {/* User Management Tab */}
              <TabsContent value="user-management" className="space-y-4 mt-4">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10 pointer-events-none" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name or email"
                    className="pl-10 bg-[#0f172a] border-[#334155] text-white placeholder:text-gray-400"
                  />

                  {/* Search Results Dropdown */}
                  {searchQuery && filteredAvailableUsers.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-[#1e293b] border border-[#334155] rounded-md shadow-lg max-h-48 overflow-y-auto">
                      {filteredAvailableUsers.map((user) => (
                        <button
                          key={user.id}
                          onClick={() => handleAddMember(user.id)}
                          className="w-full px-4 py-2 text-left hover:bg-[#334155] flex items-center gap-3"
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarFallback
                              style={{ backgroundColor: user.avatarColor }}
                            >
                              {user.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="text-white">{user.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {testUserEmails[user.id] ||
                                `${user.name
                                  .toLowerCase()
                                  .replace(" ", "")}@gmail.com`}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Current User (Creator) - Always shown as Admin */}
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Board creator</p>
                  <div className="flex items-center gap-3 p-3 bg-[#0f172a] rounded-lg border border-[#334155]">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback
                        style={{ backgroundColor: currentUser ? getAvatarColor(currentUser.user_id) : "#3c83f6" }}
                      >
                        {currentUser ? getUserInitials(currentUser.name) : "?"}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1">
                      <div className="font-medium text-white">
                        {currentUser?.name || "Unknown User"}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {currentUser?.email || "No email"}
                      </div>
                    </div>

                    <div className="w-32 px-3 py-2 bg-[#1e293b] border border-[#334155] rounded-md text-sm text-white">
                      Board Owner
                    </div>

                    {/* Empty space to align with other members */}
                    <div className="h-8 w-8" />
                  </div>
                </div>

                {/* Additional Members List */}
                {members.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Additional members: {members.length}
                    </p>
                    {members.map((member) => {
                      const user = testUsers.find(
                        (u) => u.id === member.test_user_id
                      );
                      if (!user) return null;

                      return (
                        <div
                          key={member.test_user_id}
                          className="flex items-center gap-3 p-3 bg-[#0f172a] rounded-lg"
                        >
                          <Avatar className="h-10 w-10">
                            <AvatarFallback
                              style={{ backgroundColor: user.avatarColor }}
                            >
                              {user.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>

                          <div className="flex-1">
                            <div className="font-medium text-white">
                              {user.name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {testUserEmails[member.test_user_id] ||
                                `${user.name
                                  .toLowerCase()
                                  .replace(" ", "")}@gmail.com`}
                            </div>
                          </div>

                          <Select
                            value={member.role}
                            onValueChange={(value) =>
                              handleRoleChange(member.test_user_id, value)
                            }
                          >
                            <SelectTrigger className="w-32 bg-[#1e293b] border-[#334155]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="projectmanager">
                                Board Project Manager
                              </SelectItem>
                              <SelectItem value="admin">
                                Board Architect
                              </SelectItem>
                              <SelectItem value="client">
                                Board Client
                              </SelectItem>
                              <SelectItem value="developer">
                                Board Developer
                              </SelectItem>
                              <SelectItem value="viewer">
                                Board Viewer
                              </SelectItem>
                            </SelectContent>
                          </Select>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              handleRemoveMember(member.test_user_id)
                            }
                            className="h-8 w-8 text-muted-foreground hover:text-white"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </TabsContent>

              {/* Permissions Tab */}
              <TabsContent value="permissions" className="space-y-4 mt-4">
                <div className="flex gap-6">
                  {/* Left Sidebar - Account Roles */}
                  <div className="w-72 space-y-6">
                    {/* Default Account Roles */}
                    <div className="space-y-2">
                      <h3 className="text-base font-medium text-white mb-3">
                        Default account roles
                      </h3>
                      <button
                        onClick={() => setSelectedRole("owner")}
                        className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                          selectedRole === "owner"
                            ? "bg-[#1e293b] text-white"
                            : "text-muted-foreground hover:bg-[#0f172a]"
                        }`}
                      >
                        Project Owner
                      </button>
                      <button
                        onClick={() => setSelectedRole("admin")}
                        className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                          selectedRole === "admin"
                            ? "bg-[#1e293b] text-white"
                            : "text-muted-foreground hover:bg-[#0f172a]"
                        }`}
                      >
                        Project Architect
                      </button>
                      <button
                        onClick={() => setSelectedRole("projectmanager")}
                        className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                          selectedRole === "projectmanager"
                            ? "bg-[#1e293b] text-white"
                            : "text-muted-foreground hover:bg-[#0f172a]"
                        }`}
                      >
                        Project Manager
                      </button>
                      <button
                        onClick={() => setSelectedRole("client")}
                        className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                          selectedRole === "client"
                            ? "bg-[#1e293b] text-white"
                            : "text-muted-foreground hover:bg-[#0f172a]"
                        }`}
                      >
                        Project Client
                      </button>
                      <button
                        onClick={() => setSelectedRole("developer")}
                        className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                          selectedRole === "developer"
                            ? "bg-[#1e293b] text-white"
                            : "text-muted-foreground hover:bg-[#0f172a]"
                        }`}
                      >
                        Project Developer
                      </button>
                      <button
                        onClick={() => setSelectedRole("viewer")}
                        className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                          selectedRole === "viewer"
                            ? "bg-[#1e293b] text-white"
                            : "text-muted-foreground hover:bg-[#0f172a]"
                        }`}
                      >
                        Project Viewer
                      </button>
                    </div>

                    {/* Custom Account Roles - Only available after board creation */}
                    <div className="space-y-2">
                      <h3 className="text-base font-medium text-muted-foreground mb-3">
                        Custom account roles
                      </h3>
                      <p className="text-sm text-muted-foreground px-4 py-3 bg-[#0f172a] rounded-lg">
                        Custom roles can be created after the board is set up in
                        the board settings.
                      </p>
                    </div>
                  </div>

                  {/* Right Content - Role Permissions */}
                  <div className="flex-1 space-y-6 max-h-[500px] overflow-y-auto pr-2">
                    <div>
                      <h3 className="text-xl font-medium text-white mb-2">
                        {selectedRole === "owner"
                          ? "Project Owner"
                          : selectedRole === "projectmanager"
                          ? "Project Manager"
                          : selectedRole === "admin"
                          ? "Project Architect"
                          : selectedRole === "client"
                          ? "Project Client"
                          : selectedRole === "developer"
                          ? "Project Developer"
                          : selectedRole === "viewer"
                          ? "Project Viewer"
                          : selectedRole.charAt(0).toUpperCase() +
                            selectedRole.slice(1).replace(/_/g, " ")}{" "}
                        permissions
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Define the default account-level permissions for your
                        users.
                      </p>
                    </div>

                    {BOARD_PERMISSION_CATEGORIES.map((category) => (
                      <div key={category.title} className="space-y-3">
                        <h4 className="text-base font-medium text-white">
                          {category.title}
                        </h4>
                        <div className="space-y-2">
                          {category.permissions.map((permission) => (
                            <div
                              key={permission.id}
                              className="flex items-center gap-3 p-3 bg-[#0f172a] rounded-lg"
                            >
                              <Checkbox
                                checked={
                                  currentPermissions[permission.id] || false
                                }
                                onCheckedChange={(checked) =>
                                  updateRolePermission(
                                    permission.id,
                                    checked as boolean
                                  )
                                }
                              />
                              <span className="text-white text-sm">
                                {permission.label}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}

                    {/* Default Hidden Section */}
                    <div className="space-y-3">
                      <h4 className="text-base font-medium text-white">
                        Default Hidden
                      </h4>
                      <div className="space-y-2">
                        {VISIBILITY_OPTIONS.map((item) => {
                          const isDisabled = isItemDisabledForHidden(item.id);
                          return (
                            <div
                              key={item.id}
                              className={`flex items-center gap-3 p-3 bg-[#0f172a] rounded-lg ${
                                isDisabled
                                  ? "cursor-not-allowed opacity-60"
                                  : ""
                              }`}
                            >
                              <Checkbox
                                checked={currentHiddenItems[item.id] || false}
                                onCheckedChange={(checked) =>
                                  updateRoleHiddenItem(
                                    item.id,
                                    checked as boolean
                                  )
                                }
                                className={
                                  isDisabled ? "cursor-not-allowed" : ""
                                }
                              />
                              <span
                                className={`text-white text-sm ${
                                  isDisabled ? "cursor-not-allowed" : ""
                                }`}
                              >
                                {item.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Default View Only Section */}
                    <div className="space-y-3">
                      <h4 className="text-base font-medium text-white">
                        Default View Only
                      </h4>
                      <div className="space-y-2">
                        {VISIBILITY_OPTIONS.map((item) => {
                          const isDisabled = isItemDisabledForViewOnly(item.id);
                          return (
                            <div
                              key={item.id}
                              className={`flex items-center gap-3 p-3 bg-[#0f172a] rounded-lg ${
                                isDisabled
                                  ? "cursor-not-allowed opacity-60"
                                  : ""
                              }`}
                            >
                              <Checkbox
                                checked={currentViewOnlyItems[item.id] || false}
                                onCheckedChange={(checked) =>
                                  updateRoleViewOnlyItem(
                                    item.id,
                                    checked as boolean
                                  )
                                }
                                className={
                                  isDisabled ? "cursor-not-allowed" : ""
                                }
                              />
                              <span
                                className={`text-white text-sm ${
                                  isDisabled ? "cursor-not-allowed" : ""
                                }`}
                              >
                                {item.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Default View & Edit Access Section */}
                    <div className="space-y-3">
                      <h4 className="text-base font-medium text-white">
                        Default View & Edit Access
                      </h4>
                      <div className="space-y-2">
                        {VISIBILITY_OPTIONS.map((item) => {
                          const isDisabled = isItemDisabledForViewEdit(item.id);
                          return (
                            <div
                              key={item.id}
                              className={`flex items-center gap-3 p-3 bg-[#0f172a] rounded-lg ${
                                isDisabled
                                  ? "cursor-not-allowed opacity-60"
                                  : ""
                              }`}
                            >
                              <Checkbox
                                checked={currentViewEditItems[item.id] || false}
                                onCheckedChange={(checked) =>
                                  updateRoleViewEditItem(
                                    item.id,
                                    checked as boolean
                                  )
                                }
                                className={
                                  isDisabled ? "cursor-not-allowed" : ""
                                }
                              />
                              <span
                                className={`text-white text-sm ${
                                  isDisabled ? "cursor-not-allowed" : ""
                                }`}
                              >
                                {item.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-[#334155]">
                      <Button
                        onClick={handleSavePermissions}
                        className="bg-[#3b82f6] hover:bg-[#2563eb] text-white"
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-[#334155]">
          <Button
            variant="ghost"
            onClick={handleCancel}
            className="text-white hover:bg-[#334155]"
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            className="bg-[#3b82f6] text-white hover:bg-[#2563eb]"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Add board"
            )}
          </Button>
        </div>
      </DialogContent>

      {/* Create Role Dialog */}
      <AlertDialog
        open={createRoleDialogOpen}
        onOpenChange={setCreateRoleDialogOpen}
      >
        <AlertDialogContent className="bg-[#1e293b] border-[#334155] text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl">
              Create new role
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Enter a name for the new custom role.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Input
              placeholder="Role name"
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
              className="bg-[#0f172a] border-[#334155] text-white placeholder:text-gray-500"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-[#334155] text-white hover:bg-[#334155]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCreateCustomRole}
              className="bg-[#3b82f6] text-white hover:bg-[#2563eb]"
            >
              Create
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
