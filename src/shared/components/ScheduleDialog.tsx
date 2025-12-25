import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Calendar } from "@/shared/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/shared/components/ui/tabs";
import { CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
// import { cn } from "@/lib/utils";
// import { supabase } from "@/integrations/supabase/client";
import { useTestUser } from "@/contexts/TestUserContext";
// import { useToast } from "@/hooks/use-toast";

interface ScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface DaySchedule {
  enabled: boolean;
  start: string;
  end: string;
}

interface TimeOffEntry {
  id: string;
  start_date: string;
  end_date: string;
  reason: string;
}

const daysOfWeek = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

const dayLabels = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

export function ScheduleDialog({ open, onOpenChange }: ScheduleDialogProps) {
  const [activeTab, setActiveTab] = useState("work-hours");
  const { currentUser } = useTestUser();
  // const { toast } = useToast();
  const [schedule, setSchedule] = useState<Record<string, DaySchedule>>({
    monday: { enabled: true, start: "09:00", end: "05:00" },
    tuesday: { enabled: true, start: "09:00", end: "05:00" },
    wednesday: { enabled: true, start: "09:00", end: "05:00" },
    thursday: { enabled: true, start: "09:00", end: "05:00" },
    friday: { enabled: true, start: "09:00", end: "05:00" },
    saturday: { enabled: true, start: "09:00", end: "05:00" },
    sunday: { enabled: true, start: "09:00", end: "05:00" },
  });
  // const [timeOffEntries, setTimeOffEntries] = useState<TimeOffEntry[]>([]);
  const [timeOffEntries] = useState<TimeOffEntry[]>([]);
  const [newTimeOff, setNewTimeOff] = useState<{
    startDate: Date | undefined;
    endDate: Date | undefined;
    reason: string;
  }>({
    startDate: undefined,
    endDate: undefined,
    reason: "",
  });

  useEffect(() => {
    if (open) {
      loadSchedule();
      loadTimeOff();
    }
  }, [open, currentUser.id]);

  const loadSchedule = async () => {
    // const { data, error } = await supabase
    //   .from("user_schedules")
    //   .select("*")
    //   .eq("test_user_id", currentUser.id)
    //   .single();
    // if (data && !error) {
    //   const loadedSchedule: Record<string, DaySchedule> = {};
    //   daysOfWeek.forEach((day) => {
    //     loadedSchedule[day] = {
    //       enabled: data[`${day}_enabled`] ?? true,
    //       start: data[`${day}_start`] ?? "09:00",
    //       end: data[`${day}_end`] ?? "05:00",
    //     };
    //   });
    //   setSchedule(loadedSchedule);
    // }
  };

  const loadTimeOff = async () => {
    // const { data, error } = await supabase
    //   .from("time_off")
    //   .select("*")
    //   .eq("test_user_id", currentUser.id)
    //   .order("start_date", { ascending: true });
    // if (data && !error) {
    //   setTimeOffEntries(data);
    // }
  };

  const calculateHours = (start: string, end: string): number => {
    const [startHour, startMin] = start.split(":").map(Number);
    const [endHour, endMin] = end.split(":").map(Number);
    const startTotal = startHour + startMin / 60;
    const endTotal = endHour + endMin / 60;
    return Math.abs(endTotal - startTotal);
  };

  const calculateWeeklyCapacity = (): number => {
    return daysOfWeek.reduce((total, day) => {
      if (schedule[day].enabled) {
        return total + calculateHours(schedule[day].start, schedule[day].end);
      }
      return total;
    }, 0);
  };

  const handleSaveSchedule = async () => {
    // const scheduleData: any = {
    //   test_user_id: currentUser.id,
    // };
    // daysOfWeek.forEach((day) => {
    //   scheduleData[`${day}_enabled`] = schedule[day].enabled;
    //   scheduleData[`${day}_start`] = schedule[day].start;
    //   scheduleData[`${day}_end`] = schedule[day].end;
    // });
    // const { error } = await supabase
    //   .from("user_schedules")
    //   .upsert(scheduleData, { onConflict: "test_user_id" });
    // if (error) {
    //   toast({
    //     title: "Error",
    //     description: "Failed to save schedule",
    //     variant: "destructive",
    //   });
    // } else {
    //   toast({
    //     title: "Success",
    //     description: "Schedule saved successfully",
    //   });
    // }
  };

  const handleAddTimeOff = async () => {
    // if (!newTimeOff.startDate || !newTimeOff.endDate) {
    //   toast({
    //     title: "Error",
    //     description: "Please select start and end dates",
    //     variant: "destructive",
    //   });
    //   return;
    // }
    // const { error } = await supabase.from("time_off").insert({
    //   test_user_id: currentUser.id,
    //   start_date: format(newTimeOff.startDate, "yyyy-MM-dd"),
    //   end_date: format(newTimeOff.endDate, "yyyy-MM-dd"),
    //   reason: newTimeOff.reason,
    // });
    // if (error) {
    //   toast({
    //     title: "Error",
    //     description: "Failed to add time off",
    //     variant: "destructive",
    //   });
    // } else {
    //   toast({
    //     title: "Success",
    //     description: "Time off added successfully",
    //   });
    //   setNewTimeOff({ startDate: undefined, endDate: undefined, reason: "" });
    //   loadTimeOff();
    // }
  };

  const handleDeleteTimeOff = async (id: string) => {
    if (id === "") return;
    // const { error } = await supabase.from("time_off").delete().eq("id", id);

    // if (error) {
    //   toast({
    //     title: "Error",
    //     description: "Failed to delete time off",
    //     variant: "destructive",
    //   });
    // } else {
    //   toast({
    //     title: "Success",
    //     description: "Time off deleted successfully",
    //   });
    //   loadTimeOff();
    // }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="work-hours">
                Select work days and hours
              </TabsTrigger>
              <TabsTrigger value="time-off">Set Time off</TabsTrigger>
            </TabsList>

            <TabsContent value="work-hours" className="mt-6 space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">
                  Select working days and daily capacity
                </h3>
                <span className="text-sm text-muted-foreground">
                  Weekly capacity: {calculateWeeklyCapacity().toFixed(0)}h
                </span>
              </div>

              <div className="space-y-4">
                {daysOfWeek.map((day) => (
                  <div key={day} className="flex items-center gap-4">
                    <div className="flex items-center gap-2 w-32">
                      <Checkbox
                        checked={schedule[day].enabled}
                        onCheckedChange={(checked) =>
                          setSchedule((prev) => ({
                            ...prev,
                            [day]: {
                              ...prev[day],
                              enabled: checked as boolean,
                            },
                          }))
                        }
                      />
                      <label className="text-sm">{dayLabels[day]}</label>
                    </div>

                    <Input
                      type="time"
                      value={schedule[day].start}
                      onChange={(e) =>
                        setSchedule((prev) => ({
                          ...prev,
                          [day]: { ...prev[day], start: e.target.value },
                        }))
                      }
                      className="w-32"
                    />

                    <span className="text-sm text-muted-foreground">to</span>

                    <Input
                      type="time"
                      value={schedule[day].end}
                      onChange={(e) =>
                        setSchedule((prev) => ({
                          ...prev,
                          [day]: { ...prev[day], end: e.target.value },
                        }))
                      }
                      className="w-32"
                    />

                    <span className="text-sm text-muted-foreground w-12">
                      {schedule[day].enabled
                        ? `${calculateHours(
                            schedule[day].start,
                            schedule[day].end
                          ).toFixed(0)}h`
                        : ""}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveSchedule}>Save</Button>
              </div>
            </TabsContent>

            <TabsContent value="time-off" className="mt-6 space-y-6">
              <h3 className="text-lg font-medium">Set Time Off</h3>

              <div className="space-y-4">
                <div className="flex gap-4">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-[240px] justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {newTimeOff.startDate
                          ? format(newTimeOff.startDate, "PPP")
                          : "Start date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={newTimeOff.startDate}
                        onSelect={(date) =>
                          setNewTimeOff((prev) => ({
                            ...prev,
                            startDate: date,
                          }))
                        }
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-[240px] justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {newTimeOff.endDate
                          ? format(newTimeOff.endDate, "PPP")
                          : "End date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={newTimeOff.endDate}
                        onSelect={(date) =>
                          setNewTimeOff((prev) => ({ ...prev, endDate: date }))
                        }
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>

                  <Input
                    placeholder="Reason (optional)"
                    value={newTimeOff.reason}
                    onChange={(e) =>
                      setNewTimeOff((prev) => ({
                        ...prev,
                        reason: e.target.value,
                      }))
                    }
                    className="flex-1"
                  />

                  <Button onClick={handleAddTimeOff}>Add</Button>
                </div>

                {timeOffEntries.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Scheduled Time Off</h4>
                    {timeOffEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between p-3 border rounded-md"
                      >
                        <div>
                          <div className="text-sm font-medium">
                            {format(new Date(entry.start_date), "PPP")} -{" "}
                            {format(new Date(entry.end_date), "PPP")}
                          </div>
                          {entry.reason && (
                            <div className="text-sm text-muted-foreground">
                              {entry.reason}
                            </div>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteTimeOff(entry.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveSchedule}>Save</Button>
              </div>
            </TabsContent>
          </Tabs>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
