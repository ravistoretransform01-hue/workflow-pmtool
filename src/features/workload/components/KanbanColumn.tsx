import { useState } from "react";
import { CreateTaskPopover } from "@/shared/modals/CreateTaskPopover";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Status, Priority } from "@/features/cms/types/types";
import { useParams } from "react-router-dom";
import type { Task } from "@/features/workload/components/WorkloadBoard";
import { KanbanCard } from "@/features/workload/components/KanbanCard";
import { useDroppable } from "@dnd-kit/core";
import { Plus, GripVertical } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { cn, getOrganizationId } from "@/utils/utils";
import { cmsApi } from "@/features/cms/api/cmsApi";
import {
  updateStatusInCache,
  updatePriorityInCache,
} from "@/features/cms/services/cmsStorage";
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
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingName, setEditingName] = useState(category.name);
  const [isSavingName, setIsSavingName] = useState(false);

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
            statuses.map((s) =>
              String(s.id) === String(category.id) ? updated : s,
            ),
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
            priorities.map((p) =>
              String(p.id) === String(category.id) ? updated : p,
            ),
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

  const { orgId } = useParams<{ orgId?: string }>();
  const canEditCategory =
    Number(orgId) === 31 ||
    category.is_editable === 1 ||
    category.is_editable === true ||
    String(category.is_editable) === "1";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex-shrink-0 w-80 rounded-xl border flex flex-col transition-all duration-200 h-auto min-h-[300px] max-h-[110vh] lg:max-h-[1000px]",
        isOver && !isDragging
          ? "bg-primary/5 border-primary/30 ring-2 ring-primary/10 shadow-lg"
          : isDraggingOver
            ? "bg-primary/5 border-primary/40 ring-2 ring-primary/10"
            : "bg-[#f8fafc] dark:bg-[#0f172a] border-slate-200 dark:border-slate-800",
        isOverlay &&
          "shadow-2xl border-primary/50 ring-2 ring-primary/20 rotate-[2deg] max-h-[70vh] overflow-hidden",
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
                className={`font-bold text-sm tracking-tight text-slate-900 dark:text-slate-100 transition-colors ${
                  canEditCategory
                    ? "cursor-text hover:text-primary"
                    : "cursor-default"
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (canEditCategory) {
                    setIsEditingName(true);
                  }
                }}
              >
                {category.name}
              </h3>
            )}
            <span className="text-[10px] font-black bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full min-w-[20px] text-center">
              {tasks.length}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <CreateTaskPopover
              groups={groups}
              onAddTask={onAddTask}
              trigger={
                <Button
                  variant="ghost"
                  size="icon"
                  title="Add Task"
                  className="h-7 w-7 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              }
            />
            <div className="opacity-0 group-hover/header:opacity-100 transition-opacity flex items-center">
              <GripVertical className="h-4 w-4 text-slate-300" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar min-h-0">
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

        <CreateTaskPopover
          groups={groups}
          onAddTask={onAddTask}
          trigger={
            <button className="w-full flex items-center gap-2.5 p-3 rounded-xl text-slate-500 hover:text-primary hover:bg-white dark:hover:bg-slate-900 transition-all duration-200 group border border-dashed border-slate-300 dark:border-slate-800 hover:border-primary/50 hover:shadow-sm mt-3">
              <div className="bg-slate-100 dark:bg-slate-800 group-hover:bg-primary/10 rounded-lg p-1.5 transition-colors">
                <Plus className="h-3.5 w-3.5" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider">
                Add Item
              </span>
            </button>
          }
        />
      </div>
    </div>
  );
}
