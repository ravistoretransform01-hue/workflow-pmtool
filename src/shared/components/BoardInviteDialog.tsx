import { useState, useEffect, useMemo } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Avatar, AvatarFallback } from "@/shared/components/ui/avatar";
import { Plus, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { organizationApi, type OrganizationMember } from "@/features/organization/organizationApi";
import { boardsApi } from "@/features/boards/boardsApi";
import { clearCMSCache } from "@/features/cms/cmsStorage";
import { getOrganizationId, getCurrentUserId } from "@/lib/utils";
import api from "@/lib/axios";

interface BoardInviteDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    boardId: string;
    currentMembers?: Array<{ id: string; name: string; email: string; role: string; avatarColor?: string }>;
    onMembersUpdate?: () => void;
}

// Email validation helper
const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

// Generate avatar color based on user name
const getAvatarColor = (name: string): string => {
    const colors = [
        "hsl(221, 83%, 53%)",
        "hsl(142, 71%, 45%)",
        "hsl(330, 81%, 60%)",
        "hsl(262, 83%, 58%)",
        "hsl(25, 95%, 53%)",
        "hsl(197, 71%, 52%)",
        "hsl(271, 81%, 60%)",
        "hsl(142, 76%, 36%)",
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
};

export function BoardInviteDialog({ open, onOpenChange, boardId, currentMembers = [], onMembersUpdate }: BoardInviteDialogProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [organizationMembers, setOrganizationMembers] = useState<OrganizationMember[]>([]);
    const [isLoadingOrgMembers, setIsLoadingOrgMembers] = useState(false);
    const [isInviting, setIsInviting] = useState(false);
    const [addingUserId, setAddingUserId] = useState<string | null>(null);
    const { toast } = useToast();

    // Check if search query is a valid email
    const isEmail = useMemo(() => isValidEmail(searchQuery.trim()), [searchQuery]);

    useEffect(() => {
        if (open && boardId) {
            loadOrganizationMembers();
        }
    }, [open, boardId]);

    useEffect(() => {
        if (!open) {
            setSearchQuery("");
        }
    }, [open]);

    const loadOrganizationMembers = async () => {
        setIsLoadingOrgMembers(true);
        try {
            const organizationId = getOrganizationId() || 2;
            const orgMembers = await organizationApi.getOrganizationMembers(organizationId);
            setOrganizationMembers(orgMembers);
        } catch (error) {
            console.error("Failed to load organization members:", error);
            toast({
                title: "Error",
                description: "Failed to load organization members",
                variant: "destructive",
            });
        } finally {
            setIsLoadingOrgMembers(false);
        }
    };

    // Filter available users (organization members not already in board) based on search
    const availableUsers = useMemo(() => {
        // Get current member user IDs to filter them out
        const currentMemberIds = new Set(currentMembers.map(member => member.id));
        
        // Get current user ID to filter them out from search results
        const currentUserId = getCurrentUserId();
        
        if (!searchQuery.trim()) {
            return [];
        }

        return organizationMembers.filter(orgMember => {
            // Filter out members who are already in the board
            const isAlreadyMember = currentMemberIds.has(orgMember.user_id);
            if (isAlreadyMember) return false;

            // Filter out current user to prevent self-invitation
            const isCurrentUser = currentUserId && orgMember.user_id === String(currentUserId);
            if (isCurrentUser) return false;

            // Filter by search query
            return orgMember.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                   orgMember.user_email.toLowerCase().includes(searchQuery.toLowerCase());
        });
    }, [organizationMembers, currentMembers, searchQuery]);

    // Filter current members based on search - REMOVED: Don't filter current members
    const filteredMembers = useMemo(() => {
        // Always show all current members, don't filter them by search
        return currentMembers;
    }, [currentMembers]);

    const handleAddMember = async (userId: string) => {
        setAddingUserId(userId);
        try {
            const organizationId = getOrganizationId() ?? 2;

            const response = await boardsApi.assignMembers({
                board_id: parseInt(boardId),
                user_id: parseInt(userId),
                role_id: 2, // Default role_id
                organization_id: organizationId
            });

            if (response.status === "success") {
                toast({
                    title: "Member added",
                    description: "Member has been successfully added to the board",
                });

                // Clear CMS cache to ensure fresh data is loaded
                clearCMSCache(parseInt(boardId));
                
                setSearchQuery("");
                
                // Add a small delay to ensure API operations are complete
                setTimeout(() => {
                    onMembersUpdate?.();
                }, 500);
            } else {
                throw new Error(response.message || "Failed to add member");
            }
        } catch (error: any) {
            console.error('Error adding member:', error);
            
            // Handle specific error cases
            if (error.response?.data?.error_type === "duplicate_entry") {
                toast({
                    title: "Already a member",
                    description: "This user is already a member of this board",
                    variant: "destructive",
                });
            } else {
                toast({
                    title: "Error",
                    description: error.response?.data?.message || error.message || "Failed to add member to board",
                    variant: "destructive",
                });
            }
        } finally {
            setAddingUserId(null);
        }
    };

    const handleInviteByEmail = async () => {
        if (!isEmail || !searchQuery.trim()) return;

        setIsInviting(true);
        try {
            const organizationId = getOrganizationId() || 2;

            await api.post('/invite-user', {
                email: searchQuery.trim(),
                organization_id: organizationId,
                board_id: parseInt(boardId),
                role_id: 2 // Default role_id, you can make this configurable
            });

            toast({
                title: "Invitation sent",
                description: `Invitation has been sent to ${searchQuery.trim()}`,
            });

            // Clear CMS cache to ensure fresh data is loaded
            clearCMSCache(parseInt(boardId));
            
            setSearchQuery("");
            
            // Add a small delay to ensure API operations are complete
            setTimeout(() => {
                onMembersUpdate?.();
            }, 500);
        } catch (error: any) {
            console.error('Error inviting user:', error);
            toast({
                title: "Error",
                description: error.response?.data?.message || "Failed to send invitation",
                variant: "destructive",
            });
        } finally {
            setIsInviting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl bg-[#2d3250] max-h-[80vh] overflow-hidden flex flex-col border-none text-white">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-semibold">Invite to this board</DialogTitle>
                </DialogHeader>

                <div className="space-y-6 mt-6 overflow-y-auto flex-1 p-1">
                    <div className="relative">
                        <Input
                            placeholder="Search by name, team, or email address"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && isEmail) {
                                    handleInviteByEmail();
                                }
                            }}
                            className="bg-[#404463] border-2 border-primary/50 text-white placeholder:text-gray-400 h-14 text-base focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-primary"
                        />

                        {/* Invite by email button */}
                        {searchQuery.trim() && isEmail && availableUsers.length === 0 && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-[#404463] border-2 border-primary rounded-lg shadow-lg z-50">
                                <button
                                    onClick={handleInviteByEmail}
                                    disabled={isInviting}
                                    className="w-full flex items-center gap-4 p-4 hover:bg-[#4a4e6b] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <UserPlus className="h-5 w-5 text-primary" />
                                    <div className="flex-1 text-left">
                                        <p className="text-base font-medium text-white">
                                            {isInviting ? 'Sending invitation...' : `Invite ${searchQuery.trim()}`}
                                        </p>
                                        <p className="text-sm text-gray-400">Send invitation to this email</p>
                                    </div>
                                    <Plus className="h-5 w-5 text-gray-400" />
                                </button>
                            </div>
                        )}

                        {/* Available users dropdown */}
                        {searchQuery.trim() && !isEmail && availableUsers.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-[#404463] border-2 border-primary rounded-lg shadow-lg z-50 max-h-[200px] overflow-y-auto">
                                {availableUsers.map((orgMember) => (
                                    <button
                                        key={orgMember.user_id}
                                        onClick={() => handleAddMember(orgMember.user_id)}
                                        disabled={addingUserId === orgMember.user_id}
                                        className="w-full flex items-center gap-4 p-4 hover:bg-[#4a4e6b] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <Avatar className="w-10 h-10">
                                            <AvatarFallback style={{ backgroundColor: getAvatarColor(orgMember.display_name) }}>
                                                <span className="text-white font-semibold">
                                                    {orgMember.display_name.charAt(0).toUpperCase()}
                                                </span>
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 text-left">
                                            <p className="text-base font-medium text-white">{orgMember.display_name}</p>
                                            <p className="text-sm text-gray-400">{orgMember.user_email}</p>
                                        </div>
                                        {addingUserId === orgMember.user_id ? (
                                            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                            <Plus className="h-5 w-5 text-gray-400" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Loading state for organization members */}
                        {searchQuery.trim() && !isEmail && isLoadingOrgMembers && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-[#404463] border-2 border-primary rounded-lg shadow-lg z-50">
                                <div className="p-4 text-center text-gray-400">
                                    Loading members...
                                </div>
                            </div>
                        )}

                        {/* No results message */}
                        {searchQuery.trim() && !isEmail && !isLoadingOrgMembers && availableUsers.length === 0 && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-[#404463] border-2 border-primary rounded-lg shadow-lg z-50">
                                <div className="p-4 text-center text-gray-400">
                                    No available members found
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-white">People in this board</h3>

                        {filteredMembers.length === 0 ? (
                            <p className="text-gray-400 text-center py-8">
                                No members in this board
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {filteredMembers.map((member) => {
                                    return (
                                        <div
                                            key={member.id}
                                            className="flex items-center gap-4 py-2"
                                        >
                                            <Avatar className="w-12 h-12">
                                                <AvatarFallback style={{ backgroundColor: member.avatarColor || getAvatarColor(member.name) }}>
                                                    <span className="text-white font-semibold text-lg">
                                                        {member.name.charAt(0).toUpperCase()}
                                                    </span>
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1">
                                                <p className="text-lg font-medium text-white">{member.name}</p>
                                                <p className="text-sm text-gray-400">{member.email}</p>
                                                <p className="text-xs text-gray-500 capitalize">{member.role}</p>
                                            </div>
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