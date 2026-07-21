import { useDispatch, useSelector } from "react-redux";
import { useCallback } from "react";
import type { RootState, AppDispatch } from "@/store";
import { createBoardThunk, fetchBoardsThunk } from "@/features/boards/services/boardsThunks";
import { clearError, clearCreatedBoard } from "@/features/boards/services/boardsSlice";
import type { CreateBoardRequest } from "@/features/boards/types/types";

export const useBoards = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { boards, loading, fetchLoading, error, createdBoard } = useSelector(
    (state: RootState) => state.boards
  );

  const fetchBoards = useCallback(async () => {
    const result = await dispatch(fetchBoardsThunk());
    return result;
  }, [dispatch]);

  const createBoard = useCallback(
    async (data: CreateBoardRequest) => {
      const result = await dispatch(createBoardThunk(data));
      return result;
    },
    [dispatch]
  );

  const clearBoardError = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);

  const resetCreatedBoard = useCallback(() => {
    dispatch(clearCreatedBoard());
  }, [dispatch]);

  return {
    boards,
    loading,
    fetchLoading,
    error,
    createdBoard,
    fetchBoards,
    createBoard,
    clearBoardError,
    resetCreatedBoard,
  };
};
