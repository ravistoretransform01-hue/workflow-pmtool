export interface Group {
  id: string | number;
  name: string;
  color: string;
  board_id: number;
  workspace_id: number;
  organization_id: number;
  label?: string | null;
  label_color?: string | null;
  tasks?: Task[];
  created_at?: string;
  updated_at?: string;
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
  abbreviation?: string;
  completion_date?: string;
}

export interface UpdateGroupRequest {
  name?: string;
  color?: string;
  label?: string | null;
  label_color?: string | null;
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
