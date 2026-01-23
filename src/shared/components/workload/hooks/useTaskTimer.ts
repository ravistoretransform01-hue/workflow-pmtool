import { useState, useCallback } from "react";

/**
 * Hook for managing task timer state
 * Tracks which task's timer is running and provides timer control
 * Reusable across all views
 */
export function useTaskTimer() {
  const [activeTimerId, setActiveTimerId] = useState<string | null>(null);
  const [timerUpdateTrigger, setTimerUpdateTrigger] = useState(0);

  const startTimer = useCallback((taskId: string) => {
    setActiveTimerId(taskId);
  }, []);

  const stopTimer = useCallback(() => {
    setActiveTimerId(null);
  }, []);

  const switchTimer = useCallback((taskId: string) => {
    setActiveTimerId(taskId);
  }, []);

  const isTimerRunning = useCallback(
    (taskId: string) => activeTimerId === taskId,
    [activeTimerId]
  );

  const triggerTimerUpdate = useCallback(() => {
    setTimerUpdateTrigger((prev) => prev + 1);
  }, []);

  return {
    // State
    activeTimerId,
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
