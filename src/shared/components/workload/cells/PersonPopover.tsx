import { useState } from "react";
import { Search } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover";
import { Button } from "@/shared/components/ui/button";
import { Avatar, AvatarFallback } from "@/shared/components/ui/avatar";
import { Input } from "@/shared/components/ui/input";
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
  const [localSelected, setLocalSelected] = useState<string | null>(
    selectedMemberIds?.[0] || null
  );

  const filteredMembers = members.filter((member) =>
    (member?.name ?? "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleMemberSelect = (memberId: string) => {
    setLocalSelected(memberId);
  };

  const handleUpdateAssignees = () => {
    onPersonChange?.(task.id, localSelected ? [localSelected] : []);
    setOpenPopoverId?.(null);
  };

  return (
    <Popover
      open={openPopoverId === popoverId}
      onOpenChange={(open) => setOpenPopoverId?.(open ? popoverId : null)}
    >
      <PopoverTrigger asChild>
        <button
          className="w-full flex justify-center hover:opacity-80 transition-opacity cursor-pointer"
          onClick={(e) => e.stopPropagation()}
        >
          {!localSelected ? (
            <span className="text-muted-foreground text-xs">+ Add</span>
          ) : (
            <div className="flex justify-center">
              {(() => {
                const member = members.find(
                  (m) => String(m.user_id) === String(localSelected)
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
                  <Avatar className="h-8 w-8 border-2 border-background">
                    <AvatarFallback
                      style={{ background: bgColor, color: "white" }}
                      className="text-[10px] font-semibold"
                    >
                      {initials || "U"}
                    </AvatarFallback>
                  </Avatar>
                );
              })()}
            </div>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-56 p-3 bg-card border border-border shadow-lg rounded-lg flex flex-col"
        align="center"
      >
        <div className="space-y-2 flex flex-col">
          {/* Search Input */}
          <div className="relative flex-shrink-0">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-0 pointer-events-none" />
            <Input
              placeholder="Search members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>

          {/* Members List */}
          <div
            className="space-y-1 overflow-y-auto"
            style={{
              maxHeight: "calc(4 * 40px)",
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            }}
          >
            {/* No Member Option */}
            <button
              onClick={() => setLocalSelected(null)}
              className="w-full border-y border-border flex items-center gap-3 px-2 py-2 rounded transition-colors text-sm font-medium text-left hover:bg-muted"
            >
              <input
                type="radio"
                checked={localSelected === null}
                onChange={() => {}}
                className="h-4 w-4 accent-primary cursor-pointer"
              />
              <span className="text-muted-foreground">No Member</span>
            </button>

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

                const isSelected = localSelected === String(member.user_id);

                return (
                  <button
                    key={member.user_id}
                    onClick={() => handleMemberSelect(String(member.user_id))}
                    className="w-full flex items-center gap-3 px-2 py-2 rounded transition-colors text-sm font-medium text-left hover:bg-muted"
                  >
                    <input
                      type="radio"
                      checked={isSelected}
                      onChange={() => {}}
                      className="h-4 w-4 accent-primary cursor-pointer"
                    />
                    <Avatar className="h-8 w-8">
                      <AvatarFallback
                        style={{ background: bgColor, color: "white" }}
                      >
                        {initials || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <span>{member.name}</span>
                  </button>
                );
              })
            )}
          </div>

          {/* Update Button */}
          <div className="flex-shrink-0 pt-2 border-t border-border flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setLocalSelected(null);
                onPersonChange?.(task.id, []);
                setOpenPopoverId?.(null);
              }}
              className="flex-1 h-8 text-sm"
              size="sm"
            >
              Clear
            </Button>
            <Button
              onClick={handleUpdateAssignees}
              className="flex-1 h-8 text-sm"
              size="sm"
            >
              Update
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
