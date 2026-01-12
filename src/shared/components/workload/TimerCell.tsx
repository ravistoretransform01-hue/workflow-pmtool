import { useState, useEffect } from "react";
import { Play, Pause } from "lucide-react";
import { toast } from "sonner";
import { tasksApi } from "@/features/tasks/tasksApi";

interface TimerCellProps {
  taskId: string;
  trackedTimeSeconds?: number;
  activeTimerId: string | null;
  onTimerStart: (taskId: string | null) => void;
  onTimerConflict?: (taskId: string) => void;
}

export function TimerCell({
  taskId,
  trackedTimeSeconds = 0,
  activeTimerId,
  onTimerStart,
  onTimerConflict,
}: TimerCellProps) {
  const [seconds, setSeconds] = useState(trackedTimeSeconds);
  const [isLoading, setIsLoading] = useState(false);
  const isRunning = activeTimerId === taskId;

  // Update seconds when trackedTimeSeconds prop changes (e.g., on page refresh)
  useEffect(() => {
    setSeconds(trackedTimeSeconds);
  }, [trackedTimeSeconds]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isRunning) {
      interval = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const handlePlayPause = async () => {
    setIsLoading(true);
    try {
      if (isRunning) {
        // Stop timer
        await tasksApi.stopTimer(taskId);
        onTimerStart(null);
        toast.success("Timer stopped");
      } else {
        // Check for conflict
        if (activeTimerId && activeTimerId !== taskId) {
          onTimerConflict?.(activeTimerId);
          setIsLoading(false);
          return;
        }

        // Start timer
        await tasksApi.startTimer(taskId);
        onTimerStart(taskId);
        toast.success("Timer started");
      }
    } catch (error) {
      console.error("Failed to update timer:", error);
      toast.error("Failed to update timer");
    } finally {
      setIsLoading(false);
    }
  };

  // Determine background color based on timer state
  let bgColor = "bg-blue-500/50"; // Default: blue
  if (isRunning) {
    bgColor = "bg-green-500/50"; // Running: green
  }

  return (
    <div
      className={`flex items-center justify-center gap-2 w-full h-full ${bgColor} rounded`}
    >
      <button
        onClick={handlePlayPause}
        disabled={isLoading}
        className="p-2 hover:bg-muted rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title={isRunning ? "Pause" : "Start"}
      >
        {isRunning ? (
          <Pause className="h-4 w-4 text-foreground" />
        ) : (
          <Play className="h-4 w-4 text-foreground" />
        )}
      </button>
      <div className="rounded px-3 py-1 min-w-14 text-center">
        <span className="text-sm font-medium">{formatTime(seconds)}</span>
      </div>
    </div>
  );
}
