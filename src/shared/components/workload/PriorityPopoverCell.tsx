import { useState, useEffect } from "react";
import { X, Trash } from "lucide-react";
import type { Priority } from "@/features/cms/types";
import { cmsApi } from "@/features/cms/cmsApi";
import {
  addPriorityToCache,
  updatePriorityInCache,
} from "@/features/cms/cmsStorage";
import { getOrganizationId } from "@/lib/utils";
import { toast } from "sonner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { ColorPickerPopover } from "@/shared/components/workload/ColorPickerPopover";

const PRESET_COLORS = [
  "#16a249", // green
  "#3c83f6", // blue
  "#a855f7", // purple
  "#dc2828", // red
  "#facc14", // yellow
  "#ff8400", // orange
  "#ec4899", // pink
  "#10b981", // emerald
  "#06b6d4", // cyan
  "#8b5cf6", // violet
  "#f59e0b", // amber
  "#ef4444", // rose
  "#14b8a6", // teal
  "#6366f1", // indigo
  "#f97316", // orange-600
  "#84cc16", // lime
];

interface PriorityPopoverCellProps {
  task: any;
  priorities: Priority[];
  priorityObj: Priority | undefined;
  popoverId: string;
  openPopoverId?: string | null;
  setOpenPopoverId?: (id: string | null) => void;
  onPriorityChange?: (taskId: string, priorityId: string) => void;
  onPriorityCreated?: (newPriority: Priority) => void;
  onPrioritiesUpdated?: (updatedPriorities: Priority[]) => void;
  boardId?: string | number;
}

export function PriorityPopoverCell({
  task,
  priorities,
  priorityObj,
  popoverId,
  openPopoverId,
  setOpenPopoverId,
  onPriorityChange,
  onPriorityCreated,
  onPrioritiesUpdated,
  boardId,
}: PriorityPopoverCellProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newPriorityName, setNewPriorityName] = useState("");
  const [newPriorityColor, setNewPriorityColor] = useState(PRESET_COLORS[0]);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editablePriorities, setEditablePriorities] = useState<
    Array<{ id: string; name: string; color_code: string }>
  >([]);
  const [colorPickerOpen, setColorPickerOpen] = useState<string | null>(null);
  const [createFormColorPickerOpen, setCreateFormColorPickerOpen] =
    useState(false);
  const [displayPriorities, setDisplayPriorities] = useState<Priority[]>([]);

  // Initialize displayPriorities when popover opens
  useEffect(() => {
    if (openPopoverId === popoverId) {
      setDisplayPriorities([...priorities]);
    }
  }, [openPopoverId, popoverId, priorities]);

  // Sync editablePriorities with priorities when edit mode is opened
  useEffect(() => {
    if (isEditMode) {
      setEditablePriorities(priorities.map((p) => ({ ...p })));
    }
  }, [isEditMode, priorities]);

  // Sync displayPriorities with editablePriorities when in edit mode for real-time updates
  useEffect(() => {
    if (isEditMode && editablePriorities.length > 0) {
      setDisplayPriorities([...editablePriorities] as any);
    }
  }, [editablePriorities, isEditMode]);

  const handleCreatePriority = async () => {
    if (!newPriorityName.trim()) {
      toast.error("Priority name is required");
      return;
    }

    setIsCreating(true);
    try {
      const orgId = getOrganizationId();
      const bId = boardId;

      if (!orgId || !bId) {
        toast.error("Organization or board information not found");
        return;
      }

      const newPriority = await cmsApi.createPriority({
        name: newPriorityName.trim(),
        color_code: newPriorityColor,
        organization_id: orgId,
        board_id: Number(bId),
      });

      // Ensure priority has required fields
      const priorityWithDefaults: any = {
        id: newPriority.id || String(Date.now()),
        name: newPriority.name,
        color_code: newPriority.color_code,
        priority_order: newPriority.priority_order || "999",
      };

      // Update localStorage cache
      addPriorityToCache(Number(bId), priorityWithDefaults);

      // Add to display priorities immediately for real-time update
      setDisplayPriorities((prev) => [...prev, priorityWithDefaults]);

      setNewPriorityName("");
      setNewPriorityColor(PRESET_COLORS[0]);
      setShowCreateForm(false);
      onPriorityCreated?.(priorityWithDefaults);
      toast.success("Priority created successfully");
    } catch (error) {
      console.error("Failed to create priority:", error);
      toast.error("Failed to create priority");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Popover
      open={openPopoverId === popoverId}
      onOpenChange={(open) => {
        if (!open) {
          // When closing, reset edit mode and create form
          setIsEditMode(false);
          setShowCreateForm(false);
        }
        setOpenPopoverId?.(open ? popoverId : null);
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 px-3 text-xs font-medium whitespace-nowrap"
          style={{
            backgroundColor: priorityObj?.color_code || "#e5e7eb",
            color: "white",
            border: "none",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {priorityObj?.name || "No Priority"}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-max p-3 bg-card border border-border shadow-lg rounded-lg"
        align="center"
      >
        <div
          className="flex flex-col"
          style={{
            width: "500px",
          }}
        >
          {!isEditMode ? (
            <>
              {/* Header with + button */}
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-sm">Select Priority</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-primary"
                  onClick={() => setShowCreateForm(!showCreateForm)}
                  title="Create New Priority"
                >
                  <span className="text-lg font-semibold">+</span>
                </Button>
              </div>

              {/* Create Form */}
              {showCreateForm && (
                <div className="space-y-2 mb-2 pb-2 border-b border-border">
                  <div className="flex gap-2 items-center">
                    <Input
                      placeholder="Priority name"
                      value={newPriorityName}
                      onChange={(e) => setNewPriorityName(e.target.value)}
                      className="h-8 text-sm flex-1"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleCreatePriority();
                        } else if (e.key === "Escape") {
                          setShowCreateForm(false);
                          setNewPriorityName("");
                        }
                      }}
                      autoFocus
                    />
                    <ColorPickerPopover
                      color={newPriorityColor}
                      onColorChange={setNewPriorityColor}
                      isOpen={createFormColorPickerOpen}
                      onOpenChange={setCreateFormColorPickerOpen}
                      size="w-8 h-8"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-8 text-xs"
                      onClick={() => {
                        setShowCreateForm(false);
                        setNewPriorityName("");
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 h-8 text-xs"
                      onClick={handleCreatePriority}
                      disabled={isCreating || !newPriorityName.trim()}
                    >
                      {isCreating ? "Creating..." : "Create"}
                    </Button>
                  </div>
                </div>
              )}

              {/* Priority Grid */}
              <div className="grid grid-cols-2 gap-2 max-h-80 overflow-y-auto scrollbar-hide mb-2">
                {displayPriorities.map((priority) => (
                  <button
                    key={priority.id}
                    onClick={() => {
                      onPriorityChange?.(task.id, priority.id);
                      setOpenPopoverId?.(null);
                    }}
                    title={priority.name}
                    className="flex flex-col items-center gap-2 px-3 py-3 rounded-lg hover:opacity-80 transition-opacity text-sm font-medium overflow-hidden"
                    style={{
                      backgroundColor: priority.color_code,
                      color: "white",
                    }}
                  >
                    <span className="text-center truncate w-full">
                      {priority.name}
                    </span>
                  </button>
                ))}
              </div>

              {/* Edit Labels Button */}
              <Button
                variant="outline"
                size="sm"
                className="w-full h-8 text-xs"
                onClick={() => {
                  setIsEditMode(true);
                  setEditablePriorities(priorities.map((p) => ({ ...p })));
                }}
              >
                Edit Labels
              </Button>
            </>
          ) : (
            <>
              {/* Edit Mode Header */}
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-sm">Edit Priority Labels</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => setIsEditMode(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Editable Priority List - Grid Structure */}
              <div className="grid grid-cols-2 gap-2 max-h-80 overflow-y-auto scrollbar-hide mb-3">
                {editablePriorities.map((priority, index) => (
                  <div
                    key={priority.id}
                    className="flex flex-row gap-2 items-center p-1 rounded border border-border"
                  >
                    {/* Color div with popover */}
                    <ColorPickerPopover
                      color={priority.color_code}
                      onColorChange={(newColor: string) => {
                        const updated = [...editablePriorities];
                        updated[index].color_code = newColor;
                        setEditablePriorities(updated);
                      }}
                      isOpen={colorPickerOpen === priority.id}
                      onOpenChange={(open: boolean) => {
                        setColorPickerOpen(open ? priority.id : null);
                      }}
                    />

                    <Input
                      value={priority.name}
                      onChange={(e) => {
                        const updated = [...editablePriorities];
                        updated[index].name = e.target.value;
                        setEditablePriorities(updated);
                      }}
                      className="h-8 text-sm flex-1"
                      placeholder="Priority name"
                    />

                    <button
                      onClick={() => {
                        const updated = editablePriorities.filter(
                          (_, i) => i !== index,
                        );
                        setEditablePriorities(updated);
                      }}
                      className="p-1 hover:bg-destructive/20 rounded flex items-center justify-center gap-1 text-xs"
                      title="Delete priority"
                    >
                      <Trash className="h-3 w-3 text-destructive" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Done Button */}
              <Button
                size="sm"
                className="w-full h-8 text-xs"
                onClick={async () => {
                  try {
                    // Track original priorities for comparison
                    const originalPriorityMap = new Map(
                      priorities.map((p) => [p.id, p]),
                    );

                    // Save all priorities (new and updated)
                    for (const priority of editablePriorities) {
                      if (priority.id.startsWith("new-")) {
                        // Create new priority
                        const orgId = getOrganizationId();
                        const bId = boardId;
                        if (orgId && bId) {
                          const newPriority = await cmsApi.createPriority({
                            name: priority.name,
                            color_code: priority.color_code,
                            organization_id: orgId,
                            board_id: Number(bId),
                          });
                          addPriorityToCache(Number(bId), newPriority);
                          onPriorityCreated?.(newPriority);
                        }
                      } else {
                        // Check if existing priority was modified
                        const originalPriority = originalPriorityMap.get(
                          priority.id
                        );
                        if (
                          originalPriority &&
                          (originalPriority.name !== priority.name ||
                            originalPriority.color_code !== priority.color_code)
                        ) {
                          // Update existing priority
                          const orgId = getOrganizationId();
                          const bId = boardId;
                          if (orgId && bId) {
                            await cmsApi.updatePriority({
                              priority_id: priority.id,
                              name: priority.name,
                              color_code: priority.color_code,
                              organization_id: orgId,
                              board_id: Number(bId),
                            });
                            // Update cache
                            updatePriorityInCache(Number(boardId), priority as any);
                            // Trigger UI update
                            onPriorityCreated?.(priority as any);
                          }
                        }
                      }
                    }
                    toast.success("Priority labels updated successfully");
                    // Reset edit mode and refresh the editable priorities list with updated values
                    setIsEditMode(false);
                    // Update editablePriorities to match the current state so originalPriorityMap is accurate next time
                    setEditablePriorities(
                      editablePriorities.map((p) => ({ ...p }))
                    );
                    // Update displayPriorities with the edited priorities
                    setDisplayPriorities(editablePriorities as any);
                    // Notify parent to refresh the priorities list
                    onPrioritiesUpdated?.(editablePriorities as any);
                  } catch (error) {
                    console.error("Failed to update priority labels:", error);
                    toast.error("Failed to update priority labels");
                  }
                }}
              >
                Done
              </Button>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
