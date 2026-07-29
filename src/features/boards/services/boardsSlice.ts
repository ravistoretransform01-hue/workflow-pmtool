import { createSlice } from "@reduxjs/toolkit";
import { createBoardThunk, fetchBoardsThunk } from "@/features/boards/services/boardsThunks";
import type { Board } from "@/features/boards/types/types";

interface BoardsState {
  boards: Board[];
  loading: boolean;
  fetchLoading: boolean;
  error: string | null;
  createdBoard: Board | null;
}

const initialState: BoardsState = {
  boards: [],
  loading: false,
  fetchLoading: false,
  error: null,
  createdBoard: null,
};

const boardsSlice = createSlice({
  name: "boards",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCreatedBoard: (state) => {
      state.createdBoard = null;
    },
    updateBoardInStore: (state, action) => {
      const { id, updates } = action.payload;
      const boardIndex = state.boards.findIndex((b) => String(b.id) === String(id));
      if (boardIndex !== -1) {
        state.boards[boardIndex] = { ...state.boards[boardIndex], ...updates };
      }
    },
  },
  extraReducers: (builder) => {
    // Fetch Boards
    builder
      .addCase(fetchBoardsThunk.pending, (state) => {
        state.fetchLoading = true;
        state.error = null;
      })
      .addCase(fetchBoardsThunk.fulfilled, (state, action) => {
        state.fetchLoading = false;
        state.boards = action.payload;
      })
      .addCase(fetchBoardsThunk.rejected, (state, action) => {
        state.fetchLoading = false;
        state.error = action.payload || "Failed to fetch boards";
      });

    // Create Board
    builder
      .addCase(createBoardThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createBoardThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.createdBoard = action.payload;
        state.boards.push(action.payload);
      })
      .addCase(createBoardThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to create board";
      });
  },
});

export const { clearError, clearCreatedBoard, updateBoardInStore } = boardsSlice.actions;
export default boardsSlice.reducer;
