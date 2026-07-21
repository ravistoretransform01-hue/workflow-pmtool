export interface Group {
  id: string | number;
  name: string;
  color: string;
  board_id: number | string;
  workspace_id?: number | string | null;
  organization_id: number | string;
  label?: string | null;
  label_color?: string | null;
  tasks?: Task[];
  abbreviation?: string | null;
  completion_date?: string | null;
  external_project_id?: string | null;
  position?: string | number;
  columns?: string;
  created_by?: string | number;
  updated_by?: string | number | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
  label_ids?: any[];
  label_details?: any[];
  creator?: {
    id: number;
    name: string;
    email: string;
  };
  task_count?: string | number;
}

export interface Task {
  id: string;
  name: string;
  status: string[];
  priority: string;
  estimatedDate: string;
  person: string[];
  timeSpent: string;
}

export interface CreateGroupRequest {
  board_id: number;
  workspace_id: number | null;
  organization_id: number;
  name: string;
  color: string;
  abbreviation?: string | null;
  completion_date?: string | null;
}

export interface UpdateGroupRequest {
  name?: string;
  color?: string;
  label?: string | null;
  label_color?: string | null;
  abbreviation?: string | null;
  completion_date?: string | null;
  position?: string | number;
}

export interface GetGroupsResponse {
  code: number;
  status: string;
  data: Group[];
  count: number;
}

export interface CreateGroupResponse {
  success?: boolean;
  data?: Group | any;
  message?: string;
  [key: string]: any;
}
