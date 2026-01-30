import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { tasksApi } from "@/features/tasks/tasksApi";
import { parseEstimatedTime } from "../utils";

interface EstimatedTimePickerProps {
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
}

export function EstimatedTimePicker({
  task,
  estimatedHours,
  hasEstimatedDate,
  popoverId,
  openPopoverId,
  setOpenPopoverId,
  onEstimatedTimeChange,
}: EstimatedTimePickerProps) {
  const initialTime = parseEstimatedTime(estimatedHours);
  const [hours, setHours] = useState<string>(initialTime.hours);
  const [minutes, setMinutes] = useState<string>(initialTime.minutes);

  useEffect(() => {
    if (openPopoverId === popoverId) {
      const parsed = parseEstimatedTime(estimatedHours);
      setHours(parsed.hours);
      setMinutes(parsed.minutes);
    }
  }, [openPopoverId, popoverId, estimatedHours]);

  const formatDisplayValue = () => {
    if (estimatedHours === "-") return "-";
    const strValue = String(estimatedHours);
    if (strValue.match(/\d+h\s*\d+m/)) return strValue;
    if (strValue.match(/\d+h/)) return strValue;
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
                  style={{ MozAppearance: "textfield" }}
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
                  style={{ MozAppearance: "textfield" }}
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

                    let approvedHours: string | null = null;
                    if (hrs > 0 || mins > 0) {
                      const hrsStr = hrs.toString().padStart(2, "0");
                      const minsStr = mins.toString().padStart(2, "0");
                      approvedHours =
                        mins > 0 ? `${hrsStr}h ${minsStr}m` : `${hrs}h 00m`;
                    }

                    await tasksApi.updateEstimatedDate({
                      task_id: task.id,
                      approved_hours: approvedHours,
                    });

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
