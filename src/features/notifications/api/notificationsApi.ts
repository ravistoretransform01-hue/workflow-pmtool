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
  getAllNotifications: async (
    organizationId?: string | number,
    page: number = 1,
    limit: number = 20,
  ): Promise<NotificationsResponse> => {
    let url = organizationId
      ? `/notifications/all?status=all&organization_id=${organizationId}&page=${page}&per_page=${limit}&limit=${limit}`
      : `/notifications/all?status=all&page=${page}&per_page=${limit}&limit=${limit}`;
    const response = await api.get<any>(url);
    const data = response.data || {};

    const headerTotal = response.headers?.["x-wp-total"]
      ? Number(response.headers["x-wp-total"])
      : undefined;
    const headerTotalPages = response.headers?.["x-wp-totalpages"]
      ? Number(response.headers["x-wp-totalpages"])
      : undefined;

    const meta = data.meta || data.pagination;

    const totalItems =
      meta?.total_items ??
      meta?.total ??
      headerTotal ??
      data.total_items ??
      data.total ??
      data.count ??
      (Array.isArray(data.data) ? data.data.length : 0);

    const totalPages =
      meta?.total_pages ??
      data.total_pages ??
      headerTotalPages ??
      (meta?.total_items ? Math.ceil(meta.total_items / limit) : undefined) ??
      (headerTotal ? Math.ceil(headerTotal / limit) : undefined) ??
      (totalItems > 0 ? Math.ceil(totalItems / limit) : 1);

    return {
      ...data,
      total_items: totalItems,
      total_pages: totalPages,
      current_page: meta?.current_page ?? page,
      per_page: meta?.per_page ?? limit,
    };
  },

  getUnreadNotifications: async (
    organizationId?: string | number,
    page: number = 1,
    limit: number = 20,
  ): Promise<NotificationsResponse> => {
    let url = organizationId
      ? `/notifications/all?status=unread&organization_id=${organizationId}&page=${page}&per_page=${limit}&limit=${limit}`
      : `/notifications/all?status=unread&page=${page}&per_page=${limit}&limit=${limit}`;
    const response = await api.get<any>(url);
    const data = response.data || {};

    const headerTotal = response.headers?.["x-wp-total"]
      ? Number(response.headers["x-wp-total"])
      : undefined;
    const headerTotalPages = response.headers?.["x-wp-totalpages"]
      ? Number(response.headers["x-wp-totalpages"])
      : undefined;

    const meta = data.meta || data.pagination;

    const totalItems =
      meta?.total_items ??
      meta?.total ??
      headerTotal ??
      data.total_items ??
      data.total ??
      data.count ??
      (Array.isArray(data.data) ? data.data.length : 0);

    const totalPages =
      meta?.total_pages ??
      data.total_pages ??
      headerTotalPages ??
      (meta?.total_items ? Math.ceil(meta.total_items / limit) : undefined) ??
      (headerTotal ? Math.ceil(headerTotal / limit) : undefined) ??
      (totalItems > 0 ? Math.ceil(totalItems / limit) : 1);

    return {
      ...data,
      total_items: totalItems,
      total_pages: totalPages,
      current_page: meta?.current_page ?? page,
      per_page: meta?.per_page ?? limit,
    };
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
