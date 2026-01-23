import axios from "@/lib/axios";
import type { CMSRequest, CMSResponse, Label } from "./types";

const CMS_ENDPOINTS = {
  GET_CMS_DATA: `/cms`,
  CREATE_LABEL: `/labels`,
  CREATE_TAG: `/tags`,
  CREATE_STATUS: `/task-status`,
  UPDATE_STATUS: `/task-status`,
  CREATE_PRIORITY: `/task-priority`,
  UPDATE_PRIORITY: `/task-priority`,
  USER_GROUP_COLUMNS: `/user-group-columns`,
};

export const cmsApi = {
  /**
   * Get CMS data (statuses and priorities)
   */
  getCMSData: async (payload: CMSRequest): Promise<CMSResponse> => {
    try {
      const response = await axios.post<CMSResponse>(
        CMS_ENDPOINTS.GET_CMS_DATA,
        payload
      );

      if (!response.data.status) {
        throw new Error("CMS API returned status: false");
      }

      return response.data;
    } catch (error) {
      console.error("Failed to fetch CMS data:", error);
      throw error;
    }
  },

  /**
   * Create a new label
   */
  createLabel: async (payload: {
    label_name: string;
    label_color: string;
    organization_id: number;
    board_id: number;
  }): Promise<Label> => {
    try {
      const response = await axios.post<Label>(
        CMS_ENDPOINTS.CREATE_LABEL,
        payload
      );

      return response.data;
    } catch (error) {
      console.error("Failed to create label:", error);
      throw error;
    }
  },

  /**
   * Create a new tag
   */
  createTag: async (payload: {
    name: string;
    slug: string;
    organization_id: number;
    board_id: number;
  }): Promise<any> => {
    try {
      const response = await axios.post<any>(
        CMS_ENDPOINTS.CREATE_TAG,
        payload
      );

      return response.data.data || response.data;
    } catch (error) {
      console.error("Failed to create tag:", error);
      throw error;
    }
  },

  /**
   * Create a new status
   */
  createStatus: async (payload: {
    name: string;
    color_code: string;
    organization_id: number;
    board_id: number;
  }): Promise<any> => {
    try {
      const response = await axios.post<any>(
        CMS_ENDPOINTS.CREATE_STATUS,
        payload
      );

      return response.data.data || response.data;
    } catch (error) {
      console.error("Failed to create status:", error);
      throw error;
    }
  },

  /**
   * Update an existing status
   */
  updateStatus: async (payload: {
    status_id: string;
    name: string;
    color_code: string;
    organization_id?: number;
    board_id?: number;
  }): Promise<any> => {
    try {
      const response = await axios.put<any>(
        CMS_ENDPOINTS.UPDATE_STATUS,
        payload
      );

      return response.data.data || response.data;
    } catch (error) {
      console.error("Failed to update status:", error);
      throw error;
    }
  },

  /**
   * Create a new priority
   */
  createPriority: async (payload: {
    name: string;
    color_code: string;
    organization_id: number;
    board_id: number;
  }): Promise<any> => {
    try {
      const response = await axios.post<any>(
        CMS_ENDPOINTS.CREATE_PRIORITY,
        payload
      );

      return response.data.data || response.data;
    } catch (error) {
      console.error("Failed to create priority:", error);
      throw error;
    }
  },

  /**
   * Update an existing priority
   */
  updatePriority: async (payload: {
    priority_id: string | number;
    name: string;
    color_code: string;
    organization_id: number;
    board_id: number;
  }): Promise<any> => {
    try {
      const response = await axios.put<any>(
        CMS_ENDPOINTS.UPDATE_PRIORITY,
        payload
      );

      return response.data.data || response.data;
    } catch (error) {
      console.error("Failed to update priority:", error);
      throw error;
    }
  },

  /**
   * Save user group columns configuration
   */
  saveUserGroupColumns: async (payload: {
    user_id: number;
    group_id: number;
    board_id: number;
    columns: Record<string, any>;
  }): Promise<any> => {
    try {
      const response = await axios.post<any>(
        CMS_ENDPOINTS.USER_GROUP_COLUMNS,
        payload
      );

      return response.data.data || response.data;
    } catch (error) {
      console.error("Failed to save user group columns:", error);
      throw error;
    }
  },
};
