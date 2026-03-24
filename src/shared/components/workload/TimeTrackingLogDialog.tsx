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
import { format, addDays, isAfter, startOfToday } from "date-fns";
import { useAppDispatch } from "@/app/hooks";
import { updateActiveTaskTime } from "@/features/tasks/tasksSlice";
import { TimePickerInput } from "@/shared/components/TimePickerInput";
import { debugLog } from "@/lib/debugLog";
import {
  parseApiDateTime,
  formatDateToApi,
} from "@/lib/dates";

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
  onTimeUpdate?: (taskId: string, seconds: number) => void;
}

// Helper function to format time entry data
const formatTimeEntry = (entry: TimeEntry): TimeLogEntry => {
  const startDate = parseApiDateTime(entry.start_time);
  const endDate = entry.end_time ? parseApiDateTime(entry.end_time) : new Date();

  // ---- Date (Jan 22) ----
  const date = startDate ? format(startDate, "MMM dd") : "";

  // ---- Time (hh:mm AM/PM) ----
  const startTime = startDate ? format(startDate, "hh:mm:ss a") : "";
  const endTime = entry.end_time
    ? endDate
      ? format(endDate, "hh:mm:ss a")
      : ""
    : "Active...";

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

//   debugLog("API start_time:", entry.start_time);
//   debugLog("Parsed startDate:", startDate);

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

//   debugLog("Formatted startTime:", startTimeFormatted);

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
  taskName,
  onTimeUpdate,
}: TimeTrackingLogDialogProps) {
  const [timeLogs, setTimeLogs] = useState<TimeLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showManualSession, setShowManualSession] = useState(false);
  const dispatch = useAppDispatch();

  // Manual session form state
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [startTime, setStartTime] = useState("12:00 PM");
  const [endTime, setEndTime] = useState("1:00 PM");
  const [tag, setTag] = useState("");
  const [duration, setDuration] = useState("01h 00m 00s");
  // If a log had an end datetime on the next day, we store the exact end date here so
  // the manual session submission can use the correct date for end_time.
  const [endDateOverride, setEndDateOverride] = useState<Date | null>(null);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);



  // Disable function for calendar - restrict to dates up to today
  const isDateDisabled = (date: Date): boolean => {
    return isAfter(date, startOfToday());
  };

  // Fetch time entries when dialog opens
  useEffect(() => {
    if (open) {
      setShowManualSession(false);
      setEditingEntryId(null);
      // Reset any previously-set end date override
      setEndDateOverride(null);
      fetchTimeEntries();
    }
  }, [open, taskId]);

  useEffect(() => {
    debugLog(startTime);
    debugLog(endTime);
    debugLog(duration);
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
      const res = await tasksApi.deleteTimeEntry(id);
      setTimeLogs((prev) => prev.filter((log) => log.id !== id));
      toast.success("Time Entry Deleted Successfully");
      
      if (res?.tracked_time_seconds !== undefined) {
        if (onTimeUpdate) {
          onTimeUpdate(taskId, res.tracked_time_seconds);
        }
        dispatch(
          updateActiveTaskTime({
            taskId,
            trackedTimeSeconds: res.tracked_time_seconds,
          }),
        );
      }
    } catch (error) {
      console.error("Failed to delete time entry:", error);
      toast.error("Failed to Delete Time Entry");
    }
  };

  const handleClear = async () => {
    if (confirm("Are you sure you want to clear all time logs?")) {
      try {
        // Delete all time entries
        await Promise.all(
          timeLogs.map((log) => tasksApi.deleteTimeEntry(log.id)),
        );
        setTimeLogs([]);
        toast.success("All Time Entries Deleted Successfully");
        
        if (onTimeUpdate) {
          onTimeUpdate(taskId, 0);
        }
        dispatch(
          updateActiveTaskTime({
            taskId,
            trackedTimeSeconds: 0,
          }),
        );
      } catch (error) {
        console.error("Failed to clear time logs:", error);
        toast.error("Failed to Clear Time Logs");
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
    link.download = `time-tracking-${taskName || taskId}-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
    toast.success("Exported to CSV");
  };

  const handleSaveSession = () => {
    const dateStr = format(selectedDate, "yyyy-MM-dd");

    const getLocalDateTime = (dStr: string, tStr: string): Date => {
      const match = tStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
      if (!match) return new Date();
      let hours = parseInt(match[1]);
      const minutes = parseInt(match[2]);
      const period = match[3].toUpperCase();
      if (period === "PM" && hours !== 12) hours += 12;
      else if (period === "AM" && hours === 12) hours = 0;
      const [yr, mo, dy] = dStr.split("-").map(Number);
      return new Date(yr, mo - 1, dy, hours, minutes, 0);
    };

    const startLocal = getLocalDateTime(dateStr, startTime);
    const startTimeUTC = formatDateToApi(startLocal);

    // Compute end date string: prefer explicit endDateOverride (if log had a different day),
    // otherwise, if end time is earlier than or equal to start time, assume next day.
    let endDateStr = dateStr;
    if (endDateOverride) {
      endDateStr = format(endDateOverride, "yyyy-MM-dd");
    } else {
      // parse times to minutes to decide if end belongs to next day
      const parseMinutes = (timeStr: string | undefined) => {
        if (!timeStr) return null;
        const m = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
        if (!m) return null;
        let hrs = Number(m[1]);
        const mins = Number(m[2]);
        const period = m[3].toUpperCase();
        if (period === "PM" && hrs !== 12) hrs += 12;
        if (period === "AM" && hrs === 12) hrs = 0;
        return hrs * 60 + mins;
      };

      const sM = parseMinutes(startTime);
      const eM = parseMinutes(endTime);
      if (sM !== null && eM !== null && eM <= sM) {
        endDateStr = format(addDays(selectedDate, 1), "yyyy-MM-dd");
      }
    }

    const endLocal = getLocalDateTime(endDateStr, endTime);
    const endTimeUTC = formatDateToApi(endLocal);

    // Validation: No future logging
    const now = new Date();
    if (isAfter(startLocal, now) || isAfter(endLocal, now)) {
      toast.error("You cannot log time in the future");
      return;
    }

    const payload = {
      task_id: taskId,
      start_time: startTimeUTC,
      end_time: endTimeUTC,
      note: tag || undefined,
    };

    // Call API to add or update time entry
    (async () => {
      try {
        setIsLoading(true);
        if (editingEntryId) {
          const res = await tasksApi.updateTimeEntry(editingEntryId, {
            start_time: payload.start_time,
            end_time: payload.end_time,
            note: payload.note,
          });
          toast.success("Session Updated Successfully");
          if (res?.tracked_time_seconds !== undefined) {
            if (onTimeUpdate) {
              onTimeUpdate(taskId, res.tracked_time_seconds);
            }
            dispatch(
              updateActiveTaskTime({
                taskId,
                trackedTimeSeconds: res.tracked_time_seconds,
              }),
            );
          }
        } else {
          const res = await tasksApi.addManualTimeEntry(payload);
          toast.success("Session Added Successfully");
          if (res?.tracked_time_seconds !== undefined) {
            if (onTimeUpdate) {
              onTimeUpdate(taskId, res.tracked_time_seconds);
            }
            dispatch(
              updateActiveTaskTime({
                taskId,
                trackedTimeSeconds: res.tracked_time_seconds,
              }),
            );
          }
        }
        // Reset form and go back to time logs view
        setShowManualSession(false);
        setEditingEntryId(null);
        setSelectedDate(new Date());
        setStartTime("12:00 PM");
        setEndTime("01:00 PM");
        setTag("");
        // Refresh the time logs list
        await fetchTimeEntries();
      } catch (error) {
        console.error("Failed to save session:", error);
        toast.error(editingEntryId ? "Failed to Update Session" : "Failed to Add Session");
      } finally {
        setIsLoading(false);
      }
    })();
  };

  const handleBackToLogs = () => {
    setShowManualSession(false);
    setEditingEntryId(null);
    setSelectedDate(new Date());
    setStartTime("12:00 PM");
    setEndTime("01:00 PM");
    setTag("");
  };

  // Open manual session editor pre-filled from a time log entry
  // const openManualFromLog = (log: TimeLogEntry) => {
  //   try {
  //     // Use the raw UTC timestamps to get reliable Date objects in local time
  //     const startDate = parseUtcToLocalDate(log.start_time);
  //     setSelectedDate(startDate);

  //     // Helper: round minutes to nearest 15-minute increment and return formatted "h:mm a"
  //     const formatTimeRounded = (date: Date) => {
  //       let hrs = date.getHours();
  //       let mins = date.getMinutes();

  //       // Round to nearest quarter-hour
  //       let rounded = Math.round(mins / 15) * 15;
  //       if (rounded === 60) {
  //         rounded = 0;
  //         hrs = (hrs + 1) % 24;
  //       }

  //       const period = hrs >= 12 ? "PM" : "AM";
  //       const displayHour = ((hrs + 11) % 12) + 1; // 1..12
  //       return `${displayHour}:${String(rounded).padStart(2, "0")} ${period}`;
  //     };

  //     // Determine start time based on the accurate startDate
  //     setStartTime(formatTimeRounded(startDate));

  //     // If we have an explicit end_time, use that exact local date/time and keep an override
  //     if (log.end_time) {
  //       const endDate = parseUtcToLocalDate(log.end_time);
  //       setEndDateOverride(endDate);
  //       setEndTime(formatTimeRounded(endDate));
  //     } else if (log.endTime && log.endTime !== "Active...") {
  //       // Fallback: if API didn't provide raw end_time but formatted string exists, parse it
  //       const m = log.endTime.match(/(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)/i);
  //       if (m) {
  //         // Convert to a Date anchored at startDate (we will still round minutes)
  //         let hrs = Number(m[1]);
  //         const mins = Number(m[2]);
  //         const period = m[3].toUpperCase();
  //         if (period === "PM" && hrs !== 12) hrs += 12;
  //         if (period === "AM" && hrs === 12) hrs = 0;
  //         const endDate = new Date(startDate);
  //         endDate.setHours(hrs, mins, 0, 0);
  //         setEndDateOverride(endDate);
  //         setEndTime(formatTimeRounded(endDate));
  //       } else {
  //         // as a last resort, default to one hour after start
  //         const defaultEnd = new Date(startDate.getTime() + 60 * 60 * 1000);
  //         setEndDateOverride(null);
  //         setEndTime(formatTimeRounded(defaultEnd));
  //       }
  //     } else {
  //       // Active session or no end time - default to one hour after start
  //       const defaultEnd = new Date(startDate.getTime() + 60 * 60 * 1000);
  //       setEndDateOverride(null);
  //       setEndTime(formatTimeRounded(defaultEnd));
  //     }

  //     setTag(log.note || "");
  //     setShowManualSession(true);
  //   } catch (err) {
  //     console.error("Failed to open manual session from log:", err);
  //     toast.error("Failed to open session");
  //   }
  // };

  const openManualFromLog = (log: TimeLogEntry) => {
    try {
      // Parse the UTC start_time to get the local date
      const parseUtcToLocalDate = (timeStr: string): Date => {
        return parseApiDateTime(timeStr) || new Date();
      };

      // Normalize time format: remove seconds and ensure proper spacing
      const normalizeTimeForPicker = (time: string): string => {
        if (!time || time === "Active...") return time;

        // Match: HH:MM(:SS)? AM/PM
        const match = time.match(
          /(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM|am|pm)/i,
        );

        if (!match) return time;

        const hour = match[1];
        const minute = match[2];
        const period = match[3].toUpperCase();

        return `${hour}:${minute} ${period}`;
      };

      // Set the date from the log's start_time
      const startDate = parseUtcToLocalDate(log.start_time);
      setSelectedDate(startDate);

      // Set the times with normalized format
      setStartTime(normalizeTimeForPicker(log.startTime));
      setEndTime(
        log.endTime !== "Active..."
          ? normalizeTimeForPicker(log.endTime)
          : "1:00 PM",
      );

      // Set the tag/note
      setTag(log.note || "");

      // Handle endDate if it's different from startDate
      if (log.end_time) {
        const endDate = parseUtcToLocalDate(log.end_time);
        if (format(endDate, "yyyy-MM-dd") !== format(startDate, "yyyy-MM-dd")) {
          setEndDateOverride(endDate);
        } else {
          setEndDateOverride(null);
        }
      } else {
        setEndDateOverride(null);
      }

      setEditingEntryId(log.id);
      setShowManualSession(true);
    } catch (err) {
      console.error("Failed to open manual session from log:", err);
      toast.error("Failed to open session");
    }
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
                {editingEntryId ? "Edit session" : "Add session"}
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
                      disabled={isDateDisabled}
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
                onClick={handleSaveSession}
                className="h-10 bg-primary hover:bg-primary/90"
              >
                {editingEntryId ? "Save session" : "Add session"}
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
                      role={log.endTime === "Active..." ? undefined : "button"}
                      tabIndex={log.endTime === "Active..." ? undefined : 0}
                      onClick={() => {
                        if (log.endTime !== "Active...") openManualFromLog(log);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && log.endTime !== "Active...") 
                          openManualFromLog(log);
                      }}
                      className={`flex items-center gap-2 px-6 py-2 border-border/30 rounded-md transition-colors bg-background ${
                        log.endTime === "Active..."
                          ? "cursor-default opacity-95"
                          : "cursor-pointer hover:bg-muted/80 hover:shadow-sm group"
                      }`}
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
                        ) : log.endTime === "Active..." ? (
                          <span className="text-xs text-muted-foreground/50 font-medium">
                            --
                          </span>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openManualFromLog(log);
                            }}
                            className="text-xs text-primary hover:underline font-medium"
                          >
                            + Add tag
                          </button>
                        )}
                      </div>

                      {/* Delete Button */}
                      {log.endTime !== "Active..." ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteLog(log.id);
                          }}
                          className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                          title="Delete log entry"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      ) : (
                        <div className="w-7 h-7" /> /* Placeholder space */
                      )}
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
