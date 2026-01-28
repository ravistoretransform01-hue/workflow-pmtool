import { useState, useEffect } from "react";
import { Play, Pause } from "lucide-react";
import { toast } from "sonner";
import { tasksApi } from "@/features/tasks/tasksApi";
import { TimeTrackingLogDialog } from "./TimeTrackingLogDialog";
import { getCurrentUserId } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip";
import { parseISO, isAfter, endOfDay, startOfToday } from "date-fns";

interface TimerCellProps {
  taskId: string;
  trackedTimeSeconds?: number;
  activeTimerId: string | null;
  onTimerStart: (taskId: string | null) => void;
  onTimerConflict?: (taskId: string) => void;
  hasAssignee?: boolean;
  estimatedHours?: string | number;
  taskName?: string;
  assignedToIds?: string[];
  estimatedDate?: string;
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
  assignedToIds = [],
  estimatedDate = "-",
}: TimerCellProps) {
  const [seconds, setSeconds] = useState(trackedTimeSeconds);
  const [isLoading, setIsLoading] = useState(false);
  const [showTimeLog, setShowTimeLog] = useState(false);
  const isRunning = activeTimerId === taskId;
  const currentUserId = getCurrentUserId();

  // Check if current user is assigned to this task
  const isAssignedToCurrentUser = assignedToIds.some(
    (id) => String(id) === String(currentUserId)
  );

  // Check if estimated date is overdue (past today)
  const isOverdue = (() => {
    if (!estimatedDate || estimatedDate === "-") return false;
    try {
      // Extract the end date from the date range (e.g., "Jan 19 - 30" or "27 jan, '26")
      // For single dates like "27 jan, '26", use that date
      // For ranges like "Jan 19 - 30", use the end date (30)
      let dateStr = estimatedDate;
      
      // If it's a range format like "Jan 19 - 30", extract the end date
      if (dateStr.includes(" - ")) {
        const parts = dateStr.split(" - ");
        const endPart = parts[1].trim();
        const monthPart = parts[0].split(" ")[0]; // Get month from first part
        
        // Reconstruct as "Jan 30" format
        dateStr = `${monthPart} ${endPart}`;
      }
      
      // If it's a range format like "Jan 31 – Feb 15", extract the end date
      if (dateStr.includes(" - ")) {
        const parts = dateStr.split(" - ");
        dateStr = parts[1].trim(); // Use the end date part
      }
      
      // Parse the date string
      // Handle formats like "27 jan, '26" or "Jan 30"
      const parsedDate = parseISO(dateStr);
      const todayDate = startOfToday();
      
      // Check if the date is before today (overdue)
      return isAfter(todayDate, endOfDay(parsedDate));
    } catch (error) {
      return false;
    }
  })();

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
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else {
      return `${hours}h ${minutes}m ${secs}s`;
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

  // Determine background color based on overdue status first, then progress
  let bgColor = "bg-blue-600"; // Default: blue (< 75%)
  
  if (isOverdue) {
    // Red if overdue, regardless of progress percentage
    bgColor = "bg-red-600";
  } else if (progressPercentage >= 75 && progressPercentage < 100) {
    bgColor = "bg-orange-600"; // Orange (75% - 100%)
  } else if (progressPercentage >= 100) {
    bgColor = "bg-red-600"; // Red (> 100%)
  }

  const handlePlayPause = async () => {
    // Check if current user is assigned to this task before starting timer
    if (!isRunning && !isAssignedToCurrentUser) {
      if (hasAssignee) {
        toast.error("You can only track time for tasks assigned to you");
      } else {
        toast.error("Task needs an assignee to track time");
      }
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
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handlePlayPause}
                disabled={isLoading || (!isAssignedToCurrentUser && !isRunning)}
                className="p-2 hover:bg-muted rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRunning ? (
                  <Pause className="h-4 w-4 text-white" />
                ) : (
                  <Play className="h-4 w-4 text-white" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent>
              {!isAssignedToCurrentUser && !isRunning
                ? hasAssignee
                  ? "You can only track time for tasks assigned to you"
                  : "Task needs an assignee to track time"
                : isRunning
                ? "Pause"
                : "Start"}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
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
