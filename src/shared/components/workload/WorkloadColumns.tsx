import { useState, useEffect } from "react";
import {
  ChevronDown,
  ChevronRight,
  MessageCirclePlus,
  Pencil,
  X,
  Search,
} from "lucide-react";
import type { Status, Priority } from "@/features/cms/types";
import { tasksApi } from "@/features/tasks/tasksApi";
import { cmsApi } from "@/features/cms/cmsApi";
import { addStatusToCache, addPriorityToCache } from "@/features/cms/cmsStorage";
import { getOrganizationId } from "@/lib/utils";
import { toast } from "sonner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover";
import { Button } from "@/shared/components/ui/button";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Calendar } from "@/shared/components/ui/calendar";
import { Input } from "@/shared/components/ui/input";
import { format, parseISO, parse } from "date-fns";
import { TagsColumnCell } from "./TagsColumnCell";
import { TimerCell } from "./TimerCell";
import { ProgressBarCell } from "./ProgressBarCell";

function stringToHslColor(str: string, s = 70, l = 55): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return `hsl(${h} ${s}% ${l}%)`;
}

// Preset colors for status and priority creation
const PRESET_COLORS = [
  "#16a249", // green
  "#3c83f6", // blue
  "#a855f7", // purple
  "#dc2828", // red
  "#facc14", // yellow
  "#ff8400", // orange
  "#ec4899", // pink
  "#10b981", // emerald
];

// Component for person selection with search
function PersonPopover({
  task,
  members,
  selectedMemberIds,
  popoverId,
  openPopoverId,
  setOpenPopoverId,
  onPersonChange,
}: {
  task: any;
  members: any[];
  selectedMemberIds?: string[];
  popoverId: string;
  openPopoverId?: string | null;
  setOpenPopoverId?: (id: string | null) => void;
  onPersonChange?: (taskId: string, memberIds: string[]) => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [localSelected, setLocalSelected] = useState<string | null>(
    selectedMemberIds?.[0] || null
  );

  const filteredMembers = members.filter((member) =>
    (member?.name ?? "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleMemberSelect = (memberId: string) => {
    setLocalSelected(memberId);
  };

  const handleUpdateAssignees = () => {
    // Send selected member (or empty array if none selected)
    onPersonChange?.(task.id, localSelected ? [localSelected] : []);
    setOpenPopoverId?.(null);
  };

  return (
    <Popover
      open={openPopoverId === popoverId}
      onOpenChange={(open) => setOpenPopoverId?.(open ? popoverId : null)}
    >
      <PopoverTrigger asChild>
        <button
          className="w-full flex justify-center hover:opacity-80 transition-opacity cursor-pointer"
          onClick={(e) => e.stopPropagation()}
        >
          {!localSelected ? (
            <span className="text-muted-foreground text-xs">+ Add</span>
          ) : (
            <div className="flex justify-center">
              {(() => {
                const member = members.find(
                  (m) => String(m.user_id) === String(localSelected)
                );
                if (!member) return null;
                const name = (member?.name ?? "").trim();
                const initials = name
                  .split(/\s+/)
                  .map((n: string) => n[0])
                  .filter(Boolean)
                  .slice(0, 2)
                  .join("")
                  .toUpperCase();
                const bgColor = stringToHslColor(
                  name || String(member?.user_id || "user")
                );
                return (
                  <Avatar className="h-8 w-8 border-2 border-background">
                    <AvatarFallback
                      style={{ background: bgColor, color: "white" }}
                      className="text-[10px] font-semibold"
                    >
                      {initials || "U"}
                    </AvatarFallback>
                  </Avatar>
                );
              })()}
            </div>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-56 p-3 bg-card border border-border shadow-lg rounded-lg flex flex-col"
        align="center"
      >
        <div className="space-y-2 flex flex-col">
          {/* Search Input */}
          <div className="relative flex-shrink-0">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-0 pointer-events-none" />
            <Input
              placeholder="Search members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>

          {/* Members List - Show 2.5 items, rest scrollable */}
          <div
            className="space-y-1 overflow-y-auto"
            style={{
              maxHeight: "calc(4 * 40px)",
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            }}
          >
            {/* No Member Option */}
            <button
              onClick={() => setLocalSelected(null)}
              className="w-full border-y border-border flex items-center gap-3 px-2 py-2 rounded transition-colors text-sm font-medium text-left hover:bg-muted"
            >
              <input
                type="radio"
                checked={localSelected === null}
                onChange={() => {}}
                className="h-4 w-4 accent-primary cursor-pointer"
              />
              <span className="text-muted-foreground">No Member</span>
            </button>

            {/* Divider */}
            {/* <div className="border-t border-d border-border my-1" /> */}

            {filteredMembers.length === 0 ? (
              <div className="text-center py-4 text-sm text-muted-foreground">
                No members found
              </div>
            ) : (
              filteredMembers.map((member) => {
                const name = (member?.name ?? "").trim();
                const initials = name
                  .split(/\s+/)
                  .map((n: string) => n[0])
                  .filter(Boolean)
                  .slice(0, 2)
                  .join("")
                  .toUpperCase();

                const bgColor = stringToHslColor(
                  name || String(member?.user_id || "user")
                );

                const isSelected = localSelected === String(member.user_id);

                return (
                  <button
                    key={member.user_id}
                    onClick={() => handleMemberSelect(String(member.user_id))}
                    className="w-full flex items-center gap-3 px-2 py-2 rounded transition-colors text-sm font-medium text-left hover:bg-muted"
                  >
                    <input
                      type="radio"
                      checked={isSelected}
                      onChange={() => {}}
                      className="h-4 w-4 accent-primary cursor-pointer"
                    />
                    <Avatar className="h-8 w-8">
                      <AvatarFallback
                        style={{ background: bgColor, color: "white" }}
                      >
                        {initials || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <span>{member.name}</span>
                  </button>
                );
              })
            )}
          </div>

          {/* Update Button */}
          <div className="flex-shrink-0 pt-2 border-t border-border flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setLocalSelected(null);
                onPersonChange?.(task.id, []);
                setOpenPopoverId?.(null);
              }}
              className="flex-1 h-8 text-sm"
              size="sm"
            >
              Clear
            </Button>
            <Button
              onClick={handleUpdateAssignees}
              className="flex-1 h-8 text-sm"
              size="sm"
            >
              Update
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
function RatingStars({
  task,
  rating,
  ratingCount,
  popoverId,
  openPopoverId,
  setOpenPopoverId,
  onRatingChange,
  hasAssignee = false,
  isDone = false,
}: {
  task: any;
  rating: number;
  ratingCount?: number;
  popoverId: string;
  openPopoverId?: string | null;
  setOpenPopoverId?: (id: string | null) => void;
  onRatingChange?: (taskId: string, rating: number) => void;
  hasAssignee?: boolean;
  isDone?: boolean;
}) {
  const [hoveredRating, setHoveredRating] = useState(0);

  const handleRatingClick = (ratingValue: number) => {
    if (!hasAssignee) {
      toast.error("Please assign a person before rating");
      setOpenPopoverId?.(null);
      return;
    }
    if (!isDone) {
      toast.error("Task must be marked as Done before rating");
      setOpenPopoverId?.(null);
      return;
    }
    setOpenPopoverId?.(null);
    onRatingChange?.(task.id, ratingValue);
  };

  return (
    <Popover
      open={openPopoverId === popoverId}
      onOpenChange={(open) => {
        if (open && !hasAssignee) {
          toast.error("Please assign a person before rating");
          return;
        }
        if (open && !isDone) {
          toast.error("Task must be marked as Done before rating");
          return;
        }
        setOpenPopoverId?.(open ? popoverId : null);
      }}
    >
      <PopoverTrigger asChild>
        <button
          className={`w-full h-8 flex items-center justify-center gap-1 ${
            !hasAssignee || !isDone ? "opacity-50 cursor-not-allowed" : ""
          }`}
          aria-label={`Rating ${rating}${
            ratingCount
              ? ` (${ratingCount} rating${ratingCount !== 1 ? "s" : ""})`
              : ""
          }`}
          onClick={(e) => e.stopPropagation()}
          title={
            !hasAssignee
              ? "Assign a person first"
              : !isDone
              ? "Task must be marked as Done"
              : ratingCount
              ? `${ratingCount} rating${ratingCount !== 1 ? "s" : ""}`
              : "No ratings"
          }
          disabled={!hasAssignee || !isDone}
        >
          {[1, 2, 3, 4, 5].map((i) => (
            <svg
              key={i}
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className={`h-4 w-4 ${
                i <= rating ? "text-yellow-400" : "text-muted-foreground"
              }`}
            >
              <path
                d="M12 .587l3.668 7.431L23.5 9.753l-5.75 5.601L19.334 24 12 20.202 4.666 24l1.584-8.646L.5 9.753l7.832-1.735L12 .587z"
                fill="currentColor"
              />
            </svg>
          ))}
          {/* {ratingCount ? (
            <span className="text-xs text-muted-foreground ml-1">({ratingCount})</span>
          ) : null} */}
        </button>
      </PopoverTrigger>

      <PopoverContent
        className="w-60 p-3 bg-card border border-border shadow-lg rounded-lg"
        align="center"
      >
        <div className="space-y-3">
          <div className="flex gap-2 justify-center">
            {[1, 2, 3, 4, 5].map((i) => (
              <button
                key={i}
                onClick={() => handleRatingClick(i)}
                onMouseEnter={() => setHoveredRating(i)}
                onMouseLeave={() => setHoveredRating(0)}
                className="p-1"
                aria-label={`Set rating ${i}`}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className={`h-6 w-6 transition-colors ${
                    i <= (hoveredRating || rating)
                      ? "text-yellow-400"
                      : "text-muted-foreground"
                  }`}
                >
                  <path
                    d="M12 .587l3.668 7.431L23.5 9.753l-5.75 5.601L19.334 24 12 20.202 4.666 24l1.584-8.646L.5 9.753l7.832-1.735L12 .587z"
                    fill="currentColor"
                  />
                </svg>
              </button>
            ))}
          </div>
          {/* {ratingCount ? (
            <div className="text-center text-xs text-muted-foreground">
              {ratingCount} rating{ratingCount !== 1 ? 's' : ''}
            </div>
          ) : null} */}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Component for estimated date picker
function EstimatedDatePicker({
  task,
  estimatedDate,
  // estimatedDateEnd,
  popoverId,
  openPopoverId,
  setOpenPopoverId,
  onEstimatedDateChange,
}: {
  task: any;
  estimatedDate: string;
  estimatedDateEnd: string | null;
  popoverId: string;
  openPopoverId?: string | null;
  setOpenPopoverId?: (id: string | null) => void;
  onEstimatedDateChange?: (
    taskId: string,
    fromDate: string | null,
    toDate?: string | null
  ) => void;
}) {
  // Initialize date range from task.estimation object or formatted estimatedDate string
  const getInitialDateRange = (): { from?: Date; to?: Date } | undefined => {
    try {
      // First priority: use task.estimation as the source of truth
      if (task.estimation?.estimated_date_from) {
        const from = parseISO(task.estimation.estimated_date_from);
        const to = task.estimation.estimated_date_to
          ? parseISO(task.estimation.estimated_date_to)
          : from;
        return { from, to };
      }

      // Fallback: parse the formatted estimatedDate string
      if (estimatedDate && estimatedDate !== "-") {
        // Try format: "15 Jan, 2026  -  19 Jan, 2026"
        const doubleSpaceParts = estimatedDate.split("  -  ");
        if (doubleSpaceParts.length === 2) {
          try {
            const from = parse(doubleSpaceParts[0].trim(), "dd MMM, yyyy", new Date());
            const to = parse(doubleSpaceParts[1].trim(), "dd MMM, yyyy", new Date());
            if (!isNaN(from.getTime()) && !isNaN(to.getTime())) {
              return { from, to };
            }
          } catch {
            // Continue to next format
          }
        }
        
        // Try format: "Jan 19 - 30" (same month and year)
        const singleDashParts = estimatedDate.split(" - ");
        if (singleDashParts.length === 2) {
          try {
            const fromStr = singleDashParts[0].trim();
            const toStr = singleDashParts[1].trim();
            
            // Parse "Jan 19" and "30" format
            const from = parse(fromStr, "MMM d", new Date());
            const toDay = parseInt(toStr);
            
            if (!isNaN(from.getTime()) && !isNaN(toDay)) {
              const to = new Date(from);
              to.setDate(toDay);
              return { from, to };
            }
          } catch {
            // Continue to next format
          }
        }
        
        // Try format: "Jan 31 – Feb 15" or "Dec 31, '26 – Jan 8, '27" (with en-dash)
        const enDashParts = estimatedDate.split("–");
        if (enDashParts.length === 2) {
          try {
            let fromStr = enDashParts[0].trim();
            let toStr = enDashParts[1].trim();
            
            // Check if format includes year with apostrophe (e.g., "Dec 30, '26")
            const hasYearWithApostrophe = /,\s*'?\d{2}$/.test(fromStr) || /,\s*'?\d{2}$/.test(toStr);
            
            if (hasYearWithApostrophe) {
              // Remove apostrophes and parse with full year format
              fromStr = fromStr.replace(/'/g, "");
              toStr = toStr.replace(/'/g, "");
              
              // Parse "Dec 30, 26" format - need to handle 2-digit year
              // date-fns yy format interprets 00-68 as 2000-2068, 69-99 as 1969-1999
              // So '26 becomes 2026 correctly
              let from = parse(fromStr, "MMM d, yy", new Date());
              let to = parse(toStr, "MMM d, yy", new Date());
              
              if (!isNaN(from.getTime()) && !isNaN(to.getTime())) {
                return { from, to };
              }
            } else {
              // Format without year (e.g., "Jan 31 – Feb 15")
              let from = parse(fromStr, "MMM d", new Date());
              let to = parse(toStr, "MMM d", new Date());
              
              if (!isNaN(from.getTime()) && !isNaN(to.getTime())) {
                return { from, to };
              }
            }
          } catch (error) {
            console.warn("Failed to parse en-dash format:", error, { fromStr: enDashParts[0], toStr: enDashParts[1] });
            // Continue to next format
          }
        }
        
        // Try single date format
        try {
          const from = parse(estimatedDate.trim(), "dd MMM, yyyy", new Date());
          if (!isNaN(from.getTime())) {
            return { from, to: from };
          }
        } catch {
          // Continue
        }
      }

      // No estimation exists yet
      return undefined;
    } catch (error) {
      // If parsing fails, return undefined (user will select dates fresh)
      console.warn("Failed to parse estimated date:", error);
      return undefined;
    }
  };

  const [dateRange, setDateRange] = useState<
    { from?: Date; to?: Date } | undefined
  >(getInitialDateRange());

  // State to track which month to display in the calendar
  const [displayMonth, setDisplayMonth] = useState<Date | undefined>(undefined);

  // Update dateRange when task.estimation changes (e.g., when popover opens)
  useEffect(() => {
    if (openPopoverId === popoverId) {
      const range = getInitialDateRange();
      setDateRange(range);
      // Set display month to the start date of the range, or current month if no range
      if (range?.from) {
        setDisplayMonth(range.from);
      } else {
        setDisplayMonth(new Date());
      }
    }
  }, [openPopoverId, popoverId, task.estimation, estimatedDate]);

  const handleDateRangeChange = (
    range: { from?: Date; to?: Date } | undefined
  ) => {
    setDateRange(range);
  };

  const formatDateDisplay = () => {
    if (estimatedDate === "-") return "-";
    // estimatedDate already contains the full formatted range (e.g., "15 Jan, 2026 - 19 Jan, 2026")
    // so just return it as-is
    console.log("Estimated Date:", estimatedDate);

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
          <div className="flex gap-2 justify-end">
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
                    // Check if estimation already exists by checking if estimatedDate is not "-"
                    const hasEstimation =
                      estimatedDate && estimatedDate !== "-";

                    if (hasEstimation) {
                      // Update existing estimation
                      await tasksApi.updateEstimatedDate({
                        task_id: task.id,
                        estimated_date_from: fromDate,
                        estimated_date_to: toDate,
                      });
                    } else {
                      // Create new estimation
                      await tasksApi.createEstimatedDate({
                        task_id: task.id,
                        estimated_date_from: fromDate,
                        estimated_date_to: toDate,
                      });
                    }

                    // Update local state
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
      </PopoverContent>
    </Popover>
  );
}

// Component for estimated time picker
function EstimatedTimePicker({
  task,
  estimatedHours,
  hasEstimatedDate,
  popoverId,
  openPopoverId,
  setOpenPopoverId,
  onEstimatedTimeChange,
}: {
  task: any;
  estimatedHours: string | number;
  hasEstimatedDate: boolean;
  popoverId: string;
  openPopoverId?: string | null;
  setOpenPopoverId?: (id: string | null) => void;
  onEstimatedTimeChange?: (
    taskId: string,
    hours: string | number | null
  ) => void;
}) {
  // Parse estimatedHours to extract hours and minutes
  const parseEstimatedTime = (value: string | number) => {
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
      return { hours: hrs > 0 ? String(hrs) : "", minutes: mins > 0 ? String(mins) : "" };
    }
    
    return { hours: "", minutes: "" };
  };

  const initialTime = parseEstimatedTime(estimatedHours);
  const [hours, setHours] = useState<string>(initialTime.hours);
  const [minutes, setMinutes] = useState<string>(initialTime.minutes);

  // Update hours and minutes when estimatedHours changes
  useEffect(() => {
    if (openPopoverId === popoverId) {
      const parsed = parseEstimatedTime(estimatedHours);
      setHours(parsed.hours);
      setMinutes(parsed.minutes);
    }
  }, [openPopoverId, popoverId, estimatedHours]);

  // Format display value for the button
  const formatDisplayValue = () => {
    if (estimatedHours === "-") return "-";
    const strValue = String(estimatedHours);
    // If already in "Xh Ym" format, return as is
    if (strValue.match(/\d+h\s*\d+m/)) return strValue;
    if (strValue.match(/\d+h/)) return strValue;
    // Otherwise format as hours
    return `${estimatedHours}h`;
  };

  return (
    <Popover
      open={openPopoverId === popoverId}
      onOpenChange={(open) => setOpenPopoverId?.(open ? popoverId : null)}
    >
      <PopoverTrigger asChild>
        <button
          className={`w-full text-sm px-3 py-1.5 rounded transition-colors ${
            hasEstimatedDate
              ? "bg-muted text-foreground hover:bg-accent cursor-pointer"
              : "bg-muted/50 text-muted-foreground cursor-not-allowed opacity-50"
          }`}
          disabled={!hasEstimatedDate}
          title={
            hasEstimatedDate
              ? "Click to edit estimated time"
              : "Set estimated date first"
          }
          onClick={(e) => e.stopPropagation()}
        >
          {formatDisplayValue()}
        </button>
      </PopoverTrigger>
      {hasEstimatedDate && (
        <PopoverContent
          className="w-auto p-4 bg-card border border-border shadow-lg rounded-lg"
          align="center"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-sm">Estimated Time</h3>
              <button
                onClick={() => setOpenPopoverId?.(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex gap-3 items-center">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Hours</label>
                <Input
                  type="number"
                  placeholder="0"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  className="h-9 w-20 text-sm [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  style={{ MozAppearance: 'textfield' }}
                  min="0"
                  max="999"
                />
              </div>
              <span className="text-muted-foreground mt-5">:</span>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Minutes</label>
                <Input
                  type="number"
                  placeholder="0"
                  value={minutes}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 0;
                    if (val >= 0 && val <= 59) {
                      setMinutes(e.target.value);
                    }
                  }}
                  className="h-9 w-20 text-sm [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  style={{ MozAppearance: 'textfield' }}
                  min="0"
                  max="59"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setHours("");
                  setMinutes("");
                  onEstimatedTimeChange?.(task.id, null);
                  setOpenPopoverId?.(null);
                }}
              >
                Clear
              </Button>
              <Button
                size="sm"
                onClick={async () => {
                  try {
                    const hrs = parseInt(hours) || 0;
                    const mins = parseInt(minutes) || 0;
                    
                    // Format as "02h 30m" or just "2h" if no minutes
                    let approvedHours: string | null = null;
                    if (hrs > 0 || mins > 0) {
                      const hrsStr = hrs.toString().padStart(2, '0');
                      const minsStr = mins.toString().padStart(2, '0');
                      approvedHours = mins > 0 ? `${hrsStr}h ${minsStr}m` : `${hrs}h`;
                    }

                    // Call API to update approved hours
                    await tasksApi.updateEstimatedDate({
                      task_id: task.id,
                      approved_hours: approvedHours,
                    });

                    // Update local state
                    onEstimatedTimeChange?.(task.id, approvedHours);
                    setOpenPopoverId?.(null);
                    toast.success("Estimated time updated successfully");
                  } catch (error) {
                    console.error("Failed to update estimated time:", error);
                    toast.error("Failed to update estimated time");
                  }
                }}
              >
                Done
              </Button>
            </div>
          </div>
        </PopoverContent>
      )}
    </Popover>
  );
}

// Component for Status selection with create functionality
function StatusPopover({
  task,
  statuses,
  statusObj,
  popoverId,
  openPopoverId,
  setOpenPopoverId,
  onStatusChange,
  onStatusCreated,
  boardId,
}: {
  task: any;
  statuses: Status[];
  statusObj: Status | undefined;
  popoverId: string;
  openPopoverId?: string | null;
  setOpenPopoverId?: (id: string | null) => void;
  onStatusChange?: (taskId: string, statusId: string) => void;
  onStatusCreated?: (newStatus: Status) => void;
  boardId?: string | number;
}) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newStatusName, setNewStatusName] = useState("");
  const [newStatusColor, setNewStatusColor] = useState(PRESET_COLORS[0]);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateStatus = async () => {
    if (!newStatusName.trim()) {
      toast.error("Status name is required");
      return;
    }

    setIsCreating(true);
    try {
      const orgId = getOrganizationId();
      const bId = boardId;

      if (!orgId || !bId) {
        toast.error("Organization or board information not found");
        return;
      }

      const newStatus = await cmsApi.createStatus({
        name: newStatusName.trim(),
        color_code: newStatusColor,
        organization_id: orgId,
        board_id: Number(bId),
      });

      // Ensure status has required fields
      const statusWithDefaults: any = {
        id: newStatus.id || String(Date.now()),
        name: newStatus.name,
        color_code: newStatus.color_code,
        status_order: String(newStatus.status_order) || "999",
      };

      // Update localStorage cache
      addStatusToCache(Number(bId), statusWithDefaults);

      setNewStatusName("");
      setNewStatusColor(PRESET_COLORS[0]);
      setShowCreateForm(false);
      onStatusCreated?.(statusWithDefaults);
      toast.success("Status created successfully");
    } catch (error) {
      console.error("Failed to create status:", error);
      toast.error("Failed to create status");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Popover
      open={openPopoverId === popoverId}
      onOpenChange={(open) => {
        if (open) {
          setShowCreateForm(false);
        }
        setOpenPopoverId?.(open ? popoverId : null);
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 px-3 text-xs font-medium whitespace-nowrap"
          style={{
            backgroundColor: statusObj?.color_code || "#e5e7eb",
            color: "white",
            border: "none",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {statusObj?.name || "No Status"}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-3 bg-card border border-border shadow-lg rounded-lg"
        align="center"
      >
        <div className="flex flex-col">
          {/* Header with + button */}
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium text-sm">Select Status</h3>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-primary/10"
              onClick={() => setShowCreateForm(!showCreateForm)}
              title="Create New Status"
            >
              <span className="text-lg font-semibold">+</span>
            </Button>
          </div>

          {/* Create Form */}
          {showCreateForm && (
            <div className="space-y-2 mb-2 pb-2 border-b border-border">
              <Input
                placeholder="Status name"
                value={newStatusName}
                onChange={(e) => setNewStatusName(e.target.value)}
                className="h-8 text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleCreateStatus();
                  } else if (e.key === "Escape") {
                    setShowCreateForm(false);
                    setNewStatusName("");
                  }
                }}
                autoFocus
              />
              <div className="flex gap-1 flex-wrap">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setNewStatusColor(color)}
                    className={`w-6 h-6 rounded border-2 ${
                      newStatusColor === color
                        ? "border-foreground"
                        : "border-transparent"
                    }`}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-8 text-xs"
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewStatusName("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="flex-1 h-8 text-xs"
                  onClick={handleCreateStatus}
                  disabled={isCreating || !newStatusName.trim()}
                >
                  {isCreating ? "Creating..." : "Create"}
                </Button>
              </div>
            </div>
          )}

          {/* Status Grid */}
          <div className="grid grid-cols-2 gap-2 max-h-80 overflow-y-auto scrollbar-hide">
            {statuses.map((status) => (
              <button
                key={status.id}
                onClick={() => {
                  onStatusChange?.(task.id, status.id);
                  setOpenPopoverId?.(null);
                }}
                title={status.name}
                className="flex flex-col items-center gap-2 px-3 py-2 rounded-lg hover:opacity-80 transition-opacity text-sm font-medium overflow-hidden"
                style={{
                  backgroundColor: status.color_code,
                  color: "white",
                }}
              >
                <span className="text-center truncate w-full">{status.name}</span>
              </button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Component for Priority selection with create functionality
function PriorityPopover({
  task,
  priorities,
  priorityObj,
  popoverId,
  openPopoverId,
  setOpenPopoverId,
  onPriorityChange,
  onPriorityCreated,
  boardId,
}: {
  task: any;
  priorities: Priority[];
  priorityObj: Priority | undefined;
  popoverId: string;
  openPopoverId?: string | null;
  setOpenPopoverId?: (id: string | null) => void;
  onPriorityChange?: (taskId: string, priorityId: string) => void;
  onPriorityCreated?: (newPriority: Priority) => void;
  boardId?: string | number;
}) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newPriorityName, setNewPriorityName] = useState("");
  const [newPriorityColor, setNewPriorityColor] = useState(PRESET_COLORS[0]);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreatePriority = async () => {
    if (!newPriorityName.trim()) {
      toast.error("Priority name is required");
      return;
    }

    setIsCreating(true);
    try {
      const orgId = getOrganizationId();
      const bId = boardId;

      if (!orgId || !bId) {
        toast.error("Organization or board information not found");
        return;
      }

      const newPriority = await cmsApi.createPriority({
        name: newPriorityName.trim(),
        color_code: newPriorityColor,
        organization_id: orgId,
        board_id: Number(bId),
      });

      // Ensure priority has required fields
      const priorityWithDefaults: any = {
        id: newPriority.id || String(Date.now()),
        name: newPriority.name,
        color_code: newPriority.color_code,
        priority_order: newPriority.priority_order || "999",
      };

      // Update localStorage cache
      addPriorityToCache(Number(bId), priorityWithDefaults);

      setNewPriorityName("");
      setNewPriorityColor(PRESET_COLORS[0]);
      setShowCreateForm(false);
      onPriorityCreated?.(priorityWithDefaults);
      toast.success("Priority created successfully");
    } catch (error) {
      console.error("Failed to create priority:", error);
      toast.error("Failed to create priority");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Popover
      open={openPopoverId === popoverId}
      onOpenChange={(open) => {
        if (open) {
          setShowCreateForm(false);
        }
        setOpenPopoverId?.(open ? popoverId : null);
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 px-3 text-xs font-medium whitespace-nowrap"
          style={{
            backgroundColor: priorityObj?.color_code || "#e5e7eb",
            color: "white",
            border: "none",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {priorityObj?.name || "No Priority"}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-3 bg-card border border-border shadow-lg rounded-lg"
        align="center"
      >
        <div className="flex flex-col">
          {/* Header with + button */}
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium text-sm">Select Priority</h3>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-primary/10"
              onClick={() => setShowCreateForm(!showCreateForm)}
              title="Create New Priority"
            >
              <span className="text-lg font-semibold">+</span>
            </Button>
          </div>

          {/* Create Form */}
          {showCreateForm && (
            <div className="space-y-2 mb-2 pb-2 border-b border-border">
              <Input
                placeholder="Priority name"
                value={newPriorityName}
                onChange={(e) => setNewPriorityName(e.target.value)}
                className="h-8 text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleCreatePriority();
                  } else if (e.key === "Escape") {
                    setShowCreateForm(false);
                    setNewPriorityName("");
                  }
                }}
                autoFocus
              />
              <div className="flex gap-1 flex-wrap">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setNewPriorityColor(color)}
                    className={`w-6 h-6 rounded border-2 ${
                      newPriorityColor === color
                        ? "border-foreground"
                        : "border-transparent"
                    }`}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-8 text-xs"
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewPriorityName("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="flex-1 h-8 text-xs"
                  onClick={handleCreatePriority}
                  disabled={isCreating || !newPriorityName.trim()}
                >
                  {isCreating ? "Creating..." : "Create"}
                </Button>
              </div>
            </div>
          )}

          {/* Priority Grid */}
          <div className="grid grid-cols-2 gap-2 max-h-80 overflow-y-auto scrollbar-hide">
            {priorities.map((priority) => (
              <button
                key={priority.id}
                onClick={() => {
                  onPriorityChange?.(task.id, priority.id);
                  setOpenPopoverId?.(null);
                }}
                title={priority.name}
                className="flex flex-col items-center gap-2 px-3 py-2 rounded-lg hover:opacity-80 transition-opacity text-sm font-medium overflow-hidden"
                style={{
                  backgroundColor: priority.color_code,
                  color: "white",
                }}
              >
                <span className="text-center truncate w-full">{priority.name}</span>
              </button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface Column {
  id: string;
  label: string;
  width: string;
  align: "left" | "center";
  fixed?: boolean;
  render: (task: any, isSubitem?: boolean) => React.ReactNode;
}

export const getWorkloadColumns = ({
  expandedTasks,
  toggleTask,
  onOpenComments,
  onEditTask,
  onOpenTaskCard,
  statuses = [],
  priorities = [],
  members = [],
  tags = [],
  onStatusChange,
  onPriorityChange,
  onPersonChange,
  onRatingChange,
  onEstimatedDateChange,
  onEstimatedTimeChange,
  onTagChange,
  openPopoverId,
  setOpenPopoverId,
  boardId,
  onTagCreated,
  onStatusCreated,
  onPriorityCreated,
  inlineEditingTaskId,
  setInlineEditingTaskId,
  inlineEditingTaskName,
  setInlineEditingTaskName,
  onInlineEditTaskName,
}: {
  expandedTasks: Record<string, boolean>;
  toggleTask: (taskId: string) => void;
  onOpenComments?: (task: any) => void;
  onEditTask?: (task: any, focus?: "name" | "description") => void;
  onOpenTaskCard?: (task: any) => void;
  statuses?: Status[];
  priorities?: Priority[];
  members?: any[];
  tags?: any[];
  onStatusChange?: (taskId: string, statusId: string) => void;
  onPriorityChange?: (taskId: string, priorityId: string) => void;
  onPersonChange?: (taskId: string, memberIds: string[]) => void;
  onRatingChange?: (taskId: string, rating: number) => void;
  onEstimatedDateChange?: (
    taskId: string,
    fromDate: string | null,
    toDate?: string | null
  ) => void;
  onEstimatedTimeChange?: (
    taskId: string,
    hours: string | number | null
  ) => void;
  onTagChange?: (taskId: string, tags: any[]) => void;
  openPopoverId?: string | null;
  setOpenPopoverId?: (id: string | null) => void;
  boardId?: string | number;
  onTagCreated?: (newTag: any) => void;
  onStatusCreated?: (newStatus: Status) => void;
  onPriorityCreated?: (newPriority: Priority) => void;
  inlineEditingTaskId?: string | null;
  setInlineEditingTaskId?: (id: string | null) => void;
  inlineEditingTaskName?: string;
  setInlineEditingTaskName?: (name: string) => void;
  onInlineEditTaskName?: (taskId: string, newName: string) => void;
}): Column[] => {
  // Create lookup maps for statuses and priorities
  const statusMap = new Map(statuses.map((s) => [s.id, s]));
  const priorityMap = new Map(priorities.map((p) => [p.id, p]));

  return [
    {
      id: "item",
      label: "Item",
      width: "300px",
      align: "left",
      fixed: true,
      render: (task: any, isSubitem?: boolean) => {
        if (isSubitem) {
          return (
            <div className="flex items-center gap-2 pl-8 justify-between group">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground"> {"├"}</span>
                {inlineEditingTaskId === task.id ? (
                  <Input
                    className="h-6 text-sm border-0 focus:ring-0 focus:border-0"
                    autoFocus
                    value={inlineEditingTaskName}
                    onChange={(e) => setInlineEditingTaskName?.(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && inlineEditingTaskName?.trim()) {
                        onInlineEditTaskName?.(task.id, inlineEditingTaskName);
                      }
                      if (e.key === "Escape") {
                        setInlineEditingTaskId?.(null);
                        setInlineEditingTaskName?.("");
                      }
                    }}
                    onBlur={() => {
                      setInlineEditingTaskId?.(null);
                      setInlineEditingTaskName?.("");
                    }}
                  />
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setInlineEditingTaskId?.(task.id);
                      setInlineEditingTaskName?.(task.name);
                    }}
                    className="font-medium text-foreground hover:underline cursor-pointer"
                  >
                    {task.name}
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenTaskCard?.(task);
                  }}
                  className="p-1 hover:bg-muted rounded"
                >
                  <Pencil className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenComments?.(task);
                  }}
                  className="p-1 hover:bg-muted rounded"
                >
                  <MessageCirclePlus className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                </button>
              </div>
            </div>
          );
        }
        return (
          <div className="flex items-center gap-2 justify-between group">
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleTask(task.id);
                }}
                className="flex items-center"
              >
                {
                  // task.subitems?.length > 0 &&
                  expandedTasks[task.id] ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )
                }
              </button>
              {inlineEditingTaskId === task.id ? (
                <Input
                  className="h-6 text-sm border-0 focus:ring-0 focus:border-0"
                  autoFocus
                  value={inlineEditingTaskName}
                  onChange={(e) => setInlineEditingTaskName?.(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && inlineEditingTaskName?.trim()) {
                      onInlineEditTaskName?.(task.id, inlineEditingTaskName);
                    }
                    if (e.key === "Escape") {
                      setInlineEditingTaskId?.(null);
                      setInlineEditingTaskName?.("");
                    }
                  }}
                  onBlur={() => {
                    setInlineEditingTaskId?.(null);
                    setInlineEditingTaskName?.("");
                  }}
                />
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setInlineEditingTaskId?.(task.id);
                    setInlineEditingTaskName?.(task.name);
                  }}
                  className="font-medium text-foreground hover:underline cursor-pointer"
                >
                  {task.name}
                </button>
              )}
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenTaskCard?.(task);
                }}
                className="p-1 hover:bg-muted rounded"
              >
                <Pencil className="h-4 w-4 text-muted-foreground hover:text-foreground" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenComments?.(task);
                }}
                className="p-1 hover:bg-muted rounded"
              >
                <MessageCirclePlus className="h-4 w-4 text-muted-foreground hover:text-foreground" />
              </button>
            </div>
          </div>
        );
      },
    },
    {
      id: "status",
      label: "Status",
      width: "160px",
      align: "center",
      render: (task: any) => {
        const statusObj = statusMap.get(task.status_id);
        const popoverId = `status-${task.id}`;
        return (
          <StatusPopover
            task={task}
            statuses={statuses}
            statusObj={statusObj}
            popoverId={popoverId}
            openPopoverId={openPopoverId}
            setOpenPopoverId={setOpenPopoverId}
            onStatusChange={onStatusChange}
            onStatusCreated={onStatusCreated}
            boardId={boardId}
          />
        );
      },
    },
    {
      id: "priority",
      label: "Priority",
      width: "160px",
      align: "center",
      render: (task: any) => {
        const priorityObj = priorityMap.get(task.priority_id);
        const popoverId = `priority-${task.id}`;
        return (
          <PriorityPopover
            task={task}
            priorities={priorities}
            priorityObj={priorityObj}
            popoverId={popoverId}
            openPopoverId={openPopoverId}
            setOpenPopoverId={setOpenPopoverId}
            onPriorityChange={onPriorityChange}
            onPriorityCreated={onPriorityCreated}
            boardId={boardId}
          />
        );
      },
    },
    {
      id: "description",
      label: "Description",
      width: "250px",
      align: "left",
      render: (task: any) => {
        const description = task.description ?? "";
        const hasDescription = description.trim().length > 0;

        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEditTask?.(task, "description");
            }}
            className="w-full text-left group"
            title={description}
          >
            {hasDescription ? (
              <div className="space-y-1">
                <p className="text-md text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                  {description}
                </p>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground italic group-hover:text-foreground transition-colors">
                No description
              </div>
            )}
          </button>
        );
      },
    },
    {
      id: "rating",
      label: "Rating",
      width: "140px",
      align: "center",
      render: (task: any) => {
        const rating = Number(task.rating) || 0;
        const ratingCount = task.ratingCount || 0;
        const popoverId = `rating-${task.id}`;
        const hasAssignee = task.assigned_to_ids && task.assigned_to_ids.length > 0;
        const isDone = task.status === "Done" || task.status_id === "done";

        return (
          <RatingStars
            task={task}
            rating={rating}
            ratingCount={ratingCount}
            popoverId={popoverId}
            openPopoverId={openPopoverId}
            setOpenPopoverId={setOpenPopoverId}
            onRatingChange={onRatingChange}
            hasAssignee={hasAssignee}
            isDone={isDone}
          />
        );
      },
    },
    {
      id: "estimatedDate",
      label: "Estimated Date",
      width: "180px",
      align: "center",
      render: (task: any) => {
        const estimatedDate = task.estimatedDate ?? "-";
        const estimatedDateEnd = task.estimatedDateEnd ?? null;
        const popoverId = `estimatedDate-${task.id}`;

        return (
          <EstimatedDatePicker
            task={task}
            estimatedDate={estimatedDate}
            estimatedDateEnd={estimatedDateEnd}
            popoverId={popoverId}
            openPopoverId={openPopoverId}
            setOpenPopoverId={setOpenPopoverId}
            onEstimatedDateChange={onEstimatedDateChange}
          />
        );
      },
    },
    {
      id: "estimatedTime",
      label: "Estimated Time",
      width: "140px",
      align: "center",
      render: (task: any) => {
        const estimatedHours = task.estimatedHours ?? "-";
        const hasEstimatedDate =
          task.estimatedDate && task.estimatedDate !== "-";
        const popoverId = `estimatedTime-${task.id}`;

        return (
          <EstimatedTimePicker
            task={task}
            estimatedHours={estimatedHours}
            hasEstimatedDate={hasEstimatedDate}
            popoverId={popoverId}
            openPopoverId={openPopoverId}
            setOpenPopoverId={setOpenPopoverId}
            onEstimatedTimeChange={onEstimatedTimeChange}
          />
        );
      },
    },
    {
      id: "progress",
      label: "Progress",
      width: "180px",
      align: "center",
      render: (task: any) => {
        const estimatedHours = task.estimatedHours ?? "-";
        return (
          <ProgressBarCell
            taskId={task.id}
            trackedTimeSeconds={task.tracked_time_seconds || 0}
            activeTimerId={task.activeTimerId}
            estimatedHours={estimatedHours}
          />
        );
      },
    },
    {
      id: "person",
      label: "Person",
      width: "128px",
      align: "center",
      render: (task: any) => {
        const selectedMemberIds =
          task.assigned_to_ids ||
          (task.assigned_to_id ? [task.assigned_to_id] : []);
        const popoverId = `person-${task.id}`;
        return (
          <PersonPopover
            task={task}
            members={members}
            selectedMemberIds={selectedMemberIds}
            popoverId={popoverId}
            openPopoverId={openPopoverId}
            setOpenPopoverId={setOpenPopoverId}
            onPersonChange={onPersonChange}
          />
        );
      },
    },
    {
      id: "tags",
      label: "Tags",
      width: "180px",
      align: "center",
      render: (task: any) => (
        <TagsColumnCell
          task={task}
          tags={tags}
          openPopoverId={openPopoverId}
          setOpenPopoverId={setOpenPopoverId}
          onTagChange={onTagChange}
          onTagCreated={onTagCreated}
          boardId={boardId}
        />
      ),
    },

    {
      id: "timer",
      label: "Timer",
      width: "160px",
      align: "center",
      render: (task: any) => {
        const hasAssignee = task.assigned_to_ids && task.assigned_to_ids.length > 0;
        const estimatedHours = task.estimatedHours ?? "-";
        return (
          <TimerCell
            taskId={task.id}
            trackedTimeSeconds={task.tracked_time_seconds || 0}
            activeTimerId={task.activeTimerId}
            onTimerStart={task.onTimerStart}
            onTimerConflict={task.onTimerConflict}
            hasAssignee={hasAssignee}
            estimatedHours={estimatedHours}
          />
        );
      },
    },
    {
      id: "time",
      label: "Time Spent",
      width: "128px",
      align: "center",
      render: (task: any) => task.timeSpent ?? "-",
    },
  ];
};
