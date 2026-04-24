import type { Status, Priority } from "@/features/cms/types";

/**
 * Core Task interface used throughout workload views
 */
export interface Task {
  id: string;
  name: string;
  description?: string;
  status?: string;
  status_id?: string;
  priority?: string;
  priority_id?: string;
  estimatedDate?: string;
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
  position?: string;
}

/**
 * Task group for organizing tasks
 */
export interface TaskGroup {
  id: string;
  name: string;
  color: string;
  tasks: Task[];
}

/**
 * Column definition for table/kanban views
 */
export interface Column {
  id: string;
  label: string;
  width: string;
  align: "left" | "center";
  fixed?: boolean;
  minWidth?: string;
  maxWidth?: string;
  collapsed?: boolean;
  render: (task: Task, isSubitem?: boolean) => React.ReactNode;
}

/**
 * Task filters state
 */
export interface TaskFilters {
  persons: Set<string>;
  statuses: Set<string>;
  priorities: Set<string>;
  labels: Set<string>;
  groups: Set<string>;
}

/**
 * Popover state for managing which popover is open
 */
export interface PopoverState {
  openPopoverId: string | null;
  setOpenPopoverId: (id: string | null) => void;
}

/**
 * Task state management
 */
export interface TaskState {
  expandedTasks: Record<string, boolean>;
  checkedTasks: Record<string, boolean>;
  editingTask: Task | null;
  inlineEditingTaskId: string | null;
  inlineEditingTaskName: string;
}

/**
 * Timer state
 */
export interface TimerState {
  activeTimerId: string | null;
  timerUpdateTrigger: number;
}

/**
 * Column persistence state
 */
export interface ColumnPersistenceState {
  visibleColumns: Record<string, boolean>;
  viewTabs: string[];
  columnLabels: Record<string, string>;
}

/**
 * CMS data state
 */
export interface CMSDataState {
  statuses: Status[];
  priorities: Priority[];
  members: any[];
  labels: any[];
  tags: any[];
}

/**
 * Props for cell components that use popovers
 */
export interface PopoverCellProps {
  task: Task;
  popoverId: string;
  openPopoverId?: string | null;
  setOpenPopoverId?: (id: string | null) => void;
}

/**
 * Props for status/priority selection components
 */
export interface SelectionCellProps extends PopoverCellProps {
  items: Status[] | Priority[];
  selectedItem?: Status | Priority;
  onItemChange?: (taskId: string, itemId: string) => void;
  onItemCreated?: (item: Status | Priority) => void;
  onItemsUpdated?: (items: Status[] | Priority[]) => void;
  boardId?: string | number;
}
