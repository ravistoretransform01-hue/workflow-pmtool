import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";

interface TimePickerInputProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  className?: string;
  placeholder?: string;
}

export function TimePickerInput({ value, onChange, onBlur, className }: TimePickerInputProps) {
  // Parse the incoming value to get hour, minute, and period
  const parseTime = (timeStr: string): { hour: string; minute: string; period: "AM" | "PM" } => {
    if (!timeStr || timeStr === "-" || timeStr.trim() === "") {
      return { hour: "12", minute: "00", period: "AM" };
    }
    
    // Match patterns like "10:00am", "10:00 AM", "10:00AM", "10:00:00 AM" (with optional seconds)
    const match = timeStr.match(/(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM|am|pm)/i);
    if (match) {
      let hour = match[1];
      const minute = match[2];
      const period = match[3].toUpperCase() as "AM" | "PM";
      
      // Ensure hour is in 1-12 range and pad with leading zero
      let hourNum = parseInt(hour, 10);
      if (hourNum === 0) hourNum = 12;
      if (hourNum > 12) hourNum = hourNum % 12 || 12;
      hour = String(hourNum).padStart(2, "0");
      
      return { hour, minute, period };
    }
    
    return { hour: "12", minute: "00", period: "AM" };
  };

  const parsed = parseTime(value);
  const [hour, setHour] = useState(parsed.hour);
  const [minute, setMinute] = useState(parsed.minute);
  const [period, setPeriod] = useState<"AM" | "PM">(parsed.period);

  // Sync with external value changes
  useEffect(() => {
    const parsed = parseTime(value);
    setHour(parsed.hour);
    setMinute(parsed.minute);
    setPeriod(parsed.period);
  }, [value]);

  const formatAndEmit = (h: string, m: string, p: "AM" | "PM") => {
    const formattedTime = `${h}:${m} ${p}`;
    onChange(formattedTime);
  };

  const handleHourChange = (newHour: string) => {
    setHour(newHour);
    formatAndEmit(newHour, minute, period);
  };

  const handleMinuteChange = (newMinute: string) => {
    setMinute(newMinute);
    formatAndEmit(hour, newMinute, period);
  };

  const handlePeriodChange = (newPeriod: "AM" | "PM") => {
    setPeriod(newPeriod);
    formatAndEmit(hour, minute, newPeriod);
  };

  // Generate hour options (01-12)
  const hourOptions = Array.from({ length: 12 }, (_, i) => {
    const h = i + 1;
    return String(h).padStart(2, "0");
  });

  // Generate minute options (00 to 59)
  const minuteOptions = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

  return (
    <div 
      className={cn("flex items-center gap-1", className)}
      onBlur={onBlur}
    >
      {/* Hour Select */}
      <Select value={hour} onValueChange={handleHourChange}>
        <SelectTrigger className="w-[60px] bg-[#0f172a] border-[#334155] text-foreground">
          <SelectValue placeholder="Hr" />
        </SelectTrigger>
        <SelectContent className="bg-[#1e293b] border-[#334155]">
          {hourOptions.map((h) => (
            <SelectItem key={h} value={h} className="text-foreground">
              {h}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <span className="text-muted-foreground">:</span>

      {/* Minute Select */}
      <Select value={minute} onValueChange={handleMinuteChange}>
        <SelectTrigger className="w-[60px] bg-[#0f172a] border-[#334155] text-foreground">
          <SelectValue placeholder="Min" />
        </SelectTrigger>
        <SelectContent className="bg-[#1e293b] border-[#334155]">
          {minuteOptions.map((m) => (
            <SelectItem key={m} value={m} className="text-foreground">
              {m}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* AM/PM Select */}
      <Select value={period} onValueChange={handlePeriodChange}>
        <SelectTrigger className="w-[65px] bg-[#0f172a] border-[#334155] text-foreground">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-[#1e293b] border-[#334155]">
          <SelectItem value="AM" className="text-foreground">AM</SelectItem>
          <SelectItem value="PM" className="text-foreground">PM</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

export default TimePickerInput;
