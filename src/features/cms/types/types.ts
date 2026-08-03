export interface Status {
  id: string;
  name: string;
  color_code: string;
  status_order: string;
  required_rating: number | string;
}

export interface Priority {
  id: string;
  name: string;
  color_code: string;
  priority_order: string;
}

export interface Role {
  id: string;
  name: string;
}

export interface Member {
  user_id: string;
  name: string;
  email?: string;
  username?: string;
  role_id?: string;
  board_role_id?: number;
  board_role_label?: string;
  board_role_active?: boolean;
  group_ids?: string[];
}

export interface Label {
  id: string;
  label_name: string;
  label_color: string;
  board_id: string;
  organization_id: string;
  created_by: string;
  created_at: string;
  scope: string;
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
  board_id: string;
  organization_id: string;
  is_active: string;
  usage_count: string;
  created_by: string;
  created_at: string;
}

export interface BoardGroup {
  id: string | number;
  name: string;
}

export interface Group {
  id: number | string;
  name: string;
  assigned_users: (string | number)[];
}

// Raw Response interfaces from backend
export interface RawStatus {
  id: string | number;
  name: string;
  color_code: string;
  status_order: string | number;
  required_rating: number | string;
}

export interface RawPriority {
  id: string | number;
  name: string;
  color_code: string;
  priority_order: string | number;
}

export interface RawRole {
  id: string | number;
  name: string;
}

export interface RawMember {
  user_id: string | number;
  name: string;
  email?: string;
  username?: string;
  role_id?: string | number;
  board_role_id?: number | string;
  board_role_label?: string;
  board_role_active?: boolean | string | number;
}

export interface CMSResponse {
  status: boolean;
  roles: RawRole[];
  statuses: RawStatus[];
  priorities: RawPriority[];
  members: RawMember[];
  labels: Label[];
  tags: Tag[];
  user_columns?: any;
  default_columns?: any;
  all_board_groups?: BoardGroup[];
  groups?: Group[];
  ord_logo?: string;
  org_logo?: string;
}

export interface CMSRequest {
  organization_id: number;
  board_id: number;
  user_id: number | null;
  forceRefresh?: boolean;
}

export interface CMSData {
  roles: Role[];
  statuses: Status[];
  priorities: Priority[];
  members: Member[];
  labels: Label[];
  tags: Tag[];
  timestamp: number;
  all_board_groups?: BoardGroup[];
  groups?: Group[];
}
