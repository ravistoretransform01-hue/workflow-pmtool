import { useState, useEffect } from "react";
import { X, Trash2, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Avatar, AvatarFallback } from "@/shared/components/ui/avatar";
import { tasksApi } from "@/features/tasks/tasksApi";
import type { TimeEntry } from "@/features/tasks/types";
import { format, parseISO } from "date-fns";

interface TimeLogEntry extends TimeEntry {
  date: string;
  startTime: string;
  endTime: string;
  duration: string;
  user: {
    initials: string;
    name: string;
    color: string;
  };
}

interface TimeTrackingLogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string;
  taskName?: string;
}

// Helper function to format time entry data
const formatTimeEntry = (entry: TimeEntry): TimeLogEntry => {
  const startDate = parseISO(entry.start_time);
  const endDate = parseISO(entry.end_time);

  const date = format(startDate, "MMM dd");
  const startTime = format(startDate, "h:mm a");
  const endTime = format(endDate, "h:mm a");

  const hours = Math.floor(entry.elapsed_seconds / 3600);
  const minutes = Math.floor((entry.elapsed_seconds % 3600) / 60);
  const seconds = entry.elapsed_seconds % 60;
  const duration = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  const initials = entry.user_name
    .split(/\s+/)
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return {
    ...entry,
    date,
    startTime,
    endTime,
    duration,
    user: {
      initials,
      name: entry.user_name,
      color: "#3b82f6",
    },
  };
};

export function TimeTrackingLogDialog({
  open,
  onOpenChange,
  taskId,
  taskName = "Task",
}: TimeTrackingLogDialogProps) {
  const [timeLogs, setTimeLogs] = useState<TimeLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // taskName is reserved for future use (e.g., in dialog header or breadcrumb)

  // Fetch time entries when dialog opens
  useEffect(() => {
    if (open) {
      fetchTimeEntries();
    }
  }, [open, taskId]);

  const fetchTimeEntries = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await tasksApi.getTimeEntries(taskId);
      const formattedEntries = data.entries.map(formatTimeEntry);
      setTimeLogs(formattedEntries);
    } catch (err) {
      console.error("Failed to fetch time entries:", err);
      setError("Failed to load time entries");
      toast.error("Failed to load time entries");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteLog = (id: string) => {
    setTimeLogs((prev) => prev.filter((log) => log.id !== id));
  };

  const handleClear = () => {
    if (confirm("Are you sure you want to clear all time logs?")) {
      setTimeLogs([]);
    }
  };

  const handleExportToExcel = () => {
    // Placeholder for future Excel export functionality
    console.log("Export to Excel clicked for task:", taskId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="bg-card border-border max-w-2xl p-0 h-[85vh] max-h-[700px] flex flex-col overflow-visible rounded-lg"
        hideCloseButton
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4  border-border/50">
          <DialogTitle className="text-xl font-semibold text-foreground">
            Time Tracking Log
          </DialogTitle>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="h-8 px-3 text-sm font-medium text-foreground hover:bg-muted"
            >
              Clear
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExportToExcel}
              className="h-8 px-3 text-sm font-medium text-foreground hover:bg-muted"
            >
              Export to Excel
            </Button>
            <button
              onClick={() => onOpenChange(false)}
              className="text-muted-foreground hover:text-foreground transition-colors ml-2"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Add Session Button */}
        <div className="flex justify-center px-6 py-3 border-border/50">
          <Button
            variant="outline"
            size="sm"
            className="h-12 text-sm gap-2 border-border/50"
          >
            <Plus className="h-4 w-4" />
            Add session manually
          </Button>
        </div>

        {/* Time Logs List */}
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
                <p className="text-sm text-muted-foreground">
                  Loading time logs...
                </p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center gap-3">
                <p className="text-sm text-destructive">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchTimeEntries}
                  className="h-8 text-xs"
                >
                  Retry
                </Button>
              </div>
            </div>
          ) : timeLogs.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              No time logs yet
            </div>
          ) : (
            <div className="space-y-4 px-4">
              {timeLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center gap-4 px-6 py-2 border-border/30 hover:bg-muted/80 transition-colors group bg-background hover:shadow-sm rounded-md"
                >
                  {/* User Avatar */}
                  <Avatar className="h-10 w-10 flex-shrink-0">
                    <AvatarFallback
                      style={{ background: log.user.color, color: "white" }}
                      className="text-xs font-semibold"
                    >
                      {log.user.initials}
                    </AvatarFallback>
                  </Avatar>

                  {/* Date */}
                  <div className="w-20 text-sm text-muted-foreground font-medium">
                    {log.date}
                  </div>

                  {/* Time Range */}
                  <div className="flex-1 text-sm text-foreground font-medium">
                    {log.startTime} - {log.endTime}
                  </div>

                  {/* Duration */}
                  <div className="w-24 text-sm font-bold text-foreground text-center">
                    {log.duration}
                  </div>

                  {/* Tag or Add Tag */}
                  <div className="w-32">
                    {log.note ? (
                      <span className="text-xs text-primary font-medium">
                        {log.note}
                      </span>
                    ) : (
                      <button className="text-xs text-primary hover:underline font-medium">
                        + Add tag
                      </button>
                    )}
                  </div>

                  {/* Delete Button */}
                  <button
                    onClick={() => handleDeleteLog(log.id)}
                    className="p-1.5 text-muted-foreground hover:text-destructive transition-colors  "
                    title="Delete log entry"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
