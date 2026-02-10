import { useState, useEffect } from "react";
import { toast } from "sonner";
import { getOrganizationId } from "@/lib/utils";
import { tasksApi } from "@/features/tasks/tasksApi";
import { cmsApi } from "@/features/cms/cmsApi";
import { addTagToCache } from "@/features/cms/cmsStorage";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover";
import { Input } from "@/shared/components/ui/input";
import { Loader2 } from "lucide-react";

interface TagsColumnCellProps {
  task: any;
  tags: any[];
  openPopoverId?: string | null;
  setOpenPopoverId?: (id: string | null) => void;
  onTagChange?: (taskId: string, tags: any[]) => void;
  onTagCreated?: (newTag: any) => void;
  boardId?: string | number;
}

export function TagsColumnCell({
  task,
  tags,
  openPopoverId,
  setOpenPopoverId,
  onTagChange,
  onTagCreated,
  boardId,
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
      if (isCurrentlySelected) {
        // Handle Removal
        const tagToRemove = task.tags?.find(
          (t: any) => String(t.tag_id) === tagIdStr,
        );
        if (tagToRemove?.task_tag_id) {
          await tasksApi.removeTaskTag(tagToRemove.task_tag_id);
        } else {
          // Fallback if task_tag_id is missing for some reason
          await tasksApi.updateTaskTags({
            id: task.id,
            tag_id: Number(cmsTag.id),
          });
        }
      } else {
        // Handle Addition
        await tasksApi.updateTaskTags({
          id: task.id,
          tag_id: Number(cmsTag.id),
        });
      }

      // Update local state with new tags (this logic remains same as it reconstructs the tags array)
      const updatedTags = Array.from(newSelected)
        .map((tagId) => {
          const existingTag = task.tags?.find(
            (t: any) => String(t.tag_id) === String(tagId),
          );
          if (existingTag) return existingTag;

          const cmsTagData = availableTags.find(
            (t: any) => String(t.id) === String(tagId),
          );
          if (!cmsTagData) return null;

          return {
            task_tag_id: Date.now() + Math.random(),
            tag_id: cmsTagData.id,
            tag_name: cmsTagData.name,
            tag_slug: cmsTagData.slug,
            tag_is_active: cmsTagData.is_active,
            tagged_by: 2,
            tagged_by_name: "Current User",
            tagged_at: new Date().toISOString(),
          };
        })
        .filter(Boolean);

      onTagChange?.(task.id, updatedTags);
      toast.success(isCurrentlySelected ? "Tag Removed" : "Tag Added");
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
          className="w-full flex flex-wrap gap-1 justify-center items-center hover:opacity-80 transition-opacity cursor-pointer"
          onClick={(e) => e.stopPropagation()}
        >
          {taskTags.length === 0 ? (
            <span className="text-muted-foreground text-xs">+ Add</span>
          ) : (
            taskTags.map((tag: any) => (
              <span
                key={`${task.id}-${tag.tag_id}`}
                className="px-2 py-1 rounded text-xs font-medium text-white cursor-pointer hover:opacity-90"
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
        className="w-56 p-3 bg-card border border-primary/20 shadow-lg rounded-sm flex flex-col max-h-96"
        align="center"
      >
        <div className="flex flex-col h-full">
          {/* Create New Tag Input */}
          <div className="mb-3 pb-3 border-b border-primary/20">
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
          <div className="flex-1 overflow-y-auto scrollbar-hide space-y-1">
            {Array.isArray(availableTags) && availableTags.length > 0 ? (
              availableTags.map((cmsTag: any) => {
                const isSelected = selectedTagIds.has(String(cmsTag.id));
                return (
                  <button
                    key={cmsTag.id}
                    onClick={() => handleTagToggle(cmsTag)}
                    disabled={isSaving}
                    className={`w-full px-3 py-2 rounded-none text-sm font-medium transition-all cursor-pointer text-left disabled:opacity-50 disabled:cursor-not-allowed ${
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
