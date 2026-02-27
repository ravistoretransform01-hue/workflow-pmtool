import { useState, useRef, useEffect } from "react";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { Status } from "@/features/cms/types";
import type { Task } from "./WorkloadBoard";
import { KanbanCard } from "./KanbanCard";
import { useDroppable } from "@dnd-kit/core";
import { Plus, X, ListTree, Layers } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Switch } from "@/shared/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { ScrollArea } from "@/shared/components/ui/scroll-area";

interface KanbanColumnProps {
  status: Status;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onAddTask: (
    name: string,
    groupId: string,
    parentId?: string,
  ) => Promise<void>;
  groups: Array<{ id: string; name: string; tasks: Task[] }>;
  groupMap: Record<string, { name: string; color: string }>;
  visibleCardFields: Set<string>;
  statusMap: Record<string, { name: string; color: string }>;
  priorityMap: Record<string, { name: string; color: string }>;
}

export function KanbanColumn({
  status,
  tasks,
  onTaskClick,
  onAddTask,
  groups,
  groupMap,
  visibleCardFields,
  statusMap,
  priorityMap,
}: KanbanColumnProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newTaskName, setNewTaskName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubtask, setIsSubtask] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [selectedParentId, setSelectedParentId] = useState<string>("");

  const inputRef = useRef<HTMLInputElement>(null);

  const { setNodeRef, isOver } = useDroppable({
    id: `status-${status.id}`,
  });

  useEffect(() => {
    if (isAdding) {
      if (inputRef.current) {
        inputRef.current.focus();
      }
      // Initialize with first group if available
      if (!selectedGroupId && groups.length > 0) {
        setSelectedGroupId(groups[0].id);
      }
    }
  }, [isAdding, groups, selectedGroupId]);

  const handleCreateTask = async () => {
    if (!newTaskName.trim()) {
      setIsAdding(false);
      return;
    }

    if (!selectedGroupId) {
      console.error("No group selected");
      return;
    }

    if (isSubtask && !selectedParentId) {
      console.error("No parent task selected for subtask");
      return;
    }

    setIsLoading(true);
    try {
      await onAddTask(
        newTaskName.trim(),
        selectedGroupId,
        isSubtask ? selectedParentId : undefined,
      );
      setNewTaskName("");
      setIsAdding(false);
      setIsSubtask(false);
      setSelectedParentId("");
    } catch (error) {
      console.error("Failed to create task from Kanban:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleCreateTask();
    } else if (e.key === "Escape") {
      setIsAdding(false);
      setNewTaskName("");
      setIsSubtask(false);
      setSelectedParentId("");
    }
  };

  // Get tasks for the selected group to populate parent task dropdown
  const groupTasks = groups.find((g) => g.id === selectedGroupId)?.tasks || [];

  return (
    <div
      ref={setNodeRef}
      className={`flex-shrink-0 w-80 rounded-lg border flex flex-col transition-colors min-h-full ${
        isOver
          ? "bg-primary/10 border-primary/50 ring-2 ring-primary/20"
          : "bg-muted border-border"
      }`}
    >
      {/* Column Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2 mb-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: status.color_code }}
          />
          <h3 className="font-semibold text-sm">{status.name}</h3>
          <span className="ml-auto text-xs text-muted-foreground bg-background px-2 py-1 rounded">
            {tasks.length}
          </span>
        </div>
      </div>

      {/* Tasks Container */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-hide min-h-[150px]">
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task) => {
            const groupInfo = groupMap[String(task.group_id)];
            const statusInfo = statusMap[String(task.status_id)];
            const priorityInfo = priorityMap[String(task.priority_id)];

            return (
              <KanbanCard
                key={task.id}
                task={task}
                onClick={() => onTaskClick(task)}
                groupName={groupInfo?.name}
                groupColor={groupInfo?.color}
                statusName={statusInfo?.name}
                statusColor={statusInfo?.color}
                priorityName={priorityInfo?.name}
                priorityColor={priorityInfo?.color}
                visibleCardFields={visibleCardFields}
              />
            );
          })}
        </SortableContext>

        {/* Extra hit area at the bottom of the column to make dropping easier */}
        {/* <div className="h-20" /> */}

        {/* Quick Add Task */}
        {isAdding ? (
          <div className="bg-card rounded-lg border border-primary p-3 shadow-md space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="space-y-2">
              <Input
                ref={inputRef}
                placeholder={
                  isSubtask ? "Subtask name..." : "What needs to be done?"
                }
                value={newTaskName}
                onChange={(e) => setNewTaskName(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
                className="h-8 text-sm focus-visible:ring-1"
              />

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="subtask-mode"
                    checked={isSubtask}
                    onCheckedChange={setIsSubtask}
                    className="scale-75 origin-left"
                  />
                  <Label
                    htmlFor="subtask-mode"
                    className="text-xs cursor-pointer flex items-center gap-1"
                  >
                    {isSubtask ? (
                      <>
                        <ListTree className="w-3 h-3" /> Subtask
                      </>
                    ) : (
                      <>
                        <Layers className="w-3 h-3" /> Task
                      </>
                    )}
                  </Label>
                </div>
              </div>

              <div className="grid gap-2">
                {/* Group Selector */}
                <Select
                  value={selectedGroupId}
                  onValueChange={setSelectedGroupId}
                >
                  <SelectTrigger className="h-7 text-xs">
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

                {/* Parent Task Selector (only when Subtask is active) */}
                {isSubtask && (
                  <Select
                    value={selectedParentId}
                    onValueChange={setSelectedParentId}
                  >
                    <SelectTrigger className="h-7 text-xs">
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
                          <div className="p-2 text-xs text-muted-foreground text-center">
                            No Item in this group
                          </div>
                        )}
                      </ScrollArea>
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <Button
                size="sm"
                className="h-7 text-xs px-3"
                onClick={handleCreateTask}
                disabled={isLoading || (isSubtask && !selectedParentId)}
              >
                {isLoading ? "Adding..." : "Add"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => {
                  setIsAdding(false);
                  setNewTaskName("");
                  setIsSubtask(false);
                  setSelectedParentId("");
                }}
                disabled={isLoading}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsAdding(true)}
            className="w-full flex items-center gap-2 p-2 rounded-lg text-muted-foreground hover:bg-primary/5 hover:text-primary transition-all duration-200 group border border-dashed border-transparent hover:border-primary/20"
          >
            <div className="bg-muted group-hover:bg-primary/10 rounded p-1">
              <Plus className="h-3 w-3" />
            </div>
            <span className="text-xs font-medium">Add Item</span>
          </button>
        )}
      </div>
    </div>
  );
}
