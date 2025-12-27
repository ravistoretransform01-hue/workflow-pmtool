import api from "@/lib/axios";

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
}

const USER_ENDPOINTS = {
  GET_USER_META: (userId: number) => `/usermeta?user_id=${userId}`,
  UPDATE_USER_META: (userId: number) => `/usermeta?user_id=${userId}`,
};

export const userApi = {
  /**
   * Get user details/metadata
   */
  getUserMeta: async (userId: number): Promise<UserMetaData> => {
    try {
      const response = await api.get<UserMetaResponse>(
        USER_ENDPOINTS.GET_USER_META(userId)
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
    userId: number,
    data: UpdateUserMetaRequest
  ): Promise<UserMetaData> => {
    try {
      const response = await api.put<UserMetaResponse>(
        USER_ENDPOINTS.UPDATE_USER_META(userId),
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
};
