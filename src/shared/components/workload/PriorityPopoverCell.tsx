import { useState, useEffect } from "react";
import { X, Trash } from "lucide-react";
import type { Priority } from "@/features/cms/types";
import { cmsApi } from "@/features/cms/cmsApi";
import {
  addPriorityToCache,
  updatePriorityInCache,
  deletePriorityFromCache,
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
import { debugLog } from "@/lib/debugLog";

const PRESET_COLORS = [
  "#16a249",
  "#3c83f6",
  "#a855f7",
  "#dc2828",
  "#facc14",
  "#ff8400",
  "#ec4899",
  "#10b981",
  "#06b6d4",
  "#8b5cf6",
  "#f59e0b",
  "#ef4444",
  "#14b8a6",
  "#6366f1",
  "#f97316",
  "#84cc16",
];

interface EditablePriority {
  id: string;
  name: string;
  color_code: string;
}

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
  const [isEditMode, setIsEditMode] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const [displayPriorities, setDisplayPriorities] = useState<Priority[]>([]);
  const [editablePriorities, setEditablePriorities] = useState<
    EditablePriority[]
  >([]);

  const [newPriorityName, setNewPriorityName] = useState("");
  const [newPriorityColor, setNewPriorityColor] = useState(PRESET_COLORS[0]);
  const [isCreating, setIsCreating] = useState(false);

  const [colorPickerOpen, setColorPickerOpen] = useState<string | null>(null);
  const [createColorPickerOpen, setCreateColorPickerOpen] = useState(false);

  /* ---------------------------------------------
   * Initialize displayPriorities ONCE per open
   * ------------------------------------------- */
  useEffect(() => {
    if (openPopoverId === popoverId && displayPriorities.length === 0) {
      setDisplayPriorities([...priorities]);
    }
  }, [openPopoverId, popoverId, priorities, displayPriorities.length]);

  /* ---------------------------------------------
   * Entering edit mode → derive editable state
   * ------------------------------------------- */
  useEffect(() => {
    if (isEditMode) {
      setEditablePriorities(
        displayPriorities.map((p) => ({
          id: String(p.id),
          name: p.name,
          color_code: p.color_code,
        })),
      );
    }
  }, [isEditMode, displayPriorities]);

  /* ---------------------------------------------
   * Create priority
   * ------------------------------------------- */
  const handleCreatePriority = async () => {
    if (!newPriorityName.trim()) {
      toast.error("Priority name is required");
      return;
    }

    const orgId = getOrganizationId();
    if (!orgId || !boardId) {
      toast.error("Missing board or organization");
      return;
    }

    setIsCreating(true);
    try {
      const created = await cmsApi.createPriority({
        name: newPriorityName.trim(),
        color_code: newPriorityColor,
        organization_id: orgId,
        board_id: Number(boardId),
      });

      addPriorityToCache(Number(boardId), created);

      setDisplayPriorities((prev) => [...prev, created]);
      onPriorityCreated?.(created);

      setNewPriorityName("");
      setNewPriorityColor(PRESET_COLORS[0]);
      setShowCreateForm(false);

      toast.success("Priority created");
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Failed to create priority",
      );
    } finally {
      setIsCreating(false);
    }
  };

  /* ---------------------------------------------
   * Save edits
   * ------------------------------------------- */
  const handleSaveEdits = async () => {
    try {
      const orgId = getOrganizationId();
      if (!orgId || !boardId) return;

      for (const priority of editablePriorities) {
        const original = displayPriorities.find(
          (p) => String(p.id) === priority.id,
        );

        if (
          original &&
          (original.name !== priority.name ||
            original.color_code !== priority.color_code)
        ) {
          await cmsApi.updatePriority({
            priority_id: priority.id,
            name: priority.name,
            color_code: priority.color_code,
            organization_id: orgId,
            board_id: Number(boardId),
          });

          updatePriorityInCache(Number(boardId), priority as any);
        }
      }

      const updated: Priority[] = editablePriorities.map((edited) => {
        const original = displayPriorities.find(
          (p) => String(p.id) === edited.id,
        );

        if (!original) {
          throw new Error(`Priority not found: ${edited.id}`);
        }

        return {
          ...original,
          name: edited.name,
          color_code: edited.color_code,
        };
      });

      setDisplayPriorities(updated);
      setIsEditMode(false);
      onPrioritiesUpdated?.(updated);

      toast.success("Priorities updated");
    } catch {
      toast.error("Failed to update priorities");
    }
  };

  /* ---------------------------------------------
   * Delete priority
   * ------------------------------------------- */
  const handleDeletePriority = async (priorityId: string) => {
    try {
      if (!boardId) {
        toast.error("Board ID is required");
        return;
      }

      await cmsApi.deletePriority(priorityId);
      deletePriorityFromCache(Number(boardId), priorityId);

      const updatedPriorities = editablePriorities.filter(
        (p) => p.id !== priorityId,
      );
      setEditablePriorities(updatedPriorities);

      const updatedDisplay = displayPriorities.filter(
        (p) => String(p.id) !== priorityId,
      );
      setDisplayPriorities(updatedDisplay);
      onPrioritiesUpdated?.(updatedDisplay);

      toast.success("Priority deleted");
    } catch (error: any) {
      debugLog("Failed to delete priority:", error);
      toast.error(
        error?.response?.data?.message || "Failed to delete priority",
      );
    }
  };

  return (
    <Popover
      open={openPopoverId === popoverId}
      onOpenChange={(open) => {
        if (!open) {
          setIsEditMode(false);
          setShowCreateForm(false);
        }
        setOpenPopoverId?.(open ? popoverId : null);
      }}
      modal={false}
    >
      <PopoverTrigger asChild>
        <Button
          size="sm"
          className="h-8 px-3 text-xs text-white"
          style={{
            backgroundColor: priorityObj?.color_code || "#e5e7eb",
            border: "none",
          }}
        >
          {priorityObj?.name || "No Priority"}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[500px] p-3 z-[200]"
        onWheel={(e) => e.stopPropagation()}
      >
        {!isEditMode ? (
          <>
            {/* Header */}
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium">Select Priority</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowCreateForm((v) => !v)}
              >
                +
              </Button>
            </div>

            {/* Create */}
            {showCreateForm && (
              <div className="flex gap-2 mb-2">
                <Input
                  value={newPriorityName}
                  onChange={(e) => setNewPriorityName(e.target.value)}
                  placeholder="Priority name"
                />
                <ColorPickerPopover
                  color={newPriorityColor}
                  onColorChange={setNewPriorityColor}
                  isOpen={createColorPickerOpen}
                  onOpenChange={setCreateColorPickerOpen}
                />
                <Button onClick={handleCreatePriority} disabled={isCreating}>
                  Create
                </Button>
              </div>
            )}

            {/* List */}
            <div className="max-h-64 overflow-y-auto scrollbar-hide border border-border rounded mb-2">
              <div className="grid grid-cols-2 gap-2 p-2">
                {displayPriorities.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      onPriorityChange?.(task.id, String(p.id));
                      setOpenPopoverId?.(null);
                    }}
                    className="p-3 rounded text-white text-sm hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: p.color_code }}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            <Button
              className="w-full"
              onClick={() => setIsEditMode(true)}
              variant="outline"
              size="sm"
            >
              Edit Labels
            </Button>
          </>
        ) : (
          <>
            {/* Edit Header */}
            <div className="flex justify-between mb-3">
              <span className="text-sm font-medium">Edit Priority Labels</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsEditMode(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Edit List */}
            <div className="max-h-64 overflow-y-auto scrollbar-hide border border-border rounded mb-2">
              <div className="grid grid-cols-2 gap-2 p-2">
                {editablePriorities.map((p, i) => (
                  <div
                    key={p.id}
                    className="flex gap-2 items-center p-2 border border-border rounded"
                  >
                    <ColorPickerPopover
                      color={p.color_code}
                      onColorChange={(c) => {
                        const copy = [...editablePriorities];
                        copy[i].color_code = c;
                        setEditablePriorities(copy);
                      }}
                      isOpen={colorPickerOpen === p.id}
                      onOpenChange={(o) => setColorPickerOpen(o ? p.id : null)}
                    />
                    <Input
                      value={p.name}
                      onChange={(e) => {
                        const copy = [...editablePriorities];
                        copy[i].name = e.target.value;
                        setEditablePriorities(copy);
                      }}
                      className="h-8 text-sm flex-1"
                    />
                    <Trash
                      className="h-4 w-4 text-destructive cursor-pointer"
                      onClick={() => handleDeletePriority(p.id)}
                    />
                  </div>
                ))}
              </div>
            </div>

            <Button
              className="w-full"
              onClick={(e) => {
                e.stopPropagation();
                handleSaveEdits();
              }}
              size="sm"
            >
              Done
            </Button>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
