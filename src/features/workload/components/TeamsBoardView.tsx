/**
 * TeamsBoardView
 * ──────────────
 * A dnd-kit powered Kanban board for the Teams tab (Projects & Tasks sub-tabs).
 * Mirrors the architecture of KanbanView/KanbanColumn/KanbanCard exactly:
 *  - DndContext + PointerSensor (distance: 8px)
 *  - SortableContext (vertical) per column
 *  - useSortable per card → ghost placeholder in original position
 *  - useDroppable per column → column highlighted when hovered
 *  - DragOverlay → full card rendered under pointer
 *  - Optimistic state + API call + rollback on error
 *  - Horizontal board auto-scroll when dragging near edges
 */

import React, { useState, useRef, useCallback, useMemo } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
  type CollisionDetection,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, MoreHorizontal, MessageCircle, MessageCirclePlus } from "lucide-react";
import { Avatar, AvatarFallback } from "@/shared/ui/avatar";
import { toast } from "sonner";
import { format } from "date-fns";
import type { Task } from "@/features/workload/components/WorkloadBoard";
import type { Status, Priority } from "@/features/cms/types/types";

/* ════════════════════════════════════════════════════════════════════
   PUBLIC INTERFACE
   ════════════════════════════════════════════════════════════════════ */
export interface TeamsColumn {
  id: string;        // person name OR group id
  label: string;     // display name
  color: string;
  tasks: Task[];
}

interface TeamsBoardViewProps {
  columns: TeamsColumn[];
  statuses: Status[];
  priorities: Priority[];
  members: any[];
  boardId: string;
  mode: "projects" | "tasks";
  /** Called when a task is dropped into a new column. Return updated assignee ids or new group id. */
  onDrop: (
    taskId: string,
    fromColumnId: string,
    toColumnId: string,
  ) => Promise<void>;
  onTaskClick: (task: Task) => void;
  onOpenComments?: (task: Task) => void;
  /** Pass the board scroll container ref so we can sync TeamsBoardNavigator */
  boardScrollRef?: React.RefObject<HTMLDivElement | null>;
}

/* ════════════════════════════════════════════════════════════════════
   SORTABLE CARD  (mirrors KanbanCard)
   ════════════════════════════════════════════════════════════════════ */
interface SortableCardProps {
  task: Task;
  columnId: string;
  statuses: Status[];
  priorities: Priority[];
  members: any[];
  mode: "projects" | "tasks";
  overlay?: boolean;
  onClick?: () => void;
  onOpenComments?: (task: Task) => void;
}

function SortableCard({
  task,
  columnId,
  statuses,
  priorities,
  members: _members,
  mode: _mode,
  overlay = false,
  onClick,
  onOpenComments,
}: SortableCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: { type: "card", task, columnId },
  });

  const style = overlay
    ? { opacity: 0.97 }
    : { transform: CSS.Translate.toString(transform), transition };

  const statusName =
    statuses.find((s) => String(s.id) === String(task.status_id))?.name ?? task.status ?? "";
  const priorityInfo = priorities.find((p) => String(p.id) === String(task.priority_id));
  const assigneeNames: string[] = task.assignee_names || (task.person ? [task.person] : []);

  let dueDateText = "";
  try {
    if (task.estimatedDateRaw) dueDateText = format(new Date(task.estimatedDateRaw), "dd MMM yyyy");
    else if (task.estimatedDate) dueDateText = task.estimatedDate;
  } catch {}

  /* Ghost placeholder while dragging */
  if (isDragging && !overlay) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="bg-muted/30 border-2 border-dashed border-primary/20 rounded-lg h-[90px] w-full"
      />
    );
  }

  return (
    <div
      ref={overlay ? undefined : setNodeRef}
      style={style}
      onClick={onClick}
      className={
        "bg-card border border-border rounded-lg p-3 cursor-grab active:cursor-grabbing " +
        "hover:shadow-md transition-all group relative select-none " +
        (overlay ? "shadow-2xl ring-2 ring-primary/25" : "")
      }
      {...(!overlay ? { ...attributes, ...listeners } : {})}
    >
      {/* Grip handle */}
      <div className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>

      <div className="pl-4">
        {/* Task name */}
        <p className="text-sm font-semibold text-foreground line-clamp-2 leading-snug">
          {task.name}
        </p>

        {/* Metadata row */}
        <div className="mt-2 flex flex-wrap gap-1.5 items-center">
          {statusName && (
            <span className="px-1.5 py-0.5 bg-muted text-[10px] font-medium rounded border border-border">
              {statusName}
            </span>
          )}
          {priorityInfo && (
            <span
              className="px-1.5 py-0.5 text-[10px] font-medium rounded border"
              style={{
                borderColor: `${priorityInfo.color_code}55`,
                color: priorityInfo.color_code,
                backgroundColor: `${priorityInfo.color_code}15`,
              }}
            >
              {priorityInfo.name}
            </span>
          )}
          {dueDateText && (
            <span className="text-[10px] text-muted-foreground">
              Due {dueDateText}
            </span>
          )}
        </div>

        {/* Assignees */}
        {assigneeNames.length > 0 && (
          <div className="mt-2.5 flex items-center -space-x-2">
            {assigneeNames.slice(0, 3).map((name, i) => (
              <Avatar key={i} className="h-5 w-5 border-2 border-card">
                <AvatarFallback className="text-[9px] bg-primary/10 text-primary font-bold uppercase">
                  {name[0]}
                </AvatarFallback>
              </Avatar>
            ))}
            {assigneeNames.length > 3 && (
              <div className="h-5 w-5 rounded-full bg-muted border-2 border-card flex items-center justify-center">
                <span className="text-[9px] text-muted-foreground">
                  +{assigneeNames.length - 3}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Comments */}
        {!overlay && onOpenComments && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenComments(task);
            }}
            className="absolute top-2 right-2 h-6 w-6 flex items-center justify-center rounded hover:bg-muted text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
          >
            {task.comment_count ? (
              <div className="relative">
                <MessageCircle className="h-3.5 w-3.5" />
                <span className="absolute -bottom-1 -right-1 bg-muted-foreground text-background text-[8px] font-bold h-3 min-w-[12px] px-[2px] flex items-center justify-center rounded-full">
                  {task.comment_count}
                </span>
              </div>
            ) : (
              <MessageCirclePlus className="h-3.5 w-3.5" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   DROPPABLE COLUMN  (mirrors KanbanColumn)
   ════════════════════════════════════════════════════════════════════ */
interface DroppableColumnProps {
  column: TeamsColumn;
  taskIds: string[];
  draggingTaskId: string | null;
  statuses: Status[];
  priorities: Priority[];
  members: any[];
  mode: "projects" | "tasks";
  onTaskClick: (task: Task) => void;
  onOpenComments?: (task: Task) => void;
}

function DroppableColumn({
  column,
  taskIds,
  draggingTaskId: _draggingTaskId,
  statuses,
  priorities,
  members,
  mode,
  onTaskClick,
  onOpenComments,
}: DroppableColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `col-${column.id}`,
    data: { type: "column", columnId: column.id },
  });

  return (
    <div
      className={[
        "flex-shrink-0 w-80 rounded-xl border flex flex-col transition-all duration-150",
        "bg-[#f8fafc] dark:bg-[#0f172a]",
        isOver
          ? "border-primary/60 ring-2 ring-primary/20 shadow-lg shadow-primary/10"
          : "border-slate-200 dark:border-slate-800",
        "h-auto min-h-[300px]",
      ].join(" ")}
    >
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0 z-10 bg-[#f8fafc] dark:bg-[#0f172a] rounded-t-xl shadow-sm shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-3 h-3 rounded-full shrink-0 shadow-sm"
            style={{ backgroundColor: column.color }}
          />
          <h3
            className="font-bold text-sm tracking-tight text-slate-900 dark:text-slate-100 truncate"
            title={column.label}
          >
            {column.label}
          </h3>
          <span className="text-[10px] font-black bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full min-w-[20px] text-center shrink-0">
            {column.tasks.length}
          </span>
        </div>
        <button className="p-1 rounded hover:bg-slate-200/50 dark:hover:bg-slate-800/50 text-slate-400 hover:text-slate-600 transition-colors shrink-0">
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable body */}
      <div ref={setNodeRef} className="p-3 flex-grow overflow-y-auto custom-scrollbar">
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-3">
            {column.tasks.map((task) => (
              <SortableCard
                key={task.id}
                task={task}
                columnId={column.id}
                statuses={statuses}
                priorities={priorities}
                members={members}
                mode={mode}
                onClick={() => onTaskClick(task)}
                onOpenComments={onOpenComments}
              />
            ))}

            {column.tasks.length === 0 && !isOver && (
              <div className="py-12 text-center text-sm text-muted-foreground italic select-none">
                {mode === "tasks" ? "No tasks assigned" : "No tasks in project"}
              </div>
            )}

            {/* Empty column drop target zone */}
            {isOver && column.tasks.length === 0 && (
              <div className="rounded-lg border-2 border-dashed border-primary/50 bg-primary/5 h-16 w-full flex items-center justify-center">
                <span className="text-[10px] text-primary/60 font-semibold uppercase tracking-widest select-none">
                  Drop here
                </span>
              </div>
            )}
          </div>
        </SortableContext>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════════════════════════════ */
export function TeamsBoardView({
  columns: initialColumns,
  statuses,
  priorities,
  members,
  boardId: _boardId,
  mode,
  onDrop,
  onTaskClick,
  onOpenComments,
  boardScrollRef,
}: TeamsBoardViewProps) {
  /* ── Local column/task order state (mirrors KanbanView taskOrders) ── */
  const [columns, setColumns] = useState<TeamsColumn[]>(initialColumns);

  // Sync when props change (new data from API)
  const prevColumnsRef = useRef(initialColumns);
  if (prevColumnsRef.current !== initialColumns) {
    prevColumnsRef.current = initialColumns;
    setColumns(initialColumns);
  }

  /* ── DnD active state ───────────────────────────────────────────── */
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [activeColumnId, setActiveColumnId] = useState<string | null>(null);

  /* ── Sensors (same as KanbanView) ──────────────────────────────── */
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  /* ── Horizontal auto-scroll for the board container ─────────────── */
  const hScrollRef = useRef<number | null>(null);
  const stopHScroll = useCallback(() => {
    if (hScrollRef.current !== null) {
      cancelAnimationFrame(hScrollRef.current);
      hScrollRef.current = null;
    }
  }, []);

  const doHScroll = useCallback(
    (clientX: number) => {
      stopHScroll();
      const scroller = boardScrollRef?.current;
      if (!scroller) return;
      const EDGE = 100, MAX = 16;
      const step = () => {
        const r = scroller.getBoundingClientRect();
        let speed = 0;
        if (clientX - r.left < EDGE) speed = -MAX * (1 - (clientX - r.left) / EDGE);
        else if (r.right - clientX < EDGE) speed = MAX * (1 - (r.right - clientX) / EDGE);
        if (speed !== 0) {
          scroller.scrollLeft += speed;
          hScrollRef.current = requestAnimationFrame(step);
        } else { hScrollRef.current = null; }
      };
      hScrollRef.current = requestAnimationFrame(step);
    },
    [stopHScroll, boardScrollRef]
  );

  /* ── Collision detection (same strategy as KanbanView) ─────────── */
  const collisionDetection: CollisionDetection = useCallback((args) => {
    const { pointerCoordinates, active, droppableContainers } = args;
    if (!pointerCoordinates) return [];

    // Cards first
    const cardContainers = droppableContainers.filter(
      (c) => c.data.current?.type === "card" && c.id !== active.id
    );
    for (const c of cardContainers) {
      const rect = c.rect.current;
      if (!rect) continue;
      if (
        pointerCoordinates.x >= rect.left && pointerCoordinates.x <= rect.right &&
        pointerCoordinates.y >= rect.top  && pointerCoordinates.y <= rect.bottom
      ) return [{ id: c.id }];
    }

    // Then columns
    const colContainers = droppableContainers.filter(
      (c) => c.data.current?.type === "column"
    );
    for (const c of colContainers) {
      const rect = c.rect.current;
      if (!rect) continue;
      if (
        pointerCoordinates.x >= rect.left && pointerCoordinates.x <= rect.right &&
        pointerCoordinates.y >= rect.top  && pointerCoordinates.y <= rect.bottom
      ) return [{ id: c.id }];
    }

    return closestCorners(args);
  }, []);

  /* ── Helpers ────────────────────────────────────────────────────── */
  const findColumnByTaskId = useCallback(
    (taskId: string, cols: TeamsColumn[]) =>
      cols.find((col) => col.tasks.some((t) => t.id === taskId)) ?? null,
    []
  );

  /* ── Drag Start ─────────────────────────────────────────────────── */
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const task = active.data.current?.task as Task | undefined;
    const colId = active.data.current?.columnId as string | undefined;
    if (task) setActiveTask(task);
    if (colId) setActiveColumnId(colId);
  }, []);

  /* ── Drag Over (live reordering, same as KanbanView) ──────────── */
  const handleDragOver = useCallback(
    (event: any) => {
      const { active, over } = event;
      if (!over || !activeTask) return;

      // Horizontal board scroll
      if (event.activatorEvent) {
        doHScroll(event.activatorEvent.clientX ?? 0);
      }

      const activeId = String(active.id);
      const overId = String(over.id);

      setColumns((prev) => {
        const fromCol = findColumnByTaskId(activeId, prev);
        if (!fromCol) return prev;

        const isOverColumn = overId.startsWith("col-");
        const toColId = isOverColumn ? overId.replace("col-", "") : null;

        // Find destination column
        let destCol: TeamsColumn | null = null;
        if (toColId) {
          destCol = prev.find((c) => c.id === toColId) ?? null;
        } else {
          destCol = findColumnByTaskId(overId, prev);
        }
        if (!destCol) return prev;

        const isSameCol = fromCol.id === destCol.id;

        if (isSameCol) {
          // Same-column reorder
          const oldIdx = fromCol.tasks.findIndex((t) => t.id === activeId);
          const newIdx = fromCol.tasks.findIndex((t) => t.id === overId);
          if (oldIdx === -1 || newIdx === -1 || oldIdx === newIdx) return prev;
          return prev.map((col) =>
            col.id === fromCol.id
              ? { ...col, tasks: arrayMove(col.tasks, oldIdx, newIdx) }
              : col
          );
        }

        // Cross-column move
        const movedTask = fromCol.tasks.find((t) => t.id === activeId);
        if (!movedTask) return prev;

        return prev.map((col) => {
          if (col.id === fromCol.id) {
            return { ...col, tasks: col.tasks.filter((t) => t.id !== activeId) };
          }
          if (col.id === destCol!.id) {
            const newTasks = [...col.tasks.filter((t) => t.id !== activeId)];
            if (isOverColumn) {
              newTasks.push(movedTask);
            } else {
              const overIdx = newTasks.findIndex((t) => t.id === overId);
              newTasks.splice(overIdx === -1 ? newTasks.length : overIdx, 0, movedTask);
            }
            return { ...col, tasks: newTasks };
          }
          return col;
        });
      });
    },
    [activeTask, findColumnByTaskId, doHScroll]
  );

  /* ── Drag End (commit or rollback) ──────────────────────────────── */
  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      stopHScroll();
      const { active, over } = event;
      const task = active.data.current?.task as Task | undefined;
      const fromColId = activeColumnId;

      setActiveTask(null);
      setActiveColumnId(null);

      if (!over || !task || !fromColId) {
        // Rollback: restore initial columns
        setColumns(initialColumns);
        return;
      }

      const overId = String(over.id);
      const isOverColumn = overId.startsWith("col-");
      const toColId = isOverColumn
        ? overId.replace("col-", "")
        : (() => {
            const destCol = columns.find((c) => c.tasks.some((t) => t.id === overId));
            return destCol?.id ?? null;
          })();

      if (!toColId) { setColumns(initialColumns); return; }
      if (toColId === fromColId) return; // Same-column reorder → already done optimistically

      // Cross-column: call API
      const snapshot = initialColumns; // already stale; columns state has the optimistic version
      try {
        await onDrop(task.id, fromColId, toColId);
      } catch (err) {
        console.error("TeamsBoardView: drop failed, rolling back", err);
        setColumns(snapshot);
        toast.error("Failed to move task — restored original position");
      }
    },
    [activeColumnId, columns, initialColumns, onDrop, stopHScroll]
  );

  /* ── Drag Cancel ────────────────────────────────────────────────── */
  const handleDragCancel = useCallback(() => {
    stopHScroll();
    setActiveTask(null);
    setActiveColumnId(null);
    setColumns(initialColumns);
  }, [initialColumns, stopHScroll]);

  /* ── Compute taskIds per column for SortableContext ─────────────── */
  const taskIdsByCol = useMemo(
    () => Object.fromEntries(columns.map((c) => [c.id, c.tasks.map((t) => t.id)])),
    [columns]
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex w-max h-fit gap-6 pb-4 items-stretch">
        {columns.map((col) => (
          <DroppableColumn
            key={col.id}
            column={col}
            taskIds={taskIdsByCol[col.id] ?? []}
            draggingTaskId={activeTask?.id ?? null}
            statuses={statuses}
            priorities={priorities}
            members={members}
            mode={mode}
            onTaskClick={onTaskClick}
            onOpenComments={onOpenComments}
          />
        ))}
      </div>

      {/* Drag overlay — full card rendered under pointer */}
      <DragOverlay dropAnimation={{ duration: 200, easing: "ease" }}>
        {activeTask && activeColumnId ? (
          <SortableCard
            task={activeTask}
            columnId={activeColumnId}
            statuses={statuses}
            priorities={priorities}
            members={members}
            mode={mode}
            overlay
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
