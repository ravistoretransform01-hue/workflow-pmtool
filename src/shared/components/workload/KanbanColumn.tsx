import { useState, useRef, useEffect } from "react";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Status, Priority } from "@/features/cms/types";
import type { Task } from "./WorkloadBoard";
import { KanbanCard } from "./KanbanCard";
import { useDroppable } from "@dnd-kit/core";
import {
  Plus,
  X,
  ListTree,
  Layers,
  // MoreHorizontal,
  GripVertical,
} from "lucide-react";
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
import { cn, getOrganizationId } from "@/lib/utils";
import { cmsApi } from "@/features/cms/cmsApi";
import {
  updateStatusInCache,
  updatePriorityInCache,
} from "@/features/cms/cmsStorage";
import { toast } from "sonner";

interface KanbanColumnProps {
  category: any;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onAddTask: (
    name: string,
    groupId: string,
    parentId?: string,
  ) => Promise<void>;
  groups: Array<{ id: string; name: string; tasks: Task[] }>;
  groupMap: Record<string, { name: string; color: string }>;
  members: any[];
  visibleCardFields: Set<string>;
  statusMap: Record<string, { name: string; color: string }>;
  priorityMap: Record<string, { name: string; color: string }>;
  isOverlay?: boolean;
  isDraggingOver?: boolean;
  onStatusesUpdated?: (statuses: Status[]) => void;
  onPrioritiesUpdated?: (priorities: Priority[]) => void;
  boardId?: string | number;
  statuses?: Status[];
  priorities?: Priority[];
  groupBy: "status" | "priority";
  onDeleteTask?: (taskId: string) => Promise<void>;
  onOpenComments?: (task: Task) => void;
}

export function KanbanColumn({
  category,
  tasks,
  onTaskClick,
  onAddTask,
  groups,
  groupMap,
  members,
  visibleCardFields,
  statusMap,
  priorityMap,
  isOverlay = false,
  isDraggingOver = false,
  onStatusesUpdated,
  onPrioritiesUpdated,
  boardId,
  statuses,
  priorities,
  groupBy,
  onDeleteTask,
  onOpenComments,
}: KanbanColumnProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingName, setEditingName] = useState(category.name);
  const [isSavingName, setIsSavingName] = useState(false);
  const [newTaskName, setNewTaskName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubtask, setIsSubtask] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [selectedParentId, setSelectedParentId] = useState<string>("");

  const inputRef = useRef<HTMLInputElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `column-${category.id}`,
    data: {
      type: "column",
      category,
    },
  });

  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: `${groupBy}-${category.id}`,
    data: {
      type: "column",
      category,
    },
  });

  // Combine refs
  const setNodeRef = (node: HTMLElement | null) => {
    setSortableRef(node);
    setDroppableRef(node);
  };

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  useEffect(() => {
    if (isAdding) {
      if (inputRef.current) {
        inputRef.current.focus();
      }
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
    if (!selectedGroupId) return;
    if (isSubtask && !selectedParentId) return;

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

  const handleSaveName = async () => {
    const trimmedName = editingName.trim();
    if (!trimmedName || trimmedName === category.name) {
      setIsEditingName(false);
      setEditingName(category.name);
      return;
    }

    const orgId = getOrganizationId();
    if (!orgId || !boardId) {
      toast.error("Missing organization or board info");
      setIsEditingName(false);
      setEditingName(category.name);
      return;
    }

    setIsSavingName(true);
    try {
      if (groupBy === "status") {
        await cmsApi.updateStatus({
          status_id: String(category.id),
          name: trimmedName,
          color_code: category.color_code,
          organization_id: orgId,
          board_id: Number(boardId),
        });

        const updated = { ...category, name: trimmedName };
        updateStatusInCache(Number(boardId), updated);
        // Trigger global update if handler is provided
        if (onStatusesUpdated && statuses) {
          onStatusesUpdated(
            statuses.map((s) => (String(s.id) === String(category.id) ? updated : s)),
          );
        }
      } else {
        await cmsApi.updatePriority({
          priority_id: String(category.id),
          name: trimmedName,
          color_code: category.color_code,
          organization_id: orgId,
          board_id: Number(boardId),
        });

        const updated = { ...category, name: trimmedName };
        updatePriorityInCache(Number(boardId), updated);
        // Trigger global update if handler is provided
        if (onPrioritiesUpdated && priorities) {
          onPrioritiesUpdated(
            priorities.map((p) => (String(p.id) === String(category.id) ? updated : p)),
          );
        }
      }

      toast.success(`${groupBy === "status" ? "Status" : "Priority"} updated`);
      setIsEditingName(false);
    } catch (error) {
      console.error(`Failed to update ${groupBy} name:`, error);
      toast.error(`Failed to update ${groupBy} name`);
      setEditingName(category.name);
      setIsEditingName(false);
    } finally {
      setIsSavingName(false);
    }
  };

  const groupTasks = groups.find((g) => g.id === selectedGroupId)?.tasks || [];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex-shrink-0 w-80 rounded-xl border flex flex-col transition-all duration-200 min-h-full",
        isOver && !isDragging
          ? "bg-primary/5 border-primary/30 ring-2 ring-primary/10 shadow-lg"
          : isDraggingOver
            ? "bg-primary/5 border-primary/40 ring-2 ring-primary/10"
            : "bg-[#f8fafc] dark:bg-[#0f172a] border-slate-200 dark:border-slate-800",
        isOverlay &&
          "shadow-2xl border-primary/50 ring-2 ring-primary/20 rotate-[2deg]",
        isDragging && !isOverlay && "opacity-40",
      )}
    >
      <div
        className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col gap-2 cursor-grab active:cursor-grabbing group/header"
        {...attributes}
        {...listeners}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="w-3.5 h-3.5 rounded-full shadow-sm"
              style={{ backgroundColor: category.color_code }}
            />
            {isEditingName ? (
              <Input
                className="h-7 text-xs font-bold py-0 px-2 focus-visible:ring-1 border-slate-200 dark:border-slate-800 w-48"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onBlur={handleSaveName}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveName();
                  if (e.key === "Escape") {
                    setIsEditingName(false);
                    setEditingName(category.name);
                  }
                }}
                autoFocus
                disabled={isSavingName}
              />
            ) : (
              <h3
                className="font-bold text-sm tracking-tight text-slate-900 dark:text-slate-100 cursor-text hover:text-primary transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditingName(true);
                }}
              >
                {category.name}
              </h3>
            )}
            <span className="text-[10px] font-black bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full min-w-[20px] text-center">
              {tasks.length}
            </span>
          </div>
          <div className="opacity-0 group-hover/header:opacity-100 transition-opacity flex items-center gap-1">
            {/* <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-slate-400 hover:text-slate-600"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button> */}
            <GripVertical className="h-4 w-4 text-slate-300" />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar min-h-[200px]">
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
                members={members}
                visibleCardFields={visibleCardFields}
                onDeleteTask={onDeleteTask}
                onOpenComments={onOpenComments}
              />
            );
          })}
        </SortableContext>

        {isAdding ? (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-primary/50 p-4 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="space-y-3">
              <Input
                ref={inputRef}
                placeholder={
                  isSubtask ? "Subtask name..." : "What needs to be done?"
                }
                value={newTaskName}
                onChange={(e) => setNewTaskName(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
                className="h-9 text-sm focus-visible:ring-primary/50 border-slate-200 dark:border-slate-800"
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
                    className="text-[11px] font-bold uppercase tracking-wider text-slate-500 cursor-pointer flex items-center gap-1.5"
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
                <Select
                  value={selectedGroupId}
                  onValueChange={setSelectedGroupId}
                >
                  <SelectTrigger className="h-8 text-xs bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800">
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
                    <SelectTrigger className="h-8 text-xs bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800">
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
                          <div className="p-3 text-xs text-slate-500 text-center italic">
                            No items in this group
                          </div>
                        )}
                      </ScrollArea>
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Button
                size="sm"
                className="h-8 flex-1 text-xs font-bold uppercase tracking-wide shadow-sm"
                onClick={handleCreateTask}
                disabled={isLoading || (isSubtask && !selectedParentId)}
              >
                {isLoading ? "Adding..." : "Add Item"}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
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
            className="w-full flex items-center gap-2.5 p-3 rounded-xl text-slate-500 hover:text-primary hover:bg-white dark:hover:bg-slate-900 transition-all duration-200 group border border-dashed border-slate-300 dark:border-slate-800 hover:border-primary/50 hover:shadow-sm"
          >
            <div className="bg-slate-100 dark:bg-slate-800 group-hover:bg-primary/10 rounded-lg p-1.5 transition-colors">
              <Plus className="h-3.5 w-3.5" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider">
              Add Item
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
