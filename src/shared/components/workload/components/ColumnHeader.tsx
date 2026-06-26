import React, { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  ArrowUpDown,
  Maximize2,
  Minimize2,
  Lock,
  GripVertical,
  ArrowRightLeft,
  Trash,
  MoreHorizontal,
} from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/shared/components/ui/dropdown-menu";

interface ColumnHeaderProps {
  column: any;
  onToggleCollapse?: () => void;
  onStartResize?: (columnId: string, e: React.PointerEvent) => void;
  onColumnLabelChange?: (columnId: string, newLabel: string) => void;
  onSort?: (columnId: string, direction: "asc" | "desc") => void;
}

export const SortableColumnHeader = ({
  column,
  onToggleCollapse,
  onStartResize,
  onColumnLabelChange,
  onSort,
}: ColumnHeaderProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(column.label);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: column.id,
    disabled: column.fixed,
    data: {
      type: "column",
      isFixed: column.fixed,
    },
  });

  const style = {
    transform: transform ? `translate3d(${transform.x}px, 0, 0)` : undefined,
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Sync editValue when column.label changes (e.g., from localStorage or parent state)
  useEffect(() => {
    if (!isEditing) {
      setEditValue(column.label);
    }
  }, [column.label, isEditing]);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSaveLabel = async (newLabel: string) => {
    if (newLabel.trim() && newLabel !== column.label) {
      try {
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 300));
        onColumnLabelChange?.(column.id, newLabel.trim());
        // toast.success("Column renamed successfully");
      } catch (error) {
        console.error("Failed to rename column:", error);
        toast.error("Failed to Rename Column");
        setEditValue(column.label);
      }
    } else {
      setEditValue(column.label);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSaveLabel(editValue);
    } else if (e.key === "Escape") {
      setEditValue(column.label);
      setIsEditing(false);
    }
  };

  return (
    <th
      ref={setNodeRef}
      style={{
        ...style,
        width: column.width,
        minWidth: column.minWidth || column.width,
        maxWidth: column.maxWidth || column.width,
      }}
      className={`p-4 font-medium border-r border-b border-border last:border-r-0 bg-card ${
        column.id === "item" ? "sticky left-12 z-30" : "z-20"
      }`}
      {...attributes}
    >
      <div
        {...(!column.fixed ? listeners : {})}
        className={`relative group flex items-center justify-between ${
          column.fixed
            ? "cursor-default opacity-80"
            : "cursor-grab active:cursor-grabbing"
        }`}
      >
        {/* Resizer handle (right edge) */}
        {(!column.fixed || column.id === "item") && !column.collapsed && (
          <div
            onPointerDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onStartResize?.(column.id, e);
            }}
            role="separator"
            aria-orientation="vertical"
            className="absolute right-0 top-0 h-12 w-4 -mr-6 cursor-col-resize z-40"
            title={`Resize ${column.label}`}
          />
        )}
        <GripVertical
          className="h-4 w-4
                  opacity-0
                  group-hover:opacity-100
                  transition-opacity
                  duration-150
                  cursor-grab active:cursor-grabbing"
        />

        {column.collapsed ? (
          <div className="flex items-center justify-center w-full">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={(e) => {
                e.stopPropagation();
                onToggleCollapse?.();
              }}
              aria-label={`Expand ${column.label}`}
              title={`Expand ${column.label}`}
            >
              <ArrowRightLeft className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <>
            {isEditing ? (
              <div className="flex-1 flex items-center justify-center">
                <Input
                  ref={inputRef}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onBlur={() => handleSaveLabel(editValue)}
                  onClick={(e) => e.stopPropagation()}
                  className="h-8 text-center text-sm bg-transparent border-0 focus:outline-none focus:ring-0"
                  style={{ maxWidth: "264px" }}
                  align="center"
                />
              </div>
            ) : (
              <span
                className="flex-1 text-center cursor-pointer hover:bg-muted/50 px-2 py-1 rounded transition-colors truncate min-w-0 block"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditing(true);
                }}
                title={column.label || "Click to edit column name"}
              >
                {column.label}
              </span>
            )}

            {/* More menu icon – hover only */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="
                  h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity
                  "
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <ArrowUpDown className="h-4 w-4 mr-2" />
                    <span>Sort</span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem
                      onClick={() => onSort?.(column.id, "asc")}
                    >
                      Sort ascending
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onSort?.(column.id, "desc")}
                    >
                      Sort descending
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuItem
                  onClick={() => onToggleCollapse?.()}
                  disabled={column.fixed}
                >
                  {column.collapsed ? (
                    <>
                      <Maximize2 className="h-4 w-4 mr-2" />
                      <span>Expand</span>
                    </>
                  ) : (
                    <>
                      <Minimize2 className="h-4 w-4 mr-2" />
                      <span>Collapse</span>
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="hidden" onClick={() => {}}>
                  <Lock className="h-4 w-4 mr-2" />
                  <span>Lock column</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {}}>
                  <Trash className="h-4 w-4 mr-2 text-destructive" />
                  <span>Delete</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </div>
    </th>
  );
};
