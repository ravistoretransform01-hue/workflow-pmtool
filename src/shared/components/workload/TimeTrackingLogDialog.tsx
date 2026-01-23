import { useState, useEffect } from "react";
import { X, Trash2, Plus, Loader2, Clock, Tag } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Avatar, AvatarFallback } from "@/shared/components/ui/avatar";
import { Calendar } from "@/shared/components/ui/calendar";
import { Input } from "@/shared/components/ui/input";
import { tasksApi } from "@/features/tasks/tasksApi";
import type { TimeEntry } from "@/features/tasks/types";
import { format } from "date-fns";
import { TimePickerInput } from "@/shared/components/TimePickerInput";

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
  /**
   * API sends UTC datetime without timezone info
   * Example: "2026-01-22 13:13:46" (UTC)
   * We must parse it as UTC, not local time
   */
  const parseUtcTime = (timeStr: string): Date => {
    // Convert "YYYY-MM-DD HH:mm:ss" → "YYYY-MM-DDTHH:mm:ssZ"
    return new Date(timeStr.replace(" ", "T") + "Z");
  };

  const startDate = parseUtcTime(entry.start_time);
  const endDate = entry.end_time ? parseUtcTime(entry.end_time) : new Date();

  // ---- Date (Jan 22) ----
  const dateFormatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });

  const dateParts = dateFormatter.formatToParts(startDate);
  const month = dateParts.find((p) => p.type === "month")?.value ?? "";
  const day = dateParts.find((p) => p.type === "day")?.value ?? "";
  const date = `${month} ${day}`;

  // ---- Time (hh:mm AM/PM) ----
  const timeFormatter = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });

  const startTime = timeFormatter.format(startDate);
  const endTime = entry.end_time ? timeFormatter.format(endDate) : "Active...";

  // ---- Duration ----
  const durationSeconds = entry.elapsed_seconds ?? 0;
  const hours = Math.floor(durationSeconds / 3600);
  const minutes = Math.floor((durationSeconds % 3600) / 60);
  const seconds = durationSeconds % 60;

  const duration = `${String(hours).padStart(2, "0")}:${String(
    minutes,
  ).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  // ---- User initials ----
  const initials = entry.user_name
    .trim()
    .split(/\s+/)
    .map((n) => n[0])
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

// Helper function to format time entry data
// const formatTimeEntry = (entry: TimeEntry): TimeLogEntry => {
//   // API returns times in local timezone format (e.g., "2026-01-22 13:13:46")
//   // Parse them as local times, not UTC
//   const parseLocalTime = (timeStr: string): Date => {
//     const [datePart, timePart] = timeStr.split(" ");
//     const [year, month, day] = datePart.split("-").map(Number);
//     const [hours, minutes, seconds] = timePart.split(":").map(Number);
//     return new Date(year, month - 1, day, hours, minutes, seconds);
//   };

//   const startDate = parseLocalTime(entry.start_time);
//   const endDate = entry.end_time ? parseLocalTime(entry.end_time) : new Date();

//   console.log("API start_time:", entry.start_time);
//   console.log("Parsed startDate:", startDate);

//   // Format date
//   const dateFormatter = new Intl.DateTimeFormat("en-US", {
//     month: "short",
//     day: "2-digit",
//   });
//   const dateParts = dateFormatter.formatToParts(startDate);
//   const month = dateParts.find((p) => p.type === "month")?.value || "";
//   const day = dateParts.find((p) => p.type === "day")?.value || "";
//   const date = `${month} ${day}`;

//   // Format time in 12-hour format (hh:mm AM/PM)
//   const timeFormatter = new Intl.DateTimeFormat("en-US", {
//     hour: "2-digit",
//     minute: "2-digit",
//     hour12: true,
//   });

//   const startTimeFormatted = timeFormatter.format(startDate);
//   const endTimeFormatted = entry.end_time ? timeFormatter.format(endDate) : "Active...";

//   console.log("Formatted startTime:", startTimeFormatted);

//   const startTime = startTimeFormatted;
//   const endTime = endTimeFormatted;

//   let duration: string;
//   if (entry.end_time) {
//     // Timer has ended
//     const hours = Math.floor(entry.elapsed_seconds / 3600);
//     const minutes = Math.floor((entry.elapsed_seconds % 3600) / 60);
//     const seconds = entry.elapsed_seconds % 60;
//     duration = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
//   } else {
//     // Timer is still running - show elapsed time
//     const hours = Math.floor(entry.elapsed_seconds / 3600);
//     const minutes = Math.floor((entry.elapsed_seconds % 3600) / 60);
//     const seconds = entry.elapsed_seconds % 60;
//     duration = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
//   }

//   const initials = entry.user_name
//     .split(/\s+/)
//     .map((n) => n[0])
//     .filter(Boolean)
//     .slice(0, 2)
//     .join("")
//     .toUpperCase();

//   return {
//     ...entry,
//     date,
//     startTime,
//     endTime,
//     duration,
//     user: {
//       initials,
//       name: entry.user_name,
//       color: "#3b82f6",
//     },
//   };
// };

export function TimeTrackingLogDialog({
  open,
  onOpenChange,
  taskId,
}: TimeTrackingLogDialogProps) {
  const [timeLogs, setTimeLogs] = useState<TimeLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showManualSession, setShowManualSession] = useState(false);

  // Manual session form state
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [startTime, setStartTime] = useState("12:00 PM");
  const [endTime, setEndTime] = useState("1:00 PM");
  const [tag, setTag] = useState("");
  const [duration, setDuration] = useState("01h 00m 00s");

  // Fetch time entries when dialog opens
  useEffect(() => {
    if (open) {
      setShowManualSession(false);
      fetchTimeEntries();
    }
  }, [open, taskId]);

  useEffect(() => {
    console.log(startTime);
    console.log(endTime);
    console.log(duration);
  }, [startTime, endTime, duration]);

  const calculateDuration = () => {
    try {
      // Parse time strings (e.g., "12:00 PM" -> hours and minutes)
      const parseTime = (timeStr: string) => {
        const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
        if (!match) return null;

        let hours = parseInt(match[1]);
        const minutes = parseInt(match[2]);
        const period = match[3].toUpperCase();

        // Convert to 24-hour format
        if (period === "PM" && hours !== 12) {
          hours += 12;
        } else if (period === "AM" && hours === 12) {
          hours = 0;
        }

        return hours * 60 + minutes; // Return total minutes
      };

      const startMinutes = parseTime(startTime);
      const endMinutes = parseTime(endTime);

      if (startMinutes === null || endMinutes === null) {
        return "00h 00m 00s";
      }

      let diffMinutes = endMinutes - startMinutes;

      // Handle case where end time is on the next day
      if (diffMinutes < 0) {
        diffMinutes += 24 * 60;
      }

      const hours = Math.floor(diffMinutes / 60);
      const minutes = diffMinutes % 60;

      return `${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m 00s`;
    } catch (err) {
      return "00h 00m 00s";
    }
  };

  // Update duration when start or end time changes
  useEffect(() => {
    setDuration(calculateDuration());
  }, [startTime, endTime]);

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

  const handleDeleteLog = async (id: string) => {
    try {
      await tasksApi.deleteTimeEntry(id);
      setTimeLogs((prev) => prev.filter((log) => log.id !== id));
      toast.success("Time entry deleted successfully");
    } catch (error) {
      console.error("Failed to delete time entry:", error);
      toast.error("Failed to delete time entry");
    }
  };

  const handleClear = async () => {
    if (confirm("Are you sure you want to clear all time logs?")) {
      try {
        // Delete all time entries
        await Promise.all(timeLogs.map((log) => tasksApi.deleteTimeEntry(log.id)));
        setTimeLogs([]);
        toast.success("All time entries deleted successfully");
      } catch (error) {
        console.error("Failed to clear time logs:", error);
        toast.error("Failed to clear time logs");
      }
    }
  };

  const handleExportToExcel = () => {
    // Create CSV content
    const headers = ["User", "Date", "Start Time", "End Time", "Duration"];
    const rows = timeLogs.map((log) => [
      log.user.name,
      log.date,
      log.startTime,
      log.endTime,
      log.duration,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    // Create blob and download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `time-tracking-${taskId}-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
    toast.success("Exported to CSV");
  };

  const handleAddSession = () => {
    // Convert local time to UTC
    const convertLocalToUTC = (dateStr: string, timeStr: string): string => {
      // Parse the local time
      const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
      if (!match) return "";

      let hours = parseInt(match[1]);
      const minutes = parseInt(match[2]);
      const period = match[3].toUpperCase();

      // Convert to 24-hour format
      if (period === "PM" && hours !== 12) {
        hours += 12;
      } else if (period === "AM" && hours === 12) {
        hours = 0;
      }

      // Create a local date object
      const [year, month, day] = dateStr.split("-").map(Number);
      const localDate = new Date(year, month - 1, day, hours, minutes, 0);

      // Convert to UTC by getting the offset and adjusting
      const utcDate = new Date(
        localDate.getTime() - localDate.getTimezoneOffset() * 60000
      );

      // Format as "YYYY-MM-DD HH:mm:ss" in UTC
      const utcYear = utcDate.getUTCFullYear();
      const utcMonth = String(utcDate.getUTCMonth() + 1).padStart(2, "0");
      const utcDay = String(utcDate.getUTCDate()).padStart(2, "0");
      const utcHours = String(utcDate.getUTCHours()).padStart(2, "0");
      const utcMinutes = String(utcDate.getUTCMinutes()).padStart(2, "0");
      const utcSeconds = String(utcDate.getUTCSeconds()).padStart(2, "0");

      return `${utcYear}-${utcMonth}-${utcDay} ${utcHours}:${utcMinutes}:${utcSeconds}`;
    };

    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const startTimeUTC = convertLocalToUTC(dateStr, startTime);
    const endTimeUTC = convertLocalToUTC(dateStr, endTime);

    const payload = {
      task_id: taskId,
      start_time: startTimeUTC,
      end_time: endTimeUTC,
      note: tag || undefined,
    };

    // Call API to add manual time entry
    (async () => {
      try {
        setIsLoading(true);
        await tasksApi.addManualTimeEntry(payload);
        toast.success("Session added successfully");
        // Reset form and go back to time logs view
        setShowManualSession(false);
        setSelectedDate(new Date());
        setStartTime("12:00 PM");
        setEndTime("01:00 PM");
        setTag("");
        // Refresh the time logs list
        await fetchTimeEntries();
      } catch (error) {
        console.error("Failed to add session:", error);
        toast.error("Failed to add session");
      } finally {
        setIsLoading(false);
      }
    })();
  };

  const handleBackToLogs = () => {
    setShowManualSession(false);
    setSelectedDate(new Date());
    setStartTime("12:00 PM");
    setEndTime("01:00 PM");
    setTag("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="bg-card border-border max-w-2xl p-0 h-[85vh] max-h-[700px] flex flex-col overflow-visible rounded-lg"
        hideCloseButton
      >
        {showManualSession ? (
          // Manual Session Add View
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
              <DialogTitle className="text-xl font-semibold text-foreground">
                Add session
              </DialogTitle>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleBackToLogs}
                  className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => onOpenChange(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Form Content */}
            <div className="flex-1 overflow-y-auto scrollbar-hide px-6 py-6">
              <div className="space-y-6">
                {/* Calendar Section */}
                <div className="flex flex-col items-center gap-4">
                  <div className="text-center">
                    {/* <h3 className="text-lg font-semibold text-foreground mb-4">
                      {format(selectedDate, "MMMM yyyy")}
                    </h3> */}
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => {
                        if (date) {
                          setSelectedDate(date);
                        }
                      }}
                      disabled={(date) => date > new Date()}
                      className="mx-auto"
                    />
                  </div>
                </div>

                {/* Time Pickers Section */}
                <div className="grid grid-cols-2 gap-6">
                  {/* Start Time */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      Start at
                    </label>
                    <div className="flex items-center gap-2 bg-muted rounded-md px-3 py-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <TimePickerInput
                        value={startTime}
                        onChange={setStartTime}
                        className="w-full"
                      />
                    </div>
                  </div>

                  {/* End Time */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      End at
                    </label>
                    <div className="flex items-center gap-2 bg-muted rounded-md px-3 py-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <TimePickerInput
                        value={endTime}
                        onChange={setEndTime}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>

                {/* Tag */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Tag (optional)
                  </label>
                  <div className="flex items-center gap-2 bg-muted rounded-md px-3 py-2">
                    <Tag className="h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Select or add a tag..."
                      value={tag}
                      onChange={(e) => setTag(e.target.value)}
                      className="bg-transparent border-0 p-0 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer with Add Session Button */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-border/50">
              <div className="text-2xl font-bold text-foreground">
                {duration}
              </div>
              <Button
                onClick={handleAddSession}
                className="h-10 bg-primary hover:bg-primary/90"
              >
                Add session
              </Button>
            </div>
          </>
        ) : (
          // Time Tracking Log View
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
              <DialogTitle className="text-xl font-semibold text-foreground">
                Time Tracking Log
              </DialogTitle>
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClear}
                  disabled
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
            <div className="flex justify-center px-6 py-3 border-b border-border/50">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowManualSession(true)}
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
                      className="flex items-center gap-2 px-6 py-2 border-border/30 hover:bg-muted/80 transition-colors group bg-background hover:shadow-sm rounded-md"
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
                      <div className="flex-1 w-20 text-sm text-muted-foreground font-medium">
                        {log.date}
                      </div>

                      {/* Time Range */}
                      <div className="flex-2 text-sm text-foreground font-medium">
                        {log.startTime} -{" "}
                        {log.endTime === "Active..." ? (
                          <span className="text-primary animate-pulse">
                            {log.endTime}
                          </span>
                        ) : (
                          log.endTime
                        )}
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
                        className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                        title="Delete log entry"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
