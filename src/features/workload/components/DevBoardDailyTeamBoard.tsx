import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { toast } from "sonner";
import type { Member } from "@/features/cms/types/types";
import type {
  DailyProject,
  DailyTask,
} from "@/features/workload/components/DevBoardDailyView";

export interface DailyTaskMove {
  projectId: string;
  taskId: string;
  /** Member user_id the card was dragged from, or null for Unassigned */
  from: string | null;
  /** Member user_id the card was dropped on, or null for Unassigned */
  to: string | null;
}

interface DevBoardDailyTeamBoardProps {
  projects: DailyProject[];
  members: Member[];
  boardColors: Record<string, string>;
  searchQuery: string;
  filter: "All" | "Pending" | "Completed";
  onMoveTask?: (move: DailyTaskMove) => void;
}

interface BoardCard {
  task: DailyTask;
  project: DailyProject;
}

interface DragData {
  card: BoardCard;
  columnId: string;
}

const UNASSIGNED = "unassigned";

const HEADER_COLORS = [
  "#3b82f6",
  "#10b981",
  "#ef4444",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
];

export const getInitials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

const toMemberId = (columnId: string) =>
  columnId === UNASSIGNED ? null : columnId;

/**
 * Saved daily plan shown as one column per team member (like Team Kanban).
 * A task assigned to several people appears in each of their columns.
 * Dragging a card to another column reassigns it from that person to the other.
 */
export function DevBoardDailyTeamBoard({
  projects,
  members,
  boardColors,
  searchQuery,
  filter,
  onMoveTask,
}: DevBoardDailyTeamBoardProps) {
  const [activeDrag, setActiveDrag] = useState<DragData | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const memberName = (userId: string) =>
    members.find((m) => String(m.user_id) === userId)?.name ||
    `Member #${userId}`;

  const query = searchQuery.trim().toLowerCase();
  const columns = new Map<string, BoardCard[]>();

  projects.forEach((project) =>
    project.tasks.forEach((task) => {
      if (query && !task.title.toLowerCase().includes(query)) return;
      if (filter === "Pending" && task.status !== "pending") return;
      if (filter === "Completed" && task.status !== "completed") return;

      const ids = task.assigneeIds?.length ? task.assigneeIds : [UNASSIGNED];
      ids.forEach((id) => {
        if (!columns.has(id)) columns.set(id, []);
        columns.get(id)!.push({ task, project });
      });
    }),
  );

  const columnIds = [...columns.keys()]
    .filter((id) => id !== UNASSIGNED)
    .sort((a, b) => memberName(a).localeCompare(memberName(b)));
  // Unassigned is always available as a drop target while dragging
  if (columns.has(UNASSIGNED) || activeDrag) columnIds.push(UNASSIGNED);

  const handleDragStart = (event: DragStartEvent) =>
    setActiveDrag((event.active.data.current as DragData) ?? null);

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDrag(null);
    const data = event.active.data.current as DragData | undefined;
    const toColumnId = event.over?.id ? String(event.over.id) : null;
    if (!data || !toColumnId || toColumnId === data.columnId) return;

    const to = toMemberId(toColumnId);
    const { task, project } = data.card;
    if (to && task.assigneeIds?.includes(to)) {
      toast.info(`Already assigned to ${memberName(to)}`);
      return;
    }
    onMoveTask?.({
      projectId: project.id,
      taskId: task.id,
      from: toMemberId(data.columnId),
      to,
    });
  };

  if (columnIds.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center py-16 text-sm text-muted-foreground">
        {projects.some((p) => p.tasks.length > 0)
          ? "No tasks match the current search or filter."
          : "Nothing saved for this date yet. Add tasks in Plan and click Save."}
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveDrag(null)}
    >
      <div className="flex-1 min-h-0 overflow-auto custom-scrollbar pb-2">
        <div className="flex w-max gap-6 pb-4 items-start">
          {columnIds.map((columnId, index) => {
            const isUnassigned = columnId === UNASSIGNED;
            return (
              <BoardColumn
                key={columnId}
                columnId={columnId}
                name={isUnassigned ? "Unassigned" : memberName(columnId)}
                isUnassigned={isUnassigned}
                headerColor={HEADER_COLORS[index % HEADER_COLORS.length]}
                cards={columns.get(columnId) ?? []}
                isDragSource={activeDrag?.columnId === columnId}
                memberName={memberName}
                boardColors={boardColors}
                draggable={!!onMoveTask}
              />
            );
          })}
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {activeDrag ? (
          <div className="w-[296px] rotate-[2deg] shadow-2xl rounded-lg ring-2 ring-primary/30 cursor-grabbing">
            <TaskCard
              card={activeDrag.card}
              memberName={memberName}
              boardColors={boardColors}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

interface BoardColumnProps {
  columnId: string;
  name: string;
  isUnassigned: boolean;
  headerColor: string;
  cards: BoardCard[];
  isDragSource: boolean;
  memberName: (userId: string) => string;
  boardColors: Record<string, string>;
  draggable: boolean;
}

function BoardColumn({
  columnId,
  name,
  isUnassigned,
  headerColor,
  cards,
  isDragSource,
  memberName,
  boardColors,
  draggable,
}: BoardColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: columnId });
  const isDropTarget = isOver && !isDragSource;

  return (
    <div
      ref={setNodeRef}
      className={`flex-shrink-0 w-80 rounded-xl border flex flex-col overflow-hidden max-h-[75vh] transition-all duration-200 ${
        isDropTarget
          ? "bg-primary/5 border-primary/40 ring-2 ring-primary/20 shadow-lg"
          : "bg-[#f8fafc] dark:bg-[#0f172a] border-slate-200 dark:border-slate-800"
      }`}
    >
      {/* Column header */}
      <div
        className={`p-4 border-b flex items-center gap-2.5 min-w-0 shadow-sm ${
          isDropTarget
            ? "border-primary/20"
            : "bg-[#f8fafc] dark:bg-[#0f172a] border-slate-200 dark:border-slate-800"
        }`}
      >
        <div
          className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center border border-border/50 text-[10px] font-bold uppercase"
          style={
            isUnassigned
              ? undefined
              : { backgroundColor: `${headerColor}20`, color: headerColor }
          }
        >
          {isUnassigned ? "?" : getInitials(name)}
        </div>
        <h3
          className="font-bold text-sm tracking-tight text-slate-900 dark:text-slate-100 truncate"
          title={name}
        >
          {name}
        </h3>
        <span className="text-[10px] font-black bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full min-w-[20px] text-center shrink-0">
          {cards.length}
        </span>
      </div>

      {/* Cards */}
      <div className="p-3 space-y-3 overflow-y-auto custom-scrollbar min-h-[120px]">
        {cards.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground italic border-2 border-dashed border-border rounded-lg">
            Drop here to unassign
          </div>
        ) : (
          cards.map((card) => (
            <DraggableTaskCard
              key={`${card.project.id}-${card.task.id}`}
              card={card}
              columnId={columnId}
              memberName={memberName}
              boardColors={boardColors}
              disabled={!draggable}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface TaskCardProps {
  card: BoardCard;
  memberName: (userId: string) => string;
  boardColors: Record<string, string>;
}

function DraggableTaskCard({
  card,
  columnId,
  disabled,
  ...cardProps
}: TaskCardProps & { columnId: string; disabled: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `${columnId}::${card.project.id}::${card.task.id}`,
    data: { card, columnId } satisfies DragData,
    disabled,
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`rounded-lg touch-none ${
        disabled ? "" : "cursor-grab active:cursor-grabbing"
      } ${isDragging ? "opacity-40" : ""}`}
    >
      <TaskCard card={card} {...cardProps} />
    </div>
  );
}

function TaskCard({ card, memberName, boardColors }: TaskCardProps) {
  const { task, project } = card;
  const assigneeNames = (task.assigneeIds ?? []).map(memberName);
  const visibleAssignees = assigneeNames.slice(0, 3);
  const extraAssignees = assigneeNames.length - 3;
  const projectColor =
    project.color ||
    (project.boardId && boardColors[project.boardId]) ||
    "hsl(var(--primary))";
  const isCompleted = task.status === "completed";

  return (
    <div className="bg-card border border-border rounded-lg p-3 flex flex-col gap-3 min-h-[150px] hover:shadow-md transition-shadow">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider min-w-0">
          <div
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{ backgroundColor: projectColor }}
          />
          <span className="truncate" title={project.name}>
            {project.name}
          </span>
        </div>
        <h4
          className={`text-sm font-bold line-clamp-2 mt-1 ${
            isCompleted
              ? "text-muted-foreground line-through"
              : "text-foreground"
          }`}
          title={task.title}
        >
          {task.title}
        </h4>
        {task.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {task.description}
          </p>
        )}
      </div>

      <div className="text-xs text-muted-foreground">
        Hours: {task.hours ? `${task.hours}h` : "-"}
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <span
          className={`px-2 py-0.5 rounded-md text-[10px] font-medium border ${
            isCompleted
              ? "border-emerald-500/40 text-emerald-500 bg-emerald-500/10"
              : "border-amber-500/40 text-amber-500 bg-amber-500/10"
          }`}
        >
          {isCompleted ? "Completed" : "Pending"}
        </span>
      </div>

      <div
        className="mt-auto pt-2 border-t border-border flex flex-wrap items-center gap-1"
        title={assigneeNames.join(", ")}
      >
        {visibleAssignees.length === 0 && (
          <span className="text-[10px] text-muted-foreground italic">
            Unassigned
          </span>
        )}
        {visibleAssignees.map((assigneeName, i) => (
          <div
            key={i}
            className="flex items-center gap-1 bg-muted/40 rounded-full pr-1.5 p-0.5 border border-border/80"
          >
            <span className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] bg-primary/10 text-primary uppercase font-bold">
              {assigneeName.charAt(0)}
            </span>
            <span className="text-[9px] font-medium truncate max-w-[60px] text-foreground">
              {assigneeName}
            </span>
          </div>
        ))}
        {extraAssignees > 0 && (
          <div className="flex items-center justify-center h-4 px-1 rounded-full bg-muted border border-border text-[8px] font-medium text-muted-foreground">
            +{extraAssignees}
          </div>
        )}
      </div>
    </div>
  );
}
