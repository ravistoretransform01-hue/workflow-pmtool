import { createAsyncThunk } from "@reduxjs/toolkit";
import { boardsApi } from "./boardsApi";
import type { CreateBoardRequest, Board } from "./types";
import { debugLog } from "@/lib/debugLog";

export const createBoardThunk = createAsyncThunk<
  Board,
  CreateBoardRequest,
  {
    rejectValue: string;
  }
>("boards/createBoard", async (data, { rejectWithValue }) => {
  try {
    debugLog("Creating board with data:", data);
    const response = await boardsApi.createBoard(data);
    
    debugLog("Board creation response:", response);
    
    // Handle different response formats
    let boardData: Board | null = null;
    
    if (response.data && typeof response.data === 'object' && response.data.id) {
      boardData = response.data;
    } else if (response.success === false) {
      return rejectWithValue(response.message || "Failed to create board");
    }
    
    if (!boardData) {
      return rejectWithValue("Invalid response format from server");
    }
    
    return boardData;
  } catch (error: any) {
    console.error("Board creation error:", error);
    
    const errorData = error.response?.data;
    let errorMessage = "Failed to create board. Please try again.";

    if (errorData?.message) {
      if (Array.isArray(errorData.message)) {
        errorMessage = errorData.message[0]?.message || errorMessage;
      } else if (typeof errorData.message === "string") {
        errorMessage = errorData.message;
      }
    } else if (error.message) {
      errorMessage = error.message;
    }

    console.error("Final error message:", errorMessage);
    return rejectWithValue(errorMessage);
  }
});

export const fetchBoardsThunk = createAsyncThunk<
  Board[],
  void,
  {
    rejectValue: string;
  }
>("boards/fetchBoards", async (_, { rejectWithValue }) => {
  try {
    debugLog("Fetching boards...");
    const boards = await boardsApi.getBoards();
    debugLog("Boards fetched:", boards);
    return boards;
  } catch (error: any) {
    console.error("Fetch boards error:", error);
    const errorMessage = error.message || "Failed to fetch boards";
    return rejectWithValue(errorMessage);
  }
});
