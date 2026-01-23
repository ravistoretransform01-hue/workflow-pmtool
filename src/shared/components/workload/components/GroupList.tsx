import { ChevronDown, ChevronRight, MoreHorizontal, Minimize2, Maximize2, Trash2, Pencil } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/shared/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import type { TaskGroup } from "../WorkloadBoard";
import { useTaskState, usePopoverState, useTaskTimer, useColumnPersistence, useTaskFilters } from "../hooks";

interface GroupListProps {
  groups: TaskGroup[];
  expandedGroups: Record<string, boolean>;
  expandedTasks: Record<string, boolean>;
  taskState: ReturnType<typeof useTaskState>;
  popoverState: ReturnType<typeof usePopoverState>;
  timerState: ReturnType<typeof useTaskTimer>;
  columnState: ReturnType<typeof useColumnPersistence>;
  filterState: ReturnType<typeof useTaskFilters>;
  visibleColumns: Record<string, boolean>;
  workloadColumns: any[];
  mainTableSearchQuery: string;
  groupNames: Record<string, string>;
  groupColors: Record<string, string>;
  groupLabels: Record<string, string>;
  groupLabelColors: Record<string, string>;
  labels: any[];
  onGroupToggle: (groupId: string) => void;
  onTaskToggle: (taskId: string) => void;
  onDeleteGroup: (groupId: string) => void;
  onEditGroup: (groupId: string) => void;
  onCollapseAllGroups: () => void;
  onExpandAllGroups: () => void;
  groupDropdownOpen: string | null;
  setGroupDropdownOpen: (groupId: string | null) => void;
  stickyGroupId: string | null;
  editGroupDialogOpen: boolean;
  editingGroupId: string | null;
  setEditGroupDialogOpen: (open: boolean) => void;
  setEditingGroupId: (groupId: string | null) => void;
  onEditGroupClick: (groupId: string) => void;
  // ... other handlers
}

export function GroupList({
  groups,
  expandedGroups,
  groupNames,
  groupLabels,
  groupLabelColors,
  labels,
  onGroupToggle,
  onDeleteGroup,
  onCollapseAllGroups,
  onExpandAllGroups,
  groupDropdownOpen,
  setGroupDropdownOpen,
  stickyGroupId,
  editGroupDialogOpen,
  editingGroupId,
  setEditGroupDialogOpen,
  setEditingGroupId,
  onEditGroupClick,
}: GroupListProps) {
  return (
    <div className="space-y-6 py-4">
      {groups.map((group) => (
        <div
          key={group.id}
          className="bg-card border border-border flex-1 border-l-4"
          style={{
            borderLeftColor: group.color || "#3b82f6",
          }}
        >
          {/* Group Header */}
          <div
            className={`group/header w-full flex items-center gap-2 px-4 py-3 hover:bg-hover transition-colors cursor-grab active:cursor-grabbing sticky top-0 z-30 bg-muted border-b border-border ${
              stickyGroupId === group.id ? "shadow-md" : ""
            }`}
            data-group-header
            data-group-id={group.id}
          >
            {/* Group Actions Dropdown */}
            <DropdownMenu
              open={groupDropdownOpen === group.id}
              onOpenChange={(open) =>
                setGroupDropdownOpen(open ? group.id : null)
              }
            >
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 shrink-0 hover:bg-hover"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => onGroupToggle(group.id)}>
                  {expandedGroups[group.id] ? (
                    <>
                      <Minimize2 className="h-4 w-4 mr-2" />
                      Collapse this group
                    </>
                  ) : (
                    <>
                      <Maximize2 className="h-4 w-4 mr-2" />
                      Expand this group
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onCollapseAllGroups()}>
                  <Minimize2 className="h-4 w-4 mr-2" />
                  Collapse all groups
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onExpandAllGroups()}>
                  <Maximize2 className="h-4 w-4 mr-2" />
                  Expand all groups
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  className="text-red-400 cursor-pointer"
                  onClick={() => onDeleteGroup(group.id)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete group
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <button
              onClick={() => onGroupToggle(group.id)}
              className="flex items-center gap-2"
            >
              {expandedGroups[group.id] ? (
                <ChevronDown
                  className="h-5 w-5 text-primary"
                  style={{
                    color: group.color || "#3b82f6",
                  }}
                />
              ) : (
                <ChevronRight
                  className="h-5 w-5 text-muted-foreground"
                  style={{
                    color: group.color || "#3b82f6",
                  }}
                />
              )}
            </button>

            <span
              className="font-semibold text-lg text-primary"
              style={{
                color: group.color || "#3b82f6",
              }}
            >
              {groupNames[group.id] || group.name}
            </span>

            {/* Label Chip (optional) */}
            {groupLabels[group.id] &&
              (() => {
                const labelObj = labels.find(
                  (l) => l.label_name === groupLabels[group.id]
                );
                const labelColor =
                  labelObj?.label_color ||
                  groupLabelColors[group.id] ||
                  "#3b82f6";
                return (
                  <div
                    className="px-3 py-1 rounded-full text-xs font-medium text-white ml-2"
                    style={{
                      backgroundColor: labelColor,
                    }}
                  >
                    {groupLabels[group.id]}
                  </div>
                );
              })()}

            {/* Edit group button */}
            <div className="flex items-center gap-1 opacity-70 hover:opacity-100 transition-opacity">
              <Popover
                open={editGroupDialogOpen && editingGroupId === group.id}
                onOpenChange={(open) => {
                  if (open) {
                    onEditGroupClick(group.id);
                  } else {
                    setEditGroupDialogOpen(false);
                    setEditingGroupId(null);
                  }
                }}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEditGroupClick(group.id)}
                    className="h-8 w-8 p-0 shrink-0 hover:bg-hover"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-4" align="start">
                  {/* Edit group content will be rendered by parent */}
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Group Tasks - will be rendered by parent */}
          {expandedGroups[group.id] && (
            <div className="p-4">
              {/* Tasks will be rendered here */}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
