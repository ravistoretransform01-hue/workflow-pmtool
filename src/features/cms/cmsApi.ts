import axios from "@/lib/axios";
import type { CMSRequest, CMSResponse, Label } from "./types";

const CMS_ENDPOINTS = {
  GET_CMS_DATA: `/cms`,
  CREATE_LABEL: `/labels`,
  CREATE_TAG: `/tags`,
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
};
