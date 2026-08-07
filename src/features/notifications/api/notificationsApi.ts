import api from "@/config/axios";

export interface Notification {
  id: string;
  user_id: string;
  sender_id: string;
  organization_id: string;
  board_id: string | null;
  task_id: string;
  comment_id: string | null;
  type: string | null;
  message: string;
  is_read: string; // "0" or "1"
  created_at: string;
  sender_name: string | null;
  context?: {
    task?: {
      id: string;
      name: string | null;
      status_id: string | null;
      priority_id: string | null;
      group_name: string | null;
    };
    board?: {
      id: string;
      name: string;
      color: string;
    };
    comment?: {
      id: string;
      content: string | null;
      is_reply: boolean;
    };
  };
}

export interface PaginationMeta {
  total_items: number;
  total_pages: number;
  current_page: number;
  per_page: number;
  total_unread: number;
}

export interface NotificationsResponse {
  success: boolean;
  status_filter?: string;
  data: Notification[];
  count?: number;
  pagination?: PaginationMeta;
  meta?: PaginationMeta;
  total_items?: number;
  total_pages?: number;
  current_page?: number;
  per_page?: number;
  total_unread?: number;
}

export const notificationsApi = {
  getAllNotifications: async (organizationId?: string | number, page: number = 1, limit: number = 20): Promise<NotificationsResponse> => {
    let url = organizationId 
      ? `/notifications/all?status=all&organization_id=${organizationId}&page=${page}&limit=${limit}`
      : `/notifications/all?status=all&page=${page}&limit=${limit}`;
    const response = await api.get<NotificationsResponse>(url);
    return response.data;
  },

  getUnreadNotifications: async (organizationId?: string | number, page: number = 1, limit: number = 20): Promise<NotificationsResponse> => {
    let url = organizationId 
      ? `/notifications/all?status=unread&organization_id=${organizationId}&page=${page}&limit=${limit}`
      : `/notifications/all?status=unread&page=${page}&limit=${limit}`;
    const response = await api.get<NotificationsResponse>(url);
    return response.data;
  },

  markAsRead: async (params: { 
    notificationId?: string | number; 
    markAll?: boolean; 
    organizationId?: string | number; 
  }): Promise<{ success: boolean; message: string; unread_count: number }> => {
    const body: any = {};
    if (params.notificationId) body.notification_id = params.notificationId;
    if (params.markAll) body.mark_all = true;
    if (params.organizationId) body.organization_id = params.organizationId;

    const response = await api.put("/notifications/mark-read", body);
    return response.data;
  },
};
