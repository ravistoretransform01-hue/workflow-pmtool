import api from "@/config/axios";
import type {
  CreateBoardRequest,
  Board,
  CreateBoardResponse,
  GetBoardsResponse,
} from "@/features/boards/types/types";
import { debugLog } from "@/utils/debugLog";

const BOARD_ENDPOINTS = {
  CREATE: "/boards",
  GET_ALL: "/boards",
  GET_BY_ID: (id: string) => `/boards/${id}`,
  UPDATE: "/boards",
  DELETE: "/boards",
  CLONE: "/boards/clone",
};

// const CACHE_CONTROL_HEADERS = {
//   'Cache-Control': 'no-cache, no-store, must-revalidate',
//   'Pragma': 'no-cache',
// };

export const boardsApi = {
  /**
   * Get all boards for an organization
   */
  getBoards: async (organizationId?: number): Promise<Board[]> => {
    try {
      const response = await api.get<GetBoardsResponse>(
        BOARD_ENDPOINTS.GET_ALL,
        {
          params: { organization_id: organizationId },
        },
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
      console.error("Get boards API error:", error);
      throw error;
    }
  },

  /**
   * Create a new board
   */
  createBoard: async (
    data: CreateBoardRequest,
  ): Promise<CreateBoardResponse> => {
    try {
      const response = await api.post<any>(BOARD_ENDPOINTS.CREATE, data, {
        // headers: CACHE_CONTROL_HEADERS
      });
      debugLog("Raw API response:", response);

      // The API might return the board data directly or wrapped in a response object
      // Handle both cases
      if (response.data && typeof response.data === "object") {
        // If response has a data property, use it
        if (response.data.data) {
          return {
            success: true,
            data: response.data.data,
            message: response.data.message,
          };
        }
        // If response is the board object directly
        if (response.data.id) {
          return {
            success: true,
            data: response.data,
          };
        }
        // Otherwise return as is
        return response.data;
      }

      return response.data;
    } catch (error) {
      console.error("API call error:", error);
      throw error;
    }
  },

  /**
   * Get all boards (alias for getBoards)
   */
  getAllBoards: async (): Promise<Board[]> => {
    return boardsApi.getBoards();
  },

  /**
   * Get board by ID
   */
  getBoardById: async (id: string): Promise<Board> => {
    const response = await api.get<any>(BOARD_ENDPOINTS.GET_BY_ID(id), {
      // headers: CACHE_CONTROL_HEADERS
    });

    // Handle the API response format: { code, status, data: { board_data } }
    if (response.data && response.data.data) {
      return response.data.data;
    }

    // Fallback if response is the board object directly
    if (response.data && response.data.id) {
      return response.data;
    }

    return response.data;
  },

  /**
   * Update board
   */
  updateBoard: async (
    id: string,
    data: Partial<CreateBoardRequest>,
  ): Promise<Board> => {
    const response = await api.put<Board>(
      BOARD_ENDPOINTS.UPDATE,
      {
        id,
        ...data,
      },
      {
        // headers: CACHE_CONTROL_HEADERS
      },
    );
    return response.data;
  },

  /**
   * Delete board
   */
  // deleteBoard: async (id: string): Promise<void> => {
  //   await api.delete(BOARD_ENDPOINTS.DELETE(id));
  // },
  deleteBoard: async (id: string | number): Promise<void> => {
    try {
      await api.delete(BOARD_ENDPOINTS.DELETE, {
        data: { id: id },
        // headers: CACHE_CONTROL_HEADERS
      });
    } catch (error) {
      console.error("Delete board API error:", error);
      throw error;
    }
  },

  /**
   * Assign board role to a user
   */
  assignBoardRole: async (payload: {
    user_id: number;
    board_id: number;
    organization_id: number;
    role_id: number;
  }): Promise<{
    code: number;
    status: string;
    message: string;
    data: {
      user_id: number;
      board_id: number;
      organization_id: number;
      role_id: number;
      role_label: string;
      action: string;
    };
  }> => {
    try {
      const response = await api.post("/board-roles/assign", payload);
      return response.data;
    } catch (error) {
      console.error("Assign board role API error:", error);
      throw error;
    }
  },

  /**
   * Assign member to board
   */
  assignMembers: async (payload: {
    board_id: number;
    organization_id: number;
    user_ids: number[];
    role_id: number;
    group_ids: number[];
  }): Promise<{
    code: number;
    status: string;
    message: string;
    data?: any;
  }> => {
    try {
      const response = await api.post("/boards/assign-members", payload);
      return response.data;
    } catch (error) {
      console.error("Assign members API error:", error);
      throw error;
    }
  },

  /**
   * Remove member from board
   */
  removeMembers: async (payload: {
    board_id: number;
    user_ids: number[];
    role_id: number;
    organization_id: number;
  }): Promise<{
    code: number;
    status: string;
    message: string;
    data?: any;
  }> => {
    try {
      const response = await api.delete("/boards/assign-members", {
        data: payload,
      });
      return response.data;
    } catch (error) {
      console.error("Remove members API error:", error);
      throw error;
    }
  },

  /**
   * Resend invitation
   */
  resendInvitation: async (payload: {
    board_id: number | string;
    user_id: number | string;
  }): Promise<any> => {
    try {
      const response = await api.post("/invites/resend", payload);
      return response.data;
    } catch (error) {
      console.error("Resend invitation API error:", error);
      throw error;
    }
  },

  /**
   * Clone/Duplicate board
   */
  cloneBoard: async (
    boardId: number | string,
  ): Promise<{
    code: number;
    status: string;
    message: string;
    data: {
      old_board_id: number;
      new_board_id: number;
    };
  }> => {
    try {
      const response = await api.post(BOARD_ENDPOINTS.CLONE, {
        board_id: boardId,
      });
      return response.data;
    } catch (error) {
      console.error("Clone board API error:", error);
      throw error;
    }
  },

  /**
   * Assign groups to a client user
   */
  assignClientGroups: async (payload: {
    user_id: number;
    organization_id: number;
    board_id: number;
    group_ids: number[];
  }): Promise<{
    code: number;
    status: string;
    message: string;
    data: {
      user_id: number;
      successfully_added: number[];
      already_existed: number[];
      failed: number[];
    };
  }> => {
    try {
      const response = await api.post("/clients/assign-groups", payload);
      return response.data;
    } catch (error) {
      console.error("Assign client groups API error:", error);
      throw error;
    }
  },

  /**
   * Remove a group from a client user
   */
  removeClientGroup: async (payload: {
    groupId: number | string;
    userId: number | string;
    organization_id: number;
  }): Promise<{
    code: number;
    status: string;
    message: string;
    data: {
      group_id: number;
      user_id: number;
    };
  }> => {
    try {
      const response = await api.delete(
        `/groups/${payload.groupId}/clients/${payload.userId}`,
        {
          data: { organization_id: payload.organization_id },
        },
      );
      return response.data;
    } catch (error) {
      console.error("Remove client group API error:", error);
      throw error;
    }
  },
};
