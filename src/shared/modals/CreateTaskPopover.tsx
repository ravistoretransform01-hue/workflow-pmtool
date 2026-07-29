import { useState, useEffect } from "react";
import type { KeyboardEvent } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Switch } from "@/shared/ui/switch";
import { Label } from "@/shared/ui/label";
import { ScrollArea } from "@/shared/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { ListTree, Layers } from "lucide-react";
import type { Task } from "@/features/workload/components/WorkloadBoard";

export interface CreateTaskPopoverProps {
  groups: Array<{ id: string; name: string; tasks: Task[] }>;
  isLoading?: boolean;
  onAddTask: (
    name: string,
    groupId: string,
    parentId?: string,
  ) => Promise<void>;
  preselectedGroupId?: string;
  trigger?: React.ReactNode;
}

export function CreateTaskPopover({
  groups,
  isLoading = false,
  onAddTask,
  preselectedGroupId,
  trigger,
}: CreateTaskPopoverProps) {
  const [open, setOpen] = useState(false);
  const [newTaskName, setNewTaskName] = useState("");
  const [isSubtask, setIsSubtask] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [selectedParentId, setSelectedParentId] = useState<string>("");

  const groupTasks = groups.find((g) => g.id === selectedGroupId)?.tasks || [];

  useEffect(() => {
    if (open) {
      if (!selectedGroupId) {
        setSelectedGroupId(preselectedGroupId || (groups[0]?.id ? String(groups[0].id) : ""));
      }
    }
  }, [open, preselectedGroupId, groups, selectedGroupId]);

  const resetState = () => {
    setNewTaskName("");
    setIsSubtask(false);
    setSelectedParentId("");
    if (preselectedGroupId) {
      setSelectedGroupId(""); // Reset to empty so effect catches it if opened again
    }
  };

  const handleCreateTask = async () => {
    if (!newTaskName.trim() || !selectedGroupId) return;

    if (isSubtask && !selectedParentId) {
      return;
    }

    try {
      await onAddTask(
        newTaskName,
        selectedGroupId,
        isSubtask ? selectedParentId : undefined,
      );
      setOpen(false);
      resetState();
    } catch (error) {
      console.error("Failed to create task:", error);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && newTaskName.trim()) {
      handleCreateTask();
    } else if (e.key === "Escape") {
      setOpen(false);
      resetState();
    }
  };

  return (
    <Popover
      open={open}
      onOpenChange={(val) => {
        setOpen(val);
        if (!val) resetState();
      }}
    >
      <PopoverTrigger asChild>
        {trigger}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[320px] p-4 space-y-4">
        <h4 className="font-semibold text-sm leading-none tracking-tight">Create Task</h4>
        <div className="space-y-3">
          <Input
            placeholder={
              isSubtask ? "Subtask name..." : "What needs to be done?"
            }
            value={newTaskName}
            onChange={(e) => setNewTaskName(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            className="h-9 text-sm focus-visible:ring-primary/50 border-border"
          />

          <div className="flex items-center justify-between px-1">
            <div className="flex items-center space-x-2">
              <Switch
                id="subtask-mode"
                checked={isSubtask}
                onCheckedChange={setIsSubtask}
                className="scale-75 origin-left data-[state=checked]:bg-primary"
              />
              <Label
                htmlFor="subtask-mode"
                className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground cursor-pointer flex items-center gap-1.5"
              >
                {isSubtask ? (
                  <ListTree className="w-3.5 h-3.5" />
                ) : (
                  <Layers className="w-3.5 h-3.5" />
                )}
                {isSubtask ? "Subtask" : "Task"}
              </Label>
            </div>
          </div>

          <div className="grid gap-2">
            <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
              <SelectTrigger className="h-8 text-xs bg-background border-border">
                <SelectValue placeholder="Select Group" />
              </SelectTrigger>
              <SelectContent>
                {groups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {isSubtask && (
              <Select
                value={selectedParentId}
                onValueChange={setSelectedParentId}
              >
                <SelectTrigger className="h-8 text-xs bg-background border-border">
                  <SelectValue placeholder="Select Parent Task" />
                </SelectTrigger>
                <SelectContent>
                  <ScrollArea className="h-40">
                    {groupTasks.length > 0 ? (
                      groupTasks.map((task) => (
                        <SelectItem key={task.id} value={task.id}>
                          {task.name}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="p-3 text-xs text-muted-foreground text-center italic">
                        No items in this group
                      </div>
                    )}
                  </ScrollArea>
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="pt-2 flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setOpen(false);
                resetState();
              }}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleCreateTask}
              disabled={isLoading || (isSubtask && !selectedParentId)}
            >
              {isLoading ? "Adding..." : "Add"}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
