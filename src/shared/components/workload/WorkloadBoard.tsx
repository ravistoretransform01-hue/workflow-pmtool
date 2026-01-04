import React from "react";
import { useState, useEffect, useRef, useMemo } from "react";

// Module-level guards to prevent duplicate API calls during React StrictMode double mount/unmount in dev
// const _loadedGroupsForBoard = new Set<string>();
// const _loadedCMSForBoard = new Set<string>();
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { groupsApi } from "@/features/groups/groupsApi";
import { tasksApi } from "@/features/tasks/tasksApi";
import { getCMSData } from "@/features/cms/cmsStorage";
import type {
  CreateTaskRequest,
  UpdateTaskRequest,
} from "@/features/tasks/types";
import type { Status, Priority } from "@/features/cms/types";
import {
  LayoutDashboard,

  ArrowUpDown,
  EyeOff,
  ChevronDown,
  ChevronRight,
  Search,
  MoreHorizontal,
  Maximize2,
  Minimize2,
  AtSign,
  Home,
  RefreshCcw,
  Activity,
  Trash2,
  Trash,
  Lock,
  GripVertical,
  Pencil,
  ArrowRightLeft,
  // GripVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { Avatar, AvatarFallback } from "@/shared/components/ui/avatar";
import { Progress } from "@/shared/components/ui/progress";
import { MentionRichTextEditor } from "@/shared/components/MentionRichTextEditor";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/shared/components/ui/dialog";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/shared/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  horizontalListSortingStrategy,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { GifPicker } from "../GifPicker";
import { FileUploadDropdown } from "../FileUploadDropdown";
import { EmojiPicker } from "../EmojiPicker";
import { getOrganizationId } from "@/lib/utils";
import { getWorkloadColumns } from "./WorkloadColumns";
import type { TaskResponse } from "@/features/tasks/types";

interface WorkloadBoardProps {
  boardId: string;
  boardName: string;
  workspaceId: string;
  workspaceName: string;
}

interface TaskGroup {
  id: string;
  name: string;
  color: string;
  tasks: Task[];
}

export interface Task {
  id: string;
  name: string;
  description?: string;
  status?: string;
  status_id?: string;
  priority?: string;
  priority_id?: string;
  estimatedDate?: string;
  person?: string;
  assigned_to_id?: string;
  timeSpent?: string;
  rating?: number;
  group_id?: string;
  subitems?: Task[];
}

const DEFAULT_TABS = [
  "Main Table",
  "List",
  "Kanban",
  "Calendar",
  "Workload",
  "Time",
  "Recurring",
  "Completed",
  "Gantt",
  "SOP",
  "Doc",
  "Updates",
  "Dashboard",
];

// Default visible columns - all columns visible by default
const DEFAULT_VISIBLE_COLUMNS = [
  "item",
  "status",
  "priority",
  "description",
  "rating",
  "person",
  "time",
];

// All available columns (for the dropdown menu)
const ALL_AVAILABLE_COLUMNS = [
  "item",
  "status",
  "priority",
  "description",
  "rating",
  "date",
  "person",
  "time",
];

const PRESET_COLORS = [
  "#16a249", // green
  "#3c83f6", // blue
  "#a855f7", // purple
  "#dc2828", // red
  "#facc14", // yellow
  "#ff8400", // orange
];

// Helper function to format seconds to time string (e.g., "2h 30m")
const formatSecondsToTime = (seconds: number): string => {
  if (seconds <= 0) return "0m";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};

// Helper function to calculate group progress
const calculateGroupProgress = (tasks: Task[]) => {
  let totalTimeSpentSeconds = 0;
  let totalEstimatedSeconds = 0;

  tasks.forEach((task) => {
    // Parse time spent (e.g., "2h 30m" or "45m")
    const timeSpentMatch = task.timeSpent?.match(/(\d+)h\s*(\d+)m|(\d+)m/);
    if (timeSpentMatch) {
      if (timeSpentMatch[1]) {
        totalTimeSpentSeconds +=
          parseInt(timeSpentMatch[1]) * 3600 + parseInt(timeSpentMatch[2]) * 60;
      } else {
        totalTimeSpentSeconds += parseInt(timeSpentMatch[3]) * 60;
      }
    }

    // Parse estimated date/time if available (for now, we'll use a default)
    // This would need to be extended based on your data structure
  });

  const percentage =
    totalEstimatedSeconds > 0
      ? Math.min(100, (totalTimeSpentSeconds / totalEstimatedSeconds) * 100)
      : 0;

  return {
    timeSpentSeconds: totalTimeSpentSeconds,
    estimatedTimeSeconds: totalEstimatedSeconds,
    percentage,
  };
};

// Sortable Tab Component
interface SortableViewTabProps {
  tab: string;
  activeTab: string;
  onTabClick: (tab: string) => void;
}

// Sortable Group Component
interface SortableGroupProps {
  group: TaskGroup;
  children: (dragListeners: any, dragAttributes: any) => React.ReactNode;
}

// const SortableGroup = ({ group, children }: SortableGroupProps) => {
//   const {
//     attributes,
//     listeners,
//     setNodeRef,
//     transform,
//     transition,
//     isDragging,
//   } = useSortable({ id: group.id });

//   const style = {
//     transform: transform ? `translate3d(0, ${transform.y}px, 0)` : undefined,
//     transition,
//     opacity: isDragging ? 0.5 : 1,
//   };

//   return (
//     <div
//       ref={setNodeRef}
//       style={style}
//       className="mb-6"
//       role="group"
//       aria-label={`Group: ${group.name}`}
//     >
//       {children(listeners, attributes)}
//     </div>
//   );
// };

const SortableGroupCard = ({ group, children }: SortableGroupProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: group.id });

  const style = {
    transform: transform ? `translate3d(0, ${transform.y}px, 0)` : undefined,
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="mb-6"
      role="group"
      aria-label={`Group: ${group.name}`}
    >
      {children(listeners, attributes)}
    </div>
  );
};

function SortableViewTab({ tab, activeTab, onTabClick }: SortableViewTabProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: tab,
    data: {
      type: "tab",
    },
  });

  // Restrict transform to horizontal only (remove Y axis)
  let style = {
    transform: transform ? `translate3d(${transform.x}px, 0px, 0)` : undefined,
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <button
      ref={setNodeRef}
      style={style}
      className={`px-3 py-2 text-sm font-medium transition-colors cursor-pointer border-b-2 whitespace-nowrap ${
        activeTab === tab
          ? "text-primary border-b-primary"
          : "text-muted-foreground border-b-transparent hover:text-foreground"
      }`}
      onClick={() => onTabClick(tab)}
      {...attributes}
      {...listeners}
    >
      {tab}
    </button>
  );
}

// =======================
// Sortable Column Header
// =======================
interface SortableColumnHeaderProps {
  column: any;
  onToggleCollapse?: () => void;
  onStartResize?: (columnId: string, e: React.PointerEvent) => void;
}
const SortableColumnHeader = ({ column, onToggleCollapse, onStartResize }: SortableColumnHeaderProps) => {
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
  });

  const style = {
    transform: transform ? `translate3d(${transform.x}px, 0, 0)` : undefined,
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <th
      ref={setNodeRef}
      style={{ ...style, width: column.width }}
      className="p-4 font-medium border-r border-border last:border-r-0 bg-muted/30"
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
        {!column.fixed && !column.collapsed && (
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
            <span className="flex-1 text-center">{column.label}</span>

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
                    <DropdownMenuItem onClick={() => {}}>
                      Sort ascending
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {}}>
                      Sort descending
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuItem onClick={() => onToggleCollapse?.()} disabled={column.fixed}>
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
                {/* <DropdownMenuItem onClick={() => {}}>
                  <Filter className="h-4 w-4 mr-2" />
                  <span>Filter</span>
                </DropdownMenuItem> */}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => {}}>
                  <Lock className="h-4 w-4 mr-2" />
                  <span>Lock column</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {}}>
                  <Trash className="h-4 w-4 mr-2 text-destructive" />
                  <span>Delete</span> {/* delete column */}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </div>
    </th>
  );
};

export function WorkloadBoard({
  boardName,
  boardId,
  workspaceId,
  workspaceName,
}: WorkloadBoardProps) {
  const navigate = useNavigate();
  const [editingBoardName, setEditingBoardName] = useState(false);
  const [boardNameValue, setBoardNameValue] = useState(boardName);

  // Compute user initials from localStorage `user_data` for avatar fallback
  const userInitials = useMemo(() => {
    try {
      const raw = localStorage.getItem("user_data");
      if (!raw) return "U";
      const parsed = JSON.parse(raw) as any;
      const name = (parsed?.name as string) || (parsed?.username as string) || "";
      const trimmed = name.trim();
      if (!trimmed) return "U";
      return trimmed.charAt(0).toUpperCase();
    } catch {
      return "U";
    }
  }, []);
  const [activeTab, setActiveTab] = useState("Main Table");
  // Main Table FilterRow states
  const [mainTableSearchQuery, setMainTableSearchQuery] = useState("");
  const [groups, setGroups] = useState<TaskGroup[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    {}
  );
  const [groupNames, setGroupNames] = useState<Record<string, string>>({});
  const [groupColors, setGroupColors] = useState<Record<string, string>>({});

  // Optional: group label text and label background color (persisted per board)
  // Labels are stored server-side via the groups API; keep in-memory state and seed from API on load
  const [groupLabels, setGroupLabels] = useState<Record<string, string>>({});
  const [groupLabelColors, setGroupLabelColors] = useState<Record<string, string>>({});

  const [newGroupDialogOpen, setNewGroupDialogOpen] = useState(false);
  const [newGroupNameInput, setNewGroupNameInput] = useState("");
  const [editGroupDialogOpen, setEditGroupDialogOpen] = useState(false);
  const [editGroupNameInput, setEditGroupNameInput] = useState("");
  const [editGroupColorInput, setEditGroupColorInput] = useState("#3b82f6");
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);

  // Edit dialog optional label fields
  const [editGroupLabelInput, setEditGroupLabelInput] = useState<string>("");
  const [editGroupLabelColorInput, setEditGroupLabelColorInput] = useState<string>("#3b82f6");
  const [newGroupColorInput, setNewGroupColorInput] = useState("#3b82f6");
  const [groupDropdownOpen, setGroupDropdownOpen] = useState<string | null>(
    null
  );
  const [deleteGroupDialogOpen, setDeleteGroupDialogOpen] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<string | null>(null);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [isDeletingGroup, setIsDeletingGroup] = useState(false);
  const [addingItemToGroup, setAddingItemToGroup] = useState<string | null>(
    null
  );
  const [newItemName, setNewItemName] = useState("");
  const [addingSubitemToTask, setAddingSubitemToTask] = useState<string | null>(
    null
  );
  const [newSubitemName, setNewSubitemName] = useState("");
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>(
    {}
  );
  const [checkedTasks, setCheckedTasks] = useState<Record<string, boolean>>({});
  const [commentsPanelOpen, setCommentsPanelOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [editTaskDialogOpen, setEditTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editTaskName, setEditTaskName] = useState("");
  const [updateText, setUpdateText] = useState("");
  const [updateFiles, setUpdateFiles] = useState<
    Array<{ name: string; size: number; type: string; url: string }>
  >([]);
  const [openPopoverId, setOpenPopoverId] = useState<string | null>(null);

  // CMS Data states
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [members, setMembers] = useState<any[]>([]);

  // Column visibility state - load from localStorage
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(
    () => {
      const saved = localStorage.getItem(`board-visible-columns-${boardId}`);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          return Object.fromEntries(
            DEFAULT_VISIBLE_COLUMNS.map((col) => [col, true])
          );
        }
      }
      return Object.fromEntries(
        DEFAULT_VISIBLE_COLUMNS.map((col) => [col, true])
      );
    }
  );

  // Load saved tab order from localStorage
  const [viewTabs, setViewTabs] = useState(() => {
    const savedTabs = localStorage.getItem(`board-tabs-${boardId}`);
    if (savedTabs) {
      try {
        const parsed = JSON.parse(savedTabs);
        // Ensure all default tabs exist in saved order
        const allTabs = [...new Set([...parsed, ...DEFAULT_TABS])];
        return allTabs.filter((tab) => DEFAULT_TABS.includes(tab));
      } catch {
        return DEFAULT_TABS;
      }
    }
    return DEFAULT_TABS;
  });

  // Fetch groups from API on component mount
  useEffect(() => {
    // Prevent duplicate fetches for the same board (helps with React StrictMode double mount in dev)
    // if (_loadedGroupsForBoard.has(String(boardId))) return;
    // _loadedGroupsForBoard.add(String(boardId));

    const loadGroupsAndTasks = async () => {
      setIsLoadingGroups(true);

      try {
        const boardIdNum = Number(boardId);

        const [groupsRes, tasksRes] = await Promise.all([
          groupsApi.getGroupsByBoard(boardIdNum),
          tasksApi.getTasksByBoardId(boardIdNum),
        ]);

        console.log("Fetched Groups:", groupsRes);
        console.log("Fetched Tasks:", tasksRes);

        // 1️⃣ Split parent & subtasks
        const parentTasks: TaskResponse[] = tasksRes.filter(
          (t) => !t.parent_id
        );

        const subtasks: TaskResponse[] = tasksRes.filter((t) => t.parent_id);

        // 2️⃣ Normalize tasks into UI Task model
        const tasksWithSubtasks: Task[] = parentTasks.map((task) => ({
          id: String(task.id),
          name: task.name,
          description: task.description,
          status: task.status_label,
          status_id: String(task.status_id),
          priority: task.priority_label,
          priority_id: String(task.task_priority_id),
          estimatedDate: task.due_date,
          person: task.assignee?.name,
          rating: typeof task.rating !== 'undefined' ? Number(task.rating) : undefined,
          group_id: String(task.group_id),
          timeSpent: task.time_spent_hours ? `${task.time_spent_hours}h` : "0h",

          subitems: subtasks
            .filter((st) => String(st.parent_id) === String(task.id))
            .map((st) => ({
              id: String(st.id),
              name: st.name,
              description: st.description,
              status: st.status_label,
              status_id: String(st.status_id),
              priority: st.priority_label,
              priority_id: String(st.task_priority_id),
              estimatedDate: st.due_date,
              person: st.assignee?.name,
              rating: typeof st.rating !== 'undefined' ? Number(st.rating) : undefined,
              timeSpent: st.time_spent_hours ? `${st.time_spent_hours}h` : "0h",
              group_id: String(task.group_id), // ✅ ADD THIS
              subitems: [],
            })),

        }));

        console.log("Tasks with Subtasks:", tasksWithSubtasks);

        // 3️⃣ Attach tasks to groups - Sort groups by position
        const sortedGroups = groupsRes.sort(
          (a: any, b: any) => Number(a.position) - Number(b.position)
        );

        // console.log("Sorted Groups:", sortedGroups);

        const groupedData: TaskGroup[] = sortedGroups.map((group) => ({
          id: String(group.id),
          name: group.name,
          color: group.color ?? "#3b82f6",
          tasks: tasksWithSubtasks.filter(
            (task) => String(task.group_id) === String(group.id)
          ),
        }));

        console.log("Final Groups with Tasks:", groupedData);

        setGroups(groupedData);

      // Seed label state from API response (server-side labels)
      const seedLabels: Record<string, string> = {};
      const seedLabelColors: Record<string, string> = {};
      groupsRes.forEach((g: any) => {
        if (g.label) seedLabels[String(g.id)] = g.label;
        if (g.label_color) seedLabelColors[String(g.id)] = g.label_color;
      });
      setGroupLabels(seedLabels);
      setGroupLabelColors(seedLabelColors);

      // expand all groups by default
      setExpandedGroups(
        Object.fromEntries(groupedData.map((g: any) => [g.id, true]))
      );
      } catch (err) {
        toast.error("Failed to load board data");
        console.error(err);
      } finally {
        setIsLoadingGroups(false);
      }
    };

    loadGroupsAndTasks();
  }, [boardId]);

  // Fetch CMS data (statuses, priorities, and members) on component mount
  useEffect(() => {
    // Prevent duplicate CMS fetches for the same board (helps with React StrictMode double mount in dev)
    // if (_loadedCMSForBoard.has(String(boardId))) return;
    // _loadedCMSForBoard.add(String(boardId));

    const loadCMSData = async () => {
      try {
        const boardIdNum = Number(boardId);
        const organizationIdNum = getOrganizationId();
        const userId = 2; // TODO: Get from auth context

        if (organizationIdNum === null) {
          console.warn("Organization not found, skipping CMS data load");
          return;
        }

        const cmsData = await getCMSData({
          organization_id: organizationIdNum,
          board_id: boardIdNum,
          user_id: userId,
        });

        console.log("Fetched CMS Data:", cmsData);

        setStatuses(cmsData.statuses);
        setPriorities(cmsData.priority);
        setMembers(cmsData.members || []);
      } catch (err) {
        console.error("Failed to load CMS data:", err);
        // Don't show toast error as CMS data is optional
      }
    };

    loadCMSData();
  }, [boardId]);

  // useEffect(() => {
  //   const loadGroupsAndTasks = async () => {
  //     setIsLoadingGroups(true);
  //     try {
  //       const boardIdNum = parseInt(boardId, 10);
  //       const fetchedGroups = await groupsApi.getGroupsByBoard(boardIdNum);

  //       // Fetch tasks for the board
  //       const fetchedTasks = await tasksApi.getTasksByBoardId(boardIdNum);

  //       // Transform API response to TaskGroup format
  //       const transformedGroups: TaskGroup[] = fetchedGroups.map(
  //         (group: any) => {
  //           // Filter tasks that belong to this group and have no parent (top-level items)
  //           const groupTasks = fetchedTasks.filter(
  //             (task: any) =>
  //               String(task.group_id) === String(group.id) &&
  //               !task.parent_id
  //           );

  //           // Transform tasks to match Task interface
  //           const transformedTasks: Task[] = groupTasks.map((task: any) => {
  //             // Find subitems for this task
  //             const subitems = fetchedTasks.filter(
  //               (t: any) => String(t.parent_id) === String(task.id)
  //             );

  //             return {
  //               id: String(task.id),
  //               name: task.name,
  //               status: [task.status_label],
  //               priority: task.priority_label,
  //               estimatedDate: task.due_date || "-",
  //               person: task.assignee ? [task.assignee.name] : [],
  //               timeSpent: `${task.time_spent_hours}h`,
  //               subitems: subitems.map((subitem: any) => ({
  //                 id: String(subitem.id),
  //                 name: subitem.name,
  //                 status: [subitem.status_label],
  //                 priority: subitem.priority_label,
  //                 estimatedDate: subitem.due_date || "-",
  //                 person: subitem.assignee ? [subitem.assignee.name] : [],
  //                 timeSpent: `${subitem.time_spent_hours}h`,
  //               })),
  //             };
  //           });

  //           return {
  //             id: String(group.id),
  //             name: group.name,
  //             color: group.color || "#3b82f6",
  //             tasks: transformedTasks,
  //           };
  //         }
  //       );

  //       setGroups(transformedGroups);

  //       console.log(transformedGroups);

  //       // Initialize groupNames, groupColors, and expandedGroups from fetched data
  //       const names: Record<string, string> = {};
  //       const colors: Record<string, string> = {};
  //       const expanded: Record<string, boolean> = {};

  //       transformedGroups.forEach((group) => {
  //         names[group.id] = group.name;
  //         colors[group.id] = group.color;
  //         expanded[group.id] = true;
  //       });

  //       setGroupNames(names);
  //       setGroupColors(colors);
  //       setExpandedGroups(expanded);
  //     } catch (error) {
  //       console.error("Failed to load groups and tasks:", error);
  //       toast.error("Failed to load groups and tasks");
  //       // Set empty groups on error
  //       setGroups([]);
  //     } finally {
  //       setIsLoadingGroups(false);
  //     }
  //   };

  //   loadGroupsAndTasks();
  // }, [boardId]);

  const handleBoardNameDoubleClick = () => {
    setEditingBoardName(true);
    setBoardNameValue(boardName);
  };

  const handleBoardNameBlur = () => {
    setEditingBoardName(false);
  };

  const handleBoardNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      setEditingBoardName(false);
    } else if (e.key === "Escape") {
      setBoardNameValue(boardName);
      setEditingBoardName(false);
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const groupSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleViewTabDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = viewTabs.findIndex((tab) => tab === active.id);
      const newIndex = viewTabs.findIndex((tab) => tab === over.id);

      const newTabs = arrayMove(viewTabs, oldIndex, newIndex);
      setViewTabs(newTabs);

      // Persist tab order to localStorage
      localStorage.setItem(`board-tabs-${boardId}`, JSON.stringify(newTabs));
    }
  };

  const handleGroupDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = groups.findIndex((g) => g.id === active.id);
      const newIndex = groups.findIndex((g) => g.id === over.id);

      const newGroups = arrayMove(groups, oldIndex, newIndex);
      setGroups(newGroups);

      // Persist group order to localStorage
      localStorage.setItem(
        `board-groups-${boardId}`,
        JSON.stringify(newGroups)
      );
    }
  };

  const addNewGroup = async () => {
    setNewGroupDialogOpen(true);
    setNewGroupNameInput("");
  };

  const handleCreateGroup = async () => {
    if (!newGroupNameInput.trim()) {
      return;
    }

    setIsCreatingGroup(true);
    try {
      const boardIdNum = parseInt(boardId, 10);
      const organizationIdNum = getOrganizationId();

      if (organizationIdNum === null) {
        toast.error("Organization not found");
        return;
      }
      const payload = {
        board_id: boardIdNum,
        workspace_id: parseInt(workspaceId, 10),
        organization_id: organizationIdNum,
        name: newGroupNameInput.trim(),
        color: newGroupColorInput, // Use selected color
      };

      const newGroup = await groupsApi.createGroup(payload);

      // Transform API response to TaskGroup format
      const transformedGroup: TaskGroup = {
        id: String(newGroup.id),
        name: newGroup.name,
        color: newGroup.color || newGroupColorInput,
        tasks: (newGroup.tasks || []).map((task: any) => ({
          id: String(task.id),
          name: task.name,
          description: task.description,
          status: task.status_label,
          priority: task.priority_label,
          estimatedDate: task.due_date || "-",
          person: task.assignee ? task.assignee.name : "",
          timeSpent: `${task.time_spent_hours}h`,
          group_id: String(task.group_id),
          subitems: [],
        })),
      };

      setGroups([...groups, transformedGroup]);
      setGroupNames({ ...groupNames, [String(newGroup.id)]: newGroup.name });
      setGroupColors({ ...groupColors, [String(newGroup.id)]: newGroup.color });
      // Seed any server-provided label info
      if (newGroup.label) {
        setGroupLabels({ ...groupLabels, [String(newGroup.id)]: newGroup.label });
      }
      if (newGroup.label_color) {
        setGroupLabelColors({ ...groupLabelColors, [String(newGroup.id)]: newGroup.label_color });
      }

      setExpandedGroups({ ...expandedGroups, [String(newGroup.id)]: true });

      // Close dialog and reset input
      setNewGroupDialogOpen(false);
      setNewGroupNameInput("");
      setNewGroupColorInput("#3b82f6"); // Reset to default color

      toast.success(`Group "${newGroupNameInput.trim()}" created successfully`);
    } catch (error) {
      console.error("Failed to create group:", error);
      toast.error("Failed to create group");
    } finally {
      setIsCreatingGroup(false);
    }
  };

  const editGroup = async (groupId: string) => {
    const group = groups.find((g) => g.id === groupId);
    if (!group) return;

    setEditingGroupId(groupId);
    setEditGroupNameInput(groupNames[groupId] || group.name);
    setEditGroupColorInput(groupColors[groupId] || group.color);
    // Prefer in-memory label state; fallback to server-provided group label
    setEditGroupLabelInput(
      groupLabels[groupId] ?? (group as any).label ?? ""
    );
    setEditGroupLabelColorInput(
      groupLabelColors[groupId] ?? (group as any).label_color ?? "#3b82f6"
    );
    setEditGroupDialogOpen(true);
  };

  const handleUpdateGroup = async () => {
    if (!editingGroupId || !editGroupNameInput.trim()) {
      return;
    }

    try {
      const payload = {
        name: editGroupNameInput.trim(),
        color: editGroupColorInput,
        // use label fields so the server owns label persistence
        label: editGroupLabelInput.trim() || null,
        label_color: editGroupLabelColorInput || null,
      };

      // Call API to update group
      const res = await groupsApi.updateGroup(editingGroupId, payload);

      // Update local state with API response
      setGroupNames({
        ...groupNames,
        [editingGroupId]: res.name,
      });

      setGroupColors({
        ...groupColors,
        [editingGroupId]: res.color,
      });

      // Update label state
      // Update label state from API response (don't persist client-side)
      if (res && typeof res.label !== "undefined" && res.label !== null) {
        const labelVal = res.label as string;
        setGroupLabels((prev) => ({ ...prev, [editingGroupId]: labelVal }));
      } else {
        setGroupLabels((prev) => {
          const copy = { ...prev };
          delete copy[editingGroupId];
          return copy;
        });
      }

      if (res && typeof res.label_color !== "undefined" && res.label_color !== null) {
        const labelColorVal = res.label_color as string;
        setGroupLabelColors((prev) => ({ ...prev, [editingGroupId]: labelColorVal }));
      } else {
        setGroupLabelColors((prev) => {
          const copy = { ...prev };
          delete copy[editingGroupId];
          return copy;
        });
      }

      // Also update the groups array
      const updatedGroups = groups.map((group) => {
        if (group.id === editingGroupId) {
          return {
            ...group,
            name: res.name,
            color: res.color,
            label: res.label,
            label_color: res.label_color,
          };
        }
        return group;
      });

      setGroups(updatedGroups);

      // Close dialog and reset
      setEditGroupDialogOpen(false);
      setEditingGroupId(null);
      setEditGroupNameInput("");
      setEditGroupColorInput("#3b82f6");
      setEditGroupLabelInput("");
      setEditGroupLabelColorInput("#3b82f6");

      toast.success("Group updated successfully");
    } catch (error) {
      console.error("Failed to update group:", error);
      toast.error("Failed to update group");
    }
  };

  const toggleGroup = (groupId: string) => {
    setExpandedGroups({
      ...expandedGroups,
      [groupId]: !expandedGroups[groupId],
    });
  };

  const deleteGroup = (groupId: string) => {
    setGroupToDelete(groupId);
    setDeleteGroupDialogOpen(true);
    setGroupDropdownOpen(null);
  };

  const confirmDeleteGroup = async () => {
    if (!groupToDelete) return;

    setIsDeletingGroup(true);
    try {
      const groupName = groupNames[groupToDelete] || "Group";

      // Call API to delete group
      await groupsApi.deleteGroup(groupToDelete);

      // Update local state
      const updatedGroups = groups.filter((g) => g.id !== groupToDelete);
      setGroups(updatedGroups);

      // Remove from state objects
      const updatedGroupNames = { ...groupNames };
      delete updatedGroupNames[groupToDelete];
      setGroupNames(updatedGroupNames);

      const updatedGroupColors = { ...groupColors };
      delete updatedGroupColors[groupToDelete];
      setGroupColors(updatedGroupColors);

      const updatedExpandedGroups = { ...expandedGroups };
      delete updatedExpandedGroups[groupToDelete];
      setExpandedGroups(updatedExpandedGroups);

      // Remove any label metadata for the deleted group
      const updatedGroupLabels = { ...groupLabels };
      if (updatedGroupLabels[groupToDelete]) {
        delete updatedGroupLabels[groupToDelete];
        setGroupLabels(updatedGroupLabels);
      }

      const updatedGroupLabelColors = { ...groupLabelColors };
      if (updatedGroupLabelColors[groupToDelete]) {
        delete updatedGroupLabelColors[groupToDelete];
        setGroupLabelColors(updatedGroupLabelColors);
      }

      // Close dialog and reset
      setDeleteGroupDialogOpen(false);
      setGroupToDelete(null);

      // Show success toast
      toast.success(`Group "${groupName}" deleted successfully`);
    } catch (error) {
      console.error("Failed to delete group:", error);
      toast.error("Failed to delete group");
    } finally {
      setIsDeletingGroup(false);
    }
  };

  const addNewItem = async (groupId: string) => {
    if (!newItemName.trim()) {
      setAddingItemToGroup(null);
      return;
    }

    try {
      const boardIdNum = parseInt(boardId, 10);
      const organizationIdNum = getOrganizationId();

      if (organizationIdNum === null) {
        toast.error("Organization not found");
        return;
      }

      // Call API to create task
      const payload: CreateTaskRequest = {
        group_id: parseInt(groupId, 10),
        organization_id: organizationIdNum,
        name: newItemName.trim(),
        board_id: boardIdNum,
        parent_id: null,
        status_id:
          statuses.length > 0 ? parseInt(statuses[0].id, 10) : undefined,
        task_priority_id:
          priorities.length > 0 ? parseInt(priorities[0].id, 10) : undefined,
      };

      const newTaskResponse = await tasksApi.createTask(payload);

      // Transform API response to Task format
      const newTask: Task = {
        id: String(newTaskResponse.id),
        name: newTaskResponse.name,
        description: newTaskResponse.description,
        status: newTaskResponse.status_label,
        status_id: String(newTaskResponse.status_id),
        priority: newTaskResponse.priority_label,
        priority_id: String(newTaskResponse.task_priority_id),
        estimatedDate: newTaskResponse.due_date || "-",
        person: newTaskResponse.assignee?.name,
        timeSpent: `${newTaskResponse.time_spent_hours}h`,
        group_id: String(newTaskResponse.group_id),
        subitems: [],
      };

      // Update groups with new task
      const updatedGroups = groups.map((group) => {
        if (group.id === groupId) {
          return {
            ...group,
            tasks: [...group.tasks, newTask],
          };
        }
        return group;
      });

      setGroups(updatedGroups);
      setNewItemName("");
      setAddingItemToGroup(null);
      toast.success("Item added successfully");
    } catch (error) {
      console.error("Failed to add item:", error);
      toast.error("Failed to add item");
    }
  };

  // const handleNewItemKeyDown = (
  //   e: React.KeyboardEvent<HTMLInputElement>,
  //   groupId: string
  // ) => {
  //   if (e.key === "Enter") {
  //     addNewItem(groupId);
  //   } else if (e.key === "Escape") {
  //     setAddingItemToGroup(null);
  //     setNewItemName("");
  //   }
  // };

  const addSubitem = async (groupId: string, taskId: string) => {
    if (!newSubitemName.trim()) {
      setAddingSubitemToTask(null);
      return;
    }

    try {
      const boardIdNum = parseInt(boardId, 10);
      const organizationIdNum = getOrganizationId();

      if (organizationIdNum === null) {
        toast.error("Organization not found");
        return;
      }

      // Call API to create subitem (task with parent_id)
      const payload: CreateTaskRequest = {
        group_id: parseInt(groupId, 10),
        organization_id: organizationIdNum,
        name: newSubitemName.trim(),
        board_id: boardIdNum,
        parent_id: parseInt(taskId, 10),
        status_id:
          statuses.length > 0 ? parseInt(statuses[0].id, 10) : undefined,
        task_priority_id:
          priorities.length > 0 ? parseInt(priorities[0].id, 10) : undefined,
      };

      const newSubitemResponse = await tasksApi.createTask(payload);

      // Transform API response to Task format
      const newSubitem: Task = {
        id: String(newSubitemResponse.id),
        name: newSubitemResponse.name,
        description: newSubitemResponse.description,
        status: newSubitemResponse.status_label,
        status_id: String(newSubitemResponse.status_id),
        priority: newSubitemResponse.priority_label,
        priority_id: String(newSubitemResponse.task_priority_id),
        estimatedDate: newSubitemResponse.due_date || "-",
        person: newSubitemResponse.assignee?.name,
        timeSpent: `${newSubitemResponse.time_spent_hours}h`,
        group_id: String(newSubitemResponse.group_id),
        subitems: [],
      };

      // Update groups with new subitem
      const updatedGroups = groups.map((group) => {
        if (group.id === groupId) {
          return {
            ...group,
            tasks: group.tasks.map((task) => {
              if (task.id === taskId) {
                return {
                  ...task,
                  subitems: [...(task.subitems || []), newSubitem],
                };
              }
              return task;
            }),
          };
        }
        return group;
      });

      setGroups(updatedGroups);
      setNewSubitemName("");
      setAddingSubitemToTask(null);
      toast.success("Subitem added successfully");
    } catch (error) {
      console.error("Failed to add subitem:", error);
      toast.error("Failed to add subitem");
    }
  };

  // const handleNewSubitemKeyDown = (
  //   e: React.KeyboardEvent<HTMLInputElement>,
  //   groupId: string,
  //   taskId: string
  // ) => {
  //   if (e.key === "Enter") {
  //     addSubitem(groupId, taskId);
  //   } else if (e.key === "Escape") {
  //     setAddingSubitemToTask(null);
  //     setNewSubitemName("");
  //   }
  // };

  // const toggleTask = (taskId: string) => {
  //   setExpandedTasks({
  //     ...expandedTasks,
  //     [taskId]: !expandedTasks[taskId],
  //   });
  // };

  const collapseAllGroups = () => {
    const allCollapsed: Record<string, boolean> = {};
    groups.forEach((group) => {
      allCollapsed[group.id] = false;
    });
    setExpandedGroups(allCollapsed);
  };

  const expandAllGroups = () => {
    const allExpanded: Record<string, boolean> = {};
    groups.forEach((group) => {
      allExpanded[group.id] = true;
    });
    setExpandedGroups(allExpanded);
  };

  const openCommentsPanel = (task: Task) => {
    setSelectedTask(task);
    setCommentsPanelOpen(true);
  };

  // Which field to focus when opening the edit dialog
  const [editTaskDialogFocus, setEditTaskDialogFocus] = useState<"name" | "description">("name");

  // Refs to inputs inside the edit dialog
  const editNameRef = useRef<HTMLInputElement | null>(null);
  const editDescriptionRef = useRef<HTMLTextAreaElement | null>(null);

  const openEditTaskDialog = (task: Task, focus: "name" | "description" = "name") => {
    setEditingTask(task);
    setEditTaskName(task.name);
    setEditTaskDialogFocus(focus);
    setEditTaskDialogOpen(true);
  };

  // Focus appropriate input when the dialog opens
  useEffect(() => {
    if (!editTaskDialogOpen) return;
    // allow dialog to mount
    const id = window.setTimeout(() => {
      if (editTaskDialogFocus === "name") {
        editNameRef.current?.focus();
        editNameRef.current?.select?.();
      } else {
        editDescriptionRef.current?.focus();
      }
    }, 0);

    return () => window.clearTimeout(id);
  }, [editTaskDialogOpen, editTaskDialogFocus]);

  const handleUpdateTask = async () => {
    if (!editingTask || !editTaskName.trim()) {
      return;
    }

    try {
      const boardIdNum = parseInt(boardId, 10);

      // Call API to update task
      const payload: UpdateTaskRequest = {
        id: editingTask.id,
        board_id: boardIdNum,
        name: editTaskName.trim(),
        description: editingTask.description,
      };

      const updatedTaskResponse = await tasksApi.updateTask(payload);

      // Update local state with API response
      const updatedGroups = groups.map((group) => ({
        ...group,
        tasks: group.tasks.map((task) => {
          if (task.id === editingTask.id) {
            return {
              ...task,
              name: updatedTaskResponse.name,
              description: updatedTaskResponse.description,
              status: updatedTaskResponse.status_label,
              priority: updatedTaskResponse.priority_label,
              estimatedDate: updatedTaskResponse.due_date || "-",
              person: updatedTaskResponse.assignee?.name,
              rating: typeof updatedTaskResponse.rating !== 'undefined' ? Number(updatedTaskResponse.rating) : task.rating,
              timeSpent: `${updatedTaskResponse.time_spent_hours}h`,
            };
          }
          // Also update in subitems
          return {
            ...task,
            subitems: task.subitems?.map((subitem) => {
              if (subitem.id === editingTask.id) {
                return {
                  ...subitem,
                  name: updatedTaskResponse.name,
                  description: updatedTaskResponse.description,
                  status: updatedTaskResponse.status_label,
                  priority: updatedTaskResponse.priority_label,
                  estimatedDate: updatedTaskResponse.due_date || "-",
                  person: updatedTaskResponse.assignee?.name,
                  rating: typeof updatedTaskResponse.rating !== 'undefined' ? Number(updatedTaskResponse.rating) : subitem.rating,
                  timeSpent: `${updatedTaskResponse.time_spent_hours}h`,
                };
              }
              return subitem;
            }),
          };
        }),
      }));

      setGroups(updatedGroups);
      setEditTaskDialogOpen(false);
      setEditingTask(null);
      setEditTaskName("");
      toast.success("Task updated successfully");
    } catch (error) {
      console.error("Failed to update task:", error);
      toast.error("Failed to update task");
    }
  };

  // const handleStatusChange = async (taskId: string, statusId: string) => {
  //   try {
  //     const boardIdNum = parseInt(boardId, 10);

  //     // Call API to update task status
  //     const payload: UpdateTaskRequest = {
  //       id: taskId,
  //       board_id: boardIdNum,
  //       status_id: parseInt(statusId, 10),
  //     };

  //     const updatedTaskResponse = await tasksApi.updateTask(payload);

  //     // Update local state with API response - simpler approach
  //     const updatedGroups = groups.map((group) => {
  //       const updatedTasks = group.tasks.map((task) => {
  //         // Update parent task if it matches
  //         if (task.id === taskId) {
  //           return {
  //             ...task,
  //             status: updatedTaskResponse.status_label,
  //             status_id: String(updatedTaskResponse.status_id),
  //           };
  //         }

  //         // Update subitem if it matches
  //         if (task.subitems && task.subitems.length > 0) {
  //           const updatedSubitems = task.subitems.map((subitem) => {
  //             if (subitem.id === taskId) {
  //               return {
  //                 ...subitem,
  //                 status: updatedTaskResponse.status_label,
  //                 status_id: String(updatedTaskResponse.status_id),
  //               };
  //             }
  //             return subitem;
  //           });
  //           return {
  //             ...task,
  //             subitems: updatedSubitems,
  //           };
  //         }

  //         return task;
  //       });

  //       return {
  //         ...group,
  //         tasks: updatedTasks,
  //       };
  //     });

  //     setGroups(updatedGroups);
  //     toast.success("Status updated successfully");
  //   } catch (error) {
  //     console.error("Failed to update status:", error);
  //     toast.error("Failed to update status");
  //   }
  // };
  const handleStatusChange = async (taskId: string, statusId: string) => {
    try {
      const boardIdNum = Number(boardId);

      const payload: UpdateTaskRequest = {
        id: taskId,
        board_id: boardIdNum,
        status_id: Number(statusId),
      };

      const updated = await tasksApi.updateTask(payload);

      setGroups((prevGroups) =>
        prevGroups.map((group) => ({
          ...group,
          tasks: group.tasks.map((task) => {
            // ✅ parent task
            if (task.id === taskId) {
              return {
                ...task,
                status: updated.status_label,
                status_id: String(updated.status_id),
              };
            }

            // ✅ subtask
            if (task.subitems?.length) {
              return {
                ...task,
                subitems: task.subitems.map((sub) =>
                  sub.id === taskId
                    ? {
                        ...sub,
                        status: updated.status_label,
                        status_id: String(updated.status_id),
                      }
                    : sub
                ),
              };
            }

            return task;
          }),
        }))
      );

      // Close popover after update
      setOpenPopoverId(null);
      toast.success("Status updated successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update status");
    }
  };

  const handlePriorityChange = async (taskId: string, priorityId: string) => {
    try {
      const boardIdNum = Number(boardId);

      const payload: UpdateTaskRequest = {
        id: taskId,
        board_id: boardIdNum,
        task_priority_id: Number(priorityId),
      };

      const updated = await tasksApi.updateTask(payload);

      setGroups((prevGroups) =>
        prevGroups.map((group) => ({
          ...group,
          tasks: group.tasks.map((task) => {
            // ✅ parent task
            if (task.id === taskId) {
              return {
                ...task,
                priority: updated.priority_label,
                priority_id: String(updated.task_priority_id),
              };
            }

            // ✅ subtask
            if (task.subitems?.length) {
              return {
                ...task,
                subitems: task.subitems.map((sub) =>
                  sub.id === taskId
                    ? {
                        ...sub,
                        priority: updated.priority_label,
                        priority_id: String(updated.task_priority_id),
                      }
                    : sub
                ),
              };
            }

            return task;
          }),
        }))
      );

      // Close popover after update
      setOpenPopoverId(null);
      toast.success("Priority updated successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update priority");
    }
  };

  const handleRatingChange = async (taskId: string, rating: number) => {
    try {
      const boardIdNum = Number(boardId);

      const payload: UpdateTaskRequest = {
        id: taskId,
        board_id: boardIdNum,
        rating: Number(rating),
      };

      const updated = await tasksApi.updateTask(payload);

      setGroups((prevGroups) =>
        prevGroups.map((group) => ({
          ...group,
          tasks: group.tasks.map((task) => {
            // ✅ parent task
            if (task.id === taskId) {
              return {
                ...task,
                rating: updated.rating ?? Number(rating),
              };
            }

            // ✅ subtask
            if (task.subitems?.length) {
              return {
                ...task,
                subitems: task.subitems.map((sub) =>
                  sub.id === taskId
                    ? {
                        ...sub,
                        rating: updated.rating ?? Number(rating),
                      }
                    : sub
                ),
              };
            }

            return task;
          }),
        }))
      );

      // Close popover after update
      setOpenPopoverId(null);
      toast.success("Rating updated successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update rating");
    }
  };

  const handlePersonChange = async (taskId: string, memberId: string) => {
    try {
      const boardIdNum = Number(boardId);

      const payload: UpdateTaskRequest = {
        id: taskId,
        board_id: boardIdNum,
        assigned_to: Number(memberId),
      };

      const updated = await tasksApi.updateTask(payload);

      setGroups((prevGroups) =>
        prevGroups.map((group) => ({
          ...group,
          tasks: group.tasks.map((task) => {
            // ✅ parent task
            if (task.id === taskId) {
              return {
                ...task,
                person: updated.assignee?.name,
                assigned_to_id: String(updated.assigned_to),
              };
            }

            // ✅ subtask
            if (task.subitems?.length) {
              return {
                ...task,
                subitems: task.subitems.map((sub) =>
                  sub.id === taskId
                    ? {
                        ...sub,
                        person: updated.assignee?.name,
                        assigned_to_id: String(updated.assigned_to),
                      }
                    : sub
                ),
              };
            }

            return task;
          }),
        }))
      );

      // Close popover after update
      setOpenPopoverId(null);
      toast.success("Person assigned successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to assign person");
    }
  };

  const handleTaskCheckChange = (taskId: string, checked: boolean) => {
    const updatedChecked: Record<string, boolean> = {
      [taskId]: checked,
    };

    // Find the task and auto-select/deselect all its subitems
    getFilteredGroups().forEach((group) => {
      group.tasks.forEach((task) => {
        if (task.id === taskId && task.subitems) {
          task.subitems.forEach((subitem) => {
            updatedChecked[subitem.id] = checked;
          });
        }
      });
    });

    setCheckedTasks((prev) => ({
      ...prev,
      ...updatedChecked,
    }));
  };

  const deleteCheckedTasks = async () => {
    const checkedTaskIds = Object.entries(checkedTasks)
      .filter(([, checked]) => checked)
      .map(([id]) => id);

    if (checkedTaskIds.length === 0) return;

    try {
      // Delete tasks via API
      for (const taskId of checkedTaskIds) {
        await tasksApi.deleteTask(taskId);
      }

      // Update local state
      const updatedGroups = groups.map((group) => ({
        ...group,
        tasks: group.tasks.filter((task) => !checkedTaskIds.includes(task.id)),
      }));

      setGroups(updatedGroups);
      setCheckedTasks({});
      toast.success(`${checkedTaskIds.length} task(s) deleted successfully`);
    } catch (error) {
      console.error("Failed to delete tasks:", error);
      toast.error("Failed to delete tasks");
    }
  };

  // const openCommentsPanel = (task: Task) => {
  //   setSelectedTask(task);
  //   setCommentsPanelOpen(true);
  // };

  {
    /* This is list of groups that are shown to screen */
  }
  const getFilteredGroups = () => {
    const query = mainTableSearchQuery.trim().toLowerCase();

    if (!query) return groups;

    return groups
      .map((group) => {
        const groupMatches = group.name.toLowerCase().includes(query);

        const filteredTasks = group.tasks
          .map((task) => {
            const taskMatches = task.name.toLowerCase().includes(query);

            const filteredSubitems =
              task.subitems?.filter((sub) =>
                sub.name.toLowerCase().includes(query)
              ) || [];

            // keep task if task OR any subitem matches
            if (taskMatches || filteredSubitems.length > 0) {
              return {
                ...task,
                subitems: filteredSubitems,
              };
            }

            return null;
          })
          .filter(Boolean) as Task[];

        // keep group if:
        // - group name matches
        // - OR any task/subitem matches
        if (groupMatches || filteredTasks.length > 0) {
          return {
            ...group,
            tasks: groupMatches ? group.tasks : filteredTasks,
          };
        }

        return null;
      })
      .filter(Boolean) as TaskGroup[];
  };

  const saveUpdate = () => {
    if (!updateText.trim()) {
      return;
    }

    try {
      // Save update (in a real app, this would call an API)
      console.log("Saving update:", updateText);
      toast.success("Update saved successfully");

      // Reset the form
      setUpdateText("");
      setUpdateFiles([]);
    } catch (error) {
      console.error("Failed to save update:", error);
      toast.error("Failed to save update");
    }
  };

  // NEW : Start
  const toggleTask = (taskId: string) => {
    setExpandedTasks((prev) => ({
      ...prev,
      [taskId]: !prev[taskId],
    }));
  };

  const toggleColumnVisibility = (columnId: string) => {
    setVisibleColumns((prev) => {
      const updated = { ...prev, [columnId]: !prev[columnId] };
      localStorage.setItem(
        `board-visible-columns-${boardId}`,
        JSON.stringify(updated)
      );
      return updated;
    });
  };

  const handleColumnDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = workloadColumns.findIndex((c) => c.id === active.id);
    const newIndex = workloadColumns.findIndex((c) => c.id === over.id);

    const newWorkloadColumns = arrayMove(workloadColumns, oldIndex, newIndex);
    setWorkloadColumns(newWorkloadColumns);

    // Optional: persist
    localStorage.setItem(
      `workload-columns-${boardId}`,
      JSON.stringify(newWorkloadColumns.map((c) => c.id))
    );
  };

  const toggleCollapseColumn = (columnId: string) => {
    setCollapsedColumns((prev) => {
      const willBeCollapsed = !prev[columnId];
      const updated = { ...prev, [columnId]: willBeCollapsed };

      try {
        localStorage.setItem(
          `board-collapsed-columns-${boardId}`,
          JSON.stringify(updated)
        );
      } catch {}

      // Update columnWidths and prevColumnWidths synchronously so the UI reflects the collapsed width immediately.
      const currentWidth = columnWidths[columnId];
      const updatedColumnWidths = { ...columnWidths };
      const updatedPrevWidths = { ...prevColumnWidths };

      if (willBeCollapsed) {
        // Save current width (if any) so we can restore it when expanded
        if (typeof currentWidth !== "undefined" && currentWidth !== COLLAPSED_WIDTH) {
          updatedPrevWidths[columnId] = currentWidth;
        } else if (!currentWidth) {
          // If no explicit saved width, try to read from current workloadColumns fallback width
          const existingCol = workloadColumns.find((c) => c.id === columnId);
          if (existingCol && existingCol.width && existingCol.width !== COLLAPSED_WIDTH) {
            updatedPrevWidths[columnId] = existingCol.width as string;
          }
        }

        // Force column to collapsed width
        updatedColumnWidths[columnId] = COLLAPSED_WIDTH;
      } else {
        // Expanding: restore previous width if we have it, otherwise remove the custom width so it falls back to default
        if (updatedPrevWidths[columnId]) {
          updatedColumnWidths[columnId] = updatedPrevWidths[columnId];
          delete updatedPrevWidths[columnId];
        } else {
          // Remove the explicit width so the column uses its default
          delete updatedColumnWidths[columnId];
        }
      }

      try {
        localStorage.setItem(
          `board-column-widths-${boardId}`,
          JSON.stringify(updatedColumnWidths)
        );
      } catch {}

      try {
        localStorage.setItem(
          `board-prev-column-widths-${boardId}`,
          JSON.stringify(updatedPrevWidths)
        );
      } catch {}

      setPrevColumnWidths(updatedPrevWidths);
      setColumnWidths(updatedColumnWidths);

      // Recompute columns with new collapsed state and widths
      const allColumns = getWorkloadColumns({
        expandedTasks,
        toggleTask,
        onOpenComments: openCommentsPanel,
        onEditTask: openEditTaskDialog,
        statuses,
        priorities,
        members,
        onStatusChange: handleStatusChange,
        onPriorityChange: handlePriorityChange,
        onPersonChange: handlePersonChange,
        openPopoverId,
        setOpenPopoverId,
      });

      const newCols = allColumns
        .map((col) => ({
          ...col,
          collapsed: !!updated[col.id],
          width: updatedColumnWidths[col.id] ?? (updated[col.id] ? COLLAPSED_WIDTH : col.width),
        }))
        .filter((col) => visibleColumns[col.id] === true);

      setWorkloadColumns(newCols as any);

      return updated;
    });
  };

  const startColumnResize = (columnId: string, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = (e as any).clientX as number;

    // Find initial width
    const currentCol = workloadColumns.find((c) => c.id === columnId);
    const startWidthStr = columnWidths[columnId] ?? (currentCol?.width ?? "150px");
    const startWidth = parseInt(String(startWidthStr).replace(/px$/, "")) || 150;

    const onPointerMove = (ev: PointerEvent) => {
      const delta = (ev as PointerEvent).clientX - startX;
      const newWidth = Math.max(MIN_COLUMN_WIDTH, Math.round(startWidth + delta));

      // Apply new width immediately and persist
      setColumnWidths((prev) => {
        const updated = { ...prev, [columnId]: `${newWidth}px` };
        try {
          localStorage.setItem(
            `board-column-widths-${boardId}`,
            JSON.stringify(updated)
          );
        } catch {}

        return updated;
      });

      setWorkloadColumns((prevCols) =>
        prevCols.map((col) =>
          col.id === columnId ? { ...col, width: `${newWidth}px` } : col
        )
      );
    };

    const onPointerUp = () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    // capture pointer to the element if available
    try {
      (e.target as Element).setPointerCapture?.((e as any).pointerId);
    } catch {}
  };

  // const workloadColumns = getWorkloadColumns({
  //   expandedTasks,
  //   toggleTask,
  // });

  // Collapsed columns state (persisted per board)
  const [collapsedColumns, setCollapsedColumns] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem(`board-collapsed-columns-${boardId}`);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const COLLAPSED_WIDTH = "32px";
  const MIN_COLUMN_WIDTH = 24;

  const [columnWidths, setColumnWidths] = useState<Record<string, string>>(() => {
    try {
      const raw = localStorage.getItem(`board-column-widths-${boardId}`);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  // Keep a backup of column widths that were present before collapsing a column so we can restore them on expand
  const [prevColumnWidths, setPrevColumnWidths] = useState<Record<string, string>>(() => {
    try {
      const raw = localStorage.getItem(`board-prev-column-widths-${boardId}`);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const [workloadColumns, setWorkloadColumns] = useState(() => {
    const allColumns = getWorkloadColumns({
      expandedTasks,
      toggleTask,
      onOpenComments: openCommentsPanel,
      onEditTask: openEditTaskDialog,
      statuses,
      priorities,
      members,
      onStatusChange: handleStatusChange,
      onPriorityChange: handlePriorityChange,
      onPersonChange: handlePersonChange,
      onRatingChange: handleRatingChange,
      openPopoverId,
      setOpenPopoverId,
    });

    // Apply collapsed state and persisted widths and filter visibility
    return allColumns
      .map((col) => ({
        ...col,
        collapsed: !!collapsedColumns[col.id],
        width: columnWidths[col.id] ?? (collapsedColumns[col.id] ? COLLAPSED_WIDTH : col.width),
      }))
      .filter((col) => visibleColumns[col.id] === true);
  });

  // Update workloadColumns when CMS data changes
  useEffect(() => {
    const allColumns = getWorkloadColumns({
      expandedTasks,
      toggleTask,
      onOpenComments: openCommentsPanel,
      onEditTask: openEditTaskDialog,
      statuses,
      priorities,
      members,
      onStatusChange: handleStatusChange,
      onPriorityChange: handlePriorityChange,
      onPersonChange: handlePersonChange,
      onRatingChange: handleRatingChange,
      openPopoverId,
      setOpenPopoverId,
    });
    // Apply collapsed state and filter columns based on visibility and saved widths
    setWorkloadColumns(
      allColumns
        .map((col) => ({
          ...col,
          collapsed: !!collapsedColumns[col.id],
          width: columnWidths[col.id] ?? (collapsedColumns[col.id] ? COLLAPSED_WIDTH : col.width),
        }))
        .filter((col) => visibleColumns[col.id] === true)
    );
  }, [statuses, priorities, members, openPopoverId, visibleColumns, collapsedColumns, columnWidths]);

  const totalColumns = workloadColumns.length + 1;
  // NEW : End

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Image resize styles */}
      <style>{`
        .image-resize-wrapper:hover {
          outline: 2px dashed hsl(var(--primary) / 0.5);
          outline-offset: 4px;
        }
        .image-resize-wrapper:hover .resize-handle {
          opacity: 1;
        }
        .resize-handle {
          opacity: 0.7;
          transition: opacity 0.2s;
        }
        .resize-handle:hover {
          opacity: 1;
          transform: scale(1.2);
        }

        /* Hide horizontal scrollbar but keep scrolling intact */
        .no-scrollbar-x {
          -ms-overflow-style: none; /* IE and Edge */
          scrollbar-width: none; /* Firefox */
        }
        .no-scrollbar-x::-webkit-scrollbar {
          display: none; /* Chrome, Safari and Opera */
        }
      `}</style>

      {/* Top Header */}
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {editingBoardName ? (
              <Input
                autoFocus
                value={boardNameValue}
                onChange={(e) => setBoardNameValue(e.target.value)}
                onBlur={handleBoardNameBlur}
                onKeyDown={handleBoardNameKeyDown}
                className="text-2xl font-semibold h-10 px-2"
              />
            ) : (
              <h1
                className="text-2xl font-semibold text-foreground cursor-text"
                onDoubleClick={handleBoardNameDoubleClick}
              >
                {boardName}
              </h1>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Board Members Display */}
            <div className="flex items-center gap-2">
              <div className="flex items-center -space-x-2">
                <Avatar className="w-8 h-8 border-2 border-background">
                  <AvatarFallback className="bg-blue-500">
                    <span className="text-white text-xs font-semibold">{userInitials}</span>
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>

            {/* Dashboard Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                navigate(`/workspace/${workspaceId}/board/${boardId}/dashboard`)
              }
              className="h-8 px-3"
            >
              <LayoutDashboard className="h-4 w-4 mr-2" />
              Dashboard
            </Button>
          </div>
        </div>

        {/* View Tabs */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleViewTabDragEnd}
        >
          <div className="flex items-center gap-2 overflow-x-auto">
            <SortableContext
              items={viewTabs}
              strategy={horizontalListSortingStrategy}
            >
              {viewTabs.map((tab) => (
                <SortableViewTab
                  key={tab}
                  tab={tab}
                  activeTab={activeTab}
                  onTabClick={handleTabChange}
                />
              ))}
            </SortableContext>
          </div>
        </DndContext>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto">
        {/* Main Table View */}
        {activeTab === "Main Table" && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Toolbar */}
            <div className="border-b border-border px-6 py-4 flex items-center gap-3 flex-wrap">
              {/* New Group Button */}
              <Button
                variant="default"
                size="sm"
                onClick={addNewGroup}
                disabled={isLoadingGroups}
              >
                New Group
              </Button>
              {/* Search */}
              <div className="flex items-center gap-3 flex-1">
                {/* Search */}
                <div className="relative max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10 pointer-events-none" />
                  <Input
                    placeholder="Search items..."
                    value={mainTableSearchQuery}
                    onChange={(e) => setMainTableSearchQuery(e.target.value)}
                    className="pl-9 h-8 bg-background border-border w-48"
                  />
                </div>
              </div>

              {/* <Button variant="ghost" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
              <Button variant="ghost" size="sm">
                <ArrowUpDown className="h-4 w-4 mr-2" />
                Sort
              </Button> */}

              {/* Column Visibility Popover */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <EyeOff className="h-4 w-4 mr-2" />
                    Columns
                  </Button>
                </PopoverTrigger>

                <PopoverContent align="end" className="w-56">
                  <div className="px-2 py-1.5 text-sm font-medium text-muted-foreground">
                    Show/Hide Columns
                  </div>
                  <div className="border-t border-border my-2" />

                  <div className="p-2 space-y-1">
                    {ALL_AVAILABLE_COLUMNS.map((columnId) => {
                      const columnLabel =
                        {
                          item: "Item",
                          status: "Status",
                          priority: "Priority",
                          description: "Description",
                          rating: "Rating",
                          date: "Date",
                          person: "Person",
                          time: "Time Spent",
                        }[columnId] || columnId;

                      return (
                        <label
                          key={columnId}
                          className="flex items-center gap-2 cursor-pointer px-2 py-1 rounded hover:bg-hover"
                        >
                          <input
                            type="checkbox"
                            checked={visibleColumns[columnId] === true}
                            onChange={() => toggleColumnVisibility(columnId)}
                            className="cursor-pointer"
                          />
                          <span className="text-sm">{columnLabel}</span>
                        </label>
                      );
                    })}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Task Groups */}
            <div className="flex-1 overflow-auto px-6 py-4">
              <DndContext
                sensors={groupSensors}
                collisionDetection={closestCenter}
                onDragEnd={handleGroupDragEnd}
              >
                <SortableContext
                  items={getFilteredGroups().map((g) => g.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-6">
                    {getFilteredGroups().length === 0 ? (
                      <div className="text-center py-12">
                        {mainTableSearchQuery.trim() ? (
                          <>
                            <p className="text-muted-foreground mb-4">
                              No items found matching "{mainTableSearchQuery}"
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="text-muted-foreground mb-4">
                              No groups yet. Create one to get started.
                            </p>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={addNewGroup}
                            >
                              Create First Group
                            </Button>
                          </>
                        )}
                      </div>
                    ) : (
                      getFilteredGroups().map((group) => (
                        <SortableGroupCard key={group.id} group={group}>
                          {(dragListeners, dragAttributes) => (
                            <div
                              className="bg-card border border-border overflow-hidden flex-1 border-l-4"
                              style={{
                                borderLeftColor: group.color || "#3b82f6",
                              }}
                              {...dragAttributes}
                              {...dragListeners}
                            >
                              {/* Group Header */}

                              <div className="group/header w-full flex items-center gap-2 px-4 py-3 hover:bg-hover transition-colors cursor-grab active:cursor-grabbing">
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
                                  <DropdownMenuContent
                                    align="end"
                                    className="w-56"
                                  >
                                    <DropdownMenuItem
                                      onClick={() => toggleGroup(group.id)}
                                    >
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
                                    <DropdownMenuItem
                                      onClick={() => collapseAllGroups()}
                                    >
                                      <Minimize2 className="h-4 w-4 mr-2" />
                                      Collapse all groups
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => expandAllGroups()}
                                    >
                                      <Maximize2 className="h-4 w-4 mr-2" />
                                      Expand all groups
                                    </DropdownMenuItem>

                                    <DropdownMenuSeparator />

                                    <DropdownMenuItem
                                      className="text-red-400 cursor-pointer"
                                      onClick={() => deleteGroup(group.id)}
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete group
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>

                                <button
                                  onClick={() => toggleGroup(group.id)}
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
                                {groupLabels[group.id] && (
                                  <div
                                    className="px-3 py-1 rounded-full text-xs font-medium text-white ml-2"
                                    style={{
                                      backgroundColor:
                                        groupLabelColors[group.id] || "#3b82f6",
                                    }}
                                  >
                                    {groupLabels[group.id]}
                                  </div>
                                )}
                                <div className="flex items-center gap-1 opacity-70 hover:opacity-100 transition-opacity">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => editGroup(group.id)}
                                    className="h-8 w-8 p-0 shrink-0 hover:bg-hover"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                </div>

                                {/* Group Progress Bar - Time Spent vs Estimated Time */}
                                {(() => {
                                  const progress = calculateGroupProgress(
                                    group.tasks
                                  );
                                  return (
                                    <div className="flex items-center gap-2 flex-1 ml-4">
                                      <Progress
                                        value={progress.percentage}
                                        className="h-2 flex-1 max-w-[200px]"
                                      />
                                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                                        {formatSecondsToTime(
                                          progress.timeSpentSeconds
                                        )}{" "}
                                        /{" "}
                                        {progress.estimatedTimeSeconds > 0
                                          ? formatSecondsToTime(
                                              progress.estimatedTimeSeconds
                                            )
                                          : "—"}
                                      </span>
                                    </div>
                                  );
                                })()}
                              </div>

                              {/* Task Table */}
                              {expandedGroups[group.id] && (
                                <div className="overflow-x-auto no-scrollbar-x">
                                  <table
                                    className="w-full"
                                    style={{ tableLayout: "auto" }}
                                  >
                                    {/* Table head */}
                                    {/* <thead className="border-b border-border bg-muted/30">
                                      <tr className="text-sm text-muted-foreground">
                                        <th className="p-4 w-12 border-r border-border text-center">
                                          <input type="checkbox" />
                                        </th>

                                        {workloadColumns.map((col) => (
                                          <th
                                            key={col.id}
                                            className="p-4 font-medium border-r border-border last:border-r-0"
                                            style={{ width: col.width }}
                                          >
                                            <div className="flex items-center justify-between">
                                              <span className="flex-1 text-center">
                                                {col.label}
                                              </span>
                                              <MoreHorizontal className="h-4 w-4 cursor-pointer" />
                                            </div>
                                          </th>
                                        ))}
                                      </tr>
                                    </thead> */}

                                    <DndContext
                                      sensors={sensors}
                                      collisionDetection={closestCenter}
                                      onDragEnd={handleColumnDragEnd}
                                    >
                                      <SortableContext
                                        items={workloadColumns.map((c) => c.id)}
                                        strategy={horizontalListSortingStrategy}
                                      >
                                        <thead className="border-b border-border bg-muted/30">
                                          <tr className="text-sm text-muted-foreground">
                                            <th className="p-4 w-12 border-r border-border text-center">
                                              <input
                                                type="checkbox"
                                                checked={
                                                  group.tasks.length > 0 &&
                                                  group.tasks.every(
                                                    (task) =>
                                                      checkedTasks[task.id] ||
                                                      false
                                                  )
                                                }
                                                onChange={(e) => {
                                                  const updatedChecked: Record<
                                                    string,
                                                    boolean
                                                  > = {};
                                                  group.tasks.forEach(
                                                    (task) => {
                                                      updatedChecked[task.id] =
                                                        e.target.checked;
                                                      // Also select/deselect subitems
                                                      if (task.subitems) {
                                                        task.subitems.forEach(
                                                          (subitem) => {
                                                            updatedChecked[
                                                              subitem.id
                                                            ] =
                                                              e.target.checked;
                                                          }
                                                        );
                                                      }
                                                    }
                                                  );
                                                  setCheckedTasks((prev) => ({
                                                    ...prev,
                                                    ...updatedChecked,
                                                  }));
                                                }}
                                              />
                                            </th>

                                            {workloadColumns.map((col) => (
                                              <SortableColumnHeader
                                                key={col.id}
                                                column={col}
                                                onToggleCollapse={() => toggleCollapseColumn(col.id)}
                                                onStartResize={startColumnResize}
                                              />
                                            ))}
                                          </tr>
                                        </thead>
                                      </SortableContext>
                                    </DndContext>

                                    {/* Table Body */}
                                    <tbody>
                                      {group.tasks.map((task) => (
                                        <React.Fragment key={task.id}>
                                          {/* ================= TASK ROW ================= */}
                                          <tr className="border-t border-b border-border hover:bg-muted/40">
                                            <td className="p-4 text-center border-r border-border">
                                              <input
                                                type="checkbox"
                                                checked={
                                                  checkedTasks[task.id] || false
                                                }
                                                onChange={(e) =>
                                                  handleTaskCheckChange(
                                                    task.id,
                                                    e.target.checked
                                                  )
                                                }
                                              />
                                            </td>

                                            {workloadColumns.map((col) => (
                                              <td
                                                key={col.id}
                                                className={cn(
                                                  "p-4 border-r border-border last:border-r-0",
                                                  col.align === "center" &&
                                                    "text-center",
                                                  col.align === "left" &&
                                                    "text-left"
                                                )}
                                                style={{ width: col.width }}
                                              >
                                                {col.collapsed ? (
                                                  <div className="flex items-center justify-center">
                                                    <button
                                                      className="h-6 w-6 rounded-sm   flex items-center justify-center"
                                                      onClick={() => toggleCollapseColumn(col.id)}
                                                      aria-label={`Expand ${col.label}`}
                                                      title={`Expand ${col.label}`}
                                                    >
                                                      <MoreHorizontal className="h-3 w-3" />
                                                    </button>
                                                  </div>
                                                ) : (
                                                  col.render(task)
                                                )}
                                              </td>
                                            ))}
                                          </tr>

                                          {/* ================= SUBITEM ROWS ================= */}
                                          {expandedTasks[task.id] &&
                                            task.subitems?.map((subtask) => (
                                              <tr
                                                key={subtask.id}
                                                className="  hover:bg-muted/30 border-b border-border"
                                              >
                                                <td className="p-4 text-center border-r border-border">
                                                  <input
                                                    type="checkbox"
                                                    checked={
                                                      checkedTasks[
                                                        subtask.id
                                                      ] || false
                                                    }
                                                    onChange={(e) =>
                                                      handleTaskCheckChange(
                                                        subtask.id,
                                                        e.target.checked
                                                      )
                                                    }
                                                  />
                                                </td>

                                                {workloadColumns.map((col) => (
                                                  <td
                                                    key={col.id}
                                                    className={cn(
                                                      "p-4 border-r border-border last:border-r-0",
                                                      col.align === "center" &&
                                                        "text-center",
                                                      col.align === "left" &&
                                                        "text-left"
                                                    )}
                                                  >
                                                    {col.collapsed ? (
                                                      <div className="flex items-center justify-center">
                                                        <button
                                                          className="h-6 w-6 rounded-sm border border-border flex items-center justify-center"
                                                          onClick={() => toggleCollapseColumn(col.id)}
                                                          aria-label={`Expand ${col.label}`}
                                                          title={`Expand ${col.label}`}
                                                        >
                                                          <ChevronRight className="h-3 w-3" />
                                                        </button>
                                                      </div>
                                                    ) : (
                                                      col.render(subtask, true)
                                                    )}
                                                  </td>
                                                ))}
                                              </tr>
                                            ))}

                                          {/* ================= ADD SUBITEM ================= */}
                                          {expandedTasks[task.id] && (
                                            <tr>
                                              <td className="p-4 text-center border-r border-border">
                                                {/* Empty Cell */}
                                              </td>
                                              <td
                                                colSpan={totalColumns}
                                                className="p-4 border-t border-border"
                                              >
                                                {addingSubitemToTask ===
                                                task.id ? (
                                                  <div className="flex items-center gap-2 pl-8">
                                                    <span className="text-muted-foreground">
                                                      └
                                                    </span>
                                                    <Input
                                                      className="h-8 flex-1"
                                                      autoFocus
                                                      placeholder="Enter subitem name"
                                                      value={newSubitemName}
                                                      onChange={(e) =>
                                                        setNewSubitemName(
                                                          e.target.value
                                                        )
                                                      }
                                                      onKeyDown={(e) => {
                                                        if (
                                                          e.key === "Enter" &&
                                                          newSubitemName.trim()
                                                        ) {
                                                          addSubitem(
                                                            group.id,
                                                            task.id
                                                          );
                                                        }
                                                        if (
                                                          e.key === "Escape"
                                                        ) {
                                                          setAddingSubitemToTask(
                                                            null
                                                          );
                                                          setNewSubitemName("");
                                                        }
                                                      }}
                                                      onBlur={() => {
                                                        setAddingSubitemToTask(
                                                          null
                                                        );
                                                        setNewSubitemName("");
                                                      }}
                                                    />
                                                  </div>
                                                ) : (
                                                  <button
                                                    onClick={() => {
                                                      setExpandedTasks(
                                                        (prev) => ({
                                                          ...prev,
                                                          [task.id]: true,
                                                        })
                                                      );
                                                      setAddingSubitemToTask(
                                                        task.id
                                                      );
                                                    }}
                                                    className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-2 pl-8"
                                                  >
                                                    <span className="text-muted-foreground">
                                                      {"└"}
                                                      {/* ├ */}
                                                    </span>
                                                    <span className="text-lg">
                                                      +
                                                    </span>{" "}
                                                    Add subitem
                                                  </button>
                                                )}
                                              </td>
                                            </tr>
                                          )}
                                        </React.Fragment>
                                      ))}

                                      {/* ================= ADD ITEM ROW ================= */}
                                      <tr>
                                        <td className="p-4 text-center border-r border-border">
                                          {/* Empty Cell */}
                                        </td>
                                        <td
                                          colSpan={totalColumns}
                                          className="p-4 border-t border-border"
                                        >
                                          {addingItemToGroup === group.id ? (
                                            <Input
                                              className="h-8 max-w"
                                              autoFocus
                                              placeholder="Enter item name..."
                                              value={newItemName}
                                              onChange={(e) =>
                                                setNewItemName(e.target.value)
                                              }
                                              onKeyDown={(e) => {
                                                if (
                                                  e.key === "Enter" &&
                                                  newItemName.trim()
                                                ) {
                                                  addNewItem(group.id);
                                                }
                                                if (e.key === "Escape") {
                                                  setAddingItemToGroup(null);
                                                  setNewItemName("");
                                                }
                                              }}
                                              onBlur={() => {
                                                setAddingItemToGroup(null);
                                                setNewItemName("");
                                              }}
                                            />
                                          ) : (
                                            <button
                                              onClick={() => {
                                                setAddingItemToGroup(group.id);
                                              }}
                                              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-2 "
                                            >
                                              <span className="text-md">
                                                + Add Item
                                              </span>{" "}
                                            </button>
                                          )}
                                        </td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          )}
                        </SortableGroupCard>
                      ))
                    )}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          </div>
        )}

        {/* Other Views */}
        {activeTab !== "Main Table" && (
          <div className="flex-1 overflow-auto p-6">
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Active Tab: {activeTab}</h2>
              <p className="text-sm text-muted-foreground">
                Workspace: {workspaceName}
              </p>
              <p className="text-sm text-muted-foreground">
                Board ID: {boardId}
              </p>
              <p className="text-sm text-muted-foreground">
                Workspace ID: {workspaceId}
              </p>

              <div className="mt-6 p-4 bg-muted rounded-lg">
                <h3 className="font-semibold mb-2">Available Tabs:</h3>
                <div className="flex flex-wrap gap-2">
                  {viewTabs.map((tab) => (
                    <span
                      key={tab}
                      className="px-2 py-1 bg-background rounded text-sm"
                    >
                      {tab}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ALL DIALOGS WILL GO HERE */}
      {/* New Group Dialog */}
      <Dialog open={newGroupDialogOpen} onOpenChange={setNewGroupDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New Group</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-3">
              <label className="text-sm font-medium">Color</label>
              <div className="flex gap-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    className={`h-10 w-10 rounded-lg transition-all border-2 ${
                      newGroupColorInput === color
                        ? "border-foreground scale-110"
                        : "border-transparent hover:scale-105"
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setNewGroupColorInput(color)}
                  />
                ))}
              </div>
            </div>
            <div className="grid gap-2">
              <label htmlFor="group-name" className="text-sm font-medium">
                Group Name
              </label>
              <Input
                id="group-name"
                placeholder="Enter group name..."
                value={newGroupNameInput}
                onChange={(e) => setNewGroupNameInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleCreateGroup();
                  }
                }}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setNewGroupDialogOpen(false);
                setNewGroupNameInput("");
                setNewGroupColorInput("#3b82f6");
              }}
              disabled={isCreatingGroup}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateGroup}
              disabled={!newGroupNameInput.trim() || isCreatingGroup}
            >
              {isCreatingGroup ? "Creating..." : "Create Group"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Group Dialog */}
      <Dialog open={editGroupDialogOpen} onOpenChange={setEditGroupDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Group</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-3">
              <label className="text-sm font-medium">Color</label>
              <div className="flex gap-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    className={`h-10 w-10 rounded-lg transition-all border-2 ${
                      editGroupColorInput === color
                        ? "border-foreground scale-110"
                        : "border-transparent hover:scale-105"
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setEditGroupColorInput(color)}
                  />
                ))}
              </div>
            </div>
            <div className="grid gap-2">
              <label htmlFor="edit-group-name" className="text-sm font-medium">
                Group Name
              </label>
              <Input
                id="edit-group-name"
                placeholder="Enter group name..."
                value={editGroupNameInput}
                onChange={(e) => setEditGroupNameInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleUpdateGroup();
                  }
                }}
                autoFocus
              />
            </div>
            {/* Label Input - POSTPONED */}
            <div className="grid gap-2">
              <label htmlFor="edit-group-label" className="text-sm font-medium">
                Label (Optional)
              </label>
              <Input
                id="edit-group-label"
                placeholder="Enter label text..."
                value={editGroupLabelInput}
                onChange={(e) => setEditGroupLabelInput(e.target.value)}
              />
            </div>
            {/* <div className="grid gap-3">
              <label className="text-sm font-medium">Label Color</label>
              <div className="flex gap-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    className={`h-10 w-10 rounded-lg transition-all border-2 ${
                      editGroupLabelColorInput === color
                        ? "border-foreground scale-110"
                        : "border-transparent hover:scale-105"
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setEditGroupLabelColorInput(color)}
                  />
                ))}
              </div>
            </div>  */}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditGroupDialogOpen(false);
                setEditingGroupId(null);
                setEditGroupNameInput("");
                setEditGroupColorInput("#3b82f6");
                setEditGroupLabelInput("");
                setEditGroupLabelColorInput("#3b82f6");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateGroup}
              disabled={!editGroupNameInput.trim()}
            >
              Update Group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Group Confirmation Dialog */}
      <Dialog
        open={deleteGroupDialogOpen}
        onOpenChange={setDeleteGroupDialogOpen}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Group</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete this group? This action cannot be
              undone.
            </p>
            {groupToDelete && (
              <p className="text-sm font-medium mt-2">
                Group:{" "}
                <span className="text-foreground">
                  {groupNames[groupToDelete] || "Unknown"}
                </span>
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteGroupDialogOpen(false);
                setGroupToDelete(null);
              }}
              disabled={isDeletingGroup}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteGroup}
              disabled={isDeletingGroup}
            >
              {isDeletingGroup ? "Deleting..." : "Delete Group"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Task Dialog */}
      <Dialog open={editTaskDialogOpen} onOpenChange={setEditTaskDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="edit-task-name" className="text-sm font-medium">
                Task Name
              </label>
              <Input
                id="edit-task-name"
                placeholder="Enter task name..."
                value={editTaskName}
                onChange={(e) => setEditTaskName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleUpdateTask();
                  }
                }}
                autoFocus
                ref={editNameRef}
              />
            </div>
            <div className="grid gap-2">
              <label
                htmlFor="edit-task-description"
                className="text-sm font-medium"
              >
                Description
              </label>
              <textarea
                id="edit-task-description"
                placeholder="Enter task description..."
                value={editingTask?.description || ""}
                onChange={(e) => {
                  if (editingTask) {
                    setEditingTask({
                      ...editingTask,
                      description: e.target.value,
                    });
                  }
                }}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                rows={4}
                ref={editDescriptionRef}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditTaskDialogOpen(false);
                setEditingTask(null);
                setEditTaskName("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdateTask} disabled={!editTaskName.trim()}>
              Update Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ALL SHEETS WILL GO HERE */}
      {/* Comments Panel Sheet */}
      <Sheet
        open={commentsPanelOpen}
        onOpenChange={setCommentsPanelOpen}
        modal={false}
      >
        <SheetContent
          side="right"
          className="w-full sm:max-w-2xl p-0"
          showOverlay={false}
        >
          <div className="flex flex-col h-full">
            <SheetHeader className="px-6 py-4 border-b border-border">
              <div className="flex items-center justify-between">
                <SheetTitle className="text-2xl font-semibold">
                  {selectedTask?.name || "Task Details"}
                </SheetTitle>
                <div className="flex items-center gap-4">
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </SheetHeader>

            <Tabs
              defaultValue="updates"
              className="flex-1 flex flex-col min-h-0"
            >
              <div className="px-6 border-b border-border">
                <TabsList className="w-full justify-start h-12 bg-transparent p-0">
                  <TabsTrigger
                    value="updates"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                  >
                    <Home className="h-4 w-4 mr-2" />
                    Dev Updates
                  </TabsTrigger>

                  <TabsTrigger
                    value="client-updates"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                  >
                    <RefreshCcw className="h-4 w-4 mr-2" />
                    Client Updates
                  </TabsTrigger>

                  <TabsTrigger
                    value="activity"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                  >
                    <Activity className="h-4 w-4 mr-2" />
                    Activity Log
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent
                value="updates"
                className="flex-1 flex flex-col mt-0 overflow-hidden min-h-0"
              >
                <div className="px-6 pt-2 pb-4 border-b border-border relative z-10">
                  <MentionRichTextEditor
                    placeholder="Write an update and mention others with @"
                    value={updateText}
                    onChange={setUpdateText}
                    availablePeople={[]}
                    files={updateFiles}
                    onFilesChange={setUpdateFiles}
                  />
                </div>
                <div className="flex items-center justify-between px-6 pt-3">
                  <div className="flex items-center gap-2">
                    <FileUploadDropdown
                      onFileSelect={(fileInfo) => {
                        setUpdateFiles((prev) => [...prev, fileInfo]);
                      }}
                    />
                    <GifPicker
                      onGifSelect={(gifUrl) =>
                        setUpdateText(
                          (prev) =>
                            prev +
                            `<img src="${gifUrl}" alt="GIF" style="max-width: 200px; border-radius: 8px;" />`
                        )
                      }
                    />
                    <EmojiPicker
                      onEmojiSelect={(emoji) =>
                        setUpdateText((prev) => prev + emoji)
                      }
                    />

                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      // onClick={() => mentionEditorRef.current?.showMentionDropdown()}
                    >
                      <AtSign className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                  <Button
                    onClick={saveUpdate}
                    disabled={!updateText.trim()}
                    className="bg-primary hover:bg-primary/90"
                  >
                    Update
                  </Button>
                </div>

                <div className="flex-1 overflow-auto px-6 py-4">
                  <div className="space-y-4">
                    <div className="text-center py-8">
                      <p className="text-sm text-muted-foreground">
                        No updates yet. Be the first to add one!
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent
                value="activity"
                className="flex-1 flex flex-col mt-0 overflow-hidden min-h-0"
              >
                <div className="px-6 pt-4 pb-4">
                  <p className="text-sm text-muted-foreground">
                    Activity log for this task will appear here.
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </SheetContent>
      </Sheet>

      {/* Bulk Actions Toolbar */}
      {Object.values(checkedTasks).some((checked) => checked) && (
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border shadow-lg z-50 py-4 px-6">
          <div className="max-w-[1400px] mx-auto flex items-center justify-between">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-2">
                <div className="bg-primary rounded-full w-8 h-8 flex items-center justify-center text-white font-semibold text-sm">
                  {
                    Object.values(checkedTasks).filter((checked) => checked)
                      .length
                  }
                </div>
                <span className="text-foreground font-medium">
                  Items selected
                </span>
              </div>

              <div className="flex items-center gap-4">
                <button
                  className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={deleteCheckedTasks}
                >
                  <Trash2 className="h-5 w-5" />
                  <span className="text-xs">Delete</span>
                </button>
              </div>
            </div>

            <button
              onClick={() => setCheckedTasks({})}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* */}
    </div>
  );
}
