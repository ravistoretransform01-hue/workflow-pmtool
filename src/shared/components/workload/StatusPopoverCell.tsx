import { useEffect, useState } from "react";
import { X, Trash } from "lucide-react";
import { toast } from "sonner";

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

  const [displayStatuses, setDisplayStatuses] = useState<Status[]>([]);
  const [editableStatuses, setEditableStatuses] = useState<EditableStatus[]>(
    [],
  );

  const [newStatusName, setNewStatusName] = useState("");
  const [newStatusColor, setNewStatusColor] = useState(PRESET_COLORS[0]);
  const [isCreating, setIsCreating] = useState(false);

  const [colorPickerOpen, setColorPickerOpen] = useState<string | null>(null);
  const [createColorPickerOpen, setCreateColorPickerOpen] = useState(false);

  /* ---------------------------------------------
   * Initialize displayStatuses ONCE per open
   * ------------------------------------------- */
  useEffect(() => {
    if (openPopoverId === popoverId && displayStatuses.length === 0) {
      setDisplayStatuses([...statuses]);
    }
  }, [openPopoverId, popoverId, statuses, displayStatuses.length]);

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

      setDisplayStatuses((prev) => [...prev, created]);
      onStatusCreated?.(created);

      setNewStatusName("");
      setNewStatusColor(PRESET_COLORS[0]);
      setShowCreateForm(false);

      toast.success("Status Created");
    } catch {
      toast.error("Failed to Create Status");
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

      const updated: Status[] = editableStatuses.map((edited) => {
        const original = displayStatuses.find(
          (s) => String(s.id) === edited.id,
        );

        if (!original) {
          throw new Error(`Status not found: ${edited.id}`);
        }

        return {
          ...original, // keeps status_order and any future fields
          name: edited.name,
          color_code: edited.color_code,
        };
      });

      setDisplayStatuses(updated);
      setIsEditMode(false);
      onStatusesUpdated?.(updated);

      toast.success("Statuses Updated");
    } catch {
      toast.error("Failed to Update Statuses");
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

      await cmsApi.deleteStatus(statusId);

      deleteStatusFromCache(Number(boardId), statusId);

      const updatedEditable = editableStatuses.filter((s) => s.id !== statusId);
      setEditableStatuses(updatedEditable);

      const updatedDisplay = displayStatuses.filter(
        (s) => String(s.id) !== statusId,
      );
      setDisplayStatuses(updatedDisplay);

      onStatusesUpdated?.(updatedDisplay);

      toast.success("Status Deleted");
    } catch {
      toast.error("Failed to Delete Status");
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
      modal={false}
    >
      <PopoverTrigger asChild>
        <Button
          size="sm"
          className="h-8 px-3 text-xs text-white"
          style={{
            backgroundColor: statusObj?.color_code || "#e5e7eb",
            border: "none",
          }}
        >
          {statusObj?.name || "No Status"}
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
              <span className="text-sm font-medium">Select Status</span>
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
                  value={newStatusName}
                  onChange={(e) => setNewStatusName(e.target.value)}
                  placeholder="Status name"
                />
                <ColorPickerPopover
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

            <Button className="w-full" onClick={() => setIsEditMode(true)} variant="outline" size="sm">
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
            <div className="max-h-64 overflow-y-auto scrollbar-hide border border-border rounded mb-2">
              <div className="grid grid-cols-2 gap-2 p-2">
                {editableStatuses.map((s, i) => (
                  <div key={s.id} className="flex gap-2 items-center p-2 border border-border rounded">
                    <ColorPickerPopover
                      color={s.color_code}
                      onColorChange={(c) => {
                        const copy = [...editableStatuses];
                        copy[i].color_code = c;
                        setEditableStatuses(copy);
                      }}
                      isOpen={colorPickerOpen === s.id}
                      onOpenChange={(o) => setColorPickerOpen(o ? s.id : null)}
                    />
                    <Input
                      value={s.name}
                      onChange={(e) => {
                        const copy = [...editableStatuses];
                        copy[i].name = e.target.value;
                        setEditableStatuses(copy);
                      }}
                      className="h-8 text-sm flex-1"
                    />
                    <Trash 
                      className="h-4 w-4 text-destructive cursor-pointer" 
                      onClick={() => handleDeleteStatus(s.id)}
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

// -------------------------------------------------------------

// import { useEffect, useState } from "react";
// import { X, Trash } from "lucide-react";

// import { Button } from "@/shared/components/ui/button";
// import { Input } from "@/shared/components/ui/input";
// import {
//   Popover,
//   PopoverContent,
//   PopoverTrigger,
// } from "@/shared/components/ui/popover";
// import { ColorPickerPopover } from "@/shared/components/workload/ColorPickerPopover";
// import type { Status } from "@/features/cms/types";
// import { cmsApi } from "@/features/cms/cmsApi";
// import {
//   addStatusToCache,
//   updateStatusInCache,
// } from "@/features/cms/cmsStorage";
// import { getOrganizationId } from "@/lib/utils";
// import { toast } from "sonner";

// const PRESET_COLORS = [
//   "#16a249", // green
//   "#3c83f6", // blue
//   "#a855f7", // purple
//   "#dc2828", // red
//   "#facc14", // yellow
//   "#ff8400", // orange
//   "#ec4899", // pink
//   "#10b981", // emerald
//   "#06b6d4", // cyan
//   "#8b5cf6", // violet
//   "#f59e0b", // amber
//   "#ef4444", // rose
//   "#14b8a6", // teal
//   "#6366f1", // indigo
//   "#f97316", // orange-600
//   "#84cc16", // lime
// ];

// interface StatusPopoverCellProps {
//   task: any;
//   statuses: Status[];
//   statusObj: Status | undefined;
//   popoverId: string;
//   openPopoverId?: string | null;
//   setOpenPopoverId?: (id: string | null) => void;
//   onStatusChange?: (taskId: string, statusId: string) => void;
//   onStatusCreated?: (newStatus: Status) => void;
//   onStatusesUpdated?: (updatedStatuses: Status[]) => void;
//   boardId?: string | number;
// }

// export default function StatusPopoverCell({
//   task,
//   statuses,
//   statusObj,
//   popoverId,
//   openPopoverId,
//   setOpenPopoverId,
//   onStatusChange,
//   onStatusCreated,
//   onStatusesUpdated,
//   boardId,
// }: StatusPopoverCellProps) {
//   const [isEditMode, setIsEditMode] = useState(false);
//   const [showCreateForm, setShowCreateForm] = useState(false);

//   const [displayStatuses, setDisplayStatuses] = useState<Status[]>([]);
//   const [editableStatuses, setEditableStatuses] = useState<
//     Array<{ id: string; name: string; color_code: string }>
//   >([]);

//   const [newStatusName, setNewStatusName] = useState("");
//   const [newStatusColor, setNewStatusColor] = useState(PRESET_COLORS[0]);
//   const [isCreating, setIsCreating] = useState(false);

//   const [colorPickerOpen, setColorPickerOpen] = useState<string | null>(null);
//   const [createFormColorPickerOpen, setCreateFormColorPickerOpen] =
//     useState(false);

//   // Initialize displayStatuses only when popover first opens (not on every statuses change)
//   useEffect(() => {
//     if (openPopoverId === popoverId && displayStatuses.length === 0) {
//       setDisplayStatuses([...statuses]);
//     }
//   }, [openPopoverId, popoverId]);

//   // Sync editableStatuses with displayStatuses when edit mode is opened (use displayStatuses as source of truth)
//   useEffect(() => {
//     if (isEditMode) {
//       // debugLog("[useEffect] Syncing editableStatuses with displayStatuses:", displayStatuses);
//       setEditableStatuses(displayStatuses.map((s) => ({ id: String(s.id), name: s.name, color_code: s.color_code })));
//     }
//   }, [isEditMode, displayStatuses]);

//   // Sync displayStatuses with editableStatuses when in edit mode for real-time updates
//   useEffect(() => {
//     if (isEditMode && editableStatuses.length > 0) {
//       // debugLog("[useEffect] Syncing displayStatuses with editableStatuses:", editableStatuses);
//       setDisplayStatuses([...editableStatuses] as any);
//     }
//   }, [editableStatuses, isEditMode]);

//   const handleCreateStatus = async () => {
//     if (!newStatusName.trim()) {
//       toast.error("Status name is required");
//       return;
//     }

//     setIsCreating(true);
//     try {
//       const orgId = getOrganizationId();
//       const bId = boardId;

//       if (!orgId || !bId) {
//         toast.error("Organization or board information not found");
//         return;
//       }

//       const newStatus = await cmsApi.createStatus({
//         name: newStatusName.trim(),
//         color_code: newStatusColor,
//         organization_id: orgId,
//         board_id: Number(bId),
//       });

//       // Ensure status has required fields
//       const statusWithDefaults: any = {
//         id: newStatus.id || String(Date.now()),
//         name: newStatus.name,
//         color_code: newStatus.color_code,
//         status_order: String(newStatus.status_order) || "999",
//       };

//       // Update localStorage cache
//       addStatusToCache(Number(bId), statusWithDefaults);

//       // Add to display statuses immediately for real-time update
//       setDisplayStatuses((prev) => [...prev, statusWithDefaults]);

//       setNewStatusName("");
//       setNewStatusColor(PRESET_COLORS[0]);
//       setShowCreateForm(false);
//       onStatusCreated?.(statusWithDefaults);
//       toast.success("Status created successfully");
//     } catch (error) {
//       console.error("Failed to create status:", error);
//       toast.error("Failed to create status");
//     } finally {
//       setIsCreating(false);
//     }
//   };

//   return (
//     <Popover
//       open={openPopoverId === popoverId}
//       onOpenChange={(open) => {
//         if (open) {
//           setShowCreateForm(false);
//         }
//         setOpenPopoverId?.(open ? popoverId : null);
//       }}
//     >
//       <PopoverTrigger asChild>
//         <Button
//           variant="outline"
//           size="sm"
//           className="h-8 px-3 text-xs font-medium whitespace-nowrap"
//           style={{
//             backgroundColor: statusObj?.color_code || "#e5e7eb",
//             color: "white",
//             border: "none",
//           }}
//           onClick={(e) => e.stopPropagation()}
//         >
//           {statusObj?.name || "No Status"}
//         </Button>
//       </PopoverTrigger>
//       <PopoverContent
//         className="w-max p-3 bg-card border border-border shadow-lg rounded-lg"
//         align="center"
//       >
//         <div
//           className="flex flex-col"
//           style={{
//             width: "500px",
//           }}
//         >
//           {!isEditMode ? (
//             <>
//               {/* Header with + button */}
//               <div className="flex items-center justify-between mb-2">
//                 <h3 className="font-medium text-sm">Select Status</h3>
//                 <Button
//                   variant="ghost"
//                   size="sm"
//                   className="h-6 w-6 p-0 hover:bg-primary"
//                   onClick={() => setShowCreateForm(!showCreateForm)}
//                   title="Create New Status"
//                 >
//                   <span className="text-lg font-semibold">+</span>
//                 </Button>
//               </div>

//               {/* Create Form */}
//               {showCreateForm && (
//                 <div className="space-y-2 mb-2 pb-2 border-b border-border">
//                   <div className="flex gap-2 items-center">
//                     <Input
//                       placeholder="Status name"
//                       value={newStatusName}
//                       onChange={(e) => setNewStatusName(e.target.value)}
//                       className="h-8 text-sm flex-1"
//                       onKeyDown={(e) => {
//                         if (e.key === "Enter") {
//                           handleCreateStatus();
//                         } else if (e.key === "Escape") {
//                           setShowCreateForm(false);
//                           setNewStatusName("");
//                         }
//                       }}
//                       autoFocus
//                     />
//                     <ColorPickerPopover
//                       color={newStatusColor}
//                       onColorChange={setNewStatusColor}
//                       isOpen={createFormColorPickerOpen}
//                       onOpenChange={setCreateFormColorPickerOpen}
//                       size="w-8 h-8"
//                     />
//                   </div>
//                   <div className="flex gap-2">
//                     <Button
//                       variant="outline"
//                       size="sm"
//                       className="flex-1 h-8 text-xs"
//                       onClick={() => {
//                         setShowCreateForm(false);
//                         setNewStatusName("");
//                       }}
//                     >
//                       Cancel
//                     </Button>
//                     <Button
//                       size="sm"
//                       className="flex-1 h-8 text-xs"
//                       onClick={handleCreateStatus}
//                       disabled={isCreating || !newStatusName.trim()}
//                     >
//                       {isCreating ? "Creating..." : "Create"}
//                     </Button>
//                   </div>
//                 </div>
//               )}

//               {/* Status Grid */}
//               <div className="grid grid-cols-2 gap-2 max-h-80 overflow-y-auto scrollbar-hide mb-2">
//                 {displayStatuses.map((status) => (
//                   <button
//                     key={status.id}
//                     onClick={() => {
//                       onStatusChange?.(task.id, String(status.id));
//                       setOpenPopoverId?.(null);
//                     }}
//                     title={status.name}
//                     className="flex flex-col items-center gap-2 px-3 py-3 rounded-sm hover:opacity-80 transition-opacity text-sm font-medium overflow-hidden"
//                     style={{
//                       backgroundColor: status.color_code,
//                       color: "white",
//                     }}
//                   >
//                     <span className="text-center truncate w-full">
//                       {status.name}
//                     </span>
//                   </button>
//                 ))}
//               </div>

//               {/* Edit Labels Button */}
//               <Button
//                 variant="outline"
//                 size="sm"
//                 className="w-full h-8 text-xs"
//                 onClick={() => {
//                   setIsEditMode(true);
//                   setEditableStatuses(statuses.map((s) => ({ id: String(s.id), name: s.name, color_code: s.color_code })));
//                 }}
//               >
//                 Edit Labels
//               </Button>
//             </>
//           ) : (
//             <>
//               {/* Edit Mode Header */}
//               <div className="flex items-center justify-between mb-3">
//                 <h3 className="font-medium text-sm">Edit Status Labels</h3>
//                 <Button
//                   variant="ghost"
//                   size="sm"
//                   className="h-6 w-6 p-0"
//                   onClick={() => setIsEditMode(false)}
//                 >
//                   <X className="h-4 w-4" />
//                 </Button>
//               </div>

//               {/* Editable Status List - Grid Structure */}
//               <div className="grid grid-cols-2 gap-2 max-h-80 overflow-y-auto scrollbar-hide mb-3">
//                 {editableStatuses.map((status, index) => (
//                   <div
//                     key={`${status.id}-${index}`}
//                     className="flex flex-row gap-2 items-center p-1 rounded border border-border"
//                   >
//                     {/* Color div with popover */}
//                     <ColorPickerPopover
//                       color={status.color_code}
//                       onColorChange={(newColor: string) => {
//                         const updated = [...editableStatuses];
//                         updated[index].color_code = newColor;
//                         setEditableStatuses(updated);
//                       }}
//                       isOpen={colorPickerOpen === status.id}
//                       onOpenChange={(open: boolean) => {
//                         setColorPickerOpen(open ? status.id : null);
//                       }}
//                     />

//                     <Input
//                       value={status.name}
//                       onChange={(e) => {
//                         const updated = [...editableStatuses];
//                         updated[index].name = e.target.value;
//                         setEditableStatuses(updated);
//                       }}
//                       className="h-8 text-sm flex-1"
//                       placeholder="Status name"
//                     />

//                     <button
//                       onClick={() => {
//                         const updated = editableStatuses.filter(
//                           (_, i) => i !== index,
//                         );
//                         setEditableStatuses(updated);
//                       }}
//                       className="p-1 hover:bg-destructive/20 rounded flex items-center justify-center gap-1 text-xs"
//                       title="Delete status"
//                     >
//                       <Trash className="h-3 w-3 text-destructive" />
//                     </button>
//                   </div>
//                 ))}
//               </div>

//               {/* Done Button */}
//               <Button
//                 size="sm"
//                 className="w-full h-8 text-xs"
//                 onClick={async () => {
//                   try {
//                     // Track original statuses for comparison
//                     const originalStatusMap = new Map(
//                       statuses.map((s) => [s.id, s]),
//                     );

//                     // Save all statuses (new and updated)
//                     for (const status of editableStatuses) {
//                       if (status.id.startsWith("new-")) {
//                         // Create new status
//                         const orgId = getOrganizationId();
//                         const bId = boardId;
//                         if (orgId && bId) {
//                           const newStatus = await cmsApi.createStatus({
//                             name: status.name,
//                             color_code: status.color_code,
//                             organization_id: orgId,
//                             board_id: Number(bId),
//                           });
//                           addStatusToCache(Number(bId), newStatus);
//                           onStatusCreated?.(newStatus);
//                         }
//                       } else {
//                         // Check if existing status was modified
//                         const originalStatus = originalStatusMap.get(status.id);
//                         if (
//                           originalStatus &&
//                           (originalStatus.name !== status.name ||
//                             originalStatus.color_code !== status.color_code)
//                         ) {
//                           // Update existing status
//                           const orgId = getOrganizationId();
//                           const bId = boardId;
//                           if (orgId && bId) {
//                             await cmsApi.updateStatus({
//                               status_id: status.id,
//                               name: status.name,
//                               color_code: status.color_code,
//                               organization_id: orgId,
//                               board_id: Number(bId),
//                             });
//                             // Update cache with the updated status
//                             updateStatusInCache(Number(bId), status as any);
//                             // Trigger UI update
//                             onStatusCreated?.(status as any);
//                           }
//                         }
//                       }
//                     }
//                     toast.success("Status labels updated successfully");

//                     debugLog("[Done Button] Before state update:");
//                     debugLog("editableStatuses:", editableStatuses);
//                     debugLog("displayStatuses:", displayStatuses);

//                     // Update displayStatuses with the successfully saved editable statuses
//                     setDisplayStatuses([...editableStatuses] as any);
//                     debugLog("[Done Button] After setDisplayStatuses called with:", editableStatuses);

//                     // Reset edit mode
//                     setIsEditMode(false);
//                     debugLog("[Done Button] isEditMode set to false");

//                     // Notify parent to refresh the statuses list
//                     onStatusesUpdated?.(editableStatuses as any);
//                     debugLog("[Done Button] onStatusesUpdated called with:", editableStatuses);
//                   } catch (error) {
//                     console.error("Failed to update status labels:", error);
//                     toast.error("Failed to update status labels");
//                   }
//                 }}
//               >
//                 Done
//               </Button>
//             </>
//           )}
//         </div>
//       </PopoverContent>
//     </Popover>
//   );
// }
