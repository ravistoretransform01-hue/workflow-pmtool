import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
// import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PERMISSION_CATEGORIES, createInitialRolePermissions } from "@/lib/permissions";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectSeparator,
} from "@/shared/components/ui/select";
import { Avatar, AvatarFallback } from "@/shared/components/ui/avatar";
// import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Search, UserPlus, Trash2 } from "lucide-react";
import { InviteDialog } from "@/shared/components/InviteDialog";

const avatarColors = [
  "bg-gradient-to-br from-purple-500 to-pink-500",
  "bg-gradient-to-br from-blue-500 to-cyan-500",
  "bg-gradient-to-br from-green-500 to-emerald-500",
  "bg-gradient-to-br from-orange-500 to-red-500",
  "bg-gradient-to-br from-indigo-500 to-purple-500",
  "bg-gradient-to-br from-pink-500 to-rose-500",
];

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();
};

const getColorIndex = (id: string) => {
  // Generate consistent color index based on user id
  const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return hash % avatarColors.length;
};

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  joined: string;
  invitedBy: string;
  lastActive: string;
  isActive: boolean;
}

interface UserManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserManagementDialog({ open, onOpenChange }: UserManagementDialogProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState("Admin");
  const [customRoles, setCustomRoles] = useState<string[]>([]);
  const [createRoleOpen, setCreateRoleOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Role-specific permissions state - convert initial role permissions to use capitalized keys
  const [rolePermissions, setRolePermissions] = useState<Record<string, Record<string, boolean>>>(() => {
    const initial = createInitialRolePermissions();
    return {
      Owner: initial.owner,
      Admin: initial.admin,
      Client: initial.client,
      Developer: initial.developer,
      Viewer: initial.viewer,
    };
  });

  // Load permissions from database on mount
  useEffect(() => {
    const loadPermissions = async () => {
      // const { data, error } = await supabase
      //   .from('account_role_permissions')
      //   .select('role_name, permissions');

      // if (error) {
      //   console.error('Error loading permissions:', error);
      //   return;
      // }

      // if (data && data.length > 0) {
      //   const loadedPermissions: Record<string, Record<string, boolean>> = {};
      //   const loadedCustomRoles: string[] = [];

      //   data.forEach((row) => {
      //     loadedPermissions[row.role_name] = row.permissions as Record<string, boolean>;
          
      //     // Track custom roles (not default ones)
      //     if (!['Admin', 'Editor', 'Viewer'].includes(row.role_name)) {
      //       loadedCustomRoles.push(row.role_name);
      //     }
      //   });

      //   setRolePermissions(prev => ({ ...prev, ...loadedPermissions }));
      //   setCustomRoles(loadedCustomRoles);
      // }
    };

    if (open) {
      loadPermissions();
    }
  }, [open]);
  
  // Get permissions for the currently selected role
  const currentPermissions = rolePermissions[selectedRole] || {};
  
  // Update permission for the current role
  const updatePermission = (permissionKey: string, value: boolean) => {
    setRolePermissions(prev => ({
      ...prev,
      [selectedRole]: {
        ...prev[selectedRole],
        [permissionKey]: value,
      }
    }));
  };
  
  // Save permissions
  const handleSavePermissions = async () => {
    setIsLoading(true);
    try {
      // Upsert permissions for the selected role
      // const { error } = await supabase
      //   .from('account_role_permissions')
      //   .upsert({
      //     role_name: selectedRole,
      //     permissions: rolePermissions[selectedRole],
      //     updated_at: new Date().toISOString(),
      //   }, {
      //     onConflict: 'role_name'
      //   });

      // if (error) throw error;

      // toast({
      //   title: "Permissions saved",
      //   description: `${selectedRole} permissions have been updated successfully.`,
      // });
    } catch (error) {
      console.error('Error saving permissions:', error);
      toast({
        title: "Error",
        description: "Failed to save permissions. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Mock data - replace with actual data from your backend
  const [users, setUsers] = useState<User[]>([
    {
      id: "1",
      name: "Blake Newton",
      email: "blakeanewton@gmail.com",
      role: "Admin",
      avatar: "/placeholder.svg",
      joined: "Jun 15, 2022",
      invitedBy: "Blake Newton",
      lastActive: "Jan 04, 2023",
      isActive: true,
    },
    {
      id: "2",
      name: "Kyle Newton",
      email: "jkylenewton@gmail.com",
      role: "Admin",
      avatar: "/placeholder.svg",
      joined: "Oct 30, 2023",
      invitedBy: "Blake Newton",
      lastActive: "Oct 24, 2024",
      isActive: true,
    },
    {
      id: "3",
      name: "Brookolyn Newton",
      email: "brookolynalexis@gmail.com",
      role: "Admin",
      avatar: "/placeholder.svg",
      joined: "Nov 03, 2024",
      invitedBy: "Blake Newton",
      lastActive: "Aug 22, 2025",
      isActive: false,
    },
    {
      id: "4",
      name: "Daniel Pledger",
      email: "DanielPledger@Gmail.com",
      role: "Admin",
      avatar: "/placeholder.svg",
      joined: "Dec 10, 2024",
      invitedBy: "Blake Newton",
      lastActive: "Jan 15, 2025",
      isActive: true,
    },
  ]);

  const handleRoleChange = (userId: string, newRole: string) => {
    setUsers(users.map(user => 
      user.id === userId ? { ...user, role: newRole } : user
    ));
  };

  const handleUserAction = (userId: string, action: string) => {
    if (action === "deactivate") {
      setUsers(users.map(user => 
        user.id === userId ? { ...user, isActive: false } : user
      ));
    } else if (action === "activate") {
      setUsers(users.map(user => 
        user.id === userId ? { ...user, isActive: true } : user
      ));
    } else if (action === "delete") {
      setUsers(users.filter(user => user.id !== userId));
    }
  };

  const handleCreateRole = async () => {
    if (newRoleName.trim()) {
      const newRole = newRoleName.trim();
      
      // Save to database
      // const { error } = await supabase
      //   .from('account_role_permissions')
      //   .insert({
      //     role_name: newRole,
      //     permissions: rolePermissions[newRole] || createInitialRolePermissions().admin,
      //   });

      // if (error) {
      //   console.error('Error creating role:', error);
      //   toast({
      //     title: "Error",
      //     description: "Failed to create role. Please try again.",
      //     variant: "destructive",
      //   });
      //   return;
      // }

      setCustomRoles([...customRoles, newRole]);
      setRolePermissions(prev => ({
        ...prev,
        [newRole]: createInitialRolePermissions().admin,
      }));
      setNewRoleName("");
      setCreateRoleOpen(false);
      setSelectedRole(newRole);
      
      toast({
        title: "Role created",
        description: `${newRole} has been created successfully.`,
      });
    }
  };

  const handleDeleteRole = async (roleToDelete: string) => {
    // Delete from database
    // const { error } = await supabase
    //   .from('account_role_permissions')
    //   .delete()
    //   .eq('role_name', roleToDelete);

    // if (error) {
    //   console.error('Error deleting role:', error);
    //   toast({
    //     title: "Error",
    //     description: "Failed to delete role. Please try again.",
    //     variant: "destructive",
    //   });
    //   return;
    // }

    // Update local state
    setCustomRoles(customRoles.filter(role => role !== roleToDelete));
    
    // Remove from rolePermissions
    setRolePermissions(prev => {
      const updated = { ...prev };
      delete updated[roleToDelete];
      return updated;
    });
    
    // If the deleted role was selected, switch to Admin
    if (selectedRole === roleToDelete) {
      setSelectedRole("Admin");
    }
    
    toast({
      title: "Role deleted",
      description: `${roleToDelete} has been permanently deleted.`,
    });
  };

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl">Settings</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="user-management" className="flex-1 flex flex-col mt-4">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="user-management">User management</TabsTrigger>
            <TabsTrigger value="permissions">Permissions</TabsTrigger>
          </TabsList>
          
          <TabsContent value="user-management" className="flex-1 flex flex-col mt-0">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground z-10 pointer-events-none" />
                <Input
                  placeholder="Search user name / email"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button className="gap-2" onClick={() => setInviteDialogOpen(true)}>
                <UserPlus className="h-4 w-4" />
                Invite
              </Button>
            </div>

        <div className="text-sm text-muted-foreground mt-4">
          Showing: {filteredUsers.length} results
        </div>

        <div className="flex-1 overflow-auto mt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>User role</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Invited by</TableHead>
                <TableHead>Last active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className={`h-8 w-8 ${avatarColors[getColorIndex(user.id)]}`}>
                        <AvatarFallback className="text-sm font-semibold text-white bg-transparent">
                          {getInitials(user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{user.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.email}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={user.role}
                      onValueChange={(value) => {
                        if (value === "deactivate" || value === "activate" || value === "delete") {
                          handleUserAction(user.id, value);
                        } else {
                          handleRoleChange(user.id, value);
                        }
                      }}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Admin">Admin</SelectItem>
                        <SelectItem value="Editor">Editor</SelectItem>
                        <SelectItem value="Viewer">Viewer</SelectItem>
                        {customRoles.map((role) => (
                          <SelectItem key={role} value={role}>
                            {role}
                          </SelectItem>
                        ))}
                        <SelectSeparator />
                        {user.isActive ? (
                          <SelectItem value="deactivate">Deactivate user</SelectItem>
                        ) : (
                          <SelectItem value="activate">Activate user</SelectItem>
                        )}
                        <SelectItem value="delete" className="text-destructive">
                          Delete user
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.joined}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.invitedBy}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.lastActive}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
            </div>
          </TabsContent>
          
          <TabsContent value="permissions" className="flex-1 flex gap-4 overflow-hidden max-h-[calc(90vh-12rem)]">
            <div className="w-64 space-y-6 overflow-auto">
              <div className="space-y-2">
                <h3 className="text-sm font-semibold mb-3">Default account roles</h3>
                <div className="space-y-1">
                  <Button 
                    variant={selectedRole === "Admin" ? "secondary" : "ghost"} 
                    className="w-full justify-start"
                    onClick={() => setSelectedRole("Admin")}
                  >
                    Admin
                  </Button>
                  <Button 
                    variant={selectedRole === "Editor" ? "secondary" : "ghost"} 
                    className="w-full justify-start"
                    onClick={() => setSelectedRole("Editor")}
                  >
                    Editor
                  </Button>
                  <Button 
                    variant={selectedRole === "Viewer" ? "secondary" : "ghost"} 
                    className="w-full justify-start"
                    onClick={() => setSelectedRole("Viewer")}
                  >
                    Viewer
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-semibold mb-3">Custom account roles</h3>
                <div className="space-y-1">
                  {customRoles.map((role) => (
                    <div key={role} className="flex items-center gap-2">
                      <Button
                        variant={selectedRole === role ? "secondary" : "ghost"}
                        className="flex-1 justify-start"
                        onClick={() => setSelectedRole(role)}
                      >
                        {role}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDeleteRole(role)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-start gap-2 mt-2"
                  onClick={() => setCreateRoleOpen(true)}
                >
                  <span>+</span> New role
                </Button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-6 pr-2">
              <div>
                <h2 className="text-xl font-semibold mb-2">{selectedRole} permissions</h2>
                <p className="text-sm text-muted-foreground">
                  Define the default account-level permissions for your users.
                </p>
              </div>
              
              {PERMISSION_CATEGORIES.map((category) => (
                <div key={category.title} className="space-y-4">
                  <h3 className="text-sm font-semibold">{category.title}</h3>
                  <div className="space-y-3">
                    {category.permissions.map((permission) => (
                      <div key={permission.id} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                        <Checkbox 
                          id={`${selectedRole}-${permission.id}`}
                          checked={currentPermissions[permission.id] || false}
                          onCheckedChange={(checked) => updatePermission(permission.id, checked as boolean)}
                        />
                        <label htmlFor={`${selectedRole}-${permission.id}`} className="text-sm cursor-pointer flex-1">
                          {permission.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              
              {/* Save Button */}
              <div className="pt-6 pb-4 border-t">
                <Button 
                  onClick={handleSavePermissions} 
                  className="w-full sm:w-auto"
                  disabled={isLoading}
                >
                  {isLoading ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
      
      <AlertDialog open={createRoleOpen} onOpenChange={setCreateRoleOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Create new role</AlertDialogTitle>
            <AlertDialogDescription>
              Enter a name for the new custom role.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            placeholder="Role name"
            value={newRoleName}
            onChange={(e) => setNewRoleName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleCreateRole();
              }
            }}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleCreateRole}>
              Create
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <InviteDialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen} />
    </Dialog>
  );
}
