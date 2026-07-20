import api from "@/config/axios";

export interface UserMetaData {
  email: string;
  phone: string;
  mobile_phone: string;
  location: string;
  [key: string]: any;
}

export interface UserMetaResponse {
  code: number;
  status: string;
  data: {
    meta: UserMetaData;
  };
}

export interface UpdateUserMetaRequest {
  email?: string;
  phone?: string;
  mobile_phone?: string;
  location?: string;
  job_title?: string;
  email_notifications?: boolean;
}

// const USER_ENDPOINTS = {
//   GET_USER_META: (userId: number) => `/usermeta?user_id=${userId}`,
//   UPDATE_USER_META: (userId: number) => `/usermeta?user_id=${userId}`,
// };
const USER_ENDPOINTS = {
  GET_USER_META: `/usermeta/me`,
  UPDATE_USER_META: `/usermeta/me`,
};

export const userApi = {
  /**
   * Get user details/metadata
   */
  getUserMeta: async (): Promise<UserMetaData> => {
    try {
      const response = await api.get<UserMetaResponse>(
        USER_ENDPOINTS.GET_USER_META
      );

      if (response.data && response.data.data && response.data.data.meta) {
        return response.data.data.meta;
      }

      throw new Error("Invalid user meta response");
    } catch (error) {
      console.error("Get user meta error:", error);
      throw error;
    }
  },

  /**
   * Update user details/metadata
   */
  updateUserMeta: async (
    // userId: number,
    data: UpdateUserMetaRequest
  ): Promise<UserMetaData> => {
    try {
      const response = await api.put<UserMetaResponse>(
        USER_ENDPOINTS.UPDATE_USER_META,
        data
      );

      if (response.data && response.data.data && response.data.data.meta) {
        return response.data.data.meta;
      }

      throw new Error("Invalid update response");
    } catch (error) {
      console.error("Update user meta error:", error);
      throw error;
    }
  },

  /**
   * Get email notification preferences
   */
  getEmailPreferences: async (): Promise<{ emails_enabled: boolean }> => {
    try {
      const response = await api.get('/email-preferences');
      if (response.data && response.data.status === "success") {
        return response.data.data;
      }
      return { emails_enabled: true }; // Default fallback
    } catch (error) {
      console.error("Get email preferences error:", error);
      return { emails_enabled: true }; // Return default on error to avoid breaking UI
    }
  },

  /**
   * Update email notification preferences
   */
  updateEmailPreferences: async (enabled: boolean): Promise<any> => {
    try {
      const response = await api.put('/email-preferences', {
        emails_enabled: enabled,
      });
      return response.data;
    } catch (error) {
      console.error("Update email preferences error:", error);
      throw error;
    }
  },
};
