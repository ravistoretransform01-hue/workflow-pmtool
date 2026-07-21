import { useState, useEffect } from "react";
import { toast } from "sonner";
import { getOrganizationId } from "@/utils/utils";
import { tasksApi } from "@/features/tasks/api/tasksApi";
import { cmsApi } from "@/features/cms/api/cmsApi";
import { addTagToCache } from "@/features/cms/services/cmsStorage";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/ui/popover";
import { Input } from "@/shared/ui/input";
import { Loader2 } from "lucide-react";

interface TagsColumnCellProps {
  task: any;
  tags: any[];
  openPopoverId?: string | null;
  setOpenPopoverId?: (id: string | null) => void;
  onTagChange?: (taskId: string, tags: any[]) => void;
  onTagCreated?: (newTag: any) => void;
  boardId?: string | number;
  onTagToggle?: (
    taskId: string,
    cmsTag: any,
    isCurrentlySelected: boolean,
  ) => Promise<void>;
  checkedTasks?: Record<string, boolean>;
}

export function TagsColumnCell({
  task,
  tags,
  openPopoverId,
  setOpenPopoverId,
  onTagChange,
  onTagCreated,
  boardId,
  onTagToggle,
}: TagsColumnCellProps) {
  const taskTags = task.tags || [];
  const popoverId = `tags-${task.id}`;
  const [selectedTagIds, setSelectedTagIds] = useState<Set<number | string>>(
    () => new Set(taskTags.map((t: any) => String(t.tag_id))),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const [availableTags, setAvailableTags] = useState(tags);

  // Sync selectedTagIds when taskTags prop changes
  useEffect(() => {
    setSelectedTagIds(new Set(taskTags.map((t: any) => String(t.tag_id))));
  }, [taskTags]);

  // Update available tags when tags prop changes
  useEffect(() => {
    setAvailableTags(tags);
  }, [tags]);

  const handleCreateTag = async () => {
    if (!newTagName.trim()) {
      toast.error("Tag name is required");
      return;
    }

    setIsCreatingTag(true);
    try {
      // Get organization ID from utils
      const orgId = getOrganizationId();
      // Use passed boardId parameter
      const bId = boardId;

      if (!orgId || !bId) {
        toast.error("Organization or board information not found");
        return;
      }

      // Create slug from tag name (lowercase, replace spaces with hyphens)
      const slug = newTagName.toLowerCase().replace(/\s+/g, "-");

      const newTag = await cmsApi.createTag({
        name: newTagName.trim(),
        slug,
        organization_id: orgId,
        board_id: Number(bId),
      });

      // Update localStorage cache
      addTagToCache(Number(bId), newTag);

      // Add the new tag to available tags list
      setAvailableTags((prev) => [...prev, newTag]);

      // Don't automatically select the new tag - let user click to select
      setNewTagName("");

      // Call callback to update tags list in parent component
      onTagCreated?.(newTag);

      toast.success("Tag Created Successfully");
    } catch (error) {
      console.error("Failed to create tag:", error);
      toast.error("Failed to Create Tag");
    } finally {
      setIsCreatingTag(false);
    }
  };

  const handleTagToggle = async (cmsTag: any) => {
    const newSelected = new Set(selectedTagIds);
    const tagIdStr = String(cmsTag.id);
    const isCurrentlySelected = selectedTagIds.has(tagIdStr);

    // Update local state immediately for UI feedback
    if (isCurrentlySelected) {
      newSelected.delete(tagIdStr);
    } else {
      newSelected.add(tagIdStr);
    }
    setSelectedTagIds(newSelected);

    // Save to API immediately
    setIsSaving(true);
    try {
      if (onTagToggle) {
        await onTagToggle(task.id, cmsTag, isCurrentlySelected);
      } else {
        if (isCurrentlySelected) {
          // Handle Removal
          const tagToRemove = task.tags?.find(
            (t: any) => String(t.tag_id) === tagIdStr,
          );
          if (tagToRemove?.task_tag_id) {
            await tasksApi.removeTaskTag(tagToRemove.task_tag_id);
          } else {
            // If we don't have task_tag_id (e.g. just added), we can't remove yet
            // unless we want to find it from the task object again
            toast.error("Please wait a moment before removing this tag");
            // Revert local state
            const reverted = new Set(selectedTagIds);
            setSelectedTagIds(reverted);
            return;
          }
        } else {
          // Handle Addition
          const response = await tasksApi.updateTaskTags({
            id: task.id,
            tag_id: Number(cmsTag.id),
          });

          // Find the newly added tag in the response to get its real task_tag_id
          const addedTag = response.tags?.find(
            (t: any) => String(t.tag_id) === tagIdStr,
          );

          if (addedTag) {
            // Construct the actual tag object for the onTagChange callback
            const newTags = [
              ...(task.tags || []),
              {
                task_tag_id: addedTag.task_tag_id,
                tag_id: addedTag.tag_id,
                tag_name: addedTag.tag_name,
                tag_slug: addedTag.tag_slug,
                tag_is_active: addedTag.tag_is_active,
                tagged_by: addedTag.tagged_by,
                tagged_by_name: addedTag.tagged_by_name,
                tagged_at: addedTag.tagged_at,
              },
            ];
            onTagChange?.(task.id, newTags);
            toast.success("Tag Added");
            return; // Exit early as we've handled the state update
          }
        }

        // Reconstruct the tags array for removal (logic remains similar)
        const updatedTags = Array.from(newSelected)
          .map((tagId) => {
            return task.tags?.find(
              (t: any) => String(t.tag_id) === String(tagId),
            );
          })
          .filter(Boolean);

        onTagChange?.(task.id, updatedTags);
        toast.success(isCurrentlySelected ? "Tag Removed" : "Tag Added");
      }
    } catch (error) {
      console.error("Failed to update tag:", error);
      toast.error("Failed to Update Tag");
      // Revert selection on error (use the previous selectedTagIds)
      const reverted = new Set(selectedTagIds);
      setSelectedTagIds(reverted);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Popover
      modal={true}
      open={openPopoverId === popoverId}
      onOpenChange={(open) => {
        if (open) {
          setSelectedTagIds(
            new Set(taskTags.map((t: any) => String(t.tag_id))),
          );
        }
        // Only allow closing from outside (when open is false)
        setOpenPopoverId?.(open ? popoverId : null);
      }}
    >
      <PopoverTrigger asChild>
        <button
          className="w-full flex flex-wrap gap-1 justify-center items-center hover:opacity-80 transition-opacity cursor-pointer px-1"
          onClick={(e) => e.stopPropagation()}
        >
          {taskTags.length === 0 ? (
            <div className="w-full flex justify-center">
              <span className="text-muted-foreground text-xs">+ Add</span>
            </div>
          ) : (
            taskTags.map((tag: any) => (
              <span
                key={`${task.id}-${tag.tag_id}`}
                className="px-2 py-1 rounded text-xs font-medium text-white cursor-pointer hover:opacity-90 truncate inline-block max-w-full"
                style={{
                  backgroundColor: tag.color || "#6b7280",
                }}
                title={tag.tag_name}
              >
                #{tag.tag_name}
              </span>
            ))
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-56 p-3 bg-card border border-primary/20 shadow-lg rounded-sm flex flex-col max-h-[400px] overflow-hidden"
        align="center"
      >
        <div className="flex flex-col h-full min-h-0">
          {/* Create New Tag Input */}
          <div className="mb-3 pb-3 border-b border-primary/20 flex-shrink-0">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Add new tag..."
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleCreateTag();
                  }
                }}
                disabled={isCreatingTag}
                className="h-8 text-sm flex-1"
                autoFocus
              />
              {isCreatingTag && (
                <Loader2 className="h-5 w-5 animate-spin text-primary flex-shrink-0" />
              )}
            </div>
          </div>

          {/* Available Tags with Selectable Tiles */}
          <div className="flex-1 overflow-y-auto scrollbar-hide space-y-1 min-h-0">
            {Array.isArray(availableTags) && availableTags.length > 0 ? (
              availableTags.map((cmsTag: any) => {
                const isSelected = selectedTagIds.has(String(cmsTag.id));
                return (
                  <button
                    key={cmsTag.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTagToggle(cmsTag);
                    }}
                    disabled={isSaving}
                    className={`w-full px-3 py-2 rounded-none text-sm font-medium transition-all cursor-pointer text-left disabled:opacity-50 ${
                      isSelected
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "bg-secondary/50 text-foreground hover:bg-secondary"
                    }`}
                  >
                    #{cmsTag.name}
                  </button>
                );
              })
            ) : (
              <div className="text-center py-4 text-sm text-muted-foreground">
                No tags available
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
