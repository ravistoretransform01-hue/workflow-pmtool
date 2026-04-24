import api from "@/lib/axios";

export interface TaskFiltersData {
  persons: string[];
  statuses: string[];
  priorities: string[];
  labels: string[];
  groups: string[];
}

export interface GetFiltersResponse {
  code: number;
  status: string;
  data: {
    project_id: number;
    filters: TaskFiltersData;
  };
}

export const filtersApi = {
  /**
   * Fetch filters for a specific board
   */
  getFiltersByBoard: async (boardId: string | number): Promise<TaskFiltersData | null> => {
    try {
      const response = await api.get<GetFiltersResponse>(`/task-filters/${boardId}`);
      if (response.data && response.data.status === "success" && response.data.data) {
        return response.data.data.filters;
      }
      return null;
    } catch (error) {
      console.error(`Failed to fetch filters for board ${boardId}:`, error);
      return null;
    }
  },

  /**
   * Save filters for a specific board
   */
  saveFilters: async (boardId: string | number, filters: TaskFiltersData): Promise<boolean> => {
    try {
      const response = await api.post(`/task-filters/${boardId}`, filters);
      return response.data && response.data.status === "success";
    } catch (error) {
      console.error(`Failed to save filters for board ${boardId}:`, error);
      return false;
    }
  },

  /**
   * Delete filters for a specific board
   */
  deleteFilters: async (boardId: string | number): Promise<boolean> => {
    try {
      const response = await api.delete(`/task-filters/${boardId}`);
      return response.data && response.data.status === "success";
    } catch (error) {
      console.error(`Failed to delete filters for board ${boardId}:`, error);
      return false;
    }
  },

  /**
   * Fetch all filters across all boards
   */
  getAllFilters: async () => {
    try {
      const response = await api.get("/task-filters");
      return response.data;
    } catch (error) {
      console.error("Failed to fetch all filters:", error);
      return null;
    }
  },
};
