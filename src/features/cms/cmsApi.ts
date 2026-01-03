import axios from "@/lib/axios";
import type { CMSRequest, CMSResponse } from "./types";

const CMS_ENDPOINTS = {
  GET_CMS_DATA: `/cms`,
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
};
