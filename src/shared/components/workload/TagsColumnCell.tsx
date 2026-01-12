import { useState, useEffect } from "react";
import { toast } from "sonner";
import { getOrganizationId } from "@/lib/utils";
import { tasksApi } from "@/features/tasks/tasksApi";
import { cmsApi } from "@/features/cms/cmsApi";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";

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
    () => new Set(taskTags.map((t: any) => String(t.tag_id)))
  );
  const [isSaving, setIsSaving] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
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

      // Add the new tag to selected tags
      setSelectedTagIds((prev) => new Set([...prev, String(newTag.id)]));
      setNewTagName("");
      setShowCreateForm(false);

      // Call callback to update tags list in parent component
      onTagCreated?.(newTag);

      toast.success("Tag created successfully");
    } catch (error) {
      console.error("Failed to create tag:", error);
      toast.error("Failed to create tag");
    } finally {
      setIsCreatingTag(false);
    }
  };

  const handleSaveTags = async () => {
    setIsSaving(true);
    try {
      // Get tags to add and remove
      const currentTagIds = new Set(taskTags.map((t: any) => String(t.tag_id)));
      const tagsToAdd = Array.from(selectedTagIds).filter(
        (id) => !currentTagIds.has(String(id))
      );
      const tagsToRemove = Array.from(currentTagIds).filter(
        (id) => !selectedTagIds.has(String(id))
      );

      // Call API for each tag change
      for (const tagId of tagsToAdd) {
        await tasksApi.updateTaskTags({
          id: task.id,
          tag_id: Number(tagId),
        });
      }

      for (const tagId of tagsToRemove) {
        await tasksApi.updateTaskTags({
          id: task.id,
          tag_id: Number(tagId),
        });
      }

      // Update local state with new tags
      const updatedTags = Array.from(selectedTagIds)
        .map((tagId) => {
          // Check if tag already exists in taskTags
          const existingTag = taskTags.find(
            (t: any) => String(t.tag_id) === String(tagId)
          );
          if (existingTag) return existingTag;

          // Create new tag object
          const cmsTag = availableTags.find(
            (t: any) => String(t.id) === String(tagId)
          );
          if (!cmsTag) return null;

          return {
            task_tag_id: Date.now() + Math.random(),
            tag_id: cmsTag.id,
            tag_name: cmsTag.name,
            tag_slug: cmsTag.slug,
            tag_is_active: cmsTag.is_active,
            tagged_by: 2,
            tagged_by_name: "Current User",
            tagged_at: new Date().toISOString(),
          };
        })
        .filter(Boolean);

      onTagChange?.(task.id, updatedTags);
      setOpenPopoverId?.(null);
      toast.success("Tags updated successfully");
    } catch (error) {
      console.error("Failed to update tags:", error);
      toast.error("Failed to update tags");
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
            new Set(taskTags.map((t: any) => String(t.tag_id)))
          );
          setShowCreateForm(false);
        }
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
        className="w-56 p-3 bg-card border border-primary/20 shadow-lg rounded-lg flex flex-col max-h-96"
        align="center"
      >
        <div className="flex flex-col h-full">
          <h3 className="font-medium text-sm mb-2">Manage Tags</h3>

          {/* Available Tags with Checkboxes */}
          <div className="flex-1 overflow-y-auto scrollbar-hide space-y-1">
            {Array.isArray(availableTags) && availableTags.length > 0 ? (
              availableTags.map((cmsTag: any) => (
                <label
                  key={cmsTag.id}
                  className="flex items-center gap-2 cursor-pointer px-2 py-1 rounded hover:bg-primary/5 transition-colors text-sm"
                >
                  <input
                    type="checkbox"
                    checked={selectedTagIds.has(String(cmsTag.id))}
                    onChange={(e) => {
                      const newSelected = new Set(selectedTagIds);
                      const tagIdStr = String(cmsTag.id);
                      if (e.target.checked) {
                        newSelected.add(tagIdStr);
                      } else {
                        newSelected.delete(tagIdStr);
                      }
                      setSelectedTagIds(newSelected);
                    }}
                    className="cursor-pointer accent-primary"
                  />
                  <span className="text-sm">{cmsTag.name}</span>
                </label>
              ))
            ) : (
              <div className="text-center py-4 text-sm text-muted-foreground">
                No tags available
              </div>
            )}
          </div>

          {/* Create New Tag Section */}
          <div className="border-t border-primary/20 mt-2 pt-2">
            {!showCreateForm ? (
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={() => setShowCreateForm(true)}
              >
                + Create New Tag
              </Button>
            ) : (
              <div className="space-y-2">
                <Input
                  placeholder="Tag name"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  className="h-8 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleCreateTag();
                    } else if (e.key === "Escape") {
                      setShowCreateForm(false);
                      setNewTagName("");
                    }
                  }}
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-8 text-xs"
                    onClick={() => {
                      setShowCreateForm(false);
                      setNewTagName("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 h-8 text-xs"
                    onClick={handleCreateTag}
                    disabled={isCreatingTag || !newTagName.trim()}
                  >
                    {isCreatingTag ? "Creating..." : "Create"}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="border-t border-primary/20 mt-2 pt-2">
            <Button
              size="sm"
              className="w-full"
              onClick={handleSaveTags}
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save Tags"}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
