import api from "@/lib/axios";
import type {
  CreateBoardRequest,
  Board,
  CreateBoardResponse,
  GetBoardsResponse,
} from "./types";

const BOARD_ENDPOINTS = {
  CREATE: "/boards",
  GET_ALL: "/boards",
  GET_BY_ID: (id: string) => `/boards/${id}`,
  UPDATE: "/boards",
  DELETE: "/boards",
};

// const CACHE_CONTROL_HEADERS = {
//   'Cache-Control': 'no-cache, no-store, must-revalidate',
//   'Pragma': 'no-cache', 
// };

export const boardsApi = {
  /**
   * Get all boards
   */
  getBoards: async (): Promise<Board[]> => {
    try {
      const response = await api.get<GetBoardsResponse>(
        BOARD_ENDPOINTS.GET_ALL,
        {
          // headers: CACHE_CONTROL_HEADERS
        }
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
    data: CreateBoardRequest
  ): Promise<CreateBoardResponse> => {
    try {
      const response = await api.post<any>(BOARD_ENDPOINTS.CREATE, data, {
        // headers: CACHE_CONTROL_HEADERS
      });
      console.log("Raw API response:", response);

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
    data: Partial<CreateBoardRequest>
  ): Promise<Board> => {
    const response = await api.put<Board>(BOARD_ENDPOINTS.UPDATE, {
      id,
      ...data,
    }, {
      // headers: CACHE_CONTROL_HEADERS
    });
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
};
