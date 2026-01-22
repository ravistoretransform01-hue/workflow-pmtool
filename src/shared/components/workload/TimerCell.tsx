import { useState, useEffect } from "react";
import { Play, Pause } from "lucide-react";
import { toast } from "sonner";
import { tasksApi } from "@/features/tasks/tasksApi";
import { TimeTrackingLogDialog } from "./TimeTrackingLogDialog";

interface TimerCellProps {
  taskId: string;
  trackedTimeSeconds?: number;
  activeTimerId: string | null;
  onTimerStart: (taskId: string | null) => void;
  onTimerConflict?: (taskId: string) => void;
  hasAssignee?: boolean;
  estimatedHours?: string | number;
  taskName?: string;
}

export function TimerCell({
  taskId,
  trackedTimeSeconds = 0,
  activeTimerId,
  onTimerStart,
  onTimerConflict,
  hasAssignee = false,
  estimatedHours = "-",
  taskName = "Task",
}: TimerCellProps) {
  const [seconds, setSeconds] = useState(trackedTimeSeconds);
  const [isLoading, setIsLoading] = useState(false);
  const [showTimeLog, setShowTimeLog] = useState(false);
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

  // Parse estimated hours to get total seconds
  const parseEstimatedHours = (value: string | number): number => {
    if (!value || value === "-") return 0;
    
    const strValue = String(value);
    // Check if it's in "02h 30m" format
    const match = strValue.match(/(\d+)h\s*(\d+)m/);
    if (match) {
      const hours = parseInt(match[1]);
      const minutes = parseInt(match[2]);
      return hours * 3600 + minutes * 60;
    }
    
    // Check if it's in "2h" format
    const hoursMatch = strValue.match(/(\d+)h/);
    if (hoursMatch) {
      return parseInt(hoursMatch[1]) * 3600;
    }
    
    // Otherwise treat as decimal hours
    const numValue = parseFloat(strValue);
    if (!isNaN(numValue)) {
      return numValue * 3600;
    }
    
    return 0;
  };

  // Calculate progress percentage
  const estimatedSeconds = parseEstimatedHours(estimatedHours);
  const progressPercentage = estimatedSeconds > 0 ? (seconds / estimatedSeconds) * 100 : 0;

  // Determine background color based on progress
  let bgColor = "bg-blue-600"; // Default: blue (< 75%)
  if (progressPercentage >= 75 && progressPercentage < 100) {
    bgColor = "bg-orange-600"; // Orange (75% - 100%)
  } else if (progressPercentage >= 100) {
    // Red if progress > 100%, regardless of timer state
    bgColor = "bg-red-600"; // Red (> 100%)
  }

  const handlePlayPause = async () => {
    // Check if assignee exists before starting timer
    if (!hasAssignee && !isRunning) {
      toast.error("Please assign a person before starting the timer");
      return;
    }

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

  return (
    <>
      <div
        className={`flex items-center justify-center gap-2 w-full h-full ${bgColor} rounded`}
      >
        <button
          onClick={handlePlayPause}
          disabled={isLoading || (!hasAssignee && !isRunning)}
          className="p-2 hover:bg-muted rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title={
            !hasAssignee && !isRunning
              ? "Assign a person first"
              : isRunning
              ? "Pause"
              : "Start"
          }
        >
          {isRunning ? (
            <Pause className="h-4 w-4 text-white" />
          ) : (
            <Play className="h-4 w-4 text-white" />
          )}
        </button>
        <button
          onClick={() => setShowTimeLog(true)}
          className="rounded px-3 py-1 min-w-14 text-center hover:opacity-80 transition-opacity cursor-pointer"
          title="View time tracking log"
        >
          <span className="text-sm font-medium text-white">{formatTime(seconds)}</span>
        </button>
      </div>

      <TimeTrackingLogDialog
        open={showTimeLog}
        onOpenChange={setShowTimeLog}
        taskId={taskId}
        taskName={taskName}
      />
    </>
  );
}
