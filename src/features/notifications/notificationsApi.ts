import api from "@/lib/axios";

export interface Notification {
  id: string;
  user_id: string;
  sender_id: string;
  organization_id: string;
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
  getAllNotifications: async (): Promise<NotificationsResponse> => {
    const response = await api.get<NotificationsResponse>("/notifications/all?status=all");
    return response.data;
  },

  getUnreadNotifications: async (): Promise<NotificationsResponse> => {
    const response = await api.get<NotificationsResponse>("/notifications/all?status=unread");
    return response.data;
  },

  markAsRead: async (notificationId: string | number): Promise<{ success: boolean; message: string; unread_count: number }> => {
    const response = await api.put("/notifications/mark-read", {
      notification_id: notificationId
    });
    return response.data;
  },
};
