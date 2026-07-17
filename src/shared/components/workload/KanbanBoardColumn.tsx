/**
 * KanbanBoardColumn
 * -----------------
 * dnd-kit powered column for the Teams/Projects Kanban boards, mirroring the
 * architecture of KanbanColumn.tsx/KanbanCard.tsx (the status/priority Kanban
 * tab): a merged sortable+droppable column (drag the header to reorder
 * columns; drop cards anywhere in the body, including when empty) with each
 * task rendered inside a per-column SortableContext. Auto-scroll and the
 * floating drag visuals are handled by dnd-kit itself (DndContext default
 * auto-scroll, DragOverlay) rather than any custom logic here.
 */

import React from "react";
import { useDroppable } from "@dnd-kit/core";
import { useSortable, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

export interface KanbanBoardColumnProps {
  /** Unique key used to identify this column in DnD state */
  columnId: string;
  /** Column header JSX */
  header: React.ReactNode;
  /** Array of task IDs in render order */
  taskIds: string[];
  /** Render each task card */
  renderCard: (taskId: string) => React.ReactNode;
  /** Empty state content */
  emptyContent?: React.ReactNode;
  /** Placeholder height shown in place of a card while it's being dragged */
  cardGhostHeight?: number;
  /** Whether this column is currently the active drop target (highlight) */
  isColumnActive?: boolean;
  /** Render as the static floating clone inside a DragOverlay */
  isOverlay?: boolean;
}

export const KanbanBoardColumn = React.memo(function KanbanBoardColumn({
  columnId,
  header,
  taskIds,
  renderCard,
  emptyContent,
  cardGhostHeight = 150,
  isColumnActive = false,
  isOverlay = false,
}: KanbanBoardColumnProps) {
  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `column-${columnId}`,
    data: { type: "column", columnId },
  });

  const { setNodeRef: setDroppableRef } = useDroppable({
    id: columnId,
    data: { type: "column", columnId },
  });

  const setNodeRef = (node: HTMLDivElement | null) => {
    setSortableRef(node);
    setDroppableRef(node);
  };

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  return (
    <div
      ref={isOverlay ? undefined : setNodeRef}
      style={isOverlay ? undefined : style}
      className={[
        "flex-shrink-0 w-80 rounded-xl border flex flex-col",
        "bg-[#f8fafc] dark:bg-[#0f172a]",
        "transition-all duration-150",
        isColumnActive && !isDragging
          ? "border-primary/60 ring-2 ring-primary/20 shadow-lg shadow-primary/10"
          : "border-slate-200 dark:border-slate-800",
        isOverlay
          ? "shadow-2xl border-primary/50 ring-2 ring-primary/20 rotate-[2deg]"
          : isDragging
            ? "opacity-40"
            : "",
        "h-auto min-h-[300px]",
      ].join(" ")}
    >
      {/* Sticky header — the whole header is the column drag handle */}
      <div
        className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0 z-10 bg-[#f8fafc] dark:bg-[#0f172a] rounded-t-xl shadow-sm shrink-0 cursor-grab active:cursor-grabbing group/header"
        {...(isOverlay ? {} : attributes)}
        {...(isOverlay ? {} : listeners)}
      >
        {header}
        {!isOverlay && (
          <GripVertical className="h-4 w-4 text-slate-300 opacity-0 group-hover/header:opacity-100 transition-opacity shrink-0 ml-1" />
        )}
      </div>

      {/* Scrollable body */}
      <div className="p-3 flex-grow overflow-y-auto custom-scrollbar">
        <div className="flex flex-col gap-3">
          {taskIds.length === 0 ? (
            emptyContent ?? <EmptyColumn />
          ) : isOverlay ? (
            // Static, non-interactive preview for the floating column clone
            taskIds.slice(0, 3).map((id) => <div key={id}>{renderCard(id)}</div>)
          ) : (
            <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
              {taskIds.map((id) => (
                <KanbanBoardCard key={id} taskId={id} renderCard={renderCard} ghostHeight={cardGhostHeight} />
              ))}
            </SortableContext>
          )}
        </div>
      </div>
    </div>
  );
});

function KanbanBoardCard({
  taskId,
  renderCard,
  ghostHeight,
}: {
  taskId: string;
  renderCard: (taskId: string) => React.ReactNode;
  ghostHeight: number;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: taskId,
    data: { type: "card", taskId },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={{ ...style, height: ghostHeight }}
        className="rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 w-full"
      />
    );
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {renderCard(taskId)}
    </div>
  );
}

function EmptyColumn() {
  return (
    <div className="py-12 text-center text-sm text-muted-foreground italic select-none">
      No tasks
    </div>
  );
}
