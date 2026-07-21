export interface Permission {
  id: string;
  label: string;
}

export interface PermissionCategory {
  title: string;
  permissions: Permission[];
}

// Workspace-level permission categories (includes all categories)
export const PERMISSION_CATEGORIES: PermissionCategory[] = [
  {
    title: "Boards",
    permissions: [
      { id: "create-boards", label: "Create boards" },
      { id: "delete-archive-boards", label: "Delete/Archive self-owned boards" },
    ],
  },
  {
    title: "Folders",
    permissions: [
      { id: "create-folders", label: "Create folders" },
      { id: "delete-archive-folders", label: "Delete/Archive self-owned folders" },
    ],
  },
  {
    title: "Docs",
    permissions: [
      { id: "create-doc", label: "Create Doc" },
      { id: "delete-archive-doc", label: "Delete/Archive self-owned Doc" },
    ],
  },
  {
    title: "Workspace",
    permissions: [
      { id: "invite-members-workspace", label: "Invite members to workspace" },
      { id: "remove-users-workspace", label: "Remove users in this workspace" },
      { id: "change-members-permissions-workspace", label: "Change members permissions in workspace" },
      { id: "delete-workspace", label: "Delete or rename this workspace" },
    ],
  },
];

// Board-level permission categories (only board-specific permissions)
export const BOARD_PERMISSION_CATEGORIES: PermissionCategory[] = [
  {
    title: "Board",
    permissions: [
      { id: "invite-members-board", label: "Invite members to board" },
      { id: "remove-users-board", label: "Remove users in this board" },
      { id: "change-members-permissions-board", label: "Change members permissions in board" },
      { id: "delete-board", label: "Delete or rename this board" },
    ],
  },
];

// Default role type
export type RoleType = "owner" | "projectmanager" | "admin" | "client" | "developer" | "viewer";

// Create initial permissions object for a role
export const createInitialPermissions = (): Record<string, boolean> => {
  const permissions: Record<string, boolean> = {};
  PERMISSION_CATEGORIES.forEach(category => {
    category.permissions.forEach(permission => {
      permissions[permission.id] = false;
    });
  });
  return permissions;
};

// Create initial permissions with all enabled (for owner/admin)
export const createAllEnabledPermissions = (): Record<string, boolean> => {
  const permissions: Record<string, boolean> = {};
  PERMISSION_CATEGORIES.forEach(category => {
    category.permissions.forEach(permission => {
      permissions[permission.id] = true;
    });
  });
  return permissions;
};

// Create project manager permissions (all enabled except specific ones)
export const createProjectManagerPermissions = (): Record<string, boolean> => {
  const permissions = createAllEnabledPermissions();
  permissions["change-members-permissions"] = false;
  permissions["create-boards"] = false;
  permissions["delete-archive-boards"] = false;
  return permissions;
};

// Create developer permissions (specific ones enabled)
export const createDeveloperPermissions = (): Record<string, boolean> => {
  const permissions = createInitialPermissions();
  permissions["create-folders"] = true;
  permissions["delete-archive-folders"] = true;
  return permissions;
};

// Create initial role permissions for all default roles
export const createInitialRolePermissions = () => {
  const roles: Record<RoleType, Record<string, boolean>> = {
    owner: createAllEnabledPermissions(),
    projectmanager: createProjectManagerPermissions(),
    admin: createAllEnabledPermissions(),
    client: createInitialPermissions(),
    developer: createDeveloperPermissions(),
    viewer: createInitialPermissions(),
  };
  return roles;
};
