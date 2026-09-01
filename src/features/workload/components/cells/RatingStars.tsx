import { useState } from "react";
import { toast } from "sonner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/ui/popover";

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
}: RatingStarsProps) {
  const [hoveredRating, setHoveredRating] = useState(0);

  const isReviewPending = isDone && (!rating || rating === 0);

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
          className={`w-full h-8 flex items-center justify-center gap-1 transition-all ${
            isReviewPending
              ? "rounded-md bg-amber-500/15 border border-amber-400/60 ring-2 ring-amber-400/30 animate-pulse hover:bg-amber-500/25"
              : !hasAssignee || !isDone
                ? "opacity-50 cursor-not-allowed"
                : ""
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
                : isReviewPending
                  ? "Task completed! Click to give review & rating"
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
              className={`h-4 w-4 transition-colors ${
                i <= rating
                  ? "text-yellow-400 fill-yellow-400"
                  : isReviewPending
                    ? "text-amber-500/70"
                    : "text-muted-foreground"
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
