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
  /** Disable internal scrolling to allow sticky header against the window/outer container */
  disableInternalScroll?: boolean;
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
  disableInternalScroll = false,
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
    transform: transform && (transform.x !== 0 || transform.y !== 0) ? CSS.Translate.toString(transform) : undefined,
    transition: transform && (transform.x !== 0 || transform.y !== 0) ? transition : undefined,
  };

  return (
    <div
      ref={isOverlay ? undefined : setNodeRef}
      style={isOverlay ? undefined : style}
      className={[
        "flex-shrink-0 w-80 rounded-xl border flex flex-col transition-all duration-200",
        !disableInternalScroll && "overflow-hidden",
        isColumnActive && !isDragging
          ? "bg-primary/5 border-primary/30 ring-2 ring-primary/10 shadow-lg"
          : "bg-[#f8fafc] dark:bg-[#0f172a] border-slate-200 dark:border-slate-800",
        isOverlay
          ? "shadow-2xl border-primary/50 ring-2 ring-primary/20 rotate-[2deg]"
          : isDragging
            ? "opacity-40"
            : "",
        isOverlay ? "h-auto max-h-[70vh]" : "h-auto min-h-[300px] max-h-[110vh] lg:max-h-[1000px]",
      ].join(" ")}
    >
      {/* Scrollable column container — min-h-0 overrides the flex item's
          default min-height:auto, which otherwise forces this to grow to fit
          all cards instead of respecting flex-grow and actually scrolling.
          The header lives inside as its sticky first child, so only the
          task list beneath it ever scrolls. */}
      <div className={["flex-1 min-h-0 custom-scrollbar", !disableInternalScroll && "overflow-y-auto"].filter(Boolean).join(" ")}>
        {/* Sticky header — the whole header is the column drag handle.
            Background always matches the column body, including while it's
            the active drop target, so the header never looks "cut out". */}
        <div
          className={[
            "p-4 border-b flex flex-col gap-2 sticky top-0 z-10 shadow-sm group/header",
            isColumnActive && !isDragging
              ? "bg-primary/5 border-primary/20"
              : "bg-[#f8fafc] dark:bg-[#0f172a] border-slate-200 dark:border-slate-800",
          ].join(" ")}
          {...(isOverlay ? {} : attributes)}
          {...(isOverlay ? {} : listeners)}
        >
          {header}
        </div>

        <div className="p-3 space-y-3">
          {taskIds.length === 0 ? (
            emptyContent ?? <EmptyColumn />
          ) : isOverlay ? (
            // Static, non-interactive preview for the floating column clone
            taskIds.slice(0, 3).map((id) => <div key={id}>{renderCard(id)}</div>)
          ) : (
            <>
              <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
              {taskIds.map((id) => (
                <KanbanBoardCard key={id} taskId={id} renderCard={renderCard} ghostHeight={cardGhostHeight} />
              ))}
              </SortableContext>
            </>
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
  const { setNodeRef, transform, transition, isDragging } = useSortable({
    id: taskId,
    data: { type: "card", taskId },
    disabled: true,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={{ ...(style || {}), height: ghostHeight }}
        className="bg-muted/30 border-2 border-dashed border-primary/20 rounded-lg w-full"
      />
    );
  }

  return (
    <div ref={setNodeRef} style={style}>
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
