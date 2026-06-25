import { useEffect, useState, useRef } from "react";
import { X, Trash, GripVertical } from "lucide-react";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { ColorPickerPopover } from "@/shared/components/workload/ColorPickerPopover";

import type { Status } from "@/features/cms/types";
import { cmsApi } from "@/features/cms/cmsApi";
import {
  addStatusToCache,
  updateStatusInCache,
  deleteStatusFromCache,
  updateStatusesOrderInCache,
} from "@/features/cms/cmsStorage";
import { getOrganizationId } from "@/lib/utils";

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

interface EditableStatus {
  id: string;
  name: string;
  color_code: string;
  required_rating: number | string;
}

interface StatusPopoverCellProps {
  task: any;
  statuses: Status[];
  statusObj?: Status;
  popoverId: string;
  openPopoverId?: string | null;
  setOpenPopoverId?: (id: string | null) => void;
  onStatusChange?: (taskId: string, statusId: string) => void;
  onStatusCreated?: (status: Status) => void;
  onStatusesUpdated?: (statuses: Status[]) => void;
  boardId?: string | number;
}

interface SortableStatusItemProps {
  status: EditableStatus;
  index: number;
  editableStatuses: EditableStatus[];
  setEditableStatuses: (statuses: EditableStatus[]) => void;
  colorPickerOpen: string | null;
  setColorPickerOpen: (id: string | null) => void;
  handleDeleteStatus: (id: string) => void;
}

function SortableStatusItem({
  status,
  index,
  editableStatuses,
  setEditableStatuses,
  colorPickerOpen,
  setColorPickerOpen,
  handleDeleteStatus,
}: SortableStatusItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: status.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex gap-2 items-center p-2 border border-border rounded bg-card group"
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-1 -ml-1 transition-colors"
      >
        <GripVertical className="h-4 w-4" />
      </div>
      <ColorPickerPopover
        color={status.color_code}
        onColorChange={(c) => {
          const copy = [...editableStatuses];
          copy[index].color_code = c;
          setEditableStatuses(copy);
        }}
        isOpen={colorPickerOpen === status.id}
        onOpenChange={(o) => setColorPickerOpen(o ? status.id : null)}
      />
      <Input
        value={status.name}
        onChange={(e) => {
          const copy = [...editableStatuses];
          copy[index].name = e.target.value;
          setEditableStatuses(copy);
        }}
        className="h-8 text-sm flex-1"
      />
      <Trash
        className={`h-4 w-4 cursor-pointer hover:text-destructive transition-colors ${
          status.required_rating === 1
            ? "text-muted-foreground cursor-not-allowed opacity-50"
            : "text-destructive/70"
        }`}
        onClick={() => {
          if (status.required_rating === 1) return;
          handleDeleteStatus(status.id);
        }}
      />
    </div>
  );
}

export default function StatusPopoverCell({
  task,
  statuses,
  statusObj,
  popoverId,
  openPopoverId,
  setOpenPopoverId,
  onStatusChange,
  onStatusCreated,
  onStatusesUpdated,
  boardId,
}: StatusPopoverCellProps) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const preventPropagationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = preventPropagationRef.current;
    if (!el) return;

    const stopAndToggle = (e: Event) => {
      e.stopPropagation();
      if (e.type === "click") {
        const isCurrentOpen = openPopoverId === popoverId;
        setOpenPopoverId?.(isCurrentOpen ? null : popoverId);
      }
    };

    const events = [
      "click",
      "mousedown",
      "mouseup",
      "pointerdown",
      "pointerup",
      "touchstart",
      "touchend",
    ];

    events.forEach((val) => {
      el.addEventListener(val, stopAndToggle, { capture: true });
    });

    return () => {
      events.forEach((val) => {
        el.removeEventListener(val, stopAndToggle, { capture: true });
      });
    };
  }, [openPopoverId, popoverId, setOpenPopoverId]);

  const [displayStatuses, setDisplayStatuses] = useState<Status[]>([]);
  const [editableStatuses, setEditableStatuses] = useState<EditableStatus[]>(
    [],
  );

  const [newStatusName, setNewStatusName] = useState("");
  const [newStatusColor, setNewStatusColor] = useState(PRESET_COLORS[0]);
  const [isCreating, setIsCreating] = useState(false);

  const [colorPickerOpen, setColorPickerOpen] = useState<string | null>(null);
  const [createColorPickerOpen, setCreateColorPickerOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = editableStatuses.findIndex((i) => i.id === active.id);
      const newIndex = editableStatuses.findIndex((i) => i.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const next = arrayMove(editableStatuses, oldIndex, newIndex);
        setEditableStatuses(next);

        // Immediate sync logic (similar to KanbanView)
        const orgId = getOrganizationId();
        if (orgId && boardId) {
          try {
            const order = next.map((s) => String(s.id));

            // Persist to localStorage for Kanban consistency
            localStorage.setItem(
              `kanban-column-order-${boardId}`,
              JSON.stringify(order),
            );

            // Sync to global cache
            updateStatusesOrderInCache(Number(boardId), order);

            // Notify parent to sync across views immediately
            if (onStatusesUpdated) {
              const statusMap = new Map(statuses.map((s) => [String(s.id), s]));
              const nextFullStatuses = next
                .map((s) => statusMap.get(s.id))
                .filter((s): s is Status => !!s);
              onStatusesUpdated(nextFullStatuses);
            }

            // Sync new order to backend
            await cmsApi.reorderStatuses({
              organization_id: orgId,
              board_id: Number(boardId),
              statuses: order.map((id, index) => ({
                id: Number(id),
                status_order: index + 1,
              })),
            });
          } catch (e) {
            console.error("Failed to sync reorder immediately:", e);
          }
        }
      }
    }
  };

  /* ---------------------------------------------
   * Initialize displayStatuses ONCE per open
   * ------------------------------------------- */
  useEffect(() => {
    if (openPopoverId === popoverId) {
      setDisplayStatuses([...statuses]);
    }
  }, [openPopoverId, popoverId, statuses]);

  /* ---------------------------------------------
   * Entering edit mode → derive editable state
   * ------------------------------------------- */
  useEffect(() => {
    if (isEditMode) {
      setEditableStatuses(
        displayStatuses.map((s) => ({
          id: String(s.id),
          name: s.name,
          color_code: s.color_code,
          required_rating: s.required_rating || 0,
        })),
      );
    }
  }, [isEditMode, displayStatuses]);

  /* ---------------------------------------------
   * Create status
   * ------------------------------------------- */
  const handleCreateStatus = async () => {
    if (!newStatusName.trim()) {
      toast.error("Status name is required");
      return;
    }

    const orgId = getOrganizationId();
    if (!orgId || !boardId) {
      toast.error("Missing board or organization");
      return;
    }

    setIsCreating(true);
    try {
      const created = await cmsApi.createStatus({
        name: newStatusName.trim(),
        color_code: newStatusColor,
        organization_id: orgId,
        board_id: Number(boardId),
      });

      addStatusToCache(Number(boardId), created);

      setDisplayStatuses((prev: Status[]) => [...prev, created]);
      onStatusCreated?.(created);

      setNewStatusName("");
      setNewStatusColor(PRESET_COLORS[0]);
      setShowCreateForm(false);

      toast.success(created?.message || "Status Created");
    } catch (error: any) {
      toast.error(error?.response.data.message || "Failed to Create Status");
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
      for (const status of editableStatuses) {
        const original = displayStatuses.find(
          (s) => String(s.id) === status.id,
        );

        if (
          original &&
          (original.name !== status.name ||
            original.color_code !== status.color_code)
        ) {
          await cmsApi.updateStatus({
            status_id: status.id,
            name: status.name,
            color_code: status.color_code,
            organization_id: orgId,
            board_id: Number(boardId),
          });

          updateStatusInCache(Number(boardId), status as any);
        }
      }

      const updated: Status[] = editableStatuses.map(
        (edited: EditableStatus) => {
          const original = displayStatuses.find(
            (s: Status) => String(s.id) === edited.id,
          );

          if (!original) {
            throw new Error(`Status not found: ${edited.id}`);
          }

          return {
            ...original, // keeps status_order and any future fields
            name: edited.name,
            color_code: edited.color_code,
          };
        },
      );

      setDisplayStatuses(updated);
      setIsEditMode(false);
      onStatusesUpdated?.(updated);

      console.log("Updated statuses:", updated);
      toast.success("Statuses Updated");
    } catch (error: any) {
      console.error("Failed to update statuses:", error);
      toast.error(error?.response.data.message || "Failed to Update Statuses");
    }
  };

  /* ---------------------------------------------
   * Delete status
   * ------------------------------------------- */
  const handleDeleteStatus = async (statusId: string) => {
    try {
      const orgId = getOrganizationId();
      if (!orgId || !boardId) {
        toast.error("Missing board or organization");
        return;
      }

      const response = await cmsApi.deleteStatus(statusId);

      deleteStatusFromCache(Number(boardId), statusId);

      const updatedEditable = editableStatuses.filter((s) => s.id !== statusId);
      setEditableStatuses(updatedEditable);

      const updatedDisplay = displayStatuses.filter(
        (s) => String(s.id) !== statusId,
      );
      setDisplayStatuses(updatedDisplay);

      onStatusesUpdated?.(updatedDisplay);

      toast.success(response?.message || "Status Deleted");
    } catch (error: any) {
      toast.error(error?.response.data.message || "Failed to Delete Status");
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
      modal={true}
    >
      <PopoverTrigger asChild>
        <div
          ref={preventPropagationRef}
          className="w-full flex items-center justify-center"
        >
          <Button
            size="sm"
            className="h-8 px-3 text-xs text-white max-w-full"
            style={{
              backgroundColor: statusObj?.color_code || "#e5e7eb",
              border: "none",
            }}
          >
            <span className="truncate block min-w-0">{statusObj?.name || "No Status"}</span>
          </Button>
        </div>
      </PopoverTrigger>

      <PopoverContent
        className="w-[500px] p-3 z-[200]"
        onWheel={(e) => e.stopPropagation()}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
        >
          {!isEditMode ? (
            <>
              {/* Header */}
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Select Status</span>
                <div className="flex items-center gap-1">
                  {!showCreateForm && (
                    <Button
                      size="sm"
                      className="h-8 text-xs px-2 bg-green-500 hover:bg-green-600 text-white border-0"
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        const doneStatus = statuses.find(
                          (s) => s.name?.toLowerCase() === "done",
                        );
                        if (doneStatus && onStatusChange) {
                          onStatusChange(task.id, String(doneStatus.id));
                          setOpenPopoverId?.(null);
                        } else if (!doneStatus) {
                          toast.error("Done status not found");
                        }
                      }}
                    >
                      Mark Done
                    </Button>
                  )}
                  <Button
                    className={showCreateForm ? `bg-primary text-white` : ""}
                    size="sm"
                    variant="ghost"
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      setShowCreateForm((v: boolean) => !v);
                    }}
                  >
                    {showCreateForm ? "x" : "+"}
                  </Button>
                </div>
              </div>

              {/* Create */}
              {showCreateForm && (
                <div className="flex items-center gap-2 mb-2">
                  <Input
                    value={newStatusName}
                    onChange={(e) => setNewStatusName(e.target.value)}
                    placeholder="Status name"
                  />
                  <ColorPickerPopover
                    size="w-10 h-10"
                    color={newStatusColor}
                    onColorChange={setNewStatusColor}
                    isOpen={createColorPickerOpen}
                    onOpenChange={setCreateColorPickerOpen}
                  />
                  <Button onClick={handleCreateStatus} disabled={isCreating}>
                    Create
                  </Button>
                </div>
              )}

              {/* List */}
              <div className="max-h-64 overflow-y-auto scrollbar-hide border border-border rounded mb-2">
                <div className="grid grid-cols-2 gap-2 p-2">
                  {displayStatuses.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        onStatusChange?.(task.id, String(s.id));
                        setOpenPopoverId?.(null);
                      }}
                      className="p-3 rounded text-white text-sm hover:opacity-90 transition-opacity"
                      style={{ backgroundColor: s.color_code }}
                    >
                      {s.name}
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
                <span className="text-sm font-medium">Edit Status Labels</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsEditMode(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Edit List */}
              <div className="max-h-64 overflow-y-auto scrollbar-hide border border-border rounded mb-3">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={editableStatuses.map((s) => s.id)}
                    strategy={rectSortingStrategy}
                  >
                    <div className="grid grid-cols-2 gap-2 p-2">
                      {editableStatuses.map((s, i) => (
                        <SortableStatusItem
                          key={s.id}
                          status={s}
                          index={i}
                          editableStatuses={editableStatuses}
                          setEditableStatuses={setEditableStatuses}
                          colorPickerOpen={colorPickerOpen}
                          setColorPickerOpen={setColorPickerOpen}
                          handleDeleteStatus={handleDeleteStatus}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
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
        </div>
      </PopoverContent>
    </Popover>
  );
}
