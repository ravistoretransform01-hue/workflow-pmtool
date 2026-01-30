import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Avatar, AvatarFallback } from "@/shared/components/ui/avatar";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
// import { supabase } from "@/integrations/supabase/client";
import { useTestUser } from "@/contexts/TestUserContext";
import { Button } from "@/shared/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

interface InviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId?: string;
  userPermissions?: Record<string, boolean>;
}

export function InviteDialog({
  open,
  onOpenChange,
  workspaceId,
  userPermissions = {},
}: InviteDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  // const [members, setMembers] = useState<Array<{ id: string; test_user_id: string; role: string }>>([]);
  const [members] = useState<
    Array<{ id: string; test_user_id: string; role: string }>
  >([]);
  const [selectedRoles, setSelectedRoles] = useState<Record<string, string>>(
    {}
  );
  const { testUsers } = useTestUser();
  const { toast } = useToast();

  useEffect(() => {
    if (open && workspaceId) {
      loadMembers();
    }
  }, [open, workspaceId]);

  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      setSelectedRoles({});
    }
  }, [open]);

  const loadMembers = async () => {
    if (!workspaceId) return;

    // const { data, error } = await supabase
    //   .from('workspace_members')
    //   .select('*')
    //   .eq('workspace_id', workspaceId);

    // if (error) {
    //   console.error('Error loading members:', error);
    //   return;
    // }

    // setMembers(data || []);
  };

  // Filter available users (not already in workspace) based on search
  const availableUsers = useMemo(() => {
    const memberIds = new Set(members.map((m) => m.test_user_id));
    const available = testUsers.filter((user) => !memberIds.has(user.id));

    if (!searchQuery.trim()) {
      return [];
    }

    return available.filter((user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [testUsers, members, searchQuery]);

  // Filter current members based on search
  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) {
      return members;
    }

    return members.filter((member) => {
      const user = testUsers.find((u) => u.id === member.test_user_id);
      return (
        user && user.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });
  }, [members, testUsers, searchQuery]);

  const handleAddMember = async (userId: string) => {
    if (userId === undefined) return;
    // if (!workspaceId) return;

    // const role = selectedRoles[userId] || 'viewer'; // Default to viewer if not selected

    // const { error } = await supabase
    //   .from('workspace_members')
    //   .insert({
    //     workspace_id: workspaceId,
    //     test_user_id: userId,
    //     role: role
    //   });

    // if (error) {
    //   toast({
    //     title: "Error",
    //     description: "Failed to add member",
    //     variant: "destructive",
    //   });
    //   return;
    // }

    // toast({
    //   title: "Member added",
    //   description: "Member has been added to the workspace",
    // });

    // setSearchQuery("");
    // setSelectedRoles({});
    // loadMembers();
  };

  const canRemoveMembers = userPermissions["remove-users-workspace"] === true;

  const handleRemoveMember = async (memberId: string) => {
    if (memberId === undefined) return;
    // if (!canRemoveMembers) {
    //   toast({
    //     title: "Permission Denied",
    //     description: "You do not have permission to remove members from this workspace",
    //     variant: "destructive",
    //   });
    //   return;
    // }

    // const { error } = await supabase
    //   .from('workspace_members')
    //   .delete()
    //   .eq('id', memberId);

    // if (error) {
    //   toast({
    //     title: "Error",
    //     description: "Failed to remove member",
    //     variant: "destructive",
    //   });
    //   return;
    // }

    toast({
      title: "Member Removed",
      description: "Member Has Been Removed From The Workspace",
    });

    loadMembers();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-[#2d3250] max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl text-white font-semibold">
            Invite to this workspace
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-6 overflow-y-auto flex-1">
          <div className="relative">
            <Input
              placeholder="Search by name, team, or email address"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#404463] border-2 border-primary text-white placeholder:text-gray-400 h-14 text-base focus-visible:ring-0 focus-visible:ring-offset-0"
            />

            {/* Available users dropdown */}
            {searchQuery.trim() && availableUsers.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-[#404463] border-2 border-primary rounded-lg shadow-lg z-50 max-h-[200px] overflow-y-auto">
                {availableUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center gap-4 p-4 hover:bg-[#4a4e6b]"
                  >
                    <Avatar className="w-10 h-10">
                      <AvatarFallback
                        style={{ backgroundColor: user.avatarColor }}
                      >
                        <span className="text-white font-semibold">
                          {user.name.charAt(0)}
                        </span>
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-left">
                      <p className="text-base font-medium text-white">
                        {user.name}
                      </p>
                    </div>
                    <Select
                      value={selectedRoles[user.id] || "viewer"}
                      onValueChange={(value) =>
                        setSelectedRoles((prev) => ({
                          ...prev,
                          [user.id]: value,
                        }))
                      }
                    >
                      <SelectTrigger className="w-48 bg-[#2d3250] border-[#404463] text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#2d3250] border-[#404463]">
                        <SelectItem
                          value="projectmanager"
                          className="text-white"
                        >
                          Workspace Project Manager
                        </SelectItem>
                        <SelectItem value="admin" className="text-white">
                          Workspace Architect
                        </SelectItem>
                        <SelectItem value="client" className="text-white">
                          Workspace Client
                        </SelectItem>
                        <SelectItem value="developer" className="text-white">
                          Workspace Developer
                        </SelectItem>
                        <SelectItem value="viewer" className="text-white">
                          Workspace Viewer
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <button
                      onClick={() => handleAddMember(user.id)}
                      className="p-2 hover:bg-[#2d3250] rounded-lg transition-colors"
                    >
                      <Plus className="h-5 w-5 text-primary" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">
              People in this workspace
            </h3>

            {filteredMembers.length === 0 ? (
              <p className="text-gray-400 text-center py-8">
                {searchQuery.trim()
                  ? "No members found"
                  : "No members in this workspace"}
              </p>
            ) : (
              <div className="space-y-3">
                {filteredMembers.map((member) => {
                  const user = testUsers.find(
                    (u) => u.id === member.test_user_id
                  );
                  if (!user) return null;

                  return (
                    <div
                      key={member.id}
                      className="flex items-center gap-4 py-2"
                    >
                      <Avatar className="w-12 h-12">
                        <AvatarFallback
                          style={{ backgroundColor: user.avatarColor }}
                        >
                          <span className="text-white font-semibold text-lg">
                            {user.name.charAt(0)}
                          </span>
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-lg font-medium text-white">
                          {user.name}
                        </p>
                        <p className="text-sm text-gray-400 capitalize">
                          {member.role === "owner"
                            ? "Workspace Owner"
                            : member.role === "admin"
                            ? "Workspace Architect"
                            : member.role === "client"
                            ? "Workspace Client"
                            : member.role === "developer"
                            ? "Workspace Developer"
                            : member.role === "viewer"
                            ? "Workspace Viewer"
                            : member.role}
                        </p>
                      </div>
                      <Button
                        onClick={() => handleRemoveMember(member.id)}
                        disabled={member.role === "owner" || !canRemoveMembers}
                        variant="ghost"
                        className={`text-gray-400 hover:text-white disabled:opacity-50 ${
                          !canRemoveMembers
                            ? "cursor-not-allowed"
                            : "disabled:cursor-not-allowed"
                        }`}
                      >
                        Remove
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
