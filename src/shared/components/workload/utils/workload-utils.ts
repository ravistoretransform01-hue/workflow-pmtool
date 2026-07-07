import { format, parseISO } from "date-fns";
import type { Task } from "../WorkloadBoard";

/**
 * Safely parses a group completion date from either ISO format or dd-MM-yyyy format.
 */
export function parseGroupCompletionDate(dateStr?: string | null): Date | undefined {
  if (!dateStr) return undefined;
  try {
    const isoParsed = parseISO(dateStr);
    if (!isNaN(isoParsed.getTime())) {
      return isoParsed;
    }
    if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
      const parts = dateStr.split("-");
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      const customDate = new Date(year, month, day);
      if (!isNaN(customDate.getTime())) {
        return customDate;
      }
    }
  } catch (e) {
    console.error("Error parsing group completion date:", e);
  }
  return undefined;
}

/**
 * Generates a consistent HSL color from a string
 * Useful for generating avatar colors from names
 */
export function stringToHslColor(
  str: string,
  s = 70,
  l = 55
): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  // Multiply by a prime to widely distribute similar strings/single chars
  const h = Math.abs(hash * 137) % 360;
  return `hsl(${h} ${s}% ${l}%)`;
}

/**
 * Formats a date range in compact format
 * Examples: "Jan 19 - 30", "Jan 31 – Feb 15", "Dec 31, '26 – Jan 8, '27"
 */
export function formatDateRange(
  fromDate: string,
  toDate?: string
): string {
  try {
    const from = parseISO(fromDate);
    const to = toDate ? parseISO(toDate) : from;

    const fromMonth = format(from, "MMM");
    const fromDay = format(from, "d");
    const fromYear = format(from, "yy");

    const toMonth = format(to, "MMM");
    const toDay = format(to, "d");
    const toYear = format(to, "yy");

    // If same date, just return single date
    if (fromDate === toDate) {
      return `${fromMonth} ${fromDay}, '${fromYear}`;
    }

    // If same month and year, format as "Jan 19 - 30"
    if (fromMonth === toMonth && fromYear === toYear) {
      return `${fromMonth} ${fromDay} - ${toDay}`;
    }

    // If same year, format as "Jan 31 – Feb 15"
    if (fromYear === toYear) {
      return `${fromMonth} ${fromDay} – ${toMonth} ${toDay}`;
    }

    // Different years, format as "Dec 31, '26 – Jan 8, '27"
    return `${fromMonth} ${fromDay}, '${fromYear} – ${toMonth} ${toDay}, '${toYear}`;
  } catch (error) {
    console.warn("Failed to format date range:", error);
    return "-";
  }
}

/**
 * Converts seconds to a human-readable time string
 * Examples: "2h 30m", "45m", "30s"
 */
export function formatSecondsToTime(seconds: number): string {
  if (seconds <= 0) return "0m";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

/**
 * Calculates group progress based on tracked time vs estimated time
 */
export function calculateGroupProgress(tasks: Task[]) {
  let totalTimeSpentSeconds = 0;
  let totalEstimatedSeconds = 0;

  const processTask = (task: Task) => {
    // Add tracked time from this task
    if (task.tracked_time_seconds) {
      totalTimeSpentSeconds += task.tracked_time_seconds;
    }

    // Add estimated hours from this task (convert to seconds)
    if (task.estimatedHours) {
      const hours =
        typeof task.estimatedHours === "string"
          ? parseFloat(task.estimatedHours)
          : task.estimatedHours;
      if (!isNaN(hours)) {
        totalEstimatedSeconds += hours * 3600;
      }
    }

    // Process subitems recursively
    if (task.subitems && task.subitems.length > 0) {
      task.subitems.forEach(processTask);
    }
  };

  tasks.forEach(processTask);

  const percentage =
    totalEstimatedSeconds > 0
      ? Math.min(100, (totalTimeSpentSeconds / totalEstimatedSeconds) * 100)
      : 0;

  return {
    timeSpentSeconds: totalTimeSpentSeconds,
    estimatedTimeSeconds: totalEstimatedSeconds,
    percentage,
  };
}

/**
 * Parses estimated time string and returns hours and minutes
 * Handles formats: "02h 30m", "2h", "2.5" (decimal hours)
 */
export function parseEstimatedTime(value: string | number) {
  if (!value || value === "-") return { hours: "", minutes: "" };

  const strValue = String(value);

  // Check if it's in "02h 30m" format
  const match = strValue.match(/(\d+)h\s*(\d+)m/);
  if (match) {
    return { hours: match[1], minutes: match[2] };
  }

  // Check if it's in "2h" format
  const hoursMatch = strValue.match(/(\d+)h/);
  if (hoursMatch) {
    return { hours: hoursMatch[1], minutes: "" };
  }

  // Otherwise treat as decimal hours (e.g., "2.5" = 2h 30m)
  const numValue = parseFloat(strValue);
  if (!isNaN(numValue)) {
    const hrs = Math.floor(numValue);
    const mins = Math.round((numValue - hrs) * 60);
    return {
      hours: hrs > 0 ? String(hrs) : "",
      minutes: mins > 0 ? String(mins) : "",
    };
  }

  return { hours: "", minutes: "" };
}

/**
 * Extracts numeric rating from task data
 * Handles multiple formats for backward compatibility
 */
export function extractRating(taskData: any): number | undefined {
  if (!taskData) return undefined;

  // Use average_rating if available
  if (
    typeof taskData.average_rating === "number" &&
    taskData.average_rating !== null
  ) {
    return Math.round(taskData.average_rating);
  }

  // Check old format
  if (typeof taskData.rating === "object" && "rating" in taskData.rating) {
    return Number(taskData.rating.rating);
  }

  // Direct rating field
  if (typeof taskData.rating === "number") {
    return taskData.rating;
  }

  return undefined;
}

/**
 * Formats time for display in timer
 * Examples: "2h 30m 45s", "45m 30s", "30s"
 */
export function formatTimeDisplay(totalSeconds: number): string {
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
}

/**
 * Renders markdown-ish formatted content as HTML
 * Supports: bold (**text**), italic (_text_), strikethrough (~~text~~)
 */
export function renderFormattedContent(content: string) {
  if (!content) return { __html: "" };

  // Escape HTML first to prevent XSS
  let safeContent = content
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

  // Restore Bold
  safeContent = safeContent.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

  // Restore Italic
  safeContent = safeContent.replace(/_(.*?)_/g, "<em>$1</em>");

  // Restore Strike
  safeContent = safeContent.replace(/~~(.*?)~~/g, "<strike>$1</strike>");

  // Newlines
  safeContent = safeContent.replace(/\n/g, "<br />");

  return { __html: safeContent };
}
