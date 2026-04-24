import api from "@/lib/axios";

export interface Notification {
  id: string;
  user_id: string;
  sender_id: string;
  organization_id: string;
  board_id: string;
  task_id: string;
  comment_id: string;
  type: string | null;
  message: string;
  is_read: string; // "0" or "1"
  created_at: string;
  sender_name: string;
}

export interface NotificationsResponse {
  success: boolean;
  status_filter: string;
  data: Notification[];
  count: number;
}

export const notificationsApi = {
  getAllNotifications: async (organizationId?: string | number): Promise<NotificationsResponse> => {
    const url = organizationId 
      ? `/notifications/all?status=all&organization_id=${organizationId}`
      : "/notifications/all?status=all";
    const response = await api.get<NotificationsResponse>(url);
    return response.data;
  },

  getUnreadNotifications: async (organizationId?: string | number): Promise<NotificationsResponse> => {
    const url = organizationId 
      ? `/notifications/all?status=unread&organization_id=${organizationId}`
      : "/notifications/all?status=unread";
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
