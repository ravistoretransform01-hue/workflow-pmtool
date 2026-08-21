import { useState, useEffect, useMemo, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Avatar, AvatarFallback } from "@/shared/ui/avatar";
import { Plus, X, Loader2, Mail, Check, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  organizationApi,
  type OrganizationMember,
} from "@/features/organization/api/organizationApi";
import { boardsApi } from "@/features/boards/api/boardsApi";
import { groupsApi } from "@/features/groups/api/groupsApi";
import type { Group } from "@/features/groups/types/types";
import {
  clearCMSCache,
  getMembers,
  getRoles,
} from "@/features/cms/services/cmsStorage";
import {
  getOrganizationId,
  getCurrentUserId,
  isClientRole,
} from "@/utils/utils";
import type { Role } from "@/features/cms/types/types";
import api from "@/config/axios";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Button } from "@/shared/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";

interface BoardInviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  boardId: string;
  currentMembers?: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    avatarColor?: string;
  }>;
  onMembersUpdate?: () => void;
}

interface SelectedInvitee {
  id?: string;
  name?: string;
  email: string;
  avatarColor?: string;
  type: "user" | "email";
}

// Email validation helper
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const normalizeSearchValue = (value?: string): string =>
  (value?.toLowerCase() || "").replace(/[^a-z0-9]/g, "");

const getMemberEmail = (member: OrganizationMember): string =>
  member.user_email || member.email || "";

const getMemberName = (member: OrganizationMember): string =>
  member.display_name || member.name || member.username || getMemberEmail(member);

// Generate avatar color based on name
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

export function BoardInviteDialog({
  open,
  onOpenChange,
  boardId,
  currentMembers,
  onMembersUpdate,
}: BoardInviteDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [organizationMembers, setOrganizationMembers] = useState<
    OrganizationMember[]
  >([]);
  const [isLoadingOrganizationMembers, setIsLoadingOrganizationMembers] =
    useState(false);
  const [isInviting, setIsInviting] = useState(false);

  const [internalBoardMembers, setInternalBoardMembers] = useState<
    Array<{
      id: string;
      name: string;
      email: string;
      role: string;
      avatarColor?: string;
    }>
  >([]);
  const [isLoadingBoardMembers, setIsLoadingBoardMembers] = useState(false);

  const [roles, setRoles] = useState<Role[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState("2"); // Default to 2 (Member)
  const [selectedInvitees, setSelectedInvitees] = useState<SelectedInvitee[]>(
    [],
  );
  const [boardGroups, setBoardGroups] = useState<Group[]>([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);

  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  // Check if search query is a valid email
  const isEmail = useMemo(
    () => isValidEmail(searchQuery.trim()),
    [searchQuery],
  );

  useEffect(() => {
    if (open && boardId) {
      loadOrganizationMembers();
      fetchRoles();
      loadBoardGroups();
    }
  }, [open, boardId]);

  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      setSelectedInvitees([]);
      setSelectedGroupIds([]);
    }
  }, [open]);

  // Load board members on mount or opening
  useEffect(() => {
    let isMounted = true;

    if (open && boardId && (!currentMembers || currentMembers.length === 0)) {
      const fetchInternalMembers = async () => {
        setIsLoadingBoardMembers(true);
        try {
          const organizationId = getOrganizationId() || 2;
          const userId = getCurrentUserId() || 1;
          const cmsMembers = await getMembers({
            organization_id: organizationId,
            board_id: parseInt(boardId),
            user_id: userId,
          });

          if (!isMounted) return;

          const transformedMembers = cmsMembers.map((member: any) => ({
            id: member.user_id,
            name: member.name,
            email: member.email || `${member.username || "user"}@example.com`,
            role: member.board_role_label || "Project Member",
            avatarColor: `hsl(${
              (parseInt(member.user_id) * 137) % 360
            }, 70%, 50%)`,
          }));

          setInternalBoardMembers(transformedMembers);
        } catch (error) {
          console.error("Failed to load board members:", error);
        } finally {
          if (isMounted) {
            setIsLoadingBoardMembers(false);
          }
        }
      };

      fetchInternalMembers();
    }

    return () => {
      isMounted = false;
    };
  }, [open, boardId, currentMembers?.length]);

  const loadBoardMembers = async () => {
    if (!boardId) return;
    setIsLoadingBoardMembers(true);
    try {
      const organizationId = getOrganizationId() || 2;
      const userId = getCurrentUserId() || 1;
      const cmsMembers = await getMembers({
        organization_id: organizationId,
        board_id: parseInt(boardId),
        user_id: userId,
      });

      const transformedMembers = cmsMembers.map((member: any) => ({
        id: member.user_id,
        name: member.name,
        email: member.email || `${member.username || "user"}@example.com`,
        role: member.board_role_label || "Project Member",
        avatarColor: `hsl(${(parseInt(member.user_id) * 137) % 360}, 70%, 50%)`,
      }));

      setInternalBoardMembers(transformedMembers);
    } catch (error) {
      console.error("Failed to load board members:", error);
    } finally {
      setIsLoadingBoardMembers(false);
    }
  };

  const loadOrganizationMembers = async () => {
    setIsLoadingOrganizationMembers(true);
    try {
      const organizationId = getOrganizationId() || 2;
      const orgMembers =
        await organizationApi.getOrganizationMembers(organizationId);
      setOrganizationMembers(orgMembers);
    } catch (error) {
      console.error("Failed to load organization members:", error);
      toast({
        title: "Error",
        description: "Failed to load organization members",
        variant: "destructive",
      });
    } finally {
      setIsLoadingOrganizationMembers(false);
    }
  };

  const fetchRoles = async () => {
    setLoadingRoles(true);
    try {
      const organizationId = getOrganizationId() || 2;
      const userId = getCurrentUserId();
      const rolesData = await getRoles({
        organization_id: organizationId,
        board_id: 0, // Using 0 for organization-level roles
        user_id: userId,
      });
      setRoles(rolesData);
      if (rolesData.length > 0) {
        // Default to the member role if found
        const memberRole = rolesData.find((r) =>
          r.name.toLowerCase().includes("member"),
        );
        setSelectedRoleId(memberRole ? memberRole.id : rolesData[0].id);
      }
    } catch (error) {
      console.error("Failed to load roles:", error);
    } finally {
      setLoadingRoles(false);
    }
  };

  const loadBoardGroups = async () => {
    if (!boardId) return;
    setIsLoadingGroups(true);
    try {
      const groupsData = await groupsApi.getGroupsByBoard(Number(boardId));
      setBoardGroups(groupsData);
    } catch (error) {
      console.error("Failed to load board groups:", error);
    } finally {
      setIsLoadingGroups(false);
    }
  };

  // Fallback static roles if API roles fail or are empty
  const effectiveRoles = useMemo(() => {
    if (roles && roles.length > 0) return roles;
    return [
      { id: "2", name: "Project Member" },
      { id: "5", name: "Organization Admin" },
      { id: "3", name: "Project Developer" },
      { id: "4", name: "Project Client" },
      { id: "6", name: "Project Viewer" },
    ];
  }, [roles]);

  const isSelectedRoleClient = useMemo(() => {
    const roleObj = effectiveRoles.find(
      (r) => String(r.id) === String(selectedRoleId),
    );
    return roleObj ? isClientRole(roleObj.name) : false;
  }, [selectedRoleId, effectiveRoles]);

  // Reset selected groups if the selected role is no longer Client
  useEffect(() => {
    if (!isSelectedRoleClient) {
      setSelectedGroupIds([]);
    }
  }, [isSelectedRoleClient]);

  // Current board members list helper
  const boardMembersList = useMemo(() => {
    return currentMembers && currentMembers.length > 0
      ? currentMembers
      : internalBoardMembers;
  }, [currentMembers, internalBoardMembers]);

  // Filter organization members for dropdown search (not already on board & not selected)
  const availableUsers = useMemo(() => {
    const selectedIds = new Set(
      selectedInvitees.map((item) => String(item.id)),
    );
    const currentUserId = getCurrentUserId();

    if (!searchQuery.trim()) {
      return [];
    }

    const normalizedQuery = normalizeSearchValue(searchQuery.trim());

    return organizationMembers.filter((orgMember) => {
      const isAlreadySelected = selectedIds.has(String(orgMember.user_id));
      if (isAlreadySelected) return false;

      const isCurrentUser =
        currentUserId && String(orgMember.user_id) === String(currentUserId);
      if (isCurrentUser) return false;

      const searchableValues = [
        getMemberName(orgMember),
        orgMember.username,
        getMemberEmail(orgMember),
        orgMember.first_name,
        orgMember.last_name,
      ];

      return searchableValues.some((value) =>
        normalizeSearchValue(value).includes(normalizedQuery),
      );
    });
  }, [organizationMembers, boardMembersList, selectedInvitees, searchQuery]);

  // Suggested people row (org members not on board and not in input chips)
  const suggestedPeople = useMemo(() => {
    const currentMemberIds = new Set(boardMembersList.map((m) => String(m.id)));
    const selectedIds = new Set(
      selectedInvitees.map((item) => String(item.id)),
    );
    const currentUserId = getCurrentUserId();

    return organizationMembers
      .filter((orgMember) => {
        const isMember = currentMemberIds.has(String(orgMember.user_id));
        const isSelected = selectedIds.has(String(orgMember.user_id));
        const isCurrentUser =
          currentUserId && String(orgMember.user_id) === String(currentUserId);
        return !isMember && !isSelected && !isCurrentUser;
      })
      .slice(0, 4); // Limit to top 4 recommendations
  }, [organizationMembers, boardMembersList, selectedInvitees]);

  const handleSelectUser = (user: OrganizationMember) => {
    const userEmail = getMemberEmail(user);
    const isAlreadyOnBoard = boardMembersList.some(
      (member) =>
        String(member.id) === String(user.user_id) ||
        member.email?.toLowerCase() === userEmail.toLowerCase(),
    );

    if (isAlreadyOnBoard) {
      toast({
        title: "This user is already a member of this board.",
      });
      setSearchQuery("");
      return;
    }

    if (selectedInvitees.some((item) => item.id === user.user_id)) {
      setSearchQuery("");
      return;
    }

    setSelectedInvitees((prev) => [
      ...prev,
      {
        id: user.user_id,
        name: getMemberName(user),
        email: userEmail,
        type: "user",
        avatarColor: getAvatarColor(
          getMemberName(user),
        ),
      },
    ]);
    setSearchQuery("");
    inputRef.current?.focus();
  };

  const handleAddSuggested = (user: OrganizationMember) => {
    setSelectedInvitees((prev) => [
      ...prev,
      {
        id: user.user_id,
        name: getMemberName(user),
        email: getMemberEmail(user),
        type: "user",
        avatarColor: getAvatarColor(
          getMemberName(user),
        ),
      },
    ]);
  };

  const handleRemoveSelectedInvitee = (index: number) => {
    setSelectedInvitees((prev) => prev.filter((_, i) => i !== index));
  };

  const findOrganizationMemberByEmail = (email: string) =>
    organizationMembers.find(
      (member) =>
        getMemberEmail(member).toLowerCase() === email.trim().toLowerCase(),
    );

  const matchingEmailMember = isEmail
    ? findOrganizationMemberByEmail(searchQuery.trim())
    : undefined;
  const isEmailAlreadyOnBoard = isEmail
    ? boardMembersList.some(
        (member) =>
          member.email?.toLowerCase() === searchQuery.trim().toLowerCase() ||
          (matchingEmailMember &&
            String(member.id) === String(matchingEmailMember.user_id)),
      )
    : false;

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "," || e.key === "Tab") {
      e.preventDefault();
      const val = searchQuery.trim();
      if (!val) return;

      if (isValidEmail(val)) {
        if (
          selectedInvitees.some(
            (item) => item.email.toLowerCase() === val.toLowerCase(),
          )
        ) {
          toast({
            title: "Already added",
            description: `${val} is already in the list.`,
            variant: "destructive",
          });
          return;
        }

        const isMember = boardMembersList.some(
          (m) => m.email?.toLowerCase() === val.toLowerCase(),
        );
        if (isMember) {
          toast({
            title: "This user is already a member of this board.",
            variant: "destructive",
          });
          return;
        }

        const organizationMember = findOrganizationMemberByEmail(val);
        setSelectedInvitees((prev) => [
          ...prev,
          organizationMember
            ? {
                id: organizationMember.user_id,
                name: getMemberName(organizationMember),
                email: getMemberEmail(organizationMember),
                type: "user",
                avatarColor: getAvatarColor(getMemberName(organizationMember)),
              }
            : {
                email: val,
                type: "email",
                avatarColor: getAvatarColor(val),
              },
        ]);
        setSearchQuery("");
      } else {
        if (availableUsers.length > 0) {
          handleSelectUser(availableUsers[0]);
        }
      }
    } else if (e.key === "Backspace" && !searchQuery) {
      setSelectedInvitees((prev) => prev.slice(0, -1));
    }
  };

  // Submit all selected invites in batch/bulk
  const handleInviteSubmit = async () => {
    if (selectedInvitees.length === 0) return;

    setIsInviting(true);
    try {
      const organizationId = getOrganizationId() || 2;
      const roleId = parseInt(selectedRoleId);
      const numericGroupIds = selectedGroupIds.map((id) => parseInt(id));

      const existingUserIds = selectedInvitees
        .map(
          (invitee) =>
            invitee.id || findOrganizationMemberByEmail(invitee.email)?.user_id,
        )
        .filter((userId): userId is string => Boolean(userId))
        .map((userId) => parseInt(userId, 10));

      const existingUserIdSet = new Set(existingUserIds);
      const newEmails = selectedInvitees
        .filter(
          (invitee) =>
            !invitee.id && !findOrganizationMemberByEmail(invitee.email),
        )
        .map((invitee) => invitee.email)
        .filter(
          (email, index, emails) =>
            emails.indexOf(email) === index &&
            !existingUserIdSet.has(
              parseInt(findOrganizationMemberByEmail(email)?.user_id || "", 10),
            ),
        );

      const promises: Promise<any>[] = [];

      // 1. Bulk assign existing organization users to the board
      if (existingUserIds.length > 0) {
        promises.push(
          boardsApi.assignMembers({
            board_id: parseInt(boardId),
            organization_id: organizationId,
            user_ids: existingUserIds,
            role_id: roleId,
            group_ids: numericGroupIds,
          }),
        );
      }

      // 2. Bulk invite new emails
      if (newEmails.length > 0) {
        promises.push(
          api.post("/invites/bulk", {
            emails: newEmails,
            organization_id: organizationId,
            board_id: parseInt(boardId),
            role_id: roleId,
            group_ids: numericGroupIds,
          }),
        );
      }

      await Promise.all(promises);

      toast({
        title: "Success",
        description: `Successfully added/invited ${selectedInvitees.length} user(s).`,
      });

      clearCMSCache(parseInt(boardId));
      setSelectedInvitees([]);
      setSearchQuery("");

      // Close the modal
      onOpenChange(false);

      onMembersUpdate?.();
      loadBoardMembers();
    } catch (error: any) {
      console.error("Failed to batch invite users:", error);
      toast({
        title: "Error",
        description:
          error.response?.data?.message ||
          "Failed to add or invite some users.",
        variant: "destructive",
      });
    } finally {
      setIsInviting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] bg-[#1e293b] border border-slate-700/60 text-white rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        <DialogHeader className="flex flex-row items-center justify-between pb-2 border-b border-slate-800">
          <DialogTitle className="text-xl font-semibold tracking-tight text-white">
            Invite to this board
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-6">
          {/* Chip Input Box */}
          <div className="space-y-2 relative">
            <label className="text-xs font-semibold text-gray-300">
              Names or emails <span className="text-red-500">*</span>
            </label>

            <div
              onClick={() => inputRef.current?.focus()}
              className="min-h-12 w-full bg-[#0f172a] border border-slate-700/80 rounded-xl p-2 flex flex-wrap gap-1.5 items-center cursor-text focus-within:ring-2 focus-within:ring-primary focus-within:border-primary transition-all"
            >
              {selectedInvitees.map((invitee, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-1 bg-[#1e293b] text-white pl-1.5 pr-1 py-1 rounded-lg text-xs border border-slate-700/50 select-none animate-in fade-in zoom-in-95 duration-100"
                >
                  <Avatar className="w-4 h-4">
                    <AvatarFallback
                      className="text-[8px] text-white"
                      style={{
                        backgroundColor: invitee.avatarColor || "#3b82f6",
                      }}
                    >
                      {(invitee.name || invitee.email).charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="max-w-[120px] truncate text-gray-200">
                    {invitee.name || invitee.email}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveSelectedInvitee(idx);
                    }}
                    className="text-gray-400 hover:text-white rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}

              <input
                ref={inputRef}
                placeholder={
                  selectedInvitees.length === 0
                    ? "e.g., Maria, maria@company.com"
                    : "add more..."
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleInputKeyDown}
                className="bg-transparent border-none outline-none flex-1 min-w-[120px] text-white placeholder:text-gray-500 text-xs py-1"
              />
            </div>

            {/* Drodown: Search Suggestions overlay */}
            {searchQuery.trim() && !isEmail && availableUsers.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-[#1e293b] border border-slate-700 rounded-lg shadow-xl z-50 max-h-[160px] overflow-y-auto">
                {availableUsers.map((user) => {
                  const isAlreadyOnBoard = boardMembersList.some(
                    (member) =>
                      String(member.id) === String(user.user_id) ||
                      member.email?.toLowerCase() ===
                          getMemberEmail(user).toLowerCase(),
                  );
                  const userName = getMemberName(user);

                  return (
                    <button
                      key={user.user_id}
                      onClick={() => handleSelectUser(user)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors border-b border-slate-800/80 last:border-none ${
                        isAlreadyOnBoard
                          ? "cursor-default opacity-60"
                          : "hover:bg-[#0f172a]"
                      }`}
                    >
                      <Avatar className="w-8 h-8">
                        <AvatarFallback
                          style={{
                            backgroundColor: getAvatarColor(userName),
                          }}
                        >
                          {userName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-white truncate">
                          {userName}
                        </p>
                        <p className="text-[10px] text-gray-400 truncate">
                          {isAlreadyOnBoard
                            ? "This user is already a member of this board."
                            : getMemberEmail(user)}
                        </p>
                      </div>
                      {isAlreadyOnBoard ? (
                        <span className="text-[10px] text-gray-500">Added</span>
                      ) : (
                        <Plus className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {searchQuery.trim() &&
              !isEmail &&
              !isLoadingOrganizationMembers &&
              availableUsers.length === 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-[#1e293b] border border-slate-700 rounded-lg shadow-xl z-50 px-3 py-2.5 text-xs text-gray-400">
                  No registered Workflow PM member found
                </div>
              )}

            {searchQuery.trim() &&
              !isEmail &&
              isLoadingOrganizationMembers && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-[#1e293b] border border-slate-700 rounded-lg shadow-xl z-50 px-3 py-2.5 text-xs text-gray-400">
                  Searching members...
                </div>
              )}

            {/* Dropdown: Invite Email helper overlay */}
            {searchQuery.trim() &&
              isEmail &&
              !isEmailAlreadyOnBoard &&
              !matchingEmailMember &&
              !selectedInvitees.some(
                (item) =>
                  item.email.toLowerCase() === searchQuery.trim().toLowerCase(),
              ) && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-[#1e293b] border border-slate-700 rounded-lg shadow-xl z-50">
                  <button
                    onClick={() => {
                      setSelectedInvitees((prev) => [
                        ...prev,
                        {
                          email: searchQuery.trim(),
                          type: "email",
                          avatarColor: getAvatarColor(searchQuery.trim()),
                        },
                      ]);
                      setSearchQuery("");
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[#0f172a] text-left transition-colors"
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 text-primary">
                      <Mail className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-white">
                        Invite email
                      </p>
                      <p className="text-[10px] text-gray-400 truncate">
                        {searchQuery.trim()}
                      </p>
                    </div>
                    <Plus className="h-4 w-4 text-gray-400" />
                  </button>
                </div>
              )}

            {searchQuery.trim() &&
              isEmail &&
              !isEmailAlreadyOnBoard &&
              matchingEmailMember &&
              !selectedInvitees.some(
                (item) =>
                  item.email.toLowerCase() === searchQuery.trim().toLowerCase(),
              ) && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-[#1e293b] border border-slate-700 rounded-lg shadow-xl z-50">
                  <button
                    onClick={() => handleSelectUser(matchingEmailMember)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[#0f172a] text-left transition-colors"
                  >
                    <Avatar className="w-8 h-8">
                      <AvatarFallback
                        style={{
                          backgroundColor: getAvatarColor(
                            getMemberName(matchingEmailMember),
                          ),
                        }}
                      >
                        {getMemberName(matchingEmailMember)
                          .charAt(0)
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-white truncate">
                        {getMemberName(matchingEmailMember)}
                      </p>
                      <p className="text-[10px] text-gray-400 truncate">
                        Registered Workflow PM member
                      </p>
                    </div>
                    <Plus className="h-4 w-4 text-gray-400" />
                  </button>
                </div>
              )}

            {searchQuery.trim() && isEmailAlreadyOnBoard && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-[#1e293b] border border-slate-700 rounded-lg shadow-xl z-50 px-3 py-2.5 text-xs text-gray-400">
                This user is already a member of this board.
              </div>
            )}
          </div>

          {/* Suggested Row (Horizontal Chip List) */}
          {suggestedPeople.length > 0 && (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-1.5">
                {suggestedPeople.map((user) => (
                  <button
                    key={user.user_id}
                    onClick={() => handleAddSuggested(user)}
                    className="flex items-center gap-1.5 bg-[#0f172a] hover:bg-primary/25 border border-slate-700/60 rounded-full pl-1.5 pr-2.5 py-1 text-xs text-gray-300 font-medium transition-all"
                  >
                    <Plus className="h-3.5 w-3.5 text-gray-400" />
                    <Avatar className="w-4 h-4">
                      <AvatarFallback className="text-[8px] bg-slate-700 text-white font-semibold">
                        {getMemberName(user).charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span>{getMemberName(user)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Role selector dropdown */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-300">
              Role <span className="text-red-500">*</span>
            </label>
            <Select
              value={selectedRoleId}
              onValueChange={setSelectedRoleId}
              disabled={loadingRoles}
            >
              <SelectTrigger className="w-full bg-[#0f172a] border-slate-700 text-white rounded-xl h-10">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent className="bg-[#1e293b] border-slate-700 text-white">
                {effectiveRoles.map((role) => (
                  <SelectItem
                    key={role.id}
                    value={role.id}
                    className="text-white hover:bg-primary/20"
                  >
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Group selector multi-select dropdown */}
          {isSelectedRoleClient && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-300">
                Groups
              </label>
              <Popover modal={true}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    disabled={isLoadingGroups}
                    className="w-full flex items-center justify-between bg-[#0f172a] border border-slate-700 text-white rounded-xl h-10 px-3 text-left text-xs hover:bg-[#1e293b] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-center gap-1.5 flex-wrap overflow-hidden max-w-[90%]">
                      {selectedGroupIds.length === 0 ? (
                        <span className="text-gray-500">
                          Select groups (optional)
                        </span>
                      ) : (
                        selectedGroupIds.map((groupId) => {
                          const group = boardGroups.find(
                            (g) => String(g.id) === groupId,
                          );
                          if (!group) return null;
                          return (
                            <span
                              key={groupId}
                              className="flex items-center gap-1 bg-[#1e293b] text-white px-2 py-0.5 rounded-md text-[10px] border border-slate-700/50"
                            >
                              <span
                                className="w-1.5 h-1.5 rounded-full"
                                style={{
                                  backgroundColor: group.color || "#3b82f6",
                                }}
                              />
                              {group.name}
                            </span>
                          );
                        })
                      )}
                    </div>
                    <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-[432px] p-2 bg-[#1e293b] border border-slate-700/60 rounded-xl shadow-xl text-white">
                  {isLoadingGroups ? (
                    <p className="text-xs text-gray-400 p-2">
                      Loading groups...
                    </p>
                  ) : boardGroups.length === 0 ? (
                    <p className="text-xs text-gray-400 p-2">
                      No groups available on this board
                    </p>
                  ) : (
                    <div
                      className="space-y-1 max-h-[160px] overflow-y-auto"
                      onWheel={(e) => e.stopPropagation()}
                    >
                      {boardGroups.map((group) => {
                        const isSelected = selectedGroupIds.includes(
                          String(group.id),
                        );
                        return (
                          <button
                            key={group.id}
                            type="button"
                            onClick={() => {
                              setSelectedGroupIds((prev) =>
                                isSelected
                                  ? prev.filter((id) => id !== String(group.id))
                                  : [...prev, String(group.id)],
                              );
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all hover:bg-slate-800 ${
                              isSelected
                                ? "bg-slate-800 text-white"
                                : "text-gray-300"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className="w-2.5 h-2.5 rounded-full"
                                style={{
                                  backgroundColor: group.color || "#3b82f6",
                                }}
                              />
                              <span>{group.name}</span>
                            </div>
                            {isSelected && (
                              <Check className="h-3.5 w-3.5 text-blue-500" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>
          )}

          {/* Existing Board Members Collapsible / Section */}
          <div className="space-y-4 pt-4 border-t border-slate-800">
            <h4 className="text-xs font-semibold text-gray-300 tracking-wide uppercase">
              People in this board
            </h4>

            {boardMembersList.length === 0 ? (
              <p className="text-gray-400 text-center text-xs py-4">
                {isLoadingBoardMembers
                  ? "Loading members..."
                  : "No members in this board"}
              </p>
            ) : (
              <div className="space-y-3 max-h-[180px] overflow-y-auto pr-1">
                {boardMembersList.map((member) => (
                  <div key={member.id} className="flex items-center gap-3 py-1">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback
                        style={{
                          backgroundColor:
                            member.avatarColor || getAvatarColor(member.name),
                        }}
                        className="text-white text-xs font-semibold"
                      >
                        {member.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-white truncate">
                        {member.name}
                      </p>
                      <p className="text-[10px] text-gray-400 truncate">
                        {member.email}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-gray-500 border border-slate-800 px-2 py-0.5 rounded bg-slate-900/60 font-medium">
                        {member.role}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-end">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-xs text-gray-300 hover:text-white hover:bg-transparent px-3 py-1.5 h-8 rounded-lg bg-transparent"
              disabled={isInviting}
            >
              Cancel
            </Button>
            <Button
              variant="ghost"
              onClick={handleInviteSubmit}
              disabled={selectedInvitees.length === 0 || isInviting}
              className="text-xs text-blue-500 hover:text-blue-400 hover:bg-transparent bg-transparent px-4 py-1.5 h-8 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isInviting ? (
                <>
                  <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                  Adding...
                </>
              ) : selectedInvitees.length > 1 ? (
                `Add ${selectedInvitees.length} people`
              ) : selectedInvitees.length === 1 ? (
                "Add 1 person"
              ) : (
                "Add"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
