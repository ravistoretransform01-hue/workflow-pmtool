import api from "@/config/axios";
import type {
  Group,
  CreateGroupRequest,
  UpdateGroupRequest,
  GetGroupsResponse,
} from "@/features/groups/types/types";

const GROUP_ENDPOINTS = {
  GET_ALL: "/groups",
  GET_BY_BOARD: (boardId: number) => `/groups?board_id=${boardId}`,
  CREATE: "/groups",
  GET_BY_ID: (id: string | number) => `/groups/${id}`,
  UPDATE: `/groups`,
  // DELETE: (id: string | number) => `/groups/${id}`,
  DELETE: "/groups",
};

export const groupsApi = {
  /**
   * Fetch all groups for a board
   */
  getGroupsByBoard: async (boardId: number): Promise<Group[]> => {
    try {
      const response = await api.get<GetGroupsResponse>(
        GROUP_ENDPOINTS.GET_BY_BOARD(boardId)
      );

      // Handle the API response format
      if (
        response.data &&
        response.data.data &&
        Array.isArray(response.data.data)
      ) {
        return response.data.data;
      }

      // Fallback if response is array directly
      if (Array.isArray(response.data)) {
        return response.data;
      }

      return [];
    } catch (error) {
      console.error("Get groups API error:", error);
      throw error;
    }
  },

  /**
   * Create a new group
   */
  createGroup: async (data: CreateGroupRequest): Promise<Group> => {
    try {
      const response = await api.post<any>(GROUP_ENDPOINTS.CREATE, data);

      // Handle the API response format
      if (response.data && response.data.data) {
        return response.data.data as Group;
      }

      // If response is the group object directly
      if (response.data && response.data.id) {
        return response.data as Group;
      }

      return response.data as Group;
    } catch (error) {
      console.error("Create group API error:", error);
      throw error;
    }
  },

  /**
   * Get group by ID
   */
  getGroupById: async (id: string | number): Promise<Group> => {
    try {
      const response = await api.get<any>(GROUP_ENDPOINTS.GET_BY_ID(id));

      // Handle the API response format
      if (response.data && response.data.data) {
        return response.data.data;
      }

      // Fallback if response is the group object directly
      if (response.data && response.data.id) {
        return response.data;
      }

      return response.data;
    } catch (error) {
      console.error("Get group by ID API error:", error);
      throw error;
    }
  },

  /**
   * Update a group
   */
  updateGroup: async (
    id: string | number,
    data: UpdateGroupRequest
  ): Promise<Group> => {
    try {
      const response = await api.put<any>(GROUP_ENDPOINTS.UPDATE, {
        id: id,
        ...data,
      });

      // Handle the API response format
      if (response.data && response.data.data) {
        return response.data.data;
      }

      // Fallback if response is the group object directly
      if (response.data && response.data.id) {
        return response.data;
      }

      return response.data;
    } catch (error) {
      console.error("Update group API error:", error);
      throw error;
    }
  },

  /**
   * Delete a group
   */
  // deleteGroup: async (id: string | number): Promise<void> => {
  //   try {
  //     await api.delete(GROUP_ENDPOINTS.DELETE(id));
  //   } catch (error) {
  //     console.error("Delete group API error:", error);
  //     throw error;
  //   }
  // },
  deleteGroup: async (id: string | number): Promise<void> => {
    try {
      await api.delete(GROUP_ENDPOINTS.DELETE, {
        data: { id: id },
      });
    } catch (error) {
      console.error("Delete group API error:", error);
      throw error;
    }
  },

  /**
   * Fetch all groups
   */
  getAllGroups: async (): Promise<Group[]> => {
    try {
      const response = await api.get<GetGroupsResponse>(GROUP_ENDPOINTS.GET_ALL);

      if (
        response.data &&
        response.data.data &&
        Array.isArray(response.data.data)
      ) {
        return response.data.data;
      }

      if (Array.isArray(response.data)) {
        return response.data;
      }

      return [];
    } catch (error) {
      console.error("Get all groups API error:", error);
      throw error;
    }
  },

  /**
   * Layout Tracking API
   */
  getTrackingLayout: async (groupId: string | number): Promise<any> => {
    try {
      const isProd = typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
      const url = isProd ? `/wp-json/wp-platform/v1/group-tracking/?group_id=${groupId}` : `/group-tracking/?group_id=${groupId}`;
      const baseURL = isProd ? "" : undefined;
      
      const response = await api.get(url, { baseURL });
      return response.data?.data || response.data;
    } catch (error) {
      console.error("Get tracking layout error:", error);
      return null;
    }
  },

  saveTrackingLayout: async (payload: any): Promise<any> => {
    try {
      const isProd = typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
      const baseURL = isProd ? "" : undefined;
      const basePath = isProd ? `/wp-json/wp-platform/v1/group-tracking` : `/group-tracking`;

      let response;
      if (payload.id) {
        response = await api.put(`${basePath}/${payload.id}`, payload, { baseURL });
      } else {
        response = await api.post(`${basePath}/`, payload, { baseURL });
      }
      return response.data;
    } catch (error) {
      console.error("Save tracking layout error:", error);
      throw error;
    }
  }
};
