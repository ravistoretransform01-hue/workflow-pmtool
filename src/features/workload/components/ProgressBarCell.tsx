import { parse } from "date-fns";

interface ProgressBarCellProps {
  taskId: string;
  trackedTimeSeconds?: number;
  activeTimerId: string | null;
  timerStartTime?: number | null;
  estimatedHours?: string | number;
  estimatedDate?: string;
}

export function ProgressBarCell({
  taskId,
  trackedTimeSeconds = 0,
  activeTimerId,
  timerStartTime,
  estimatedHours = "-",
  estimatedDate = "-",
}: ProgressBarCellProps) {
  const isRunning = activeTimerId === taskId;

  // Calculate accurate elapsed time based on global start time
  const elapsedSeconds =
    isRunning && timerStartTime
      ? Math.floor((Date.now() - timerStartTime) / 1000)
      : 0;

  const currentSeconds = trackedTimeSeconds + elapsedSeconds;

  // We no longer need the local state or interval as the parent forces re-renders every second
  // and we calculate the time in render.

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

  // Extract end date from estimated date range
  const getEndDate = (): Date | null => {
    if (!estimatedDate || estimatedDate === "-") return null;

    try {
      const dateStr = String(estimatedDate);

      // Handle "21 Jan – 25 Jan" format (with en-dash)
      const enDashParts = dateStr.split("–");
      if (enDashParts.length === 2) {
        let toStr = enDashParts[1].trim();
        const hasYearWithApostrophe =
          /,\s*'?\d{2}$/.test(enDashParts[0]) || /,\s*'?\d{2}$/.test(toStr);

        if (hasYearWithApostrophe) {
          toStr = toStr.replace(/'/g, "");
          const to = parse(toStr, "MMM d, yy", new Date());
          if (!isNaN(to.getTime())) return to;
        } else {
          const to = parse(toStr, "MMM d", new Date());
          if (!isNaN(to.getTime())) return to;
        }
      }

      // Handle single date format "27 jan, '26"
      const singleDateStr = dateStr.replace(/'/g, "");
      const singleDate = parse(singleDateStr, "d MMM, yy", new Date());
      if (!isNaN(singleDate.getTime())) return singleDate;

      return null;
    } catch {
      return null;
    }
  };

  // Check if task is overdue
  const isOverdue = (): boolean => {
    const endDate = getEndDate();
    if (!endDate) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);

    return endDate < today;
  };

  // Calculate progress percentage
  const estimatedSeconds = parseEstimatedHours(estimatedHours);
  const percentage =
    estimatedSeconds > 0 ? (currentSeconds / estimatedSeconds) * 100 : 0;

  // Determine bar color: overdue takes priority, then progress-based colors
  let barColor = "#3c83f6"; // Default blue

  if (isOverdue()) {
    barColor = "#ef4444"; // Red if overdue
  } else if (percentage >= 100) {
    barColor = "#ef4444"; // Red if >= 100%
  } else if (percentage >= 75) {
    barColor = "#fb923c"; // Orange if 75-100%
  }

  return (
    <div className="w-full px-2">
      <div className="relative">
        <div
          className="relative h-6 w-full overflow-hidden bg-[#9a9aad]"
          style={{ borderRadius: "0.5rem" }}
        >
          <div
            className="h-full transition-all"
            style={{
              width: `${Math.min(percentage, 100)}%`,
              backgroundColor: barColor,
            }}
          />
        </div>
        <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white">
          {Math.round(percentage)}%
        </span>
      </div>
    </div>
  );
}
