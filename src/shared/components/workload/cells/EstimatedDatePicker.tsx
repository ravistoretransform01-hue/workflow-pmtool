import { useState, useEffect } from "react";
import { X, Clock } from "lucide-react";
import { toast } from "sonner";
import { format, parseISO, parse } from "date-fns";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover";
import { Button } from "@/shared/components/ui/button";
import { Calendar } from "@/shared/components/ui/calendar";
import { TimePickerInput } from "@/shared/components/TimePickerInput";
import { tasksApi } from "@/features/tasks/tasksApi";

interface EstimatedDatePickerProps {
  task: any;
  estimatedDate: string;
  estimatedDateEnd: string | null;
  popoverId: string;
  openPopoverId?: string | null;
  setOpenPopoverId?: (id: string | null) => void;
  onEstimatedDateChange?: (
    taskId: string,
    fromDate: string | null,
    toDate?: string | null,
  ) => void;
}

export function EstimatedDatePicker({
  task,
  estimatedDate,
  popoverId,
  openPopoverId,
  setOpenPopoverId,
  onEstimatedDateChange,
}: EstimatedDatePickerProps) {
  const getInitialDateRange = (): { from?: Date; to?: Date } | undefined => {
    try {
      if (task.estimation?.estimated_date_from) {
        const from = parseISO(task.estimation.estimated_date_from);
        const to = task.estimation.estimated_date_to
          ? parseISO(task.estimation.estimated_date_to)
          : from;
        return { from, to };
      }

      if (estimatedDate && estimatedDate !== "-") {
        const doubleSpaceParts = estimatedDate.split("  -  ");
        if (doubleSpaceParts.length === 2) {
          try {
            const from = parse(
              doubleSpaceParts[0].trim(),
              "dd MMM, yyyy",
              new Date(),
            );
            const to = parse(
              doubleSpaceParts[1].trim(),
              "dd MMM, yyyy",
              new Date(),
            );
            if (!isNaN(from.getTime()) && !isNaN(to.getTime())) {
              return { from, to };
            }
          } catch {
            // Continue
          }
        }

        const singleDashParts = estimatedDate.split(" - ");
        if (singleDashParts.length === 2) {
          try {
            const fromStr = singleDashParts[0].trim();
            const toStr = singleDashParts[1].trim();

            // Check if it's "MMM d - d" format (same month)
            const toDay = parseInt(toStr);
            if (!isNaN(toDay) && toDay > 0 && toDay <= 31) {
              const currentYear = new Date().getFullYear();
              const from = parse(fromStr, "MMM d", new Date(currentYear, 0, 1));

              if (!isNaN(from.getTime())) {
                const to = new Date(from);
                to.setDate(toDay);

                // If from and to are the same date, return single date (not a range)
                if (from.getTime() === to.getTime()) {
                  return { from, to: from };
                }

                return { from, to };
              }
            } else {
              // It's "MMM d - MMM d" format (different months)
              const currentYear = new Date().getFullYear();
              const currentMonth = new Date().getMonth();

              const from = parse(fromStr, "MMM d", new Date(currentYear, 0, 1));
              const to = parse(toStr, "MMM d", new Date(currentYear, 0, 1));

              if (!isNaN(from.getTime()) && !isNaN(to.getTime())) {
                // Determine the correct year based on current date
                // If the from month is in the past (more than 2 months ago), assume it's next year
                const fromMonth = from.getMonth();
                if (fromMonth < currentMonth - 2) {
                  from.setFullYear(currentYear + 1);
                  to.setFullYear(currentYear + 1);
                }

                // If 'to' month is before 'from' month, it spans to next year
                if (to < from) {
                  to.setFullYear(from.getFullYear() + 1);
                }

                // If from and to are the same date, return single date (not a range)
                if (from.getTime() === to.getTime()) {
                  return { from, to: from };
                }

                return { from, to };
              }
            }
          } catch {
            // Continue
          }
        }

        const enDashParts = estimatedDate.split("–");
        if (enDashParts.length === 2) {
          try {
            let fromStr = enDashParts[0].trim();
            let toStr = enDashParts[1].trim();

            const hasYearWithApostrophe =
              /,\s*'?\d{2}$/.test(fromStr) || /,\s*'?\d{2}$/.test(toStr);

            if (hasYearWithApostrophe) {
              fromStr = fromStr.replace(/'/g, "");
              toStr = toStr.replace(/'/g, "");

              let from = parse(fromStr, "MMM d, yy", new Date());
              let to = parse(toStr, "MMM d, yy", new Date());

              if (!isNaN(from.getTime()) && !isNaN(to.getTime())) {
                return { from, to };
              }
            } else {
              // Parse dates without year - use current year as reference
              const currentYear = new Date().getFullYear();
              const currentMonth = new Date().getMonth();

              let from = parse(fromStr, "MMM d", new Date(currentYear, 0, 1));
              let to = parse(toStr, "MMM d", new Date(currentYear, 0, 1));

              if (!isNaN(from.getTime()) && !isNaN(to.getTime())) {
                // Determine the correct year based on current date
                // If the from month is in the past (more than 2 months ago), assume it's next year
                const fromMonth = from.getMonth();
                if (fromMonth < currentMonth - 2) {
                  from.setFullYear(currentYear + 1);
                  to.setFullYear(currentYear + 1);
                }

                // If 'to' month is before 'from' month, it spans to next year
                if (to < from) {
                  to.setFullYear(from.getFullYear() + 1);
                }

                // If from and to are the same date, return single date (not a range)
                if (from.getTime() === to.getTime()) {
                  return { from, to: from };
                }

                return { from, to };
              }
            }
          } catch (error) {
            console.warn("Failed to parse en-dash format:", error);
          }
        }

        try {
          const from = parse(estimatedDate.trim(), "dd MMM, yyyy", new Date());
          if (!isNaN(from.getTime())) {
            return { from, to: from };
          }
        } catch {
          // Continue
        }
      }

      return undefined;
    } catch (error) {
      console.warn("Failed to parse estimated date:", error);
      return undefined;
    }
  };

  const [dateRange, setDateRange] = useState<
    { from?: Date; to?: Date } | undefined
  >(getInitialDateRange());

  const [displayMonth, setDisplayMonth] = useState<Date | undefined>(undefined);
  const [showTimeInputs, setShowTimeInputs] = useState(false);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  useEffect(() => {
    if (openPopoverId === popoverId) {
      const range = getInitialDateRange();
      setDateRange(range);
      if (range?.from) {
        setDisplayMonth(range.from);
      } else {
        setDisplayMonth(new Date());
      }
    }
  }, [openPopoverId, popoverId, task.estimation, estimatedDate]);

  const handleDateRangeChange = (
    range: { from?: Date; to?: Date } | undefined,
  ) => {
    setDateRange(range);
  };

  const formatDateDisplay = () => {
    if (estimatedDate === "-") return "-";

    // Check if from and to dates are the same
    const range = getInitialDateRange();
    if (range?.from && range?.to) {
      const fromTime = range.from.getTime();
      const toTime = range.to.getTime();

      // If dates are the same, show single formatted date
      if (fromTime === toTime) {
        return format(range.from, "d MMM, yy").toLowerCase();
      }
    }

    return estimatedDate;
  };

  return (
    <Popover
      open={openPopoverId === popoverId}
      onOpenChange={(open) => setOpenPopoverId?.(open ? popoverId : null)}
    >
      <PopoverTrigger asChild>
        <div className="w-full" onClick={(e) => e.stopPropagation()}>
          <button className="w-full bg-muted text-white px-3 py-1.5 rounded text-sm hover:bg-accent transition-colors truncate">
            {formatDateDisplay()}
          </button>
        </div>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-4 bg-card border border-border shadow-lg rounded-lg"
        align="center"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-sm">Select Date Range</h3>
            <button
              onClick={() => setOpenPopoverId?.(null)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {showTimeInputs && (
            <div className="p-4 border-y border-[#334155] space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-white">
                  Start Time
                </label>
                <TimePickerInput
                  value={startTime}
                  onChange={(e) => setStartTime(e)}
                  onBlur={() => {}}
                  placeholder="Type time (e.g., 10:00am)"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-white">
                  End Time
                </label>
                <TimePickerInput
                  value={endTime}
                  onChange={(e) => setEndTime(e)}
                  onBlur={() => {}}
                  placeholder="Type time (e.g., 11:00am)"
                />
              </div>
            </div>
          )}

          <Calendar
            mode="range"
            selected={
              dateRange?.from
                ? { from: dateRange.from, to: dateRange.to }
                : undefined
            }
            onSelect={handleDateRangeChange}
            disabled={(date) =>
              date < new Date(new Date().setHours(0, 0, 0, 0))
            }
            month={displayMonth}
            onMonthChange={setDisplayMonth}
          />
          <div className="flex gap-2 justify-between items-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowTimeInputs(!showTimeInputs)}
              className={`h-8 w-8 p-0 text-white ${
                showTimeInputs ? "bg-primary" : "hover:bg-[#4b5563]"
              }`}
              title="Toggle time inputs"
            >
              <Clock className="h-5 w-5" />
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDateRange(undefined);
                  onEstimatedDateChange?.(task.id, null);
                  setOpenPopoverId?.(null);
                }}
              >
                Clear
              </Button>
              <Button
                size="sm"
                onClick={async () => {
                  if (dateRange?.from) {
                    const fromDate = format(dateRange.from, "yyyy-MM-dd");
                    const toDate = dateRange.to
                      ? format(dateRange.to, "yyyy-MM-dd")
                      : fromDate;

                    try {
                      const hasEstimation =
                        estimatedDate && estimatedDate !== "-";

                      if (hasEstimation) {
                        await tasksApi.updateEstimatedDate({
                          task_id: task.id,
                          estimated_date_from: fromDate,
                          estimated_date_to: toDate,
                        });
                      } else {
                        await tasksApi.createEstimatedDate({
                          task_id: task.id,
                          estimated_date_from: fromDate,
                          estimated_date_to: toDate,
                        });
                      }

                      onEstimatedDateChange?.(task.id, fromDate, toDate);
                      setOpenPopoverId?.(null);
                      toast.success("Estimated date updated successfully");
                    } catch (error) {
                      console.error("Failed to update estimated date:", error);
                      toast.error("Failed to update estimated date");
                    }
                  }
                }}
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
