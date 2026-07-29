import { useState, useEffect } from "react";
import { X, Search, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "@/store";
import { organizationApi, type OrganizationMember } from "@/features/organization/api/organizationApi";
import { getRoles } from "@/features/cms/services/cmsStorage";
import type { Role } from "@/features/cms/types/types";
import { getCurrentUserId } from "@/utils/utils";
// import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/ui/popover";
import { Avatar, AvatarFallback } from "@/shared/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Checkbox } from "@/shared/ui/checkbox";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/shared/ui/tabs";
import { BOARD_PERMISSION_CATEGORIES } from "@/permissions";
import { toast } from "@/hooks/use-toast";
import { useBoards } from "@/hooks/useBoards";
import { debugLog } from "@/utils/debugLog";

interface AddBoardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBoardCreated?: () => void;
  workspaceId?: number;
  organizationId?: number;
}

interface BoardMember {
  user_id: string;
  role_id: string;
}

const PRESET_COLORS = [
  "#16a249", // green
  "#2563eb", // blue
  "#a855f7", // purple
  "#dc2828", // red
  "#facc14", // yellow
  "#ff8400", // orange
];

export function AddBoardDialog({
  open,
  onOpenChange,
  onBoardCreated,
  workspaceId = 1,
  organizationId,
}: AddBoardDialogProps) {
    const navigate = useNavigate();
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
  
  // Organization members state
  const [organizationMembers, setOrganizationMembers] = useState<OrganizationMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  
  // CMS Roles state
  const [roles, setRoles] = useState<Role[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);

  // Fetch organization members when dialog opens
  useEffect(() => {
    const fetchOrganizationMembers = async () => {
      if (!open || !organizationId) return;
      
      setLoadingMembers(true);
      try {
        const membersData = await organizationApi.getOrganizationMembers(organizationId);
        setOrganizationMembers(membersData);
      } catch (error) {
        console.error("Failed to fetch organization members:", error);
        toast({
          title: "Error",
          description: "Failed to load organization members",
          variant: "destructive",
        });
      } finally {
        setLoadingMembers(false);
      }
    };

    fetchOrganizationMembers();
  }, [open, organizationId]);

  // Fetch CMS roles when dialog opens
  useEffect(() => {
    const fetchRoles = async () => {
      if (!open || !organizationId) return;
      
      setLoadingRoles(true);
      try {
        const userId = getCurrentUserId();
        const rolesData = await getRoles({
          organization_id: organizationId,
          board_id: 0, // Use 0 for organization-level roles
          user_id: userId,
        });
        setRoles(rolesData);
      } catch (error) {
        console.error("Failed to fetch roles:", error);
        toast({
          title: "Error",
          description: "Failed to load roles",
          variant: "destructive",
        });
      } finally {
        setLoadingRoles(false);
      }
    };

    fetchRoles();
  }, [open, organizationId]);
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
      "hsl(var(--primary))", // blue
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
  const availableUsers = organizationMembers.filter(
    (member) =>
      member.user_id !== String(currentUser?.user_id) &&
      !members.some((m) => m.user_id === member.user_id)
  );

  const filteredAvailableUsers = availableUsers.filter((member) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      member.display_name.toLowerCase().includes(searchLower) ||
      member.user_email.toLowerCase().includes(searchLower) ||
      member.first_name.toLowerCase().includes(searchLower) ||
      member.last_name.toLowerCase().includes(searchLower)
    );
  });

  const handleAddMember = (userId: string) => {
    // Default to first role if available, otherwise empty string
    const defaultRoleId = roles.length > 0 ? roles[0].id : "";
    setMembers([...members, { user_id: userId, role_id: defaultRoleId }]);
    setSearchQuery("");
  };

  const handleRoleChange = (userId: string, newRoleId: string) => {
    setMembers(
      members.map((m) =>
        m.user_id === userId ? { ...m, role_id: newRoleId } : m
      )
    );
  };

  const handleRemoveMember = (userId: string) => {
    setMembers(members.filter((m) => m.user_id !== userId));
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
      // Find the "Organization Admin" role ID from fetched roles
      const orgAdminRole = roles.find((r) => r.name === "Organization Admin");
      // Use the found ID, or fallback to 5 as per user's requirement/hint
      const creatorRoleId = orgAdminRole ? orgAdminRole.id : "5";

      // Prepare members array including the creator (current user) with "Organization Admin" role
      const allMembers = [
        {
          user_id: Number(currentUser?.user_id || getCurrentUserId()),
          role_id: Number(creatorRoleId),
        },
        ...members.map((m) => ({
          user_id: Number(m.user_id),
          role_id: Number(m.role_id),
        })),
      ];

      // Call API to create board
      const result = await createBoard({
        name: boardName.trim(),
        organization_id: organizationId,
        workspace_id: workspaceId,
        icon_type: "letter",
        icon_value: boardName.charAt(0).toUpperCase(),
        icon_color: iconColor,
        members: allMembers,
      });

      if (result.type === "boards/createBoard/fulfilled") {
        
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
          navigate(`/org/${organizationId}/board/${createdBoardId}`);
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
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto bg-background border-border text-foreground">
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
                className="relative h-32 w-32 rounded-3xl flex items-center justify-center text-foreground text-6xl font-light transition-transform hover:scale-105 cursor-pointer"
                style={{ backgroundColor: iconColor }}
              >
                {getInitial()}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-3 bg-background border-border">
              <div className="grid grid-cols-3 gap-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    className="h-10 w-10 rounded-lg transition-transform hover:scale-110 border-2 border-transparent hover:border-foreground"
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
            <Label htmlFor="board-name" className="text-foreground text-base">
              Board name
            </Label>
            <Input
              id="board-name"
              value={boardName}
              placeholder="New Board"
              onChange={(e) => setBoardName(e.target.value)}
              className="bg-muted border-primary text-foreground placeholder:text-muted-foreground focus-visible:ring-primary"
            />
          </div>

          {/* Permissions Section */}
          <div className="w-full space-y-2">
            <Label className="text-foreground text-base">Permissions</Label>
            <p className="text-muted-foreground text-sm">
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
              <TabsList className="grid w-full grid-cols-2 bg-muted border border-border">
                <TabsTrigger
                  value="user-management"
                  className="data-[state=active]:bg-background data-[state=active]:text-foreground"
                >
                  User management
                </TabsTrigger>
                <TabsTrigger
                  value="permissions"
                  className="data-[state=active]:bg-background data-[state=active]:text-foreground"
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
                    className="pl-10 bg-muted border-border text-foreground placeholder:text-muted-foreground"
                  />

                  {/* Search Results Dropdown */}
                  {searchQuery && filteredAvailableUsers.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
                      {filteredAvailableUsers.map((member) => (
                        <button
                          key={member.user_id}
                          onClick={() => handleAddMember(member.user_id)}
                          className="w-full px-4 py-2 text-left hover:bg-accent flex items-center gap-3"
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarFallback
                              style={{ backgroundColor: getAvatarColor(Number(member.user_id)) }}
                            >
                              {getUserInitials(member.display_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="text-foreground">{member.display_name}</span>
                            <span className="text-xs text-muted-foreground">
                              {member.user_email}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Loading state */}
                  {loadingMembers && (
                    <div className="absolute z-10 w-full mt-1 bg-background border border-border rounded-md shadow-lg p-4 text-center">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto text-foreground" />
                      <p className="text-sm text-muted-foreground mt-2">Loading members...</p>
                    </div>
                  )}
                </div>

                {/* Current User (Creator) - Always shown as Admin */}
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Board creator</p>
                  <div className="flex items-center gap-3 p-3 bg-muted rounded-lg border border-border">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback
                        style={{ backgroundColor: currentUser ? getAvatarColor(currentUser.user_id) : "hsl(var(--primary))" }}
                      >
                        {currentUser ? getUserInitials(currentUser.name) : "?"}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1">
                      <div className="font-medium text-foreground">
                        {currentUser?.name || "Unknown User"}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {currentUser?.email || "No email"}
                      </div>
                    </div>

                    <div className="px-3 py-2 bg-background border border-border rounded-md text-sm text-foreground">
                      Organization Admin
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
                      const memberData = organizationMembers.find(
                        (m) => m.user_id === member.user_id
                      );
                      if (!memberData) return null;

                      return (
                        <div
                          key={member.user_id}
                          className="flex items-center gap-3 p-3 bg-muted rounded-lg"
                        >
                          <Avatar className="h-10 w-10">
                            <AvatarFallback
                              style={{ backgroundColor: getAvatarColor(Number(memberData.user_id)) }}
                            >
                              {getUserInitials(memberData.display_name)}
                            </AvatarFallback>
                          </Avatar>

                          <div className="flex-1">
                            <div className="font-medium text-foreground">
                              {memberData.display_name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {memberData.user_email}
                            </div>
                          </div>

                          <Select
                            value={member.role_id}
                            onValueChange={(value) =>
                              handleRoleChange(member.user_id, value)
                            }
                            disabled={loadingRoles || roles.length === 0}
                          >
                            <SelectTrigger className="w-48 bg-background border-border">
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent>
                              {roles.map((role) => (
                                <SelectItem key={role.id} value={role.id}>
                                  {role.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              handleRemoveMember(member.user_id)
                            }
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
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
                      <h3 className="text-base font-medium text-foreground mb-3">
                        Default account roles
                      </h3>
                      <button
                        onClick={() => setSelectedRole("owner")}
                        className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                          selectedRole === "owner"
                            ? "bg-background text-foreground"
                            : "text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        Project Owner
                      </button>
                      <button
                        onClick={() => setSelectedRole("admin")}
                        className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                          selectedRole === "admin"
                            ? "bg-background text-foreground"
                            : "text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        Project Architect
                      </button>
                      <button
                        onClick={() => setSelectedRole("projectmanager")}
                        className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                          selectedRole === "projectmanager"
                            ? "bg-background text-foreground"
                            : "text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        Project Manager
                      </button>
                      <button
                        onClick={() => setSelectedRole("client")}
                        className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                          selectedRole === "client"
                            ? "bg-background text-foreground"
                            : "text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        Project Client
                      </button>
                      <button
                        onClick={() => setSelectedRole("developer")}
                        className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                          selectedRole === "developer"
                            ? "bg-background text-foreground"
                            : "text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        Project Developer
                      </button>
                      <button
                        onClick={() => setSelectedRole("viewer")}
                        className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                          selectedRole === "viewer"
                            ? "bg-background text-foreground"
                            : "text-muted-foreground hover:bg-muted"
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
                      <p className="text-sm text-muted-foreground px-4 py-3 bg-muted rounded-lg">
                        Custom roles can be created after the board is set up in
                        the board settings.
                      </p>
                    </div>
                  </div>

                  {/* Right Content - Role Permissions */}
                  <div className="flex-1 space-y-6 max-h-[500px] overflow-y-auto pr-2">
                    <div>
                      <h3 className="text-xl font-medium text-foreground mb-2">
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
                        <h4 className="text-base font-medium text-foreground">
                          {category.title}
                        </h4>
                        <div className="space-y-2">
                          {category.permissions.map((permission) => (
                            <div
                              key={permission.id}
                              className="flex items-center gap-3 p-3 bg-muted rounded-lg"
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
                              <span className="text-foreground text-sm">
                                {permission.label}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}

                    {/* Default Hidden Section */}
                    <div className="space-y-3">
                      <h4 className="text-base font-medium text-foreground">
                        Default Hidden
                      </h4>
                      <div className="space-y-2">
                        {VISIBILITY_OPTIONS.map((item) => {
                          const isDisabled = isItemDisabledForHidden(item.id);
                          return (
                            <div
                              key={item.id}
                              className={`flex items-center gap-3 p-3 bg-muted rounded-lg ${
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
                                className={`text-foreground text-sm ${
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
                      <h4 className="text-base font-medium text-foreground">
                        Default View Only
                      </h4>
                      <div className="space-y-2">
                        {VISIBILITY_OPTIONS.map((item) => {
                          const isDisabled = isItemDisabledForViewOnly(item.id);
                          return (
                            <div
                              key={item.id}
                              className={`flex items-center gap-3 p-3 bg-muted rounded-lg ${
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
                                className={`text-foreground text-sm ${
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
                      <h4 className="text-base font-medium text-foreground">
                        Default View & Edit Access
                      </h4>
                      <div className="space-y-2">
                        {VISIBILITY_OPTIONS.map((item) => {
                          const isDisabled = isItemDisabledForViewEdit(item.id);
                          return (
                            <div
                              key={item.id}
                              className={`flex items-center gap-3 p-3 bg-muted rounded-lg ${
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
                                className={`text-foreground text-sm ${
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

                    <div className="pt-4 border-t border-border">
                      <Button
                        onClick={handleSavePermissions}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground"
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
        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button
            variant="ghost"
            onClick={handleCancel}
            className="text-foreground hover:bg-accent"
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
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
        <AlertDialogContent className="bg-background border-border text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl">
              Create new role
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Enter a name for the new custom role.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Input
              placeholder="Role name"
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
              className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-border text-foreground hover:bg-accent">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCreateCustomRole}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Create
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
