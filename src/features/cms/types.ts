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

export interface Member {
  user_id: string;
  name: string;
  email?: string;
  username?: string;
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

export interface CMSResponse {
  status: boolean;
  statuses: Status[];
  priorities: Priority[];
  members: Member[];
  labels: Label[];
  tags: Tag[];
  user_columns?: any;
  default_columns?: any;
}

export interface CMSRequest {
  organization_id: number;
  board_id: number;
  user_id: number | null;
}

export interface CMSData {
  statuses: Status[];
  priorities: Priority[];
  members: Member[];
  labels: Label[];
  tags: Tag[];
  timestamp: number;
}
