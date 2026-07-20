import { useState, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@/hooks";
import {
  startTimer as startTimerAction,
  stopTimer as stopTimerAction,
  setActiveTimerId as setActiveTimerIdAction,
} from "@/features/tasks/tasksSlice";

/**
 * Hook for managing task timer state
 * Tracks which task's timer is running and provides timer control
 * Reusable across all views
 */
export function useTaskTimer() {
  const dispatch = useAppDispatch();
  const activeTimerId = useAppSelector((state) => state.tasks.activeTimerId);
  const timerStartTime = useAppSelector((state) => state.tasks.timerStartTime);
  const [timerUpdateTrigger, setTimerUpdateTrigger] = useState(0);

  const startTimer = useCallback(
    (taskId: string, taskName: string, trackedTimeSeconds: number) => {
      dispatch(startTimerAction({ taskId, taskName, trackedTimeSeconds }));
    },
    [dispatch],
  );

  const stopTimer = useCallback(() => {
    dispatch(stopTimerAction());
  }, [dispatch]);

  const switchTimer = useCallback(
    (taskId: string, taskName: string, trackedTimeSeconds: number) => {
      dispatch(startTimerAction({ taskId, taskName, trackedTimeSeconds }));
    },
    [dispatch],
  );

  const isTimerRunning = useCallback(
    (taskId: string) => activeTimerId === taskId,
    [activeTimerId],
  );

  const triggerTimerUpdate = useCallback(() => {
    setTimerUpdateTrigger((prev) => prev + 1);
  }, []);

  const setActiveTimerId = useCallback(
    (taskId: string | null) => {
      dispatch(setActiveTimerIdAction(taskId));
    },
    [dispatch],
  );

  return {
    // State
    activeTimerId,
    timerStartTime,
    timerUpdateTrigger,

    // Setters
    setActiveTimerId,
    setTimerUpdateTrigger,

    // Actions
    startTimer,
    stopTimer,
    switchTimer,
    isTimerRunning,
    triggerTimerUpdate,
  };
}
