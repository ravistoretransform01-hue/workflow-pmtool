export interface CreateBoardRequest {
  name: string;
  organization_id: number;
  workspace_id: number;
  icon_type: string;
  icon_value: string;
  icon_color: string;
}

export interface BoardCreator {
  id: number;
  name: string;
  email: string;
}

export interface Board {
  id: string;
  name: string;
  organization_id: string;
  workspace_id: string;
  folder_id?: string | null;
  description?: string | null;
  icon_type: string;
  icon_value?: string | null;
  icon_color: string;
  color?: string;
  visibility?: string;
  is_archived?: string;
  status?: string;
  template_id?: string | null;
  settings?: any;
  position?: string;
  created_user_id?: string;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
  creator?: BoardCreator;
  member_count?: string;
  task_count?: string;
}

export interface GetBoardsResponse {
  code: number;
  status: string;
  data: Board[];
  count: number;
}

export interface CreateBoardResponse {
  success?: boolean;
  data?: Board | any;
  message?: string;
  [key: string]: any;
}
