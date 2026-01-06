export interface TaskResponse {
  id: string;
  group_id: string;
  parent_id: string | null;
  organization_id: string; 
  board_id: string;
  position: string;
  name: string;
  description: string;
  created_by: string;
  status_id: string;
  task_priority_id: string;
  due_date: string;
  estimated_date_from: string | null;
  estimated_date_to: string | null;
  assigned_to: string;
  task_order: string;
  total_seconds: number;
  completed_at: string | null;
  started_at: string | null;
  is_private: string;
  attachments_count: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  creator: {
    id: number;
    name: string;
    email: string;
  };
  assignee?: {
    id: number;
    name: string;
    email: string;
  };
  assignees?: Array<{
    user_id: string;
    name: string;
    email: string;
    is_primary?: boolean;
  }>;
  status_label: string;
  priority_label: string;
  subtasks_count: string;
  time_spent_hours: number;
  is_overdue: boolean;
  // optional rating field (1-5)
  rating?: number;
}

export interface CreateTaskRequest {
  group_id: number;
  organization_id: number; 
  name: string;
  board_id: number;
  parent_id: number | null;
  // optional fields
  description?: string;
  status_id?: number;
  task_priority_id?: number;
  due_date?: string;
  estimated_date_from?: string;
  estimated_date_to?: string;
  assigned_to?: number;
  is_private?: number;
}

export interface UpdateTaskRequest {
  id: string;
  board_id: number;
  name?: string;
  description?: string;
  status_id?: number;
  task_priority_id?: number;
  due_date?: string;
  estimated_date_from?: string;
  estimated_date_to?: string;
  assigned_to?: number;
  assignees?: number[]; // Multiple assignees
  is_private?: number;
  member?: string;
  // optional rating update
  rating?: number;
  
}

export interface DeleteTaskRequest {
  id: string;
}

export interface GetTasksRequest {
  board_id?: number;
  group_id?: number;
  parent_id?: number | null;
}
