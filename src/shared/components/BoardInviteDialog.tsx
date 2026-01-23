import { useState, useEffect, useMemo } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Avatar, AvatarFallback } from "@/shared/components/ui/avatar";
import { X, Plus, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { tasksApi } from "@/features/tasks/tasksApi";
import api from "@/lib/axios";
// import { supabase } from "@/integrations/supabase/client"; // To be replaced with your API
// import { useTestUser } from "@/contexts/TestUserContext"; // To be replaced

interface BoardInviteDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    boardId: string;
    onMembersUpdate?: () => void;
}

// Email validation helper
const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

// Temporary Mock Data for users available in the system
// In your full app, you would fetch this from an endpoint like /users/search or similar
const MOCK_AVAILABLE_USERS = [
    { id: "101", name: "Alice Johnson", avatarColor: "hsl(221, 83%, 53%)" },
    { id: "102", name: "Bob Smith", avatarColor: "hsl(142, 71%, 45%)" },
    { id: "103", name: "Charlie Davis", avatarColor: "hsl(330, 81%, 60%)" },
    { id: "104", name: "David Wilson", avatarColor: "hsl(262, 83%, 58%)" },
];

export function BoardInviteDialog({ open, onOpenChange, boardId, onMembersUpdate }: BoardInviteDialogProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [members, setMembers] = useState<Array<{ id: string; test_user_id: string; role: string; name: string; avatarColor?: string }>>([]);
    const [isInviting, setIsInviting] = useState(false);
    const { toast } = useToast();

    // Check if search query is a valid email
    const isEmail = useMemo(() => isValidEmail(searchQuery.trim()), [searchQuery]);

    useEffect(() => {
        if (open && boardId) {
            loadMembers();
        }
    }, [open, boardId]);

    useEffect(() => {
        if (!open) {
            setSearchQuery("");
        }
    }, [open]);

    const loadMembers = async () => {
        if (!boardId) return;

        // Using your tasksApi from before to mock getting members
        try {
            const tasks = await tasksApi.getTasksByBoardId(Number(boardId));
            const uniqueMembers = new Map();

            tasks.forEach((t: any) => {
                if (t.assignee) {
                    uniqueMembers.set(String(t.assignee.id), {
                        id: String(t.assignee.id), // Member ID (using user id for simplicity here)
                        test_user_id: String(t.assignee.id),
                        name: t.assignee.name,
                        role: "viewer", // Default logic
                        avatarColor: "hsl(221, 83%, 53%)"
                    });
                }
            });
            setMembers(Array.from(uniqueMembers.values()));

        } catch (e) {
            console.error(e);
        }
    };

    // Filter available users (not already in board) based on search
    const availableUsers = useMemo(() => {
        const memberIds = new Set(members.map(m => m.test_user_id));
        const available = MOCK_AVAILABLE_USERS.filter(user => !memberIds.has(user.id));

        if (!searchQuery.trim()) {
            return [];
        }

        return available.filter(user =>
            user.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [members, searchQuery]);

    // Filter current members based on search
    const filteredMembers = useMemo(() => {
        if (!searchQuery.trim()) {
            return members;
        }

        return members.filter(member => {
            return member.name.toLowerCase().includes(searchQuery.toLowerCase());
        });
    }, [members, searchQuery]);

    const handleAddMember = async (userId: string) => {
        // In a real implementation: call API to add member
        // await api.addBoardMember(boardId, userId);

        toast({
            title: "Member added",
            description: "Member has been added to the project (Mock)",
        });

        setSearchQuery("");
        // Simulate updating list
        const user = MOCK_AVAILABLE_USERS.find(u => u.id === userId);
        if (user) {
            setMembers(prev => [...prev, {
                id: user.id,
                test_user_id: user.id,
                name: user.name,
                role: "Viewer",
                avatarColor: user.avatarColor
            }])
        }

        onMembersUpdate?.();
    };

    const handleRemoveMember = async (memberUserId: string) => {
        // In a real implementation: call API to remove member
        // await api.removeBoardMember(boardId, memberId);

        toast({
            title: "Member removed",
            description: "Member has been removed from the board (Mock)",
        });

        setMembers(prev => prev.filter(m => m.test_user_id !== memberUserId));
        onMembersUpdate?.();
    };

    const handleInviteByEmail = async () => {
        if (!isEmail || !searchQuery.trim()) return;

        setIsInviting(true);
        try {
            // Get organization_id from localStorage or context
            const organizationId = localStorage.getItem('organization_id') || '2'; // Default to 2 if not found

            await api.post('/invite-user', {
                email: searchQuery.trim(),
                organization_id: parseInt(organizationId),
                board_id: parseInt(boardId),
                role_id: 2 // Default role_id, you can make this configurable
            });

            toast({
                title: "Invitation sent",
                description: `Invitation has been sent to ${searchQuery.trim()}`,
            });

            setSearchQuery("");
            loadMembers();
            onMembersUpdate?.();
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
                                {availableUsers.map((user) => (
                                    <button
                                        key={user.id}
                                        onClick={() => handleAddMember(user.id)}
                                        className="w-full flex items-center gap-4 p-4 hover:bg-[#4a4e6b] transition-colors"
                                    >
                                        <Avatar className="w-10 h-10">
                                            <AvatarFallback style={{ backgroundColor: user.avatarColor }}>
                                                <span className="text-white font-semibold">
                                                    {user.name.charAt(0)}
                                                </span>
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 text-left">
                                            <p className="text-base font-medium text-white">{user.name}</p>
                                        </div>
                                        <Plus className="h-5 w-5 text-gray-400" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-white">People in this board</h3>

                        {filteredMembers.length === 0 ? (
                            <p className="text-gray-400 text-center py-8">
                                {searchQuery.trim() ? "No members found" : "No members in this board"}
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
                                                <AvatarFallback style={{ backgroundColor: member.avatarColor || "hsl(221, 83%, 53%)" }}>
                                                    <span className="text-white font-semibold text-lg">
                                                        {member.name.charAt(0)}
                                                    </span>
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1">
                                                <p className="text-lg font-medium text-white">{member.name}</p>
                                                <p className="text-sm text-gray-400 capitalize">{member.role}</p>
                                            </div>
                                            <button
                                                onClick={() => handleRemoveMember(member.test_user_id)}
                                                className="p-2 hover:bg-[#404463] rounded-lg transition-colors"
                                            >
                                                <X className="h-5 w-5 text-gray-400 hover:text-white" />
                                            </button>
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