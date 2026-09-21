import { useState, useEffect } from "react";
import { toast } from "sonner";
import { X, Star } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/ui/tooltip";
import { getCurrentUserId, isClientRole } from "@/utils/utils";

interface RatingStarsProps {
  task: any;
  rating: number;
  ratingCount?: number;
  popoverId: string;
  openPopoverId?: string | null;
  setOpenPopoverId?: (id: string | null) => void;
  onRatingChange?: (taskId: string, rating: number) => void;
  hasAssignee?: boolean;
  isDone?: boolean;
  isDialog?: boolean;
  isClient?: boolean;
}

export function RatingStars({
  task,
  rating,
  ratingCount,
  popoverId,
  openPopoverId,
  setOpenPopoverId,
  onRatingChange,
  hasAssignee = false,
  isDone = false,
  isDialog = false,
  isClient: isClientProp,
}: RatingStarsProps) {
  const isClient = (() => {
    if (typeof isClientProp === "boolean") {
      return isClientProp;
    }
    try {
      const match = window.location.pathname.match(/\/board\/(\d+)/);
      const boardId = match ? match[1] : null;
      const currentUserId = getCurrentUserId();
      if (boardId && currentUserId) {
        const cached = localStorage.getItem(`cms_data_board_${boardId}`);
        if (cached) {
          const cmsData = JSON.parse(cached);
          const currentMember = cmsData?.members?.find(
            (m: any) => String(m.user_id) === String(currentUserId),
          );
          if (currentMember?.board_role_label || currentMember?.role) {
            return isClientRole(
              currentMember.board_role_label || currentMember.role,
            );
          }
        }
      }
    } catch {}

    try {
      const userDataRaw = localStorage.getItem("user_data");
      if (userDataRaw) {
        const userData = JSON.parse(userDataRaw);
        return isClientRole(userData?.role_label || userData?.role?.[0]);
      }
    } catch {}

    return false;
  })();

  const [hoveredRating, setHoveredRating] = useState(0);
  const [isDismissed, setIsDismissed] = useState(() => {
    try {
      return (
        sessionStorage.getItem(`rating_callout_dismissed_${task.id}`) === "true"
      );
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      setIsDismissed(
        sessionStorage.getItem(`rating_callout_dismissed_${task.id}`) === "true"
      );
    } catch {
      setIsDismissed(false);
    }
  }, [task.id]);

  const hasRating = Boolean(rating && Number(rating) > 0);
  const isReviewPending = isClient && isDone && !hasRating && hasAssignee;
  const isPopoverOpen = openPopoverId === popoverId;
  const showCallout =
    isClient && isReviewPending && isDialog && !isDismissed && !isPopoverOpen;
  const canRate = isClient && hasAssignee && isDone;

  const handleDismiss = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDismissed(true);
    try {
      sessionStorage.setItem(`rating_callout_dismissed_${task.id}`, "true");
    } catch {}
  };

  const tooltipText = !isClient
    ? "Only clients can rate tasks"
    : isReviewPending
      ? "Your rating is appreciated"
      : !hasAssignee
        ? "Assign a person first"
        : !isDone
          ? "Task must be marked as Done"
          : "";

  const handleRatingClick = (ratingValue: number) => {
    if (!isClient) {
      toast.error("Only clients can rate tasks");
      setOpenPopoverId?.(null);
      return;
    }
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
      open={isPopoverOpen && isClient}
      onOpenChange={(open) => {
        if (!isClient) {
          toast.error("Only clients can rate tasks");
          return;
        }
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
      <div className="relative w-full flex items-center justify-center">
        {/* Default Open Callout Tooltip with Close Option in Dialog */}
        {showCallout && (
          <div className="absolute -top-9 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 bg-popover text-popover-foreground border border-amber-500/40 dark:border-amber-400/40 text-[11px] font-medium px-2.5 py-1 rounded-md shadow-md whitespace-nowrap animate-in fade-in-0 zoom-in-95 pointer-events-auto">
            <Star className="h-3 w-3 text-amber-500 fill-amber-500 shrink-0" />
            <span>Your rating is appreciated</span>
            <button
              type="button"
              onClick={handleDismiss}
              className="ml-1 p-0.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title="Dismiss"
              aria-label="Close"
            >
              <X className="h-3 w-3" />
            </button>
            {/* Little triangle arrow pointing down to stars */}
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-popover border-b border-r border-amber-500/40 dark:border-amber-400/40 rotate-45" />
          </div>
        )}

        <TooltipProvider delayDuration={150}>
          <Tooltip
            open={
              (isClient && (hasRating || isDismissed)) ||
              showCallout ||
              isPopoverOpen ||
              !tooltipText
                ? false
                : undefined
            }
          >
            <TooltipTrigger asChild>
              <span className="w-full inline-flex">
                <PopoverTrigger asChild>
                  <button
                    className={`relative w-full h-8 flex items-center justify-center gap-1 rounded transition-colors ${
                      !canRate ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                    aria-label={`Rating ${rating}${
                      ratingCount
                        ? ` (${ratingCount} rating${ratingCount !== 1 ? "s" : ""})`
                        : ""
                    }`}
                    onClick={(e) => e.stopPropagation()}
                    disabled={!canRate}
                  >
                    {isReviewPending && (
                      <svg
                        className="absolute inset-0 w-full h-full pointer-events-none rounded overflow-visible"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        {/* Base single solid border */}
                        <rect
                          x="1"
                          y="1"
                          width="calc(100% - 2px)"
                          height="calc(100% - 2px)"
                          rx="4"
                          ry="4"
                          fill="none"
                          stroke="rgba(245, 158, 11, 0.35)"
                          strokeWidth="1.5"
                        />
                        {/* Single running shade traveling around the border */}
                        <rect
                          x="1"
                          y="1"
                          width="calc(100% - 2px)"
                          height="calc(100% - 2px)"
                          rx="4"
                          ry="4"
                          fill="none"
                          stroke="#f59e0b"
                          strokeWidth="1.5"
                          pathLength="100"
                          strokeDasharray="15 85"
                          style={{
                            animation: "runningShadeAnim 4s linear infinite",
                          }}
                        />
                      </svg>
                    )}
                    {[1, 2, 3, 4, 5].map((i) => (
                      <svg
                        key={i}
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className={`h-4 w-4 relative z-10 ${
                          i <= rating ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground"
                        }`}
                      >
                        <path
                          d="M12 .587l3.668 7.431L23.5 9.753l-5.75 5.601L19.334 24 12 20.202 4.666 24l1.584-8.646L.5 9.753l7.832-1.735L12 .587z"
                          fill="currentColor"
                        />
                      </svg>
                    ))}
                  </button>
                </PopoverTrigger>
              </span>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              className="z-[9999] px-2.5 py-1 text-xs font-medium bg-popover text-popover-foreground shadow-md rounded-md border border-border"
            >
              {tooltipText}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

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
                      ? "text-yellow-400 fill-yellow-400"
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
        </div>
      </PopoverContent>
    </Popover>
  );
}
