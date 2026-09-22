import { useState } from "react";
import type { Task } from "@/features/workload/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/ui/popover";
import { toast } from "sonner";
import { isProjectManagerRole } from "@/utils/utils";

interface LeaderRatingCellProps {
  task: Task;
  popoverId?: string;
  openPopoverId?: string | null;
  setOpenPopoverId?: (id: string | null) => void;
  onLeaderRatingChange?: (taskId: string, rating: number) => void;
  isProjectManager?: boolean;
  isDone?: boolean;
}

export function LeaderRatingCell({
  task,
  popoverId = `leader-rating-${task.id}`,
  openPopoverId,
  setOpenPopoverId,
  onLeaderRatingChange,
  isProjectManager: isProjectManagerProp,
  isDone: isDoneProp,
}: LeaderRatingCellProps) {
  // Check if current user is Project Manager
  const isProjectManager = (() => {
    if (typeof isProjectManagerProp === "boolean") return isProjectManagerProp;

    try {
      const userDataRaw = localStorage.getItem("user_data");
      if (userDataRaw) {
        const userData = JSON.parse(userDataRaw);
        if (
          isProjectManagerRole(userData?.role_label) ||
          isProjectManagerRole(userData?.role_name) ||
          isProjectManagerRole(userData?.board_role_label) ||
          isProjectManagerRole(userData?.role?.[0]) ||
          isProjectManagerRole(userData?.role)
        ) {
          return true;
        }
      }
    } catch {}

    return false;
  })();

  // Check if task is marked as Done
  const isDone =
    typeof isDoneProp === "boolean"
      ? isDoneProp
      : (() => {
          const status = (task?.status || "").trim().toLowerCase();
          return status === "done" || status === "completed";
        })();

  const canRate = isProjectManager && isDone;

  const [hoveredRating, setHoveredRating] = useState(0);
  const [localPopoverOpen, setLocalPopoverOpen] = useState(false);

  const isControlled = openPopoverId !== undefined && setOpenPopoverId !== undefined;
  const isPopoverOpen = isControlled ? openPopoverId === popoverId : localPopoverOpen;

  const handleOpenChange = (open: boolean) => {
    if (!isProjectManager) {
      if (open) {
        toast.error("Only Project Managers can rate tasks");
      }
      return;
    }
    if (open && !isDone) {
      toast.error("Task must be marked as Done before rating");
      return;
    }
    if (isControlled) {
      setOpenPopoverId?.(open ? popoverId : null);
    } else {
      setLocalPopoverOpen(open);
    }
  };

  const leaderRatingAvg =
    task?.leader_rating_average !== null &&
    task?.leader_rating_average !== undefined
      ? Number(task.leader_rating_average)
      : null;
  const hasLeaderRating =
    leaderRatingAvg !== null && !isNaN(leaderRatingAvg) && leaderRatingAvg > 0;

  const currentScore = hoveredRating || (hasLeaderRating ? Math.round(leaderRatingAvg) : 0);

  const handleRatingClick = (ratingValue: number) => {
    if (!isProjectManager) {
      toast.error("Only Project Managers can rate tasks");
      handleOpenChange(false);
      return;
    }
    if (!isDone) {
      toast.error("Task must be marked as Done before rating");
      handleOpenChange(false);
      return;
    }

    handleOpenChange(false);
    onLeaderRatingChange?.(task.id, ratingValue);
  };

  return (
    <Popover open={isPopoverOpen && canRate} onOpenChange={handleOpenChange}>
      <div className="relative w-full flex items-center justify-center">
        <TooltipProvider delayDuration={150}>
          <Tooltip open={isPopoverOpen ? false : undefined}>
            <TooltipTrigger asChild>
              <span className="w-full inline-flex">
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={`relative w-full h-8 flex items-center justify-center gap-1 rounded transition-all ${
                      canRate
                        ? "cursor-pointer hover:bg-muted/40"
                        : isProjectManager && !isDone
                          ? "cursor-not-allowed opacity-60"
                          : "cursor-default opacity-80"
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isProjectManager) {
                        toast.error("Only Project Managers can rate tasks");
                        return;
                      }
                      if (!isDone) {
                        toast.error("Task must be marked as Done before rating");
                        return;
                      }
                    }}
                    aria-label={`Leader Rating: ${leaderRatingAvg ?? "None"}`}
                  >
                    {[1, 2, 3, 4, 5].map((i) => (
                      <svg
                        key={i}
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className={`h-4 w-4 transition-colors ${
                          hasLeaderRating && i <= Math.round(leaderRatingAvg)
                            ? "text-yellow-400 fill-yellow-400"
                            : "text-muted-foreground/30"
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
              className="z-[9999] px-3 py-1.5 text-xs font-medium bg-popover text-popover-foreground shadow-md rounded-md border border-border max-w-xs"
            >
              {hasLeaderRating ? (
                <div className="space-y-1 text-left">
                  <p className="font-semibold text-foreground">
                    Leader Rating: {leaderRatingAvg} / 5
                  </p>
                  {!isProjectManager ? (
                    <p className="text-[11px] text-amber-500 font-normal">
                      Only Project Managers can edit this rating
                    </p>
                  ) : !isDone ? (
                    <p className="text-[11px] text-amber-500 font-normal">
                      Task must be marked as Done to edit rating
                    </p>
                  ) : null}
                </div>
              ) : (
                <div className="text-left">
                  <span>
                    {!isProjectManager
                      ? "Only Project Managers can rate tasks"
                      : !isDone
                        ? "Task must be marked as Done before rating"
                        : "Click to rate as Project Manager"}
                  </span>
                </div>
              )}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <PopoverContent
        className="w-60 p-3 bg-card border border-border shadow-lg rounded-lg"
        align="center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-3">
          <div className="text-xs font-medium text-muted-foreground text-center">
            Set Leader Rating
          </div>
          <div className="flex gap-2 justify-center">
            {[1, 2, 3, 4, 5].map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleRatingClick(i)}
                onMouseEnter={() => setHoveredRating(i)}
                onMouseLeave={() => setHoveredRating(0)}
                className="p-1 cursor-pointer transition-transform hover:scale-110"
                aria-label={`Set leader rating to ${i}`}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className={`h-6 w-6 transition-colors ${
                    i <= currentScore
                      ? "text-yellow-400 fill-yellow-400"
                      : "text-muted-foreground/40"
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
