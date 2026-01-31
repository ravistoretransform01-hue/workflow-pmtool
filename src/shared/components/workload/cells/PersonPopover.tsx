import { useState, useEffect } from "react";
import { Avatar, AvatarFallback } from "@/shared/components/ui/avatar";
import { Input } from "@/shared/components/ui/input";
import { toast } from "sonner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover";
import { stringToHslColor } from "../utils";

interface PersonPopoverProps {
  task: any;
  members: any[];
  selectedMemberIds?: string[];
  popoverId: string;
  openPopoverId?: string | null;
  setOpenPopoverId?: (id: string | null) => void;
  onPersonChange?: (taskId: string, memberIds: string[]) => void;
}

export function PersonPopover({
  task,
  members,
  selectedMemberIds,
  popoverId,
  openPopoverId,
  setOpenPopoverId,
  onPersonChange,
}: PersonPopoverProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [localSelected, setLocalSelected] = useState<string[]>(
    selectedMemberIds || []
  );
  const [isSaving, setIsSaving] = useState(false);

  // Sync localSelected with selectedMemberIds when it changes
  useEffect(() => {
    setLocalSelected(selectedMemberIds || []);
  }, [selectedMemberIds]);

  const filteredMembers = members.filter((member) =>
    (member?.name ?? "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleMemberSelect = async (memberId: string) => {
    // Toggle member selection
    const newSelected = localSelected.includes(memberId)
      ? localSelected.filter(id => id !== memberId)
      : [...localSelected, memberId];
    
    setLocalSelected(newSelected);
    setIsSaving(true);
    try {
      await onPersonChange?.(task.id, newSelected);
      // Don't show toast here - let the parent handler show it
    } catch (error) {
      console.error("Failed to update assignee:", error);
      toast.error("Failed to update assignee");
      // Revert local state on error
      setLocalSelected(selectedMemberIds || []);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearAssignee = async () => {
    setLocalSelected([]);
    setIsSaving(true);
    try {
      await onPersonChange?.(task.id, []);
      // Don't show toast here - let the parent handler show it
    } catch (error) {
      console.error("Failed to clear assignee:", error);
      toast.error("Failed to clear assignee");
      // Revert local state on error
      setLocalSelected(selectedMemberIds || []);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Popover
      open={openPopoverId === popoverId}
      onOpenChange={(open) => {
        if (open) {
          setLocalSelected(selectedMemberIds || []);
        }
        setOpenPopoverId?.(open ? popoverId : null);
      }}
    >
      <PopoverTrigger asChild>
        <button
          className="w-full flex justify-center hover:opacity-80 transition-opacity cursor-pointer"
          onClick={(e) => e.stopPropagation()}
        >
          {localSelected.length === 0 ? (
            <span className="text-muted-foreground text-xs">+ Add</span>
          ) : (
            <div className="flex justify-center -space-x-2">
              {localSelected.slice(0, 3).map((memberId) => {
                const member = members.find(
                  (m) => String(m.user_id) === String(memberId)
                );
                if (!member) return null;
                const name = (member?.name ?? "").trim();
                const initials = name
                  .split(/\s+/)
                  .map((n: string) => n[0])
                  .filter(Boolean)
                  .slice(0, 2)
                  .join("")
                  .toUpperCase();
                const bgColor = stringToHslColor(
                  name || String(member?.user_id || "user")
                );
                return (
                  <Avatar key={memberId} className="h-8 w-8 border-2 border-background">
                    <AvatarFallback
                      style={{ background: bgColor, color: "white" }}
                      className="text-[10px] font-semibold"
                    >
                      {initials || "U"}
                    </AvatarFallback>
                  </Avatar>
                );
              })}
              {localSelected.length > 3 && (
                <div className="h-8 w-8 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                  <span className="text-[10px] font-semibold text-muted-foreground">
                    +{localSelected.length - 3}
                  </span>
                </div>
              )}
            </div>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-56 p-3 bg-card border border-border shadow-lg rounded-lg flex flex-col max-h-96"
        align="center"
      >
        <div className="flex flex-col h-full space-y-2">
          {/* Search Input */}
          <div className="flex-shrink-0">
            <Input
              placeholder="Search members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 text-sm"
            />
          </div>

          {/* No Member Option - Fixed */}
          <div className="flex-shrink-0">
            <button
              onClick={handleClearAssignee}
              disabled={isSaving}
              className={`w-full px-3 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer text-center disabled:opacity-50 disabled:cursor-not-allowed ${
                localSelected.length === 0
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-secondary/50 text-foreground hover:bg-secondary"
              }`}
            >
              No Member
            </button>
          </div>

          {/* Members List with Selectable Tiles */}
          <div
            className="flex-1 overflow-y-auto scrollbar-hide space-y-1 max-h-64"
            style={{
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            }}
          >
            {filteredMembers.length === 0 ? (
              <div className="text-center py-4 text-sm text-muted-foreground">
                No members found
              </div>
            ) : (
              filteredMembers.map((member) => {
                const name = (member?.name ?? "").trim();
                const initials = name
                  .split(/\s+/)
                  .map((n: string) => n[0])
                  .filter(Boolean)
                  .slice(0, 2)
                  .join("")
                  .toUpperCase();

                const bgColor = stringToHslColor(
                  name || String(member?.user_id || "user")
                );

                const isSelected = localSelected.includes(String(member.user_id));

                return (
                  <button
                    key={member.user_id}
                    onClick={() => handleMemberSelect(String(member.user_id))}
                    disabled={isSaving}
                    className={`w-full px-3 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                      isSelected
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "bg-secondary/50 text-foreground hover:bg-secondary"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback
                            style={{ background: bgColor, color: "white" }}
                            className="text-[10px] font-semibold"
                          >
                            {initials || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate">{member.name}</span>
                      </div>
                      {isSelected && (
                        <svg
                          className="h-4 w-4 flex-shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
