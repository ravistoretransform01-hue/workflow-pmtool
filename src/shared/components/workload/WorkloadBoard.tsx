import React from "react";
import { useState, useEffect, useRef, useMemo } from "react";
import { format, parseISO } from "date-fns";

// Module-level guards to prevent duplicate API calls during React StrictMode double mount/unmount in dev
// const _loadedGroupsForBoard = new Set<string>();
// const _loadedCMSForBoard = new Set<string>();
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import { toast } from "sonner";
import axios from "@/lib/axios";
import { useAppDispatch, useAppSelector } from "@/app/hooks";
import type { RootState } from "@/app/store";
import { groupsApi } from "@/features/groups/groupsApi";
import { tasksApi } from "@/features/tasks/tasksApi";
import { attachmentsApi } from "@/features/tasks/attachmentsApi";
import { cmsApi } from "@/features/cms/cmsApi";
// import { boardsApi } from "@/features/boards/boardsApi";
import {
  getCMSData,
  clearCMSCache,
  getUserColumnsFromCache,
} from "@/features/cms/cmsStorage";
import type {
  CreateTaskRequest,
  UpdateTaskRequest,
} from "@/features/tasks/types";
import type { Status, Priority } from "@/features/cms/types";
import {
  LayoutDashboard,
  Eye,
  ChevronDown,
  ChevronRight,
  Search,
  MoreHorizontal,
  Maximize2,
  Minimize2,
  Trash2,
  Save,
  Pencil,
} from "lucide-react";
import { cn, getCurrentUserId } from "@/lib/utils";
import { sortBy } from "@/lib/sorting";
import {
  updateColumnLabel,
  updateFullColumnConfiguration,
  getColumnConfiguration,
  getColumnLabel,
  mergeColumnConfigWithAPI,
} from "@/lib/columnPersistence";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { Avatar, AvatarFallback } from "@/shared/components/ui/avatar";
import { Progress } from "@/shared/components/ui/progress";
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
} from "@/shared/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover";
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
import { getOrganizationId } from "@/lib/utils";
import { getWorkloadColumns } from "./WorkloadColumns";
import { TaskCardDialog } from "./TaskCardDialog";
import { CommentsPanelSheet } from "./CommentsPanelSheet";
import type { TaskResponse, TaskComment } from "@/features/tasks/types";
import { ProfileDialog } from "../ProfileDialog";
import {
  useTaskState,
  usePopoverState,
  useTaskTimer,
  useColumnPersistence,
  useTaskFilters,
} from "./hooks";
import { useBeforeUnload } from "./hooks/useBeforeUnload";
import { fetchActiveTimer } from "@/features/tasks/tasksSlice";
import { SortableColumnHeader } from "./components/ColumnHeader";
import { ColorPickerPopover } from "./ColorPickerPopover";
import { debugLog } from "@/lib/debugLog";
import { KanbanView } from "./KanbanView";
import { ListView } from "./ListView";
import { isViewLive } from "@/lib/constants";
import { ComingSoonAnimation } from "../ComingSoonAnimation";

interface WorkloadBoardProps {
  boardId: string;
  boardName: string;
  workspaceId: string;
  workspaceName: string;
}

export interface TaskGroup {
  id: string;
  name: string;
  color: string;
  tasks: Task[];
  label_id?: string;
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
  estimatedDateRaw?: string; // Raw ISO date for sorting/categorization
  estimatedHours?: string | number; // Approved hours from estimation
  person?: string;
  assigned_to_id?: string | number;
  assigned_to_ids?: string[]; // Multiple assignees
  timeSpent?: string;
  tracked_time_seconds?: number; // Tracked time in seconds from timer
  rating?: number; // Display rating as average number (1-5)
  ratingCount?: number; // Number of ratings
  ratings?: Array<{
    id: string;
    task_id?: string;
    assignee_id: string | number;
    assigner_id?: string | number;
    rating: string | number;
    created_at?: string;
    updated_at?: string;
    assignee?: {
      id: number;
      name: string;
      email: string;
    };
    assigner?: {
      id: number;
      name: string;
      email: string;
    };
  }>;
  label_id?: string; // Label ID for the task
  group_id?: string;
  tags?: Array<{
    task_tag_id: number;
    tag_id: number;
    tag_name: string;
    tag_slug: string;
    tag_is_active: boolean;
    tagged_by: number;
    tagged_by_name: string;
    tagged_at: string;
  }>;
  subitems?: Task[];
  assignee_names?: string[];
  recurrence?: any;
}

// All available columns (for the dropdown menu)
const ALL_AVAILABLE_COLUMNS = [
  "item",
  "status",
  "priority",
  "description",
  "rating",
  "estimatedDate",
  "estimatedTime",
  "progress",
  "person",
  "tags",
  "timer",
];

const COLUMN_DEFAULT_LABELS: Record<string, string> = {
  item: "Item",
  status: "Status",
  priority: "Priority",
  description: "Description",
  rating: "Rating",
  estimatedDate: "Estimated Date",
  estimatedTime: "Estimated Time",
  progress: "Progress",
  person: "Person",
  tags: "Tags",
  timer: "Timer",
};

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

// Helper to convert "00h 04m" | number → seconds
const parseEstimatedToSeconds = (value: string | number): number => {
  if (typeof value === "number") {
    return value * 3600;
  }

  if (typeof value === "string") {
    const match = value.match(/(\d+)\s*h\s*(\d+)\s*m/i);
    if (!match) return 0;

    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);

    return hours * 3600 + minutes * 60;
  }

  return 0;
};

// Helper function to calculate group progress
const calculateGroupProgress = (tasks: Task[]) => {
  let totalTimeSpentSeconds = 0;
  let totalEstimatedSeconds = 0;

  const processTask = (task: Task) => {
    // Add tracked time
    if (task.tracked_time_seconds) {
      totalTimeSpentSeconds += task.tracked_time_seconds;
    }

    // Add estimated time
    if (task.estimatedHours) {
      const estimatedSeconds = parseEstimatedToSeconds(task.estimatedHours);
      totalEstimatedSeconds += estimatedSeconds;
    }

    // Process subitems recursively
    if (task.subitems?.length) {
      task.subitems.forEach(processTask);
    }
  };

  tasks.forEach(processTask);

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

// Helper function to format date range in compact format
// Examples: "Jan 19 - 30", "Jan 31 – Feb 15", "Dec 31, '26 – Jan 8, '27"
const formatDateRange = (fromDate: string, toDate?: string): string => {
  try {
    const from = parseISO(fromDate);
    const to = toDate ? parseISO(toDate) : from;

    const fromMonth = format(from, "MMM");
    const fromDay = format(from, "d");
    const fromYear = format(from, "yy");

    const toMonth = format(to, "MMM");
    const toDay = format(to, "d");
    const toYear = format(to, "yy");

    // If same date, just return single date
    if (fromDate === toDate) {
      return `${fromMonth} ${fromDay}, '${fromYear}`;
    }

    // If same month and year, format as "Jan 19 - 30"
    if (fromMonth === toMonth && fromYear === toYear) {
      return `${fromMonth} ${fromDay} - ${toDay}`;
    }

    // If same year, format as "Jan 31 – Feb 15"
    if (fromYear === toYear) {
      return `${fromMonth} ${fromDay} – ${toMonth} ${toDay}`;
    }

    // Different years, format as "Dec 31, '26 – Jan 8, '27"
    return `${fromMonth} ${fromDay}, '${fromYear} – ${toMonth} ${toDay}, '${toYear}`;
  } catch (error) {
    console.warn("Failed to format date range:", error);
    return "-";
  }
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

export function WorkloadBoard({
  boardName,
  boardId,
  workspaceId,
  // workspaceName,
}: WorkloadBoardProps) {
  const navigate = useNavigate();
  const { viewName } = useParams<{ viewName?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const dispatch = useAppDispatch();
  const refreshCounter = useAppSelector(
    (state: RootState) => state.ui.refreshCounter,
  );

  // Initialize hooks for state management
  const taskState = useTaskState();
  const popoverState = usePopoverState();
  const timerState = useTaskTimer();
  const columnState = useColumnPersistence(boardId);
  const filterState = useTaskFilters();

  // Mapping Tab Name -> isViewLive key
  const TAB_TO_VIEW_KEY: Record<string, keyof typeof isViewLive> = {
    "Main Table": "mainTable",
    Kanban: "kanban",
    List: "list",
    Calendar: "calendar",
    Workload: "workload",
    Gantt: "timeline",
  };

  const isCurrentViewLive = (tab: string) => {
    const key = TAB_TO_VIEW_KEY[tab];
    return key ? isViewLive[key] : false;
  };

  // Ensure the primary 'item' column is always visible — protect against any stored setting that hides it.
  useEffect(() => {
    columnState.showColumn("item");
  }, [boardId, columnState.showColumn]);

  // Local state for board-specific UI
  // const [editingBoardName, setEditingBoardName] = useState(false);
  const [boardNameValue, setBoardNameValue] = useState(boardName);
  const [isSaving, setIsSaving] = useState(false);

  // Ref for the main flex container (flex-1 flex flex-col)
  const mainFlexContainerRef = useRef<HTMLDivElement>(null);

  // Local state for task card and comments
  const [commentsPanelOpen, setCommentsPanelOpen] = useState(false);
  const [sheetTaskCardOpen, setSheetTaskCardOpen] = useState(false);
  const [selectedTaskCardId, setSelectedTaskCardId] = useState<string | null>(
    null,
  );
  const [selectedCommentsId, setSelectedCommentsId] = useState<string | null>(
    null,
  );
  const [taskCardInitialEditDescription, setTaskCardInitialEditDescription] =
    useState(false);

  // Sync URL <-> State
  useEffect(() => {
    const taskIdFromUrl = searchParams.get("task");
    const commentsIdFromUrl = searchParams.get("comments");

    // Sync View Tab
    if (viewName) {
      // Decode URI component in case of "Main%20Table"
      const decodedViewName = decodeURIComponent(viewName);
      if (TAB_TO_VIEW_KEY[decodedViewName]) {
        setActiveTab((prev) =>
          decodedViewName !== prev ? decodedViewName : prev,
        );
      } else {
        // Invalid view name, redirect to Main Table
        navigate(
          `/board/${boardId}/view/Main%20Table${window.location.search}`,
          { replace: true },
        );
      }
    } else {
      // Missing view name, redirect to Main Table
      navigate(`/board/${boardId}/view/Main%20Table${window.location.search}`, {
        replace: true,
      });
    }

    // Sync Task Card State
    if (taskIdFromUrl) {
      if (taskIdFromUrl !== selectedTaskCardId) {
        setSelectedTaskCardId(taskIdFromUrl);
      }
      if (!sheetTaskCardOpen) {
        setSheetTaskCardOpen(true);
      }
    } else {
      if (sheetTaskCardOpen) {
        setSheetTaskCardOpen(false);
      }
      if (selectedTaskCardId) {
        setSelectedTaskCardId(null);
      }
    }

    // Sync Comments Panel State
    if (commentsIdFromUrl) {
      if (commentsIdFromUrl !== selectedCommentsId) {
        setSelectedCommentsId(commentsIdFromUrl);
      }
      if (!commentsPanelOpen) {
        setCommentsPanelOpen(true);
      }
    } else {
      if (commentsPanelOpen) {
        setCommentsPanelOpen(false);
      }
      if (selectedCommentsId) {
        setSelectedCommentsId(null);
      }
    }
  }, [searchParams, viewName]);

  const [updateText, setUpdateText] = useState("");
  const [updateFiles, setUpdateFiles] = useState<
    Array<{ name: string; size: number; type: string; url: string }>
  >([]);

  // Compute user initials from localStorage `user_data` for avatar fallback
  const userInitials = useMemo(() => {
    try {
      const raw = localStorage.getItem("user_data");
      if (!raw) return "U";
      const parsed = JSON.parse(raw) as any;
      const name =
        (parsed?.name as string) || (parsed?.username as string) || "";
      const trimmed = name.trim();
      if (!trimmed) return "U";
      return trimmed.charAt(0).toUpperCase();
    } catch {
      return "U";
    }
  }, []);

  let initialViewFromUrl = "Main Table";
  if (viewName) {
    const decodedViewName = decodeURIComponent(viewName);
    if (TAB_TO_VIEW_KEY[decodedViewName]) {
      initialViewFromUrl = decodedViewName;
    }
  }

  const [activeTab, setActiveTab] = useState(initialViewFromUrl);

  // Main Table FilterRow states
  const [mainTableSearchQuery, setMainTableSearchQuery] = useState("");
  const [groups, setGroups] = useState<TaskGroup[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    {},
  );
  const [groupNames, setGroupNames] = useState<Record<string, string>>({});
  const [groupColors, setGroupColors] = useState<Record<string, string>>({});

  // Optional: group label text and label background color (persisted per board)
  // Labels are stored server-side via the groups API; keep in-memory state and seed from API on load
  const [groupLabels, setGroupLabels] = useState<Record<string, string>>({});
  const [groupLabelColors, setGroupLabelColors] = useState<
    Record<string, string>
  >({});

  const [newGroupDialogOpen, setNewGroupDialogOpen] = useState(false);
  const [newGroupNameInput, setNewGroupNameInput] = useState("");
  const [editGroupDialogOpen, setEditGroupDialogOpen] = useState(false);
  const [editGroupNameInput, setEditGroupNameInput] = useState("");
  const [editGroupColorInput, setEditGroupColorInput] = useState("#3b82f6");
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);

  // Edit dialog optional label fields
  const [editGroupLabelInput, setEditGroupLabelInput] = useState<string>("");
  const [editGroupLabelColorInput, setEditGroupLabelColorInput] =
    useState<string>("#3b82f6");
  const [newGroupColorInput, setNewGroupColorInput] = useState("#3b82f6");
  const [groupDropdownOpen, setGroupDropdownOpen] = useState<string | null>(
    null,
  );
  const [deleteGroupDialogOpen, setDeleteGroupDialogOpen] = useState(false);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<string | null>(null);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [isDeletingGroup, setIsDeletingGroup] = useState(false);
  const [addingItemToGroup, setAddingItemToGroup] = useState<string | null>(
    null,
  );
  const [newItemName, setNewItemName] = useState("");
  const [addingSubitemToTask, setAddingSubitemToTask] = useState<string | null>(
    null,
  );
  const [newSubitemName, setNewSubitemName] = useState("");
  // Comments state
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [replyingTo, setReplyingTo] = useState<TaskComment | null>(null);

  // Timer conflict dialog state
  const [timerConflictDialogOpen, setTimerConflictDialogOpen] = useState(false);
  const [conflictingTaskName, setConflictingTaskName] = useState("");

  // CMS Data states
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [labels, setLabels] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);

  // Color picker popover states
  const [editGroupColorPickerOpen, setEditGroupColorPickerOpen] =
    useState(false);

  // Edit labels dialog state
  const [editLabelsDialogOpen, setEditLabelsDialogOpen] = useState(false);
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState("#a855f7");
  const [newLabelColorPickerOpen, setNewLabelColorPickerOpen] = useState(false);

  // Edit existing label state
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const [editingLabelName, setEditingLabelName] = useState("");
  const [editingLabelColor, setEditingLabelColor] = useState("");
  const [editingLabelColorPickerOpen, setEditingLabelColorPickerOpen] =
    useState(false);

  // Helper function to update a task in groups state (ensures React detects changes)
  const updateTaskInGroups = (taskId: string, updates: Partial<Task>) => {
    setGroups((prevGroups) => {
      // Create a completely new array to ensure React detects the change
      const newGroups = prevGroups.map((group) => {
        const newTasks = group.tasks.map((task) => {
          if (task.id === taskId) {
            return { ...task, ...updates };
          }
          // Check subitems
          if (task.subitems?.length) {
            const updatedSubitems = task.subitems.map((subitem) =>
              subitem.id === taskId ? { ...subitem, ...updates } : subitem,
            );
            if (updatedSubitems.some((s, i) => s !== task.subitems![i])) {
              return { ...task, subitems: updatedSubitems };
            }
          }
          return task;
        });

        // Only create new group object if tasks changed
        if (newTasks.some((t, i) => t !== group.tasks[i])) {
          return { ...group, tasks: newTasks };
        }
        return group;
      });

      return newGroups;
    });
  };

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

        debugLog("Fetched Groups:", groupsRes);
        debugLog("Fetched Tasks:", tasksRes);

        // 1️⃣ Split parent & subtasks
        const parentTasks: TaskResponse[] = tasksRes.filter(
          (t) => !t.parent_id,
        );

        const subtasks: TaskResponse[] = tasksRes.filter((t) => t.parent_id);

        // 2️⃣ Normalize tasks into UI Task model
        const tasksWithSubtasks: Task[] = parentTasks.map((task) => {
          // Extract numeric rating from average_rating field
          const extractRating = (taskData: any): number | undefined => {
            if (!taskData) return undefined;
            // Use average_rating if available, otherwise check old format
            if (
              typeof taskData.average_rating === "number" &&
              taskData.average_rating !== null
            ) {
              return Math.round(taskData.average_rating);
            }
            if (
              typeof taskData.rating === "object" &&
              "rating" in taskData.rating
            ) {
              return Number(taskData.rating.rating);
            }
            if (typeof taskData.rating === "number") {
              return taskData.rating;
            }
            return undefined;
          };

          return {
            id: String(task.id),
            name: task.name,
            description: task.description,
            status: task.status_label,
            status_id: String(task.status_id),
            priority: task.priority_label,
            priority_id: String(task.task_priority_id),
            // Handle new estimation object structure
            estimatedDate: task.estimation?.estimated_date_from
              ? task.estimation.estimated_date_to &&
                task.estimation.estimated_date_to !==
                  task.estimation.estimated_date_from
                ? formatDateRange(
                    task.estimation.estimated_date_from,
                    task.estimation.estimated_date_to,
                  )
                : formatDateRange(task.estimation.estimated_date_from)
              : task.due_date,
            estimatedDateRaw:
              task.estimation?.estimated_date_from ||
              task.due_date ||
              undefined,
            estimatedHours: task.estimation?.approved_hours || "-",
            person: task.assignee?.name,
            assigned_to_id: task.assigned_to,
            assigned_to_ids:
              task.assignees?.map((a) => String(a.user_id)) ||
              (task.assigned_to ? [String(task.assigned_to)] : []),
            rating: extractRating(task),
            ratingCount: task.rating_count || 0,
            ratings: task.ratings,
            tags: task.tags || [],
            group_id: String(task.group_id),
            timeSpent: task.time_spent_hours
              ? `${task.time_spent_hours}h`
              : "0h",
            tracked_time_seconds: task.tracked_time_seconds || 0,
            recurrence: task.recurrence,
            assignee_names:
              task.assignees?.map((a) => a.name || a.username || "") ||
              (task.assignee?.name ? [task.assignee.name] : []),

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
                // Handle new estimation object structure
                estimatedDate: st.estimation?.estimated_date_from
                  ? st.estimation.estimated_date_to &&
                    st.estimation.estimated_date_to !==
                      st.estimation.estimated_date_from
                    ? formatDateRange(
                        st.estimation.estimated_date_from,
                        st.estimation.estimated_date_to,
                      )
                    : formatDateRange(st.estimation.estimated_date_from)
                  : st.due_date,
                estimatedDateRaw:
                  st.estimation?.estimated_date_from ||
                  st.due_date ||
                  undefined,
                estimatedHours: st.estimation?.approved_hours || "-",
                person: st.assignee?.name,
                assigned_to_id: st.assigned_to,
                assigned_to_ids:
                  st.assignees?.map((a) => String(a.user_id)) ||
                  (st.assigned_to ? [String(st.assigned_to)] : []),
                rating: extractRating(st),
                ratingCount: st.rating_count || 0,
                ratings: st.ratings,
                tags: st.tags || [],
                timeSpent: st.time_spent_hours
                  ? `${st.time_spent_hours}h`
                  : "0h",
                group_id: String(task.group_id),
                tracked_time_seconds: st.tracked_time_seconds || 0,
                recurrence: st.recurrence,
                assignee_names:
                  st.assignees?.map((a) => a.name || a.username || "") ||
                  (st.assignee?.name ? [st.assignee.name] : []),
                subitems: [],
              })),
          };
        });

        debugLog("Tasks with Subtasks:", tasksWithSubtasks);

        // 3️⃣ Attach tasks to groups - Sort groups by position
        const sortedGroups = groupsRes.sort(
          (a: any, b: any) => Number(a.position) - Number(b.position),
        );

        // debugLog("Sorted Groups:", sortedGroups);

        const groupedData: TaskGroup[] = sortedGroups.map((group) => {
          const groupIdStr = String(group.id);
          const groupLabelId = group.label ? String(group.label) : undefined;

          return {
            id: groupIdStr,
            name: group.name,
            color: group.color ?? "#3b82f6",
            label_id: groupLabelId,
            tasks: tasksWithSubtasks
              .filter((task) => String(task.group_id) === groupIdStr)
              .map((task) => ({
                ...task,
                label_id: groupLabelId,
                subitems: task.subitems?.map((sub) => ({
                  ...sub,
                  label_id: groupLabelId,
                })),
              })),
          };
        });

        debugLog("Final Groups with Tasks:", groupedData);

        setGroups(groupedData);

        // Seed state from API response
        const seedLabels: Record<string, string> = {};
        const seedLabelColors: Record<string, string> = {};
        const names: Record<string, string> = {};
        const colors: Record<string, string> = {};

        groupsRes.forEach((g: any) => {
          if (g.label) seedLabels[String(g.id)] = g.label;
          if (g.label_color) seedLabelColors[String(g.id)] = g.label_color;
          names[String(g.id)] = g.name;
          colors[String(g.id)] = g.color ?? "#3b82f6";
        });

        setGroupLabels(seedLabels);
        setGroupLabelColors(seedLabelColors);
        setGroupNames(names);
        setGroupColors(colors);

        // expand all groups by default
        setExpandedGroups(
          Object.fromEntries(groupedData.map((g: any) => [g.id, true])),
        );
      } catch (err) {
        toast.error("Failed to load board data");
        console.error(err);
      } finally {
        setIsLoadingGroups(false);
      }
    };

    loadGroupsAndTasks();
  }, [boardId, refreshCounter]);

  // Fetch CMS data (statuses, priorities, and members) on component mount
  useEffect(() => {
    // Prevent duplicate CMS fetches for the same board (helps with React StrictMode double mount in dev)
    // if (_loadedCMSForBoard.has(String(boardId))) return;
    // _loadedCMSForBoard.add(String(boardId));

    const loadCMSData = async () => {
      try {
        const boardIdNum = Number(boardId);
        const organizationIdNum = getOrganizationId();
        const userId = getCurrentUserId();

        if (organizationIdNum === null) {
          console.warn("Organization not found, skipping CMS data load");
          return;
        }

        // Clear the cache for this board to ensure fresh data on mount
        clearCMSCache(boardIdNum);

        const cmsData = await getCMSData({
          organization_id: organizationIdNum,
          board_id: boardIdNum,
          user_id: userId,
        });

        debugLog("Fetched CMS Data:", cmsData);

        // Sort statuses by status_order
        const sortedStatuses = [...cmsData.statuses].sort(
          sortBy((s) => s.status_order, "number"),
        );

        // Sort priorities by priority_order
        const sortedPriorities = [...cmsData.priorities].sort(
          sortBy((p) => p.priority_order, "number"),
        );

        setStatuses(sortedStatuses);
        setPriorities(sortedPriorities);
        setMembers(cmsData.members || []);
        setLabels(cmsData.labels || []);
        setTags(cmsData.tags || []);

        // Sync user_columns from CMS API with columnPersistence
        // This ensures custom column labels and positions from the server are loaded on initial mount
        const userColumns = getUserColumnsFromCache(boardIdNum);
        if (userColumns?.columns) {
          debugLog(
            "Syncing user_columns from CMS API to columnPersistence:",
            userColumns,
          );
          mergeColumnConfigWithAPI(boardIdNum, userColumns.columns);

          // Update columnOrder to reflect the positions from the API
          // Sort columns by position to get the correct order
          const sortedColumnIds = Object.entries(userColumns.columns)
            .sort(
              ([, a]: [string, any], [, b]: [string, any]) =>
                (a.position || 0) - (b.position || 0),
            )
            .map(([colId]) => colId);

          if (sortedColumnIds.length > 0) {
            setColumnOrder(sortedColumnIds);
            debugLog(
              "Updated columnOrder from API positions:",
              sortedColumnIds,
            );
          }
        }
      } catch (err) {
        console.error("Failed to load CMS data:", err);
        // Don't show toast error as CMS data is optional
      }
    };

    loadCMSData();
  }, [boardId]);

  // Fetch comments when task is selected or comments panel is opened
  // Auto-refresh comments every 5-7 seconds while the panel is open
  useEffect(() => {
    const fetchComments = async (taskId: string) => {
      try {
        const data = await tasksApi.getComments(taskId);
        setComments(data);
      } catch (error) {
        console.error("Failed to fetch comments:", error);
      }
    };

    if (commentsPanelOpen && selectedCommentsId) {
      // Initial fetch without loading state to avoid flickering
      fetchComments(selectedCommentsId);
      setIsLoadingComments(false);

      // Set up interval to auto-refresh comments every 6 seconds
      const refreshInterval = setInterval(() => {
        fetchComments(selectedCommentsId);
      }, 5000); // 5 seconds

      // Cleanup interval when panel closes or task changes
      return () => clearInterval(refreshInterval);
    } else {
      setComments([]);
      setIsLoadingComments(false);
    }
  }, [commentsPanelOpen, selectedCommentsId]);

  // Sync boardName prop with local state when it changes
  useEffect(() => {
    setBoardNameValue(boardName);
  }, [boardName]);

  // Update timer trigger every second when a timer is running to force progress bar recalculation
  // Also force a re-render to update group progress bars
  const [, forceUpdate] = useState({});
  useEffect(() => {
    if (!timerState.activeTimerId) return;

    const interval = setInterval(() => {
      timerState.triggerTimerUpdate();
      // Force component re-render to update group progress calculations
      forceUpdate({});
    }, 1000);

    return () => clearInterval(interval);
  }, [timerState.activeTimerId, timerState]);

  // Sync with backend on mount to ensure timer state is accurate across tabs/refreshes
  useEffect(() => {
    dispatch(fetchActiveTimer());
  }, [dispatch]);

  // Keep-alive heartbeat to prevent backend from cleaning up active timer
  useEffect(() => {
    if (!timerState.activeTimerId) return;

    // Ping every 30 seconds
    const pingInterval = setInterval(async () => {
      try {
        await tasksApi.pingTimer();
      } catch (error) {
        console.error("Heartbeat ping failed:", error);
      }
    }, 30000);

    return () => clearInterval(pingInterval);
  }, [timerState.activeTimerId]);

  // Prevent page unload when timer is running
  useBeforeUnload(!!timerState.activeTimerId, {
    message: "A timer is running. Are you sure you want to leave?",
    onUnload: () => {
      if (timerState.activeTimerId) {
        try {
          // Use axios to stop timer during page unload
          // axios instance handles auth headers automatically
          axios
            .post("/tasks/time/stop", {
              task_id: timerState.activeTimerId,
            })
            .catch((error) => {
              console.error("Failed to stop timer on page unload:", error);
            });

          // Clear session storage immediately during unload process
          sessionStorage.removeItem("activeTimerId");
          sessionStorage.removeItem("timerStartTime");

          console.log(
            "Timer stop request sent on page hide and storage cleared",
          );
        } catch (error) {
          console.error("Error stopping timer on unload:", error);
        }
      }
    },
  });

  // const handleGetS3Link = async () => {
  //   try {
  //     const response = await axios.get(
  //       "https://5a2g87jm9b.execute-api.ap-south-1.amazonaws.com/default/pm-generate-upload-url?file_name=report.png&file_type=application/png",
  //     );
  //     console.log("S3 Signed URL Response:", response.data);
  //     toast.success("S3 Link fetched. Check console.");
  //   } catch (error) {
  //     console.error("Failed to fetch S3 link:", error);
  //     toast.error("Failed to fetch S3 link");
  //   }
  // };

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

  //       debugLog(transformedGroups);

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

  // const handleBoardNameDoubleClick = () => {
  //   setEditingBoardName(true);
  //   setBoardNameValue(boardName);
  // };

  // const handleBoardNameBlur = async () => {
  //   if (boardNameValue.trim() && boardNameValue !== boardName) {
  //     await updateBoardName();
  //   }
  //   setEditingBoardName(false);
  // };

  // const updateBoardName = async () => {
  //   if (!boardNameValue.trim() || boardNameValue === boardName) {
  //     return;
  //   }

  //   try {
  //     await boardsApi.updateBoard(boardId, { name: boardNameValue.trim() });
  //     toast.success("Board name updated successfully");

  //     // Update the parent component or trigger a refresh if needed
  //     // The board name in the UI will update via the local state
  //   } catch (error) {
  //     console.error("Failed to update board name:", error);
  //     toast.error("Failed to update board name");
  //     setBoardNameValue(boardName); // Revert to original name on error
  //   }
  // };

  // const handleBoardNameKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
  //   if (e.key === "Enter") {
  //     e.preventDefault();
  //     await updateBoardName();
  //     setEditingBoardName(false);
  //   } else if (e.key === "Escape") {
  //     setBoardNameValue(boardName);
  //     setEditingBoardName(false);
  //   }
  // };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    // Remove "view" query param if it exists, since we're using path now
    if (searchParams.has("view")) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete("view");
          return next;
        },
        { replace: true },
      );
    }
    // Navigate to the new path
    navigate(
      `/board/${boardId}/view/${encodeURIComponent(tab)}${window.location.search}`,
    );
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  );

  const groupSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  );

  const handleViewTabDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = columnState.viewTabs.findIndex(
        (tab: any) => tab === active.id,
      );
      const newIndex = columnState.viewTabs.findIndex(
        (tab: any) => tab === over.id,
      );

      const newTabs = arrayMove(columnState.viewTabs, oldIndex, newIndex);
      columnState.reorderTabs(newTabs);

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
        JSON.stringify(newGroups),
      );
    }
  };

  // Helper to find current task by ID from groups state
  const getTaskById = (taskId: string | null): Task | null => {
    if (!taskId) return null;
    for (const group of groups) {
      const task = group.tasks.find((t) => t.id === taskId);
      if (task) return task;
      const subitem = group.tasks
        .flatMap((t) => t.subitems || [])
        .find((s) => s.id === taskId);
      if (subitem) return subitem;
    }
    return null;
  };

  const openCommentsPanel = (task: Task) => {
    setSearchParams((prev: URLSearchParams) => {
      const next = new URLSearchParams(prev);
      next.delete("task");
      next.set("comments", task.id);
      return next;
    });
  };

  const closeCommentsPanel = () => {
    setSearchParams((prev: URLSearchParams) => {
      const next = new URLSearchParams(prev);
      next.delete("comments");
      return next;
    });
  };

  const openTaskCard = (
    task: Task,
    initialEditDescription: boolean = false,
  ) => {
    setTaskCardInitialEditDescription(initialEditDescription);
    setSearchParams((prev: URLSearchParams) => {
      const next = new URLSearchParams(prev);
      next.delete("comments");
      next.set("task", task.id);
      return next;
    });
  };

  const closeTaskCard = () => {
    setTaskCardInitialEditDescription(false);
    setSearchParams((prev: URLSearchParams) => {
      const next = new URLSearchParams(prev);
      next.delete("task");
      return next;
    });
  };

  const handleInlineEditTaskName = async (taskId: string, newName: string) => {
    if (!newName.trim()) {
      taskState.cancelInlineEdit();
      return;
    }

    try {
      // Call the API to update task name
      await tasksApi.updateTask({
        id: taskId,
        board_id: parseInt(boardId, 10),
        name: newName.trim(),
      });

      // Update local state - handle both parent tasks and subtasks
      setGroups((prevGroups) =>
        prevGroups.map((group) => ({
          ...group,
          tasks: group.tasks.map((task) => {
            // ✅ Update parent task if it matches
            if (task.id === taskId) {
              return { ...task, name: newName.trim() };
            }

            // ✅ Update subtask if it matches
            if (task.subitems?.length) {
              return {
                ...task,
                subitems: task.subitems.map((subitem) =>
                  subitem.id === taskId
                    ? { ...subitem, name: newName.trim() }
                    : subitem,
                ),
              };
            }

            return task;
          }),
        })),
      );

      taskState.finishInlineEdit();
      toast.success("Task Name Updated successfully");
    } catch (error) {
      console.error("Failed to update task name:", error);
      toast.error("Failed to update task name");
      taskState.cancelInlineEdit();
    }
  };

  const handleSortGroupItems = (
    groupId: string,
    columnId: string,
    direction: "asc" | "desc",
  ) => {
    setGroups((prevGroups) =>
      prevGroups.map((group) => {
        if (group.id !== groupId) return group;

        const sortedTasks = [...group.tasks].sort((a, b) => {
          let valA: string | number = "";
          let valB: string | number = "";

          switch (columnId) {
            case "item":
              valA = a.name?.toLowerCase() || "";
              valB = b.name?.toLowerCase() || "";
              break;
            case "status":
              valA = a.status || "";
              valB = b.status || "";
              break;
            case "priority":
              valA = a.priority || "";
              valB = b.priority || "";
              break;
            case "person":
              valA = a.person || "";
              valB = b.person || "";
              break;
            case "rating":
              valA = a.rating || 0;
              valB = b.rating || 0;
              break;
            case "estimatedDate":
              valA = a.estimatedDate || "";
              valB = b.estimatedDate || "";
              break;
            case "estimatedTime":
              valA = Number(a.estimatedHours) || 0;
              valB = Number(b.estimatedHours) || 0;
              break;
            default:
              return 0;
          }

          if (valA < valB) return direction === "asc" ? -1 : 1;
          if (valA > valB) return direction === "asc" ? 1 : -1;
          return 0;
        });

        return { ...group, tasks: sortedTasks };
      }),
    );
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
        setGroupLabels({
          ...groupLabels,
          [String(newGroup.id)]: newGroup.label,
        });
      }
      if (newGroup.label_color) {
        setGroupLabelColors({
          ...groupLabelColors,
          [String(newGroup.id)]: newGroup.label_color,
        });
      }

      setExpandedGroups({ ...expandedGroups, [String(newGroup.id)]: true });

      // Close dialog and reset input
      setNewGroupDialogOpen(false);
      setNewGroupNameInput("");
      setNewGroupColorInput("#3b82f6"); // Reset to default color

      toast.success(`Group "${newGroupNameInput.trim()}" Created Successfully`);
    } catch (error) {
      console.error("Failed to create group:", error);
      toast.error("Failed to Create Group");
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
    setEditGroupLabelInput(groupLabels[groupId] ?? (group as any).label ?? "");
    setEditGroupLabelColorInput(
      groupLabelColors[groupId] ?? (group as any).label_color ?? "#3b82f6",
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

      if (
        res &&
        typeof res.label_color !== "undefined" &&
        res.label_color !== null
      ) {
        const labelColorVal = res.label_color as string;
        setGroupLabelColors((prev) => ({
          ...prev,
          [editingGroupId]: labelColorVal,
        }));
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

      toast.success("Group Updated Successfully");
    } catch (error) {
      console.error("Failed to update group:", error);
      toast.error("Failed to Update Group");
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

  const handleColumnLabelChange = async (
    columnId: string,
    newLabel: string,
  ) => {
    // Persist the new label to localStorage immediately
    const success = updateColumnLabel(
      parseInt(boardId, 10),
      columnId,
      newLabel,
    );

    if (!success) {
      console.error("Failed to persist column label to localStorage");
      toast.error("Failed to save column label");
      return;
    }

    // Update workload columns with new label immediately (for UI feedback)
    setWorkloadColumns((prev) =>
      prev.map((col) =>
        col.id === columnId ? { ...col, label: newLabel } : col,
      ),
    );

    // Call API to save column configuration (async, non-blocking)
    try {
      // Build the columns object for the API
      const columnsPayload: Record<string, any> = {};
      workloadColumns.forEach((col) => {
        columnsPayload[col.id] = {
          label: col.id === columnId ? newLabel : col.label,
          visible: !collapsedColumns[col.id],
          position: workloadColumns.indexOf(col) + 1,
        };
      });

      // Build the full payload
      const payload = {
        user_id: getCurrentUserId(),
        organization_id: getOrganizationId(),
        board_id: parseInt(boardId, 10),
        columns: columnsPayload,
      };

      debugLog("Column label update payload:", payload);

      // Call API to save
      const response = await cmsApi.saveUserGroupColumns(payload);

      // Merge API response with localStorage to ensure consistency
      if (response.columns) {
        const newOrder = workloadColumns.map((c) => c.id);
        updateFullColumnConfiguration(
          parseInt(boardId, 10),
          newOrder,
          response.columns,
        );
      }

      toast.success("Column Renamed Successfully");
    } catch (error) {
      console.error("Failed to update column on server:", error);
      console.warn(
        "Column label saved locally but API sync failed. Will retry on next sync.",
      );
      // Don't show error to user since we already saved locally
    }
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
      toast.success(`Group "${groupName}" Deleted Successfully`);
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
        assignee_names:
          newTaskResponse.assignees?.map((a) => a.name || a.username || "") ||
          (newTaskResponse.assignee?.name
            ? [newTaskResponse.assignee.name]
            : []),
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
      toast.success("Item Added Successfully");
    } catch (error) {
      console.error("Failed to add item:", error);
      toast.error("Failed to add item");
    }
  };

  const handleKanbanAddTask = async (
    name: string,
    statusId: string,
    groupId: string,
    parentId?: string,
  ) => {
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
        name: name.trim(),
        board_id: boardIdNum,
        parent_id: parentId ? parseInt(parentId, 10) : null,
        status_id: parseInt(statusId, 10),
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
        assignee_names:
          newTaskResponse.assignees?.map((a) => a.name || a.username || "") ||
          (newTaskResponse.assignee?.name
            ? [newTaskResponse.assignee.name]
            : []),
        label_id: groupLabels[String(newTaskResponse.group_id)],
      };

      // Update groups with new task
      const updatedGroups = groups.map((group) => {
        if (group.id === groupId) {
          if (parentId) {
            // Add as subtask
            return {
              ...group,
              tasks: group.tasks.map((task) => {
                if (task.id === parentId) {
                  return {
                    ...task,
                    subitems: [...(task.subitems || []), newTask],
                  };
                }
                return task;
              }),
            };
          } else {
            // Add as main task
            return {
              ...group,
              tasks: [...group.tasks, newTask],
            };
          }
        }
        return group;
      });

      setGroups(updatedGroups);
      toast.success("Item Added Successfully");
    } catch (error) {
      console.error("Failed to add item from Kanban:", error);
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
        assignee_names:
          newSubitemResponse.assignees?.map(
            (a) => a.name || a.username || "",
          ) ||
          (newSubitemResponse.assignee?.name
            ? [newSubitemResponse.assignee.name]
            : []),
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
      toast.success("Subitem Added Successfully");
    } catch (error) {
      console.error("Failed to add subitem:", error);
      toast.error("Failed to Add Subitem");
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

  const handleRatingChange = async (taskId: string, rating: number) => {
    try {
      const boardIdNum = Number(boardId);

      // Get the currently assigned member ID (first assignee)
      let assigneeId = 0;
      for (const group of groups) {
        const task = group.tasks.find((t) => t.id === taskId);
        if (task) {
          assigneeId = task.assigned_to_ids?.[0]
            ? Number(task.assigned_to_ids[0])
            : 0;
          break;
        }
        const subitem = group.tasks
          .flatMap((t) => t.subitems || [])
          .find((s) => s.id === taskId);
        if (subitem) {
          assigneeId = subitem.assigned_to_ids?.[0]
            ? Number(subitem.assigned_to_ids[0])
            : 0;
          break;
        }
      }

      debugLog("assigneeId", assigneeId);

      const payload: UpdateTaskRequest = {
        id: taskId,
        board_id: boardIdNum,
        rating: {
          rating: Number(rating),
          assignee_id: assigneeId,
        },
      };

      const updated = await tasksApi.updateTask(payload);

      // Extract numeric rating from average_rating field
      const ratingValue = updated.average_rating
        ? Math.round(updated.average_rating)
        : Number(rating);

      setGroups((prevGroups) =>
        prevGroups.map((group) => ({
          ...group,
          tasks: group.tasks.map((task) => {
            // ✅ parent task
            if (task.id === taskId) {
              return {
                ...task,
                rating: ratingValue,
                ratingCount: updated.rating_count || 0,
                ratings: updated.ratings,
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
                        rating: ratingValue,
                        ratingCount: updated.rating_count || 0,
                        ratings: updated.ratings,
                      }
                    : sub,
                ),
              };
            }

            return task;
          }),
        })),
      );

      // Close popover after update
      popoverState.closePopover();
      toast.success("Rating Updated Successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to Update Rating");
    }
  };

  const handlePersonChange = async (taskId: string, memberIds: string[]) => {
    try {
      const boardIdNum = Number(boardId);

      // Filter out null/undefined values and convert to numbers
      const validMemberIds = memberIds
        .filter((id) => id && id !== "null" && id !== "undefined")
        .map((id) => Number(id));

      // Send the update with assignees array
      const payload: UpdateTaskRequest = {
        id: taskId,
        board_id: boardIdNum,
        assignees: validMemberIds,
      };

      const updated = await tasksApi.updateTask(payload);

      // Extract assignee IDs from the response
      const assigneeIds =
        updated.assignees?.map((a) => String(a.user_id)) || [];

      setGroups((prevGroups) =>
        prevGroups.map((group) => ({
          ...group,
          tasks: group.tasks.map((task) => {
            // ✅ parent task
            if (task.id === taskId) {
              return {
                ...task,
                person: updated.assignees?.[0]?.name || updated.assignee?.name,
                assigned_to_id:
                  updated.assignees?.[0]?.user_id ||
                  String(updated.assigned_to),
                assigned_to_ids: assigneeIds,
                assignee_names:
                  updated.assignees?.map((a) => a.name || a.username || "") ||
                  (updated.assignee?.name ? [updated.assignee.name] : []),
              };
            }

            // ✅ subtask
            if (task.subitems?.length) {
              return {
                ...task,
                subitems: task.subitems.map((sub) => {
                  if (sub.id === taskId) {
                    return {
                      ...sub,
                      person:
                        updated.assignees?.[0]?.name || updated.assignee?.name,
                      assigned_to_id:
                        updated.assignees?.[0]?.user_id ||
                        String(updated.assigned_to),
                      assigned_to_ids: assigneeIds,
                      assignee_names:
                        updated.assignees?.map(
                          (a) => a.name || a.username || "",
                        ) ||
                        (updated.assignee?.name ? [updated.assignee.name] : []),
                    };
                  }
                  return sub;
                }),
              };
            }

            return task;
          }),
        })),
      );

      // Don't close the popover - let user continue selecting multiple assignees
      // popoverState.closePopover();

      toast.success("Person Assigned Successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to Assign Person");
    }
  };

  const handleEstimatedDateChange = async (
    taskId: string,
    fromDate: string | null,
    toDate?: string | null,
  ) => {
    // Format the date range display using the new formatDateRange function
    let dateDisplay = "-";
    if (fromDate) {
      dateDisplay = formatDateRange(fromDate, toDate || undefined);
    }

    setGroups((prevGroups) =>
      prevGroups.map((group) => ({
        ...group,
        tasks: group.tasks.map((task) => {
          // ✅ parent task
          if (task.id === taskId) {
            return {
              ...task,
              estimatedDate: dateDisplay,
              estimatedDateEnd: toDate || null,
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
                      estimatedDate: dateDisplay,
                      estimatedDateEnd: toDate || null,
                    }
                  : sub,
              ),
            };
          }

          return task;
        }),
      })),
    );

    // Close popover after update
    popoverState.closePopover();
  };

  const handleEstimatedTimeChange = async (
    taskId: string,
    hours: string | number | null,
  ) => {
    setGroups((prevGroups) =>
      prevGroups.map((group) => ({
        ...group,
        tasks: group.tasks.map((task) => {
          // ✅ parent task
          if (task.id === taskId) {
            return {
              ...task,
              estimatedHours: hours || "-",
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
                      estimatedHours: hours || "-",
                    }
                  : sub,
              ),
            };
          }

          return task;
        }),
      })),
    );

    // Close popover after update
    popoverState.closePopover();
  };

  const handleTagChange = async (taskId: string, tags: any[]) => {
    setGroups((prevGroups) =>
      prevGroups.map((group) => ({
        ...group,
        tasks: group.tasks.map((task) => {
          // ✅ parent task
          if (task.id === taskId) {
            return {
              ...task,
              tags,
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
                      tags,
                    }
                  : sub,
              ),
            };
          }

          return task;
        }),
      })),
    );

    // Close popover after update
    popoverState.closePopover();
  };

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
                    : sub,
                ),
              };
            }

            return task;
          }),
        })),
      );

      toast.success("Status Updated Successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to Update Status");
    }
  };

  const handleUpdateTaskDescription = async (
    taskId: string,
    description: string,
  ) => {
    try {
      const boardIdNum = Number(boardId);
      const payload: UpdateTaskRequest = {
        id: taskId,
        board_id: boardIdNum,
        description,
      };

      await tasksApi.updateTask(payload);

      setGroups((prevGroups) =>
        prevGroups.map((group) => ({
          ...group,
          tasks: group.tasks.map((task) => {
            // ✅ parent task
            if (task.id === taskId) {
              return {
                ...task,
                description,
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
                        description,
                      }
                    : sub,
                ),
              };
            }

            return task;
          }),
        })),
      );

      toast.success("Description Updated Successfully");
    } catch (error: any) {
      console.error(error);
      toast.error(
        error?.response.data.message || "Failed to Update Description",
      );
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
                    : sub,
                ),
              };
            }

            return task;
          }),
        })),
      );

      toast.success("Priority Updated Successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to Update Priority");
    }
  };

  const handleStatusCreated = (newStatus: any) => {
    setStatuses((prevStatuses) => [...prevStatuses, newStatus]);
  };

  const handleStatusesUpdated = (updatedStatuses: Status[]) => {
    setStatuses(updatedStatuses);
  };

  const handlePriorityCreated = (newPriority: any) => {
    setPriorities((prevPriorities) => [...prevPriorities, newPriority]);
  };

  const handlePrioritiesUpdated = (updatedPriorities: Priority[]) => {
    setPriorities(updatedPriorities);
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

    taskState.setCheckedTasks((prev) => ({
      ...prev,
      ...updatedChecked,
    }));
  };

  const handleTimerStart = (taskId: string | null) => {
    if (taskId === null) {
      timerState.stopTimer();
    } else {
      timerState.startTimer(taskId);
    }
  };

  const handleTimerConflict = (conflictingTaskId: string) => {
    // Find the conflicting task name
    let taskName = "Another task";
    getFilteredGroups().forEach((group) => {
      group.tasks.forEach((task) => {
        if (task.id === conflictingTaskId) {
          taskName = task.name;
        }
        task.subitems?.forEach((subitem) => {
          if (subitem.id === conflictingTaskId) {
            taskName = subitem.name;
          }
        });
      });
    });
    setConflictingTaskName(taskName);
    setTimerConflictDialogOpen(true);
  };

  const deleteCheckedTasks = async () => {
    const checkedTaskIds = Object.entries(taskState.checkedTasks)
      .filter(([, checked]) => checked)
      .map(([id]) => id);

    if (checkedTaskIds.length === 0) return;

    try {
      // Delete tasks via API
      for (const taskId of checkedTaskIds) {
        await tasksApi.deleteTask(taskId);
      }

      // Update local state - filter both parent tasks and subtasks
      const updatedGroups = groups.map((group) => ({
        ...group,
        tasks: group.tasks
          .filter((task) => !checkedTaskIds.includes(task.id))
          .map((task) => ({
            ...task,
            subitems: task.subitems?.filter(
              (subitem) => !checkedTaskIds.includes(subitem.id),
            ),
          })),
      }));

      setGroups(updatedGroups);
      taskState.clearCheckedTasks();
      toast.success(`${checkedTaskIds.length} Task(s) Deleted Successfully`);
    } catch (error) {
      console.error("Failed to delete tasks:", error);
      toast.error("Failed to Delete Tasks");
    }
  };

  // const openCommentsPanel = (task: Task) => {
  //   setSelectedTask(task);
  //   setCommentsPanelOpen(true);
  // };

  {
    /* This is list of groups that are shown to screen */
  }
  // Consolidate filtering and auto-expansion logic into one memoized result
  const memoizedFilteredData = useMemo(() => {
    const query = mainTableSearchQuery.trim().toLowerCase();
    const autoExpandedIds = new Set<string>();

    // Lookup maps for dynamic name resolution during search
    const statusNameMap = new Map(statuses.map((s) => [String(s.id), s.name]));
    const priorityNameMap = new Map(
      priorities.map((p) => [String(p.id), p.name]),
    );
    const labelNameMap = new Map(
      labels.map((l) => [String(l.id), l.label_name]),
    );

    // Final result set
    const resultGroups = groups
      .filter((group) => {
        // 1. Group Filter
        if (filterState.taskFilters.groups.size > 0) {
          if (!filterState.taskFilters.groups.has(group.id)) return false;
        }

        // 2. Label Filter (Group Level)
        if (filterState.taskFilters.labels.size > 0) {
          // Get the names of the selected labels to match against group.label (which is often a name)
          const selectedLabelNames = labels
            .filter((l) => filterState.taskFilters.labels.has(String(l.id)))
            .map((l) => l.label_name);

          // Also allow matching by ID just in case
          const hasMatch =
            filterState.taskFilters.labels.has(group.label_id || "") ||
            selectedLabelNames.includes(group.label_id || "");

          if (!hasMatch) return false;
        }

        return true;
      })
      .map((group) => {
        // Process tasks for this group
        const filteredTasksForGroup = group.tasks
          .map((task) => {
            // Helper to check if a task (or subtask) matches the active ATTRIBUTE filters
            const matchesAttributeFilters = (item: any) => {
              // Check done items filter
              if (filterState.showDoneItemsOnly) {
                const doneStatus = statuses.find(
                  (s) => s.name.toLowerCase() === "done",
                );
                if (!doneStatus || item.status_id !== String(doneStatus.id)) {
                  return false;
                }
              }

              // Check person filter
              if (filterState.taskFilters.persons.size > 0) {
                const hasMatchingPerson = item.assigned_to_ids?.some(
                  (id: any) => filterState.taskFilters.persons.has(String(id)),
                );
                if (!hasMatchingPerson) return false;
              }

              // Check status filter
              if (filterState.taskFilters.statuses.size > 0) {
                if (!filterState.taskFilters.statuses.has(item.status_id || ""))
                  return false;
              }

              // Check priority filter
              if (filterState.taskFilters.priorities.size > 0) {
                if (
                  !filterState.taskFilters.priorities.has(
                    item.priority_id || "",
                  )
                )
                  return false;
              }

              // Note: Label filter is now at group level so we don't check item.label_id here
              return true;
            };

            // Helper to check if a task (or subtask) matches the SEARCH query
            const matchesSearchQuery = (item: any) => {
              if (!query) return true;

              // Resolve readable names dynamically for better search accuracy
              const statusName = statusNameMap.get(item.status_id || "") || "";
              const priorityName =
                priorityNameMap.get(item.priority_id || "") || "";
              const groupLabelName =
                labelNameMap.get(item.label_id || "") || "";

              const content = [
                item.name,
                statusName,
                priorityName,
                groupLabelName,
                ...(item.assignee_names || []),
                ...(Array.isArray(item.tags)
                  ? item.tags.map((t: any) => t.tag_name)
                  : []),
              ]
                .join(" ")
                .toLowerCase();
              return content.includes(query);
            };

            const isFullMatch = (item: any) =>
              matchesAttributeFilters(item) && matchesSearchQuery(item);

            // 1. Check if the parent task itself matches
            const parentMatches = isFullMatch(task);

            // 2. Filter subitems - find those that match
            const matchingSubitems = (task.subitems || []).filter((sub) =>
              isFullMatch(sub),
            );

            // 3. Determine if we keep the task and if we should expand it
            if (parentMatches || matchingSubitems.length > 0) {
              // If only subitems match, or if any subitem matches while a filter/search is active, expand
              const hasActiveFilters =
                query.length > 0 ||
                filterState.taskFilters.persons.size > 0 ||
                filterState.taskFilters.statuses.size > 0 ||
                filterState.taskFilters.priorities.size > 0 ||
                filterState.showDoneItemsOnly;

              if (hasActiveFilters && matchingSubitems.length > 0) {
                autoExpandedIds.add(task.id);
              }

              return {
                ...task,
                subitems: matchingSubitems,
              };
            }

            return null;
          })
          .filter(Boolean) as Task[];

        return {
          ...group,
          tasks: filteredTasksForGroup,
        };
      })
      .filter((group) => {
        // Determine if any filters are active
        const hasActiveFilters =
          query.length > 0 ||
          filterState.taskFilters.persons.size > 0 ||
          filterState.taskFilters.statuses.size > 0 ||
          filterState.taskFilters.priorities.size > 0 ||
          filterState.taskFilters.labels.size > 0 ||
          filterState.taskFilters.groups.size > 0 ||
          filterState.showDoneItemsOnly;

        // If filtering, only show groups with matching tasks
        if (hasActiveFilters) {
          return group.tasks.length > 0;
        }
        // Default state (no filters): show all groups
        return true;
      });

    return {
      groups: resultGroups,
      autoExpandedTaskIds: autoExpandedIds,
    };
  }, [
    groups,
    mainTableSearchQuery,
    filterState.taskFilters,
    filterState.showDoneItemsOnly,
    statuses,
    labels,
  ]);

  // Compatibility function to return groups (maintains existing usage)
  const getFilteredGroups = () => memoizedFilteredData.groups;

  // Derived expanded tasks map used throughout render (merged user toggles with auto-expanded results)
  const effectiveExpandedTasks = useMemo(() => {
    const additions = Array.from(
      memoizedFilteredData.autoExpandedTaskIds,
    ).reduce((acc: Record<string, boolean>, id) => ((acc[id] = true), acc), {});
    return { ...taskState.expandedTasks, ...additions };
  }, [taskState.expandedTasks, memoizedFilteredData.autoExpandedTaskIds]);

  const saveUpdate = async () => {
    if (!updateText.trim() || !selectedCommentsId || isSaving) {
      return;
    }

    setIsSaving(true);
    try {
      // Process deferred uploads (if any)
      const finalHtml = await attachmentsApi.uploadAndReplace(updateText);

      const payload = {
        content: finalHtml,
        parent_id: replyingTo ? Number(replyingTo.id) : null,
        is_internal: 0,
      };

      const newComment = await tasksApi.createComment(
        selectedCommentsId,
        payload,
      );

      // Update local state
      setComments((prev) => [newComment, ...prev]);

      toast.success(
        replyingTo ? "Reply saved successfully" : "Update saved successfully",
      );

      console.log("Saving update:", payload);

      // Reset the form - clear the editor
      setUpdateText("");
      setUpdateFiles([]);
      setReplyingTo(null);
    } catch (error) {
      console.error("Failed to save update:", error);
      toast.error("Failed to save update");
    } finally {
      setIsSaving(false);
    }
  };

  const saveInlineReply = async (
    parentId: string | number,
    replyText: string,
  ) => {
    if (!replyText.trim() || !selectedCommentsId || isSaving) {
      return;
    }

    setIsSaving(true);
    try {
      // Process deferred uploads (if any)
      const finalHtml = await attachmentsApi.uploadAndReplace(replyText);

      const payload = {
        content: finalHtml,
        parent_id: Number(parentId),
        is_internal: 0,
      };

      const newComment = await tasksApi.createComment(
        selectedCommentsId,
        payload,
      );

      // Update local state
      setComments((prev) => [...prev, newComment]);

      toast.success("Reply Saved Successfully");

      console.log("Saving inline reply:", payload);
    } catch (error) {
      console.error("Failed to save reply:", error);
      toast.error("Failed to Save Reply");
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteComment = async (commentId: string | number) => {
    if (!selectedCommentsId) return;

    // In a real app, you might want to show a confirmation dialog
    try {
      await tasksApi.deleteComment(selectedCommentsId, commentId);
      setComments((prev) =>
        prev.filter((c) => String(c.id) !== String(commentId)),
      );
      toast.success("Comment Deleted Successfully");
    } catch (error) {
      console.error("Failed to delete comment:", error);
      toast.error("Failed to Delete Comment");
    }
  };

  const updateTaskComment = async (
    commentId: string | number,
    content: string,
  ) => {
    if (!selectedCommentsId || isSaving) return;
    setIsSaving(true);
    try {
      // Process deferred uploads (if any)
      const finalHtml = await attachmentsApi.uploadAndReplace(content);

      const updatedComment = await tasksApi.updateComment(
        selectedCommentsId,
        commentId,
        { content: finalHtml }, // Send the HTML content after processing deferred uploads
      );

      // Update local state with the updated comment
      setComments((prev) =>
        prev.map((c) =>
          String(c.id) === String(commentId) ? updatedComment : c,
        ),
      );

      toast.success("Comment Updated Successfully");
    } catch (error) {
      console.error("Failed to update comment:", error);
      toast.error("Failed to Update Comment");
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  // NEW : Start
  // Note: toggleTask is now provided by taskState hook

  const toggleColumnVisibility = (columnId: string) => {
    columnState.toggleColumnVisibility(columnId);
  };

  const handleColumnDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    // Prevent dragging fixed columns or dropping on fixed columns
    const activeColumn = workloadColumns.find((c) => c.id === active.id);
    const overColumn = workloadColumns.find((c) => c.id === over.id);

    if (activeColumn?.fixed || overColumn?.fixed) {
      return;
    }

    const oldIndex = workloadColumns.findIndex((c) => c.id === active.id);
    const newIndex = workloadColumns.findIndex((c) => c.id === over.id);

    const newWorkloadColumns = arrayMove(workloadColumns, oldIndex, newIndex);
    setWorkloadColumns(newWorkloadColumns);

    // Build the columns payload with labels
    const columnsPayload: Record<string, any> = {};
    newWorkloadColumns.forEach((col) => {
      columnsPayload[col.id] = {
        label: col.label,
        visible: !collapsedColumns[col.id],
        position: newWorkloadColumns.indexOf(col) + 1,
      };
    });

    // Update columnOrder state
    const newOrder = newWorkloadColumns.map((c) => c.id);
    setColumnOrder(newOrder);

    // Persist using the new utility
    updateFullColumnConfiguration(
      parseInt(boardId, 10),
      newOrder,
      columnsPayload,
    );
  };

  const toggleCollapseColumn = (columnId: string) => {
    setCollapsedColumns((prev) => {
      const willBeCollapsed = !prev[columnId];
      const updated = { ...prev, [columnId]: willBeCollapsed };

      try {
        localStorage.setItem(
          `board-collapsed-columns-${boardId}`,
          JSON.stringify(updated),
        );
      } catch {}

      // Update columnWidths and prevColumnWidths synchronously so the UI reflects the collapsed width immediately.
      const currentWidth = columnWidths[columnId];
      const updatedColumnWidths = { ...columnWidths };
      const updatedPrevWidths = { ...prevColumnWidths };

      if (willBeCollapsed) {
        // Save current width (if any) so we can restore it when expanded
        if (
          typeof currentWidth !== "undefined" &&
          currentWidth !== COLLAPSED_WIDTH
        ) {
          updatedPrevWidths[columnId] = currentWidth;
        } else if (!currentWidth) {
          // If no explicit saved width, try to read from current workloadColumns fallback width
          const existingCol = workloadColumns.find((c) => c.id === columnId);
          if (
            existingCol &&
            existingCol.width &&
            existingCol.width !== COLLAPSED_WIDTH
          ) {
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
          JSON.stringify(updatedColumnWidths),
        );
      } catch {}

      try {
        localStorage.setItem(
          `board-prev-column-widths-${boardId}`,
          JSON.stringify(updatedPrevWidths),
        );
      } catch {}

      setPrevColumnWidths(updatedPrevWidths);
      setColumnWidths(updatedColumnWidths);

      // Recompute columns with new collapsed state and widths, preserving column order
      const allColumns = getWorkloadColumns({
        expandedTasks: effectiveExpandedTasks,
        toggleTask: taskState.toggleTask,
        onOpenComments: openCommentsPanel,
        onOpenTaskCard: openTaskCard,
        statuses,
        priorities,
        members,
        tags,
        onStatusChange: handleStatusChange,
        onPriorityChange: handlePriorityChange,
        onPersonChange: handlePersonChange,
        onRatingChange: handleRatingChange,
        onEstimatedDateChange: handleEstimatedDateChange,
        onEstimatedTimeChange: handleEstimatedTimeChange,
        onTagChange: handleTagChange,
        openPopoverId: popoverState.openPopoverId,
        setOpenPopoverId: popoverState.setOpenPopoverId,
        boardId: parseInt(boardId, 10),
        onTagCreated: (newTag) => {
          setTags((prevTags) => [...prevTags, newTag]);
        },
        onStatusCreated: handleStatusCreated,
        onPriorityCreated: handlePriorityCreated,
        inlineEditingTaskId: taskState.inlineEditingTaskId,
        setInlineEditingTaskId: taskState.setInlineEditingTaskId,
        inlineEditingTaskName: taskState.inlineEditingTaskName,
        setInlineEditingTaskName: taskState.setInlineEditingTaskName,
        onInlineEditTaskName: handleInlineEditTaskName,
        activeTimerId: timerState.activeTimerId,
        timerStartTime: timerState.timerStartTime,
        onTimerStart: handleTimerStart,
        onTimerConflict: handleTimerConflict,
        onTimeUpdate: (taskId: string, seconds: number) => {
          updateTaskInGroups(taskId, { tracked_time_seconds: seconds });
        },
      });

      // Apply saved column order
      let orderedColumns = allColumns;
      if (columnOrder.length > 0) {
        const columnMap = new Map(allColumns.map((col) => [col.id, col]));
        orderedColumns = columnOrder
          .map((id) => columnMap.get(id))
          .filter(Boolean) as typeof allColumns;
        // Add any new columns that weren't in saved order
        allColumns.forEach((col) => {
          if (!columnOrder.includes(col.id)) {
            orderedColumns.push(col);
          }
        });
      }

      const newCols = orderedColumns
        .map((col) => ({
          ...col,
          collapsed: !!updated[col.id],
          width:
            updatedColumnWidths[col.id] ??
            (updated[col.id] ? COLLAPSED_WIDTH : col.width),
        }))
        .filter((col) => columnState.visibleColumns[col.id] === true);

      setWorkloadColumns(newCols as any);

      return updated;
    });
  };

  const startColumnResize = (columnId: string, e: React.PointerEvent) => {
    // Prevent resizing fixed columns
    const column = workloadColumns.find((c) => c.id === columnId);
    if (column?.fixed) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    const startX = (e as any).clientX as number;

    // Find initial width
    const currentCol = workloadColumns.find((c) => c.id === columnId);
    const startWidthStr =
      columnWidths[columnId] ?? currentCol?.width ?? "150px";
    const startWidth =
      parseInt(String(startWidthStr).replace(/px$/, "")) || 150;

    const onPointerMove = (ev: PointerEvent) => {
      const delta = (ev as PointerEvent).clientX - startX;
      const newWidth = Math.round(startWidth + delta);

      // Check if width is below minimum threshold
      if (newWidth < MIN_COLUMN_WIDTH) {
        // Auto-collapse the column
        setCollapsedColumns((prev) => ({
          ...prev,
          [columnId]: true,
        }));
        try {
          const updated = { ...collapsedColumns, [columnId]: true };
          localStorage.setItem(
            `board-collapsed-columns-${boardId}`,
            JSON.stringify(updated),
          );
        } catch {}
        return;
      }

      // Apply new width immediately and persist
      setColumnWidths((prev) => {
        const updated = { ...prev, [columnId]: `${newWidth}px` };
        try {
          localStorage.setItem(
            `board-column-widths-${boardId}`,
            JSON.stringify(updated),
          );
        } catch {}

        return updated;
      });

      setWorkloadColumns((prevCols) =>
        prevCols.map((col) =>
          col.id === columnId ? { ...col, width: `${newWidth}px` } : col,
        ),
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
  const [collapsedColumns, setCollapsedColumns] = useState<
    Record<string, boolean>
  >(() => {
    try {
      const raw = localStorage.getItem(`board-collapsed-columns-${boardId}`);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const COLLAPSED_WIDTH = "32px";
  const MIN_COLUMN_WIDTH = 80;

  const [columnWidths, setColumnWidths] = useState<Record<string, string>>(
    () => {
      try {
        const raw = localStorage.getItem(`board-column-widths-${boardId}`);
        return raw ? JSON.parse(raw) : {};
      } catch {
        return {};
      }
    },
  );

  // Keep a backup of column widths that were present before collapsing a column so we can restore them on expand
  const [prevColumnWidths, setPrevColumnWidths] = useState<
    Record<string, string>
  >(() => {
    try {
      const raw = localStorage.getItem(`board-prev-column-widths-${boardId}`);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  // Track column order separately to preserve it across updates
  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    try {
      const config = getColumnConfiguration(parseInt(boardId, 10));
      return config?.columnOrder || [];
    } catch {
      return [];
    }
  });

  const [workloadColumns, setWorkloadColumns] = useState(() => {
    const allColumns = getWorkloadColumns({
      expandedTasks: effectiveExpandedTasks,
      toggleTask: taskState.toggleTask,
      onOpenComments: openCommentsPanel,
      onOpenTaskCard: openTaskCard,
      statuses,
      priorities,
      members,
      tags,
      onStatusChange: handleStatusChange,
      onPriorityChange: handlePriorityChange,
      onPersonChange: handlePersonChange,
      onRatingChange: handleRatingChange,
      onEstimatedDateChange: handleEstimatedDateChange,
      onEstimatedTimeChange: handleEstimatedTimeChange,
      onTagChange: handleTagChange,
      openPopoverId: popoverState.openPopoverId,
      setOpenPopoverId: popoverState.setOpenPopoverId,
      boardId: parseInt(boardId, 10),
      onTagCreated: (newTag) => {
        setTags((prevTags) => [...prevTags, newTag]);
      },
      onStatusCreated: handleStatusCreated,
      onStatusesUpdated: handleStatusesUpdated,
      onPriorityCreated: handlePriorityCreated,
      onPrioritiesUpdated: handlePrioritiesUpdated,
      inlineEditingTaskId: taskState.inlineEditingTaskId,
      setInlineEditingTaskId: taskState.setInlineEditingTaskId,
      inlineEditingTaskName: taskState.inlineEditingTaskName,
      setInlineEditingTaskName: taskState.setInlineEditingTaskName,
      onInlineEditTaskName: handleInlineEditTaskName,
      activeTimerId: timerState.activeTimerId,
      timerStartTime: timerState.timerStartTime,
      onTimerStart: handleTimerStart,
      onTimerConflict: handleTimerConflict,
      onTimeUpdate: (taskId: string, seconds: number) => {
        updateTaskInGroups(taskId, { tracked_time_seconds: seconds });
      },
    });

    // Apply saved column order if available
    let orderedColumns = allColumns;
    if (columnOrder.length > 0) {
      const columnMap = new Map(allColumns.map((col) => [col.id, col]));
      orderedColumns = columnOrder
        .map((id) => columnMap.get(id))
        .filter(Boolean) as typeof allColumns;
      // Add any new columns that weren't in saved order
      allColumns.forEach((col) => {
        if (!columnOrder.includes(col.id)) {
          orderedColumns.push(col);
        }
      });
    }

    // Load persisted column labels from localStorage using the new utility
    let savedLabels: Record<string, string> = {};
    try {
      const config = getColumnConfiguration(parseInt(boardId, 10));
      if (config?.columns) {
        Object.entries(config.columns).forEach(([colId, colData]) => {
          if (colData.label) {
            savedLabels[colId] = colData.label;
          }
        });
      }
    } catch (error) {
      console.error("Error loading saved column labels:", error);
    }

    // Apply collapsed state, persisted widths, persisted labels, and filter visibility
    return orderedColumns
      .map((col) => ({
        ...col,
        label: savedLabels[col.id] || col.label, // Apply persisted label
        collapsed: !!collapsedColumns[col.id],
        width:
          columnWidths[col.id] ??
          (collapsedColumns[col.id] ? COLLAPSED_WIDTH : col.width),
      }))
      .filter((col) => columnState.visibleColumns[col.id] === true);
  });

  // Update workloadColumns when CMS data, visibility, or popover state changes
  // Preserve column order by using columnOrder state
  useEffect(() => {
    const allColumns = getWorkloadColumns({
      expandedTasks: effectiveExpandedTasks,
      toggleTask: taskState.toggleTask,
      onOpenComments: openCommentsPanel,
      onOpenTaskCard: openTaskCard,
      statuses,
      priorities,
      members,
      tags,
      onStatusChange: handleStatusChange,
      onPriorityChange: handlePriorityChange,
      onPersonChange: handlePersonChange,
      onRatingChange: handleRatingChange,
      onEstimatedDateChange: handleEstimatedDateChange,
      onEstimatedTimeChange: handleEstimatedTimeChange,
      onTagChange: handleTagChange,
      openPopoverId: popoverState.openPopoverId,
      setOpenPopoverId: popoverState.setOpenPopoverId,
      boardId: parseInt(boardId, 10),
      onTagCreated: (newTag) => {
        setTags((prevTags) => [...prevTags, newTag]);
      },
      onStatusCreated: handleStatusCreated,
      onStatusesUpdated: handleStatusesUpdated,
      onPriorityCreated: handlePriorityCreated,
      onPrioritiesUpdated: handlePrioritiesUpdated,
      inlineEditingTaskId: taskState.inlineEditingTaskId,
      setInlineEditingTaskId: taskState.setInlineEditingTaskId,
      inlineEditingTaskName: taskState.inlineEditingTaskName,
      setInlineEditingTaskName: taskState.setInlineEditingTaskName,
      onInlineEditTaskName: handleInlineEditTaskName,
      activeTimerId: timerState.activeTimerId,
      timerStartTime: timerState.timerStartTime,
      onTimerStart: handleTimerStart,
      onTimerConflict: handleTimerConflict,
      onTimeUpdate: (taskId: string, seconds: number) => {
        updateTaskInGroups(taskId, { tracked_time_seconds: seconds });
      },
    });

    // Apply saved column order
    let orderedColumns = allColumns;
    if (columnOrder.length > 0) {
      const columnMap = new Map(allColumns.map((col) => [col.id, col]));
      orderedColumns = columnOrder
        .map((id) => columnMap.get(id))
        .filter(Boolean) as typeof allColumns;
      // Add any new columns that weren't in saved order
      allColumns.forEach((col) => {
        if (!columnOrder.includes(col.id)) {
          orderedColumns.push(col);
        }
      });
    }

    // Load persisted column labels from localStorage using the new utility
    let savedLabels: Record<string, string> = {};
    try {
      const config = getColumnConfiguration(parseInt(boardId, 10));
      if (config?.columns) {
        Object.entries(config.columns).forEach(([colId, colData]) => {
          if (colData.label) {
            savedLabels[colId] = colData.label;
          }
        });
      }
    } catch (error) {
      console.error("Error loading saved column labels:", error);
    }

    // Apply collapsed state, persisted labels, and filter columns based on visibility and saved widths
    setWorkloadColumns(
      orderedColumns
        .map((col) => ({
          ...col,
          label: savedLabels[col.id] || col.label, // Apply persisted label
          collapsed: !!collapsedColumns[col.id],
          width:
            columnWidths[col.id] ??
            (collapsedColumns[col.id] ? COLLAPSED_WIDTH : col.width),
        }))
        .filter((col) => columnState.visibleColumns[col.id] === true),
    );
  }, [
    groups,
    statuses,
    priorities,
    members,
    tags,
    popoverState.openPopoverId,
    columnState.visibleColumns,
    collapsedColumns,
    columnWidths,
    columnOrder,
    taskState.inlineEditingTaskId,
    taskState.inlineEditingTaskName,
    timerState.activeTimerId,
  ]);

  // Track unsaved changes for layout
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [initialGroupOrder, setInitialGroupOrder] = useState<string[]>([]);
  const [initialColumnOrder, setInitialColumnOrder] = useState<string[]>([]);

  // Initialize the original order when groups and columns are loaded
  useEffect(() => {
    setInitialGroupOrder(groups.map((g) => g.id));
    setInitialColumnOrder(workloadColumns.map((c) => c.id));
  }, []);

  // Check if there are unsaved changes
  useEffect(() => {
    const currentGroupOrder = groups.map((g) => g.id);
    const currentColumnOrder = workloadColumns.map((c) => c.id);

    const groupsChanged =
      JSON.stringify(currentGroupOrder) !== JSON.stringify(initialGroupOrder);
    const columnsChanged =
      JSON.stringify(currentColumnOrder) !== JSON.stringify(initialColumnOrder);

    setHasUnsavedChanges(groupsChanged || columnsChanged);
  }, [groups, workloadColumns, initialGroupOrder, initialColumnOrder]);

  // Synchronized horizontal scrolling for all group tables
  const tableScrollRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const isSyncingScroll = useRef(false);
  const [maxScrollWidth, setMaxScrollWidth] = useState(0);
  const groupsContainerRef = useRef<HTMLDivElement | null>(null);
  const [stickyGroupId, setStickyGroupId] = useState<string | null>(null);

  const handleTableScroll = (groupId: string, scrollLeft: number) => {
    if (isSyncingScroll.current) return;

    // Scroll all other tables to the same position (proportional mapping)
    Object.entries(tableScrollRefs.current).forEach(([id, ref]) => {
      if (ref && id !== groupId) {
        const srcRef = tableScrollRefs.current[groupId];
        if (srcRef) {
          const srcMax = Math.max(0, srcRef.scrollWidth - srcRef.clientWidth);
          const dstMax = Math.max(0, ref.scrollWidth - ref.clientWidth);
          const mapped = srcMax > 0 ? (scrollLeft / srcMax) * dstMax : 0;
          ref.scrollLeft = mapped;
        } else {
          ref.scrollLeft = scrollLeft;
        }
      }
    });

    // Update the unified scrollbar position proportionally
    const unifiedScrollbar = document.querySelector(
      "[data-unified-scrollbar]",
    ) as HTMLDivElement;
    if (unifiedScrollbar) {
      const srcRef = tableScrollRefs.current[groupId];
      const srcMax = srcRef
        ? Math.max(0, srcRef.scrollWidth - srcRef.clientWidth)
        : 0;
      const unifiedMax = Math.max(
        0,
        unifiedScrollbar.scrollWidth - unifiedScrollbar.clientWidth,
      );

      const mapped =
        srcMax > 0 && unifiedMax > 0
          ? (scrollLeft / srcMax) * unifiedMax
          : scrollLeft;

      // Guard against re-entrant scroll events
      isSyncingScroll.current = true;
      unifiedScrollbar.scrollLeft = mapped;
      // Allow other scrolls on next frame
      window.requestAnimationFrame(() => {
        isSyncingScroll.current = false;
      });
    }
  };

  // Calculate max scroll width from tables
  useEffect(() => {
    if (Object.keys(tableScrollRefs.current).length > 0) {
      // Get the maximum scrollWidth from all tables
      let maxWidth = 0;
      Object.values(tableScrollRefs.current).forEach((ref) => {
        if (ref && ref.scrollWidth > maxWidth) {
          maxWidth = ref.scrollWidth;
        }
      });
      setMaxScrollWidth(maxWidth);
    }
  }, [workloadColumns, groups]);

  // Handle scroll event to detect sticky group header
  useEffect(() => {
    const container = groupsContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      // Find which group header is currently at the top (sticky)
      const groupHeaders = container.querySelectorAll("[data-group-header]");
      let currentStickyGroupId: string | null = null;

      groupHeaders.forEach((header) => {
        const rect = header.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();

        // Check if header is at the top of the container (sticky position)
        if (
          rect.top <= containerRect.top + 1 &&
          rect.bottom > containerRect.top
        ) {
          currentStickyGroupId = header.getAttribute("data-group-id");
        }
      });

      setStickyGroupId(currentStickyGroupId);
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  const handleOpenProfile = () => {
    setProfileDialogOpen(true);
  };

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">
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

        /* Hide scrollbar but keep scrolling intact */
        .scrollbar-hide {
          -ms-overflow-style: none; /* IE and Edge */
          scrollbar-width: none; /* Firefox */
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none; /* Chrome, Safari and Opera */
        }
      `}</style>

      {/* Top Header - FIXED, does not scroll */}
      <div className="border-b border-border px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {/* {editingBoardName ? (
              <Input
                autoFocus
                value={boardNameValue}
                onChange={(e) => setBoardNameValue(e.target.value)}
                onBlur={handleBoardNameBlur}
                onKeyDown={handleBoardNameKeyDown}
                className="text-2xl font-semibold h-10 px-2"
              />
            ) : ( */}
            <h1
              className="text-2xl font-semibold text-foreground cursor-text"
              // onDoubleClick={handleBoardNameDoubleClick}
            >
              {boardNameValue}
            </h1>
            {/* )} */}
          </div>

          <div className="flex items-center gap-3">
            {/* Board Members Display */}
            <button onClick={handleOpenProfile}>
              <Avatar className="w-8 h-8 border-2 border-background">
                <AvatarFallback className="bg-blue-500">
                  <span className="text-white text-xs font-semibold">
                    {userInitials}
                  </span>
                </AvatarFallback>
              </Avatar>
            </button>

            {/* Dashboard Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/board/${boardId}/dashboard`)}
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
              items={columnState.viewTabs}
              strategy={horizontalListSortingStrategy}
            >
              {columnState.viewTabs.map((tab: any) => (
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

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Global Toolbar for all views */}
        <div className="border-b border-border px-6 py-4 flex items-center gap-3 flex-wrap flex-shrink-0">
          {activeTab === "Main Table" && (
            <Button
              variant="default"
              size="sm"
              onClick={addNewGroup}
              disabled={isLoadingGroups}
            >
              New Group
            </Button>
          )}
          {/* 
          <Button
            variant="outline"
            size="sm"
            onClick={handleGetS3Link}
            className="border-dashed"
          >
            Get S3 Link (Temp)
          </Button> */}
          {/* Search and Filters */}
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

            {/* Done Items Checkbox */}
            <label className="flex items-center gap-2 cursor-pointer px-3 py-2 rounded hover:bg-hover transition-colors">
              <input
                type="checkbox"
                checked={filterState.showDoneItemsOnly}
                onChange={(e) =>
                  filterState.setShowDoneItemsOnly(e.target.checked)
                }
                className="cursor-pointer"
              />
              <span className="text-sm font-medium">Done Items</span>
            </label>

            {/* Show/Hide Filter Popover */}
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex items-center px-3 gap-2 text-sm font-medium text-foreground cursor-pointer">
                  <Eye className="h-4 w-4" />
                  Only Show
                </button>
              </PopoverTrigger>

              <PopoverContent
                align="start"
                className="w-64 max-h-96 p-0 bg-card border-2 border-primary/20 flex flex-col"
              >
                <div className="space-y-1 overflow-y-auto flex-1 p-2 scrollbar-hide">
                  {/* Person Filter Dropdown */}
                  <div className="border border-primary/30 rounded-md bg-background">
                    <button
                      onClick={() =>
                        filterState.toggleFilterDropdown("persons")
                      }
                      className="w-full flex items-center justify-between px-3 py-2 hover:bg-primary/5 transition-colors"
                    >
                      <span className="text-sm font-medium">Person</span>
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${
                          filterState.openFilterDropdowns.persons
                            ? "rotate-180"
                            : ""
                        }`}
                      />
                    </button>
                    {filterState.openFilterDropdowns.persons && (
                      <div className="border-t border-primary/20 bg-primary/5 p-2 space-y-1">
                        {members.map((member) => (
                          <label
                            key={member.user_id}
                            className="flex items-center gap-2 cursor-pointer px-2 py-1 rounded hover:bg-primary/10 text-sm transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={filterState.taskFilters.persons.has(
                                String(member.user_id),
                              )}
                              onChange={(e) => {
                                const newPersons = new Set(
                                  filterState.taskFilters.persons,
                                );
                                if (e.target.checked) {
                                  newPersons.add(String(member.user_id));
                                } else {
                                  newPersons.delete(String(member.user_id));
                                }
                                filterState.setTaskFilters({
                                  ...filterState.taskFilters,
                                  persons: newPersons,
                                });
                              }}
                              className="cursor-pointer"
                            />
                            <span className="flex-1 min-w-0 truncate">
                              {member.name}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Status Filter Dropdown */}
                  <div className="border border-primary/30 rounded-md bg-background">
                    <button
                      onClick={() =>
                        filterState.toggleFilterDropdown("statuses")
                      }
                      className="w-full flex items-center justify-between px-3 py-2 hover:bg-primary/5 transition-colors"
                    >
                      <span className="text-sm font-medium">Status</span>
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${
                          filterState.openFilterDropdowns.statuses
                            ? "rotate-180"
                            : ""
                        }`}
                      />
                    </button>
                    {filterState.openFilterDropdowns.statuses && (
                      <div className="border-t border-primary/20 bg-primary/5 p-2 space-y-1">
                        {statuses.map((status) => (
                          <label
                            key={status.id}
                            className="flex items-center gap-2 cursor-pointer px-2 py-1 rounded hover:bg-primary/10 text-sm transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={filterState.taskFilters.statuses.has(
                                String(status.id),
                              )}
                              onChange={(e) => {
                                const newStatuses = new Set(
                                  filterState.taskFilters.statuses,
                                );
                                if (e.target.checked) {
                                  newStatuses.add(String(status.id));
                                } else {
                                  newStatuses.delete(String(status.id));
                                }
                                filterState.setTaskFilters({
                                  ...filterState.taskFilters,
                                  statuses: newStatuses,
                                });
                              }}
                              className="cursor-pointer"
                            />
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{
                                  backgroundColor: status.color_code,
                                }}
                              />
                              <span>{status.name}</span>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Priority Filter Dropdown */}
                  <div className="border border-primary/30 rounded-md bg-background">
                    <button
                      onClick={() =>
                        filterState.toggleFilterDropdown("priorities")
                      }
                      className="w-full flex items-center justify-between px-3 py-2 hover:bg-primary/5 transition-colors"
                    >
                      <span className="text-sm font-medium">Priority</span>
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${
                          filterState.openFilterDropdowns.priorities
                            ? "rotate-180"
                            : ""
                        }`}
                      />
                    </button>
                    {filterState.openFilterDropdowns.priorities && (
                      <div className="border-t border-primary/20 bg-primary/5 p-2 space-y-1">
                        {priorities.map((priority) => (
                          <label
                            key={priority.id}
                            className="flex items-center gap-2 cursor-pointer px-2 py-1 rounded hover:bg-primary/10 text-sm transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={filterState.taskFilters.priorities.has(
                                String(priority.id),
                              )}
                              onChange={(e) => {
                                const newPriorities = new Set(
                                  filterState.taskFilters.priorities,
                                );
                                if (e.target.checked) {
                                  newPriorities.add(String(priority.id));
                                } else {
                                  newPriorities.delete(String(priority.id));
                                }
                                filterState.setTaskFilters({
                                  ...filterState.taskFilters,
                                  priorities: newPriorities,
                                });
                              }}
                              className="cursor-pointer"
                            />
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{
                                  backgroundColor: priority.color_code,
                                }}
                              />
                              <span>{priority.name}</span>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Label Filter Dropdown */}
                  <div className="border border-primary/30 rounded-md bg-background">
                    <button
                      onClick={() => filterState.toggleFilterDropdown("labels")}
                      className="w-full flex items-center justify-between px-3 py-2 hover:bg-primary/5 transition-colors"
                    >
                      <span className="text-sm font-medium">Label</span>
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${
                          filterState.openFilterDropdowns.labels
                            ? "rotate-180"
                            : ""
                        }`}
                      />
                    </button>
                    {filterState.openFilterDropdowns.labels && (
                      <div className="border-t border-primary/20 bg-primary/5 p-2 space-y-1">
                        {labels.map((label) => (
                          <label
                            key={label.id}
                            className="flex items-center gap-2 cursor-pointer px-2 py-1 rounded hover:bg-primary/10 text-sm transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={filterState.taskFilters.labels.has(
                                String(label.id),
                              )}
                              onChange={(e) => {
                                const newLabels = new Set(
                                  filterState.taskFilters.labels,
                                );
                                if (e.target.checked) {
                                  newLabels.add(String(label.id));
                                } else {
                                  newLabels.delete(String(label.id));
                                }
                                filterState.setTaskFilters({
                                  ...filterState.taskFilters,
                                  labels: newLabels,
                                });
                              }}
                              className="cursor-pointer"
                            />
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{
                                  backgroundColor: label.label_color,
                                }}
                              />
                              <span>{label.label_name}</span>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Group Filter Dropdown */}
                  <div className="border border-primary/30 rounded-md bg-background">
                    <button
                      onClick={() => filterState.toggleFilterDropdown("groups")}
                      className="w-full flex items-center justify-between px-3 py-2 hover:bg-primary/5 transition-colors"
                    >
                      <span className="text-sm font-medium">Group</span>
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${
                          filterState.openFilterDropdowns.groups
                            ? "rotate-180"
                            : ""
                        }`}
                      />
                    </button>
                    {filterState.openFilterDropdowns.groups && (
                      <div className="border-t border-primary/20 bg-primary/5 p-2 space-y-1">
                        {groups.map((group) => (
                          <label
                            key={group.id}
                            className="flex items-center gap-2 cursor-pointer px-2 py-1 rounded hover:bg-primary/10 text-sm transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={filterState.taskFilters.groups.has(
                                group.id,
                              )}
                              onChange={(e) => {
                                const newGroups = new Set(
                                  filterState.taskFilters.groups,
                                );
                                if (e.target.checked) {
                                  newGroups.add(group.id);
                                } else {
                                  newGroups.delete(group.id);
                                }
                                filterState.setTaskFilters({
                                  ...filterState.taskFilters,
                                  groups: newGroups,
                                });
                              }}
                              className="cursor-pointer"
                            />
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: group.color }}
                              />
                              <span>{group.name}</span>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Clear Filters Button - Fixed at bottom */}
                {(filterState.taskFilters.persons.size > 0 ||
                  filterState.taskFilters.statuses.size > 0 ||
                  filterState.taskFilters.priorities.size > 0 ||
                  filterState.taskFilters.labels.size > 0 ||
                  filterState.taskFilters.groups.size > 0) && (
                  <div className="border-t border-primary/20 bg-primary/5 p-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        filterState.clearFilters();
                      }}
                    >
                      Clear All Filters
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>

            {/* Save Button */}
            {activeTab === "Main Table" && (
              <button
                disabled={!hasUnsavedChanges}
                className="flex items-center px-3 gap-2 text-sm font-medium text-foreground cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={async () => {
                  try {
                    // Build the columns payload with labels and positions
                    const columnsPayload: Record<string, any> = {};
                    workloadColumns.forEach((col) => {
                      columnsPayload[col.id] = {
                        label: col.label,
                        visible: !collapsedColumns[col.id],
                        position: workloadColumns.indexOf(col) + 1,
                      };
                    });

                    // Build the group order payload
                    const groupOrder: Record<string, string> = {};
                    groups.forEach((group, index) => {
                      groupOrder[String(index + 1)] = group.id;
                    });

                    // Build the column order payload
                    const columnOrder: Record<string, string> = {};
                    workloadColumns.forEach((col, index) => {
                      columnOrder[String(index + 1)] = col.id;
                    });

                    // Build the full payload
                    const payload = {
                      user_id: getCurrentUserId(),
                      organization_id: getOrganizationId(),
                      board_id: parseInt(boardId, 10),
                      group_order: groupOrder,
                      column_order: columnOrder,
                      columns: columnsPayload,
                    };

                    debugLog("Save View payload:", payload);

                    // Call the API to save the layout
                    const response = await cmsApi.saveUserGroupColumns(payload);

                    // Update localStorage with the response to ensure sync
                    if (response.columns) {
                      const newOrder = workloadColumns.map((c) => c.id);
                      updateFullColumnConfiguration(
                        parseInt(boardId, 10),
                        newOrder,
                        response.columns,
                      );
                    }

                    // Update initial order to mark changes as saved
                    setInitialGroupOrder(groups.map((g) => g.id));
                    setInitialColumnOrder(workloadColumns.map((c) => c.id));
                    setHasUnsavedChanges(false);

                    toast.success("Layout Saved Successfully");
                  } catch (error) {
                    console.error("Failed to save layout:", error);
                    toast.error("Failed to Save Layout");
                  }
                }}
              >
                <Save className="h-4 w-4" />
                Save View
              </button>
            )}

            {/* Show/Hide Columns Popover */}
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex items-center px-3 gap-2 text-sm font-medium text-foreground cursor-pointer">
                  <Eye className="h-4 w-4" />
                  Show/Hide
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-3" align="end">
                {/* Header with Select All checkbox */}
                <div className="px-2 py-1.5 flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      // Check whether all non-required columns are visible (item is always required)
                      checked={ALL_AVAILABLE_COLUMNS.filter(
                        (c) => c !== "item",
                      ).every((c) => columnState.visibleColumns[c] !== false)}
                      onChange={() => {
                        const others = ALL_AVAILABLE_COLUMNS.filter(
                          (c) => c !== "item",
                        );
                        const allOthersOn = others.every(
                          (c) => columnState.visibleColumns[c] !== false,
                        );
                        // Toggle only the non-required columns; always keep 'item' visible
                        const next = Object.fromEntries(
                          others.map((c) => [c, !allOthersOn]),
                        );
                        next["item"] = true;
                        columnState.setVisibleColumns((prev) => ({
                          ...prev,
                          ...next,
                        }));
                        setHasUnsavedChanges(true);
                      }}
                      className="cursor-pointer"
                    />
                    <span className="text-sm font-medium">All Columns</span>
                  </label>
                  <div className="text-sm text-muted-foreground">
                    {
                      ALL_AVAILABLE_COLUMNS.filter(
                        (c) => columnState.visibleColumns[c] === true,
                      ).length
                    }
                    /{ALL_AVAILABLE_COLUMNS.length}
                  </div>
                </div>
                <div className="border-t border-border my-2" />

                <div className=" space-y-1">
                  {ALL_AVAILABLE_COLUMNS.map((columnId) => {
                    const columnLabel = getColumnLabel(
                      parseInt(boardId, 10),
                      columnId,
                      COLUMN_DEFAULT_LABELS[columnId] || columnId,
                    );

                    return columnId === "item" ? (
                      <label
                        key={columnId}
                        className="flex items-center gap-2 cursor-default px-2 py-1 rounded"
                      >
                        <input
                          type="checkbox"
                          checked={true}
                          disabled
                          title="Item column is required"
                          className="cursor-not-allowed opacity-50"
                        />
                        <span className="text-sm font-medium capitalize">
                          {columnLabel}
                        </span>
                      </label>
                    ) : (
                      <label
                        key={columnId}
                        className="flex items-center gap-2 cursor-pointer px-2 py-1 rounded hover:bg-hover"
                      >
                        <input
                          type="checkbox"
                          checked={
                            columnState.visibleColumns[columnId] === true
                          }
                          onChange={() => {
                            toggleColumnVisibility(columnId);
                            setHasUnsavedChanges(true);
                          }}
                          className="cursor-pointer"
                        />
                        <span className="text-sm capitalize">
                          {columnLabel}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Main Table View */}
        {activeTab === "Main Table" && isViewLive.mainTable && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Task Groups Container - ONLY scrollable element */}
            <div
              className="flex-1 overflow-y-auto overflow-x-hidden px-6"
              ref={groupsContainerRef}
            >
              <DndContext
                sensors={groupSensors}
                collisionDetection={closestCenter}
                onDragEnd={handleGroupDragEnd}
              >
                <SortableContext
                  items={getFilteredGroups().map((g) => g.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-6 py-4">
                    {isLoadingGroups ? (
                      <div className="text-center py-12">
                        <p className="text-muted-foreground">
                          Loading groups...
                        </p>
                      </div>
                    ) : getFilteredGroups().length === 0 ? (
                      <div className="text-center py-12">
                        {mainTableSearchQuery.trim() ? (
                          <>
                            <p className="text-muted-foreground mb-4">
                              No items found matching "{mainTableSearchQuery}"
                            </p>
                          </>
                        ) : groups.length === 0 ? (
                          <>
                            <p className="text-muted-foreground mb-4">
                              No groups yet. Create one to get started.
                            </p>
                            {/* <Button
                            variant="default"
                            size="sm"
                            onClick={addNewGroup}
                          >
                            Create First Group
                          </Button> */}
                          </>
                        ) : (
                          <>
                            <p className="text-muted-foreground mb-4">
                              No items match your filters
                            </p>
                          </>
                        )}
                      </div>
                    ) : (
                      getFilteredGroups().map((group) => (
                        <SortableGroupCard key={group.id} group={group}>
                          {(dragListeners, dragAttributes) => (
                            <div
                              className="bg-card border border-border flex-1 border-l-4"
                              style={{
                                borderLeftColor: group.color || "#3b82f6",
                              }}
                              {...dragAttributes}
                              {...dragListeners}
                            >
                              {/* Group Header */}

                              <div
                                className={`group/header w-full flex items-center gap-2 px-4 py-3 hover:bg-hover transition-colors cursor-grab active:cursor-grabbing sticky top-0 z-30 bg-muted border-b border-border ${stickyGroupId === group.id ? "shadow-md" : ""}`}
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
                                {groupLabels[group.id] &&
                                  (() => {
                                    // Find the label object to get its color
                                    const labelObj = labels.find(
                                      (l) =>
                                        l.label_name === groupLabels[group.id],
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
                                {/* edit group button */}
                                <div className="flex items-center gap-1 opacity-70 hover:opacity-100 transition-opacity">
                                  <Popover
                                    open={
                                      editGroupDialogOpen &&
                                      editingGroupId === group.id
                                    }
                                    onOpenChange={(open) => {
                                      if (open) {
                                        editGroup(group.id);
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
                                        onClick={() => editGroup(group.id)}
                                        className="h-8 w-8 p-0 shrink-0 hover:bg-hover"
                                      >
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent
                                      className="w-80 p-4"
                                      align="start"
                                    >
                                      <div className="space-y-4">
                                        <div>
                                          <h3 className="font-semibold text-sm mb-3">
                                            Edit Group
                                          </h3>
                                        </div>

                                        {/* Group Name Input and Color Picker */}
                                        <div className="space-y-2">
                                          <label
                                            htmlFor="edit-group-name"
                                            className="text-sm font-medium"
                                          >
                                            Group Name
                                          </label>
                                          <div className="flex gap-2 items-end">
                                            <Input
                                              id="edit-group-name"
                                              placeholder="Enter group name..."
                                              value={editGroupNameInput}
                                              onChange={(e) =>
                                                setEditGroupNameInput(
                                                  e.target.value,
                                                )
                                              }
                                              onKeyDown={(e) => {
                                                if (e.key === "Enter") {
                                                  handleUpdateGroup();
                                                }
                                              }}
                                              autoFocus
                                              className="flex-1"
                                            />
                                            <ColorPickerPopover
                                              color={editGroupColorInput}
                                              onColorChange={
                                                setEditGroupColorInput
                                              }
                                              isOpen={editGroupColorPickerOpen}
                                              onOpenChange={
                                                setEditGroupColorPickerOpen
                                              }
                                              size="w-10 h-10"
                                              disableHexInput={true}
                                            />
                                          </div>
                                        </div>

                                        {/* Labels Selector */}
                                        <div className="space-y-3">
                                          <div className="flex items-center justify-between">
                                            <label className="text-sm font-medium">
                                              Labels
                                            </label>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-6 w-6 p-0"
                                              onClick={() =>
                                                setEditLabelsDialogOpen(true)
                                              }
                                            >
                                              <Pencil className="h-3.5 w-3.5" />
                                            </Button>
                                          </div>

                                          {/* Display all available labels as clickable chips */}
                                          {Array.isArray(labels) &&
                                            labels.length > 0 && (
                                              <div className="flex flex-wrap gap-2">
                                                {labels.map((label) => (
                                                  <button
                                                    key={`label-${label.id}`}
                                                    onClick={() => {
                                                      setEditGroupLabelInput(
                                                        label.label_name,
                                                      );
                                                      setEditGroupLabelColorInput(
                                                        label.label_color,
                                                      );
                                                    }}
                                                    className={`px-3 py-1 rounded-full text-xs font-medium text-white hover:opacity-80 transition-opacity ${
                                                      editGroupLabelInput ===
                                                      label.label_name
                                                        ? "ring-2 ring-offset-1 ring-foreground"
                                                        : ""
                                                    }`}
                                                    style={{
                                                      backgroundColor:
                                                        label.label_color,
                                                    }}
                                                  >
                                                    {label.label_name}
                                                  </button>
                                                ))}
                                              </div>
                                            )}

                                          {(!Array.isArray(labels) ||
                                            labels.length === 0) && (
                                            <p className="text-xs text-muted-foreground">
                                              No labels available
                                            </p>
                                          )}
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="flex gap-2 justify-end pt-2">
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                              setEditGroupDialogOpen(false);
                                              setEditingGroupId(null);
                                              setEditGroupNameInput("");
                                              setEditGroupColorInput("#3b82f6");
                                              setEditGroupLabelInput("");
                                              setEditGroupLabelColorInput(
                                                "#3b82f6",
                                              );
                                            }}
                                          >
                                            Cancel
                                          </Button>
                                          <Button
                                            size="sm"
                                            onClick={() => {
                                              handleUpdateGroup();
                                              setEditGroupDialogOpen(false);
                                            }}
                                          >
                                            Update
                                          </Button>
                                        </div>
                                      </div>
                                    </PopoverContent>
                                  </Popover>
                                </div>

                                {/* Group Progress Bar - Time Spent vs Estimated Time */}
                                {(() => {
                                  const progress = calculateGroupProgress(
                                    group.tasks,
                                  );
                                  return (
                                    <div className="flex items-center gap-3 flex-1 ml-4">
                                      <div className="flex-1 max-w-[250px]">
                                        <Progress
                                          value={progress.percentage}
                                          className="h-2"
                                        />
                                      </div>
                                      <span className="text-xs font-medium text-foreground whitespace-nowrap min-w-fit">
                                        {formatSecondsToTime(
                                          progress.timeSpentSeconds,
                                        )}{" "}
                                        /{" "}
                                        {progress.estimatedTimeSeconds > 0
                                          ? formatSecondsToTime(
                                              progress.estimatedTimeSeconds,
                                            )
                                          : "—"}
                                      </span>
                                    </div>
                                  );
                                })()}
                              </div>

                              {/* Task Table */}
                              {expandedGroups[group.id] && (
                                <div
                                  className="overflow-x-auto w-full scrollbar-hide"
                                  ref={(el) => {
                                    if (el)
                                      tableScrollRefs.current[group.id] = el;
                                  }}
                                  onScroll={(e) => {
                                    const target =
                                      e.currentTarget as HTMLDivElement;
                                    handleTableScroll(
                                      group.id,
                                      target.scrollLeft,
                                    );
                                  }}
                                >
                                  <table
                                    className="w-full"
                                    style={{ tableLayout: "fixed" }}
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
                                        <thead className="border-b border-border bg-muted/30   top-0 z-30">
                                          <tr className="text-sm text-muted-foreground">
                                            <th className="p-4 w-12 border-r border-border text-center sticky left-0 z-10 bg-card">
                                              <input
                                                type="checkbox"
                                                checked={
                                                  group.tasks.length > 0 &&
                                                  group.tasks.every(
                                                    (task) =>
                                                      taskState.checkedTasks[
                                                        task.id
                                                      ] || false,
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
                                                          },
                                                        );
                                                      }
                                                    },
                                                  );
                                                  taskState.setCheckedTasks(
                                                    (prev) => ({
                                                      ...prev,
                                                      ...updatedChecked,
                                                    }),
                                                  );
                                                }}
                                              />
                                            </th>

                                            {workloadColumns.map((col) => (
                                              <SortableColumnHeader
                                                key={col.id}
                                                column={col}
                                                onToggleCollapse={() =>
                                                  toggleCollapseColumn(col.id)
                                                }
                                                onStartResize={
                                                  startColumnResize
                                                }
                                                onColumnLabelChange={
                                                  handleColumnLabelChange
                                                }
                                                onSort={(
                                                  columnId: string,
                                                  direction: "asc" | "desc",
                                                ) =>
                                                  handleSortGroupItems(
                                                    group.id,
                                                    columnId,
                                                    direction,
                                                  )
                                                }
                                              />
                                            ))}
                                            {/* Filler column to absorb extra space and prevent stretching */}
                                            <th
                                              className="p-0 border-none"
                                              style={{ width: "auto" }}
                                            />
                                          </tr>
                                        </thead>
                                      </SortableContext>
                                    </DndContext>

                                    {/* Table Body */}
                                    <tbody>
                                      {group.tasks.map((task) => {
                                        const taskWithProps = {
                                          ...task,
                                          boardId: boardId,
                                          activeTimerId:
                                            timerState.activeTimerId,
                                          onTimerStart: handleTimerStart,
                                          onTimerConflict: handleTimerConflict,
                                        };
                                        return (
                                          <React.Fragment key={task.id}>
                                            {/* ================= TASK ROW ================= */}
                                            <tr
                                              className="border-t border-b border-border hover:bg-primary/5 focus-within:bg-primary/10 focus-within:ring-2 focus-within:ring-primary/20 cursor-pointer transition-colors"
                                              onClick={() => {
                                                openTaskCard(task);
                                              }}
                                            >
                                              <td
                                                className="p-4 text-center border-r border-border sticky left-0 z-10 bg-card"
                                                onClick={(e) =>
                                                  e.stopPropagation()
                                                }
                                              >
                                                <input
                                                  type="checkbox"
                                                  checked={
                                                    taskState.checkedTasks[
                                                      task.id
                                                    ] || false
                                                  }
                                                  onChange={(e) =>
                                                    handleTaskCheckChange(
                                                      task.id,
                                                      e.target.checked,
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
                                                      "text-left",
                                                    col.id === "item" &&
                                                      "sticky left-12 z-10 bg-card",
                                                  )}
                                                  style={{
                                                    width: col.width,
                                                    minWidth:
                                                      col.minWidth || col.width,
                                                    maxWidth:
                                                      col.maxWidth || col.width,
                                                  }}
                                                  onClick={(e) =>
                                                    e.stopPropagation()
                                                  }
                                                >
                                                  {col.collapsed ? (
                                                    <div className="flex items-center justify-center">
                                                      <button
                                                        className="h-6 w-6 rounded-sm   flex items-center justify-center"
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          toggleCollapseColumn(
                                                            col.id,
                                                          );
                                                        }}
                                                        aria-label={`Expand ${col.label}`}
                                                        title={`Expand ${col.label}`}
                                                      >
                                                        <MoreHorizontal className="h-3 w-3" />
                                                      </button>
                                                    </div>
                                                  ) : (
                                                    col.render(taskWithProps)
                                                  )}
                                                </td>
                                              ))}
                                              {/* Filler column to absorb extra space and prevent stretching */}
                                              <td
                                                className="p-0 border-none"
                                                style={{ width: "auto" }}
                                              />
                                            </tr>

                                            {/* ================= SUBITEM ROWS ================= */}
                                            {effectiveExpandedTasks[task.id] &&
                                              task.subitems?.map((subtask) => {
                                                const subtaskWithProps = {
                                                  ...subtask,
                                                  boardId: boardId,
                                                  activeTimerId:
                                                    timerState.activeTimerId,
                                                  onTimerStart:
                                                    handleTimerStart,
                                                  onTimerConflict:
                                                    handleTimerConflict,
                                                };
                                                return (
                                                  <tr
                                                    key={subtask.id}
                                                    className="hover:bg-primary/5 focus-within:bg-primary/10 focus-within:ring-2 focus-within:ring-primary/20 border-b border-border transition-colors"
                                                  >
                                                    <td
                                                      className="p-4 text-center border-r border-border sticky left-0 z-10 bg-card"
                                                      onClick={(e) =>
                                                        e.stopPropagation()
                                                      }
                                                    >
                                                      <input
                                                        type="checkbox"
                                                        checked={
                                                          taskState
                                                            .checkedTasks[
                                                            subtask.id
                                                          ] || false
                                                        }
                                                        onChange={(e) =>
                                                          handleTaskCheckChange(
                                                            subtask.id,
                                                            e.target.checked,
                                                          )
                                                        }
                                                      />
                                                    </td>

                                                    {workloadColumns.map(
                                                      (col) => (
                                                        <td
                                                          key={col.id}
                                                          className={cn(
                                                            "p-4 border-r border-border last:border-r-0",
                                                            col.align ===
                                                              "center" &&
                                                              "text-center",
                                                            col.align ===
                                                              "left" &&
                                                              "text-left",
                                                            col.id === "item" &&
                                                              "sticky left-12 z-10 bg-card",
                                                          )}
                                                          onClick={(e) =>
                                                            e.stopPropagation()
                                                          }
                                                        >
                                                          {col.collapsed ? (
                                                            <div className="flex items-center justify-center">
                                                              <button
                                                                className="h-6 w-6 rounded-sm border border-border flex items-center justify-center"
                                                                onClick={(
                                                                  e,
                                                                ) => {
                                                                  e.stopPropagation();
                                                                  toggleCollapseColumn(
                                                                    col.id,
                                                                  );
                                                                }}
                                                                aria-label={`Expand ${col.label}`}
                                                                title={`Expand ${col.label}`}
                                                              >
                                                                <ChevronRight className="h-3 w-3" />
                                                              </button>
                                                            </div>
                                                          ) : (
                                                            col.render(
                                                              subtaskWithProps,
                                                              true,
                                                            )
                                                          )}
                                                        </td>
                                                      ),
                                                    )}
                                                    {/* Filler column to absorb extra space and prevent stretching */}
                                                    <td
                                                      className="p-0 border-none"
                                                      style={{ width: "auto" }}
                                                    />
                                                  </tr>
                                                );
                                              })}

                                            {/* ================= ADD SUBITEM ================= */}
                                            {effectiveExpandedTasks[
                                              task.id
                                            ] && (
                                              <tr>
                                                <td className="p-4 text-center border-r border-border sticky left-0 z-10 bg-card">
                                                  {/* Empty Cell */}
                                                </td>
                                                <td
                                                  colSpan={2}
                                                  className="p-4 border-t border-border sticky left-12 z-10 bg-card"
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
                                                            e.target.value,
                                                          )
                                                        }
                                                        onKeyDown={(e) => {
                                                          if (
                                                            (e.key ===
                                                              "Enter" ||
                                                              e.key ===
                                                                "Tab") &&
                                                            newSubitemName.trim()
                                                          ) {
                                                            addSubitem(
                                                              group.id,
                                                              task.id,
                                                            );
                                                          }
                                                          if (
                                                            e.key === "Escape"
                                                          ) {
                                                            setAddingSubitemToTask(
                                                              null,
                                                            );
                                                            setNewSubitemName(
                                                              "",
                                                            );
                                                          }
                                                        }}
                                                        onBlur={() => {
                                                          setAddingSubitemToTask(
                                                            null,
                                                          );
                                                          setNewSubitemName("");
                                                        }}
                                                      />
                                                    </div>
                                                  ) : (
                                                    <button
                                                      onClick={() => {
                                                        taskState.setExpandedTasks(
                                                          (prev) => ({
                                                            ...prev,
                                                            [task.id]: true,
                                                          }),
                                                        );
                                                        setAddingSubitemToTask(
                                                          task.id,
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
                                        );
                                      })}

                                      {/* ================= ADD ITEM ROW ================= */}
                                      <tr>
                                        <td className="p-4 text-center border-r border-border sticky left-0 z-10 bg-card">
                                          {/* Empty Cell */}
                                        </td>
                                        <td
                                          colSpan={2}
                                          className="p-4 border-t border-border sticky left-12 z-10 bg-card"
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
                                                  (e.key === "Enter" ||
                                                    e.key === "Tab") &&
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
                                                // Scroll the main flex container to the right
                                                if (
                                                  mainFlexContainerRef.current
                                                ) {
                                                  mainFlexContainerRef.current.scrollLeft =
                                                    mainFlexContainerRef.current.scrollWidth;
                                                }
                                              }}
                                              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-2"
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

            {/* Unified Horizontal Scrollbar at Bottom */}
            <div
              className="h-5 overflow-x-scroll border-t border-border bg-muted flex-shrink-0"
              data-unified-scrollbar
              ref={(el) => {
                if (el && Object.keys(tableScrollRefs.current).length > 0) {
                  // Sync scrollbar position with first table on mount/update (proportional)
                  const firstTableRef = Object.values(
                    tableScrollRefs.current,
                  )[0];
                  if (firstTableRef) {
                    const srcLeft = firstTableRef.scrollLeft;
                    const srcMax = Math.max(
                      0,
                      firstTableRef.scrollWidth - firstTableRef.clientWidth,
                    );
                    const unifiedMax = Math.max(
                      0,
                      el.scrollWidth - el.clientWidth,
                    );
                    const mapped =
                      srcMax > 0 && unifiedMax > 0
                        ? (srcLeft / srcMax) * unifiedMax
                        : srcLeft;
                    if (el.scrollLeft !== mapped) el.scrollLeft = mapped;
                  }
                }
              }}
              onScroll={(e) => {
                if (isSyncingScroll.current) return;
                const unified = e.currentTarget as HTMLDivElement;
                const unifiedLeft = unified.scrollLeft;
                const unifiedMax = Math.max(
                  0,
                  unified.scrollWidth - unified.clientWidth,
                );

                isSyncingScroll.current = true;
                Object.values(tableScrollRefs.current).forEach((ref) => {
                  if (ref) {
                    const tableMax = Math.max(
                      0,
                      ref.scrollWidth - ref.clientWidth,
                    );
                    const mapped =
                      unifiedMax > 0 && tableMax > 0
                        ? (unifiedLeft / unifiedMax) * tableMax
                        : unifiedLeft;
                    if (ref.scrollLeft !== mapped) ref.scrollLeft = mapped;
                  }
                });
                window.requestAnimationFrame(() => {
                  isSyncingScroll.current = false;
                });
              }}
            >
              <div style={{ width: `${maxScrollWidth}px`, height: "1px" }} />
            </div>
          </div>
        )}

        {/* KANBAN VIEW */}
        {/* kanban commented intentionally */}
        {activeTab === "Kanban" && isViewLive.kanban && (
          <KanbanView
            groups={memoizedFilteredData.groups}
            statuses={statuses}
            priorities={priorities}
            members={members}
            boardId={boardId}
            onTaskMove={handleStatusChange}
            onTaskClick={openTaskCard}
            onAddTask={handleKanbanAddTask}
          />
        )}

        {/* List VIEW */}
        {activeTab === "List" && isViewLive.list && (
          <ListView
            groups={memoizedFilteredData.groups}
            statuses={statuses}
            priorities={priorities}
            members={members}
            tags={tags}
            onTaskClick={openTaskCard}
            expandedTasks={effectiveExpandedTasks}
            toggleTask={taskState.toggleTask}
            onOpenComments={openCommentsPanel}
            onOpenTaskCard={openTaskCard}
            onStatusChange={handleStatusChange}
            onPriorityChange={handlePriorityChange}
            onPersonChange={handlePersonChange}
            onRatingChange={handleRatingChange}
            onEstimatedDateChange={handleEstimatedDateChange}
            onEstimatedTimeChange={handleEstimatedTimeChange}
            onTagChange={handleTagChange}
            openPopoverId={popoverState.openPopoverId}
            setOpenPopoverId={popoverState.setOpenPopoverId}
            boardId={parseInt(boardId, 10)}
            onTagCreated={(newTag) => {
              setTags((prevTags) => [...prevTags, newTag]);
            }}
            onStatusCreated={handleStatusCreated}
            onStatusesUpdated={handleStatusesUpdated}
            onPriorityCreated={handlePriorityCreated}
            onPrioritiesUpdated={handlePrioritiesUpdated}
            inlineEditingTaskId={taskState.inlineEditingTaskId}
            setInlineEditingTaskId={taskState.setInlineEditingTaskId}
            inlineEditingTaskName={taskState.inlineEditingTaskName}
            setInlineEditingTaskName={taskState.setInlineEditingTaskName}
            onInlineEditTaskName={handleInlineEditTaskName}
            activeTimerId={timerState.activeTimerId}
            onTimerStart={handleTimerStart}
            onTimerConflict={handleTimerConflict}
            onTimeUpdate={(taskId: string, seconds: number) => {
              updateTaskInGroups(taskId, { tracked_time_seconds: seconds });
            }}
            workloadColumns={workloadColumns}
          />
        )}

        {/* Other Views - Coming Soon */}
        {!isCurrentViewLive(activeTab) && (
          <div className="flex-1 overflow-auto flex items-center justify-center bg-background/50">
            <div className="text-center flex flex-col items-center">
              <ComingSoonAnimation width={400} height={400} />
              <div className="-mt-16 space-y-2">
                <h2 className="text-3xl font-bold text-foreground tracking-tight">
                  Coming Soon
                </h2>
                <p className="text-muted-foreground text-lg">
                  The{" "}
                  <span className="font-semibold text-primary">
                    {activeTab}
                  </span>{" "}
                  view is under development
                </p>
              </div>
            </div>
          </div>
        )}

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

        {/*  Profile Details Dialog */}
        <ProfileDialog
          open={profileDialogOpen}
          onOpenChange={setProfileDialogOpen}
        />

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
                Are you sure you want to delete this group? This action cannot
                be undone.
              </p>
              {groupToDelete && (
                <p className="text-sm font-medium mt-2">
                  Group:{" "}
                  <span className="text-foreground">
                    {groups.find((g) => g.id === groupToDelete)?.name ||
                      "Unknown"}
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

        {/* Timer Conflict Dialog */}
        <Dialog
          open={timerConflictDialogOpen}
          onOpenChange={setTimerConflictDialogOpen}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Timer Already Running</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-foreground">
                Another timer is already running on "
                <strong>{conflictingTaskName}</strong>". Please stop it first
                before starting a new timer.
              </p>
            </div>
            <DialogFooter>
              <Button onClick={() => setTimerConflictDialogOpen(false)}>
                OK
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ALL SHEETS WILL GO HERE */}
        <CommentsPanelSheet
          open={commentsPanelOpen}
          onOpenChange={(open) => {
            if (!open) closeCommentsPanel();
            else setCommentsPanelOpen(true);
          }}
          taskName={getTaskById(selectedCommentsId)?.name || "Task Details"}
          taskId={selectedCommentsId}
          comments={comments}
          isLoadingComments={isLoadingComments}
          updateText={updateText}
          onUpdateTextChange={setUpdateText}
          updateFiles={updateFiles}
          onUpdateFilesChange={setUpdateFiles}
          onSaveUpdate={saveUpdate}
          onDeleteComment={handleDeleteComment}
          onUpdateComment={updateTaskComment}
          onSaveInlineReply={saveInlineReply}
          isSaving={isSaving}
          onTaskButtonClick={() => {
            closeCommentsPanel();
            // Use search params to switch to task
            setSearchParams((prev: URLSearchParams) => {
              const next = new URLSearchParams(prev);
              next.delete("comments");
              if (selectedCommentsId) next.set("task", selectedCommentsId);
              return next;
            });
          }}
          boardId={boardId}
        />

        {/* Bulk Actions Toolbar */}
        {Object.values(taskState.checkedTasks).some((checked) => checked) && (
          <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border shadow-lg z-50 py-4 px-6">
            <div className="max-w-[1400px] mx-auto flex items-center justify-between">
              <div className="flex items-center gap-8">
                <div className="flex items-center gap-2">
                  <div className="bg-primary rounded-full w-8 h-8 flex items-center justify-center text-white font-semibold text-sm">
                    {
                      Object.values(taskState.checkedTasks).filter(
                        (checked) => checked,
                      ).length
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
                onClick={() => taskState.clearCheckedTasks()}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {/* */}
        {/* Task Card Dialog */}
        {selectedTaskCardId && (
          <TaskCardDialog
            open={sheetTaskCardOpen}
            onOpenChange={(open) => {
              if (!open) closeTaskCard();
              else setSheetTaskCardOpen(true);
            }}
            task={getTaskById(selectedTaskCardId)}
            boardName={boardName}
            statuses={statuses}
            priorities={priorities}
            members={members}
            onStatusChange={handleStatusChange}
            onPriorityChange={handlePriorityChange}
            onPersonChange={handlePersonChange}
            onRatingChange={handleRatingChange}
            onEstimatedDateChange={handleEstimatedDateChange}
            boardId={Number(boardId)}
            groupName={
              groups.find((g) =>
                g.tasks.some(
                  (t) =>
                    t.id === selectedTaskCardId ||
                    t.subitems?.some((s) => s.id === selectedTaskCardId),
                ),
              )?.name
            }
            groupColor={
              groups.find((g) =>
                g.tasks.some(
                  (t) =>
                    t.id === selectedTaskCardId ||
                    t.subitems?.some((s) => s.id === selectedTaskCardId),
                ),
              )?.color
            }
            onInlineEditTaskName={handleInlineEditTaskName}
            tags={tags}
            onTagChange={handleTagChange}
            onTagCreated={(newTag) => {
              setTags((prevTags) => [...prevTags, newTag]);
            }}
            onStatusCreated={handleStatusCreated}
            onPriorityCreated={handlePriorityCreated}
            onDescriptionChange={handleUpdateTaskDescription}
            initialEditDescription={taskCardInitialEditDescription}
            onEstimatedTimeChange={handleEstimatedTimeChange}
            activeTimerId={timerState.activeTimerId}
            timerStartTime={timerState.timerStartTime}
            onTimerStart={handleTimerStart}
            onTimerConflict={handleTimerConflict}
            onTimeUpdate={(taskId: string, seconds: number) => {
              updateTaskInGroups(taskId, { tracked_time_seconds: seconds });
            }}
          />
        )}

        {/* Edit Labels Dialog */}
        <Dialog
          open={editLabelsDialogOpen}
          onOpenChange={setEditLabelsDialogOpen}
        >
          <DialogContent className="max-w-2xl flex flex-col max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>Edit Group Labels</DialogTitle>
            </DialogHeader>

            {/* Scrollable Labels List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-4">
              {/* Existing Labels */}
              {Array.isArray(labels) && labels.length > 0 && (
                <div className="space-y-2">
                  {labels.map((label) => (
                    <div
                      key={`edit-label-${label.id}`}
                      className="flex items-center gap-2 p-3 rounded-lg bg-muted"
                    >
                      {editingLabelId === String(label.id) ? (
                        <>
                          <Input
                            value={editingLabelName}
                            onChange={(e) =>
                              setEditingLabelName(e.target.value)
                            }
                            className="flex-1"
                            placeholder="Label name..."
                          />
                          <ColorPickerPopover
                            color={editingLabelColor}
                            onColorChange={setEditingLabelColor}
                            isOpen={editingLabelColorPickerOpen}
                            onOpenChange={setEditingLabelColorPickerOpen}
                            size="w-10 h-10"
                          />
                          <Button
                            size="sm"
                            className="h-8 px-2"
                            onClick={async () => {
                              try {
                                const organizationIdNum = getOrganizationId();
                                const boardIdNum = Number(boardId);

                                if (organizationIdNum === null) {
                                  toast.error("Organization not found");
                                  return;
                                }

                                // Capture the old label data before updating
                                const oldLabel = labels.find(
                                  (l) => String(l.id) === editingLabelId,
                                );
                                const oldLabelName = oldLabel?.label_name;
                                const oldLabelColor = oldLabel?.label_color;

                                // Call API to update label
                                await cmsApi.updateLabel({
                                  label_id: editingLabelId!,
                                  label_name: editingLabelName,
                                  label_color: editingLabelColor,
                                  organization_id: organizationIdNum,
                                  board_id: boardIdNum,
                                });

                                // Update local state
                                setLabels((prev) =>
                                  prev.map((l) =>
                                    String(l.id) === editingLabelId
                                      ? {
                                          ...l,
                                          label_name: editingLabelName,
                                          label_color: editingLabelColor,
                                        }
                                      : l,
                                  ),
                                );

                                // Update group labels if any group is using this label
                                if (oldLabelName) {
                                  // First, identify which groups need to be updated
                                  const groupsToUpdate: string[] = [];

                                  // Check current group labels to find matches (match by name or id as a fallback)
                                  Object.entries(groupLabels).forEach(
                                    ([groupId, gLabel]) => {
                                      if (
                                        gLabel === oldLabelName ||
                                        gLabel === String(editingLabelId)
                                      ) {
                                        groupsToUpdate.push(groupId);
                                      }
                                    },
                                  );

                                  console.log(
                                    "Groups to update:",
                                    groupsToUpdate,
                                  );
                                  console.log("Old label name:", oldLabelName);
                                  console.log(
                                    "New label name:",
                                    editingLabelName,
                                  );

                                  // Update local state
                                  setGroupLabels((prevGroupLabels) => {
                                    const updatedGroupLabels = {
                                      ...prevGroupLabels,
                                    };
                                    let hasUpdates = false;

                                    // Find groups that are using the old label name
                                    Object.keys(updatedGroupLabels).forEach(
                                      (groupId) => {
                                        if (
                                          updatedGroupLabels[groupId] ===
                                          oldLabelName
                                        ) {
                                          updatedGroupLabels[groupId] =
                                            editingLabelName;
                                          hasUpdates = true;
                                        }
                                      },
                                    );

                                    return hasUpdates
                                      ? updatedGroupLabels
                                      : prevGroupLabels;
                                  });

                                  // Update groups on backend
                                  if (groupsToUpdate.length > 0) {
                                    console.log(
                                      "Calling group update API for groups:",
                                      groupsToUpdate,
                                    );
                                    try {
                                      await Promise.all(
                                        groupsToUpdate.map(async (groupId) => {
                                          console.log(
                                            `Updating group ${groupId} with label: ${editingLabelName}`,
                                          );
                                          await groupsApi.updateGroup(groupId, {
                                            label: editingLabelName,
                                            label_color: editingLabelColor,
                                          });
                                          console.log(
                                            `Successfully updated group ${groupId}`,
                                          );
                                        }),
                                      );

                                      setTimeout(() => {
                                        toast.success(
                                          `Updated ${groupsToUpdate.length} group${groupsToUpdate.length > 1 ? "s" : ""} using this label`,
                                        );
                                      }, 500);
                                    } catch (error) {
                                      console.error(
                                        "Failed to update some groups:",
                                        error,
                                      );
                                      toast.error(
                                        "Some groups failed to update on the server",
                                      );
                                    }
                                  } else {
                                    console.log("No groups found to update");
                                  }
                                }

                                // Update group label colors if any group is using this label
                                if (oldLabelColor) {
                                  setGroupLabelColors(
                                    (prevGroupLabelColors) => {
                                      const updatedGroupLabelColors = {
                                        ...prevGroupLabelColors,
                                      };
                                      let hasUpdates = false;

                                      // Find groups that are using the old label color and update them
                                      Object.keys(
                                        updatedGroupLabelColors,
                                      ).forEach((groupId) => {
                                        if (
                                          updatedGroupLabelColors[groupId] ===
                                          oldLabelColor
                                        ) {
                                          updatedGroupLabelColors[groupId] =
                                            editingLabelColor;
                                          hasUpdates = true;
                                        }
                                      });

                                      return hasUpdates
                                        ? updatedGroupLabelColors
                                        : prevGroupLabelColors;
                                    },
                                  );
                                }

                                setEditingLabelId(null);
                                toast.success("Label Updated Successfully");
                              } catch (error) {
                                console.error("Failed to update label:", error);
                                toast.error("Failed to Update Label");
                              }
                            }}
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 px-2"
                            onClick={() => setEditingLabelId(null)}
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <>
                          <div
                            className="flex-1 px-3 py-2 rounded text-white font-medium"
                            style={{ backgroundColor: label.label_color }}
                          >
                            {label.label_name}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => {
                              setEditingLabelId(String(label.id));
                              setEditingLabelName(label.label_name);
                              setEditingLabelColor(label.label_color);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            onClick={async () => {
                              try {
                                // Capture the label data before deleting
                                const labelToDelete = label;

                                // Call API to delete label
                                await cmsApi.deleteLabel(label.id);

                                // Remove from local state
                                setLabels((prev) =>
                                  prev.filter(
                                    (l) => String(l.id) !== String(label.id),
                                  ),
                                );

                                // Clear group labels that were using this deleted label
                                // First, identify which groups need to be updated
                                const groupsToUpdate: string[] = [];

                                // Check current group labels to find matches (match by name or id as a fallback)
                                Object.entries(groupLabels).forEach(
                                  ([groupId, gLabel]) => {
                                    if (
                                      gLabel === labelToDelete.label_name ||
                                      gLabel === String(labelToDelete.id)
                                    ) {
                                      groupsToUpdate.push(groupId);
                                    }
                                  },
                                );

                                console.log(
                                  "Groups to clear labels from:",
                                  groupsToUpdate,
                                );
                                console.log(
                                  "Deleted label name:",
                                  labelToDelete.label_name,
                                );
                                console.log(
                                  "Current group labels:",
                                  groupLabels,
                                );

                                setGroupLabels((prevGroupLabels) => {
                                  const updatedGroupLabels = {
                                    ...prevGroupLabels,
                                  };
                                  let hasUpdates = false;

                                  // Find groups that are using the deleted label name
                                  Object.keys(updatedGroupLabels).forEach(
                                    (groupId) => {
                                      if (
                                        updatedGroupLabels[groupId] ===
                                        labelToDelete.label_name
                                      ) {
                                        delete updatedGroupLabels[groupId];
                                        hasUpdates = true;
                                      }
                                    },
                                  );

                                  return hasUpdates
                                    ? updatedGroupLabels
                                    : prevGroupLabels;
                                });

                                // Update groups on backend to clear labels
                                if (groupsToUpdate.length > 0) {
                                  console.log(
                                    "Calling group update API to clear labels for groups:",
                                    groupsToUpdate,
                                  );
                                  try {
                                    await Promise.all(
                                      groupsToUpdate.map(async (groupId) => {
                                        console.log(
                                          `Clearing labels from group ${groupId}`,
                                        );
                                        await groupsApi.updateGroup(groupId, {
                                          label: null,
                                          label_color: null,
                                        });
                                        console.log(
                                          `Successfully cleared labels from group ${groupId}`,
                                        );
                                      }),
                                    );

                                    setTimeout(() => {
                                      toast.success(
                                        `Cleared labels from ${groupsToUpdate.length} group${groupsToUpdate.length > 1 ? "s" : ""}`,
                                      );
                                    }, 500);
                                  } catch (error) {
                                    console.error(
                                      "Failed to clear labels from some groups:",
                                      error,
                                    );
                                    toast.error(
                                      "Some groups failed to clear labels on the server",
                                    );
                                  }
                                } else {
                                  console.log(
                                    "No groups found to clear labels from",
                                  );
                                }

                                // Clear group label colors that were using this deleted label
                                setGroupLabelColors((prevGroupLabelColors) => {
                                  const updatedGroupLabelColors = {
                                    ...prevGroupLabelColors,
                                  };
                                  let hasUpdates = false;

                                  // Find groups that are using the deleted label color and clear them
                                  Object.keys(updatedGroupLabelColors).forEach(
                                    (groupId) => {
                                      if (
                                        updatedGroupLabelColors[groupId] ===
                                        labelToDelete.label_color
                                      ) {
                                        delete updatedGroupLabelColors[groupId];
                                        hasUpdates = true;
                                      }
                                    },
                                  );

                                  return hasUpdates
                                    ? updatedGroupLabelColors
                                    : prevGroupLabelColors;
                                });

                                toast.success("Label Deleted Successfully");
                              } catch (error) {
                                console.error("Failed to delete label:", error);
                                toast.error("Failed to Delete Label");
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Fixed Add New Label Section */}
            <div className="border-t border-border pt-4 space-y-3">
              <h4 className="font-medium text-sm">Add New Label</h4>
              <div className="flex gap-2">
                <Input
                  placeholder="Label name..."
                  value={newLabelName}
                  onChange={(e) => setNewLabelName(e.target.value)}
                  className="flex-1"
                />
                <ColorPickerPopover
                  color={newLabelColor}
                  onColorChange={setNewLabelColor}
                  isOpen={newLabelColorPickerOpen}
                  onOpenChange={setNewLabelColorPickerOpen}
                  size="w-10 h-10"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setEditLabelsDialogOpen(false);
                  setNewLabelName("");
                  setNewLabelColor("#a855f7");
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  try {
                    const organizationIdNum = getOrganizationId();
                    const boardIdNum = Number(boardId);
                    const userId = getCurrentUserId();

                    if (organizationIdNum === null) {
                      toast.error("Organization not found");
                      return;
                    }

                    if (userId === null) {
                      toast.error("User not found");
                      return;
                    }

                    // Create label if name is provided
                    if (newLabelName.trim()) {
                      try {
                        await cmsApi.createLabel({
                          label_name: newLabelName.trim(),
                          label_color: newLabelColor,
                          organization_id: organizationIdNum,
                          board_id: boardIdNum,
                        });
                        toast.success("Label Created Successfully");
                      } catch (createError) {
                        console.error("Failed to create label:", createError);
                        toast.error("Failed to Create Label");
                        return;
                      }
                    }

                    // Clear CMS cache to ensure fresh data
                    clearCMSCache(boardIdNum);

                    // Fetch updated labels from CMS API immediately after creating label
                    try {
                      debugLog("Fetching updated CMS data...");
                      const cmsData = await getCMSData({
                        organization_id: organizationIdNum,
                        board_id: boardIdNum,
                        user_id: userId,
                      });

                      debugLog("CMS Data received:", cmsData);

                      // Update labels state - this will reflect in all UI places where labels are used
                      setLabels(cmsData.labels || []);
                      debugLog("Labels updated:", cmsData.labels);

                      // Close dialog and reset form
                      setEditLabelsDialogOpen(false);
                      setNewLabelName("");
                      setNewLabelColor("#a855f7");

                      // Close the Edit Group popover to force re-render when reopened
                      setEditGroupDialogOpen(false);
                    } catch (fetchError) {
                      console.error("Failed to fetch CMS data:", fetchError);
                      toast.error("Failed to Fetch Updated Labels");
                    }
                  } catch (error) {
                    console.error("Failed to update labels:", error);
                    toast.error("Failed to update labels");
                  }
                }}
              >
                Done
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
