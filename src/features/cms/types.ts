export interface Status {
  id: string;
  name: string;
  color_code: string;
  status_order: string;
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
}

export interface CMSResponse {
  status: boolean;
  statuses: Status[];
  priority: Priority[];
  members: Member[];
}

export interface CMSRequest {
  organization_id: number;
  board_id: number;
  user_id: number;
}

export interface CMSData {
  statuses: Status[];
  priority: Priority[];
  members: Member[];
  timestamp: number;
}
