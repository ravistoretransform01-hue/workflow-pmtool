import { useEffect, useState } from "react";
import { useAppSelector, useAppDispatch } from "@/app/hooks";
import { stopTimer } from "@/features/tasks/tasksSlice";
import { tasksApi } from "@/features/tasks/tasksApi";
import { Square, Timer } from "lucide-react";
import { toast } from "sonner";

export function GlobalTimer() {
  const dispatch = useAppDispatch();
  const { activeTimerId, timerStartTime, activeTaskInfo } = useAppSelector(
    (state) => state.tasks,
  );
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!activeTimerId || !timerStartTime) {
      setElapsed(0);
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      const diff = Math.floor((now - timerStartTime) / 1000);
      setElapsed(diff);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activeTimerId, timerStartTime]);

  const handleStop = async () => {
    if (!activeTimerId) return;
    try {
      await tasksApi.stopTimer(activeTimerId);
      dispatch(stopTimer());
      toast.success("Timer Stopped");
    } catch (error) {
      console.error("Failed to stop timer:", error);
      toast.error("Failed to stop timer");
    }
  };

  if (!activeTimerId || !activeTaskInfo) return null;

  const totalSeconds = (activeTaskInfo.trackedTimeSeconds || 0) + elapsed;

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}h ${m}m ${s}s`;
  };

  return (
    <div className="flex items-center gap-3 px-3 py-1.5 bg-blue-600/20 border border-blue-500/30 rounded-full animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="flex items-center gap-2 max-w-[200px]">
        <Timer className="h-4 w-4 text-blue-400 animate-pulse" />
        <span
          className="text-xs font-medium text-blue-100 truncate"
          title={activeTaskInfo.name}
        >
          {activeTaskInfo.name}
        </span>
      </div>
      <div className="h-4 w-[1px] bg-blue-500/30" />
      <span className="text-xs font-mono font-bold text-blue-400 tabular-nums">
        {formatTime(totalSeconds)}
      </span>
      <button
        onClick={handleStop}
        className="p-1 hover:bg-blue-500/30 rounded-full transition-colors group"
        title="Stop Timer"
      >
        <Square className="h-3 w-3 text-blue-400 group-hover:fill-blue-400" />
      </button>
    </div>
  );
}
