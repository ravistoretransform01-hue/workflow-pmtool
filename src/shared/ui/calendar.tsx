import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/utils/utils";
import { buttonVariants } from "@/shared/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  // const CustomDay = ({ date, displayMonth }: { date: Date; displayMonth: Date }) => {
  const CustomDay = ({ date }: { date: Date; displayMonth: Date }) => {
    const isToday =
      date.getDate() === new Date().getDate() &&
      date.getMonth() === new Date().getMonth() &&
      date.getFullYear() === new Date().getFullYear();

    return (
      <div className="relative flex flex-col items-center justify-center w-full h-full">
        <span>{date.getDate()}</span>
        {isToday && (
          <div className="absolute bottom-1 w-1 h-1 rounded-full bg-blue-500" />
        )}
      </div>
    );
  };

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-medium",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell:
          "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
        row: "flex w-full mt-2",
        cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-white/20 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-muted hover:text-muted-foreground transition-colors"
        ),
        day_range_end: "day-range-end",
        day_selected:
          "bg-white text-[#1e293b] hover:bg-white hover:text-[#1e293b] focus:bg-white focus:text-[#1e293b] rounded-md !text-[#1e293b]",
        day_today: "text-foreground",
        day_outside:
          "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle:
          "aria-selected:bg-white/20 aria-selected:text-white hover:bg-muted",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        // IconLeft: ({ ..._props }) => <ChevronLeft className="h-4 w-4" />,
        // IconRight: ({ ..._props }) => <ChevronRight className="h-4 w-4" />,
        IconLeft: ({}) => <ChevronLeft className="h-4 w-4" />,
        IconRight: ({}) => <ChevronRight className="h-4 w-4" />,
        DayContent: CustomDay as any,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
