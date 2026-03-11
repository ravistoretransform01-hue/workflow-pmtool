import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  TooltipPortal,
} from "@/shared/components/ui/tooltip";

interface TruncatedTaskNameProps {
  name: string;
  subitemsCount?: number;
  className?: string;
  tooltipClassName?: string;
  maxTooltipWidth?: number;
  side?: "top" | "bottom" | "left" | "right";
}

export const TruncatedTaskName = ({
  name,
  subitemsCount,
  className,
  tooltipClassName,
  maxTooltipWidth = 400,
  side = "top",
}: TruncatedTaskNameProps) => {
  const [isTruncated, setIsTruncated] = useState(false);
  const textRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const checkTruncation = () => {
      if (textRef.current) {
        setIsTruncated(
          textRef.current.scrollWidth > textRef.current.clientWidth,
        );
      }
    };

    const timeoutId = setTimeout(checkTruncation, 50);
    window.addEventListener("resize", checkTruncation);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("resize", checkTruncation);
    };
  }, [name]);

  const nameContent = (
    <span
      ref={textRef}
      className={cn("truncate flex-1 text-left min-w-0")}
    >
      {name}
    </span>
  );

  const counterContent =
    subitemsCount && subitemsCount > 0 ? (
      <span className="shrink-0 inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-200 rounded dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800 transition-colors group-hover/taskname:no-underline dark:group-hover/taskname:bg-blue-800/50 text-center">
        {subitemsCount}
      </span>
    ) : null;

  const content = (
    <div className={cn("flex items-center gap-1.5 min-w-0 overflow-hidden flex-1", className)}>
      {nameContent}
      {counterContent}
    </div>
  );

  if (!isTruncated) {
    return content;
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          {content}
        </TooltipTrigger>
        <TooltipPortal>
          <TooltipContent
            side={side}
            className={cn(
              "break-words bg-slate-900 text-slate-50 border-slate-800 shadow-xl dark:bg-slate-50 dark:text-slate-900 dark:border-slate-200",
              tooltipClassName
            )}
            style={{ maxWidth: maxTooltipWidth }}
          >
            {name}
          </TooltipContent>
        </TooltipPortal>
      </Tooltip>
    </TooltipProvider>
  );
};
