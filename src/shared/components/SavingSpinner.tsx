import { useSelector, useDispatch } from "react-redux";
import { RotateCw } from "lucide-react";
import type { RootState } from "@/app/store";
import { cn } from "@/lib/utils";
import { Button } from "@/shared/components/ui/button";
import { triggerRefresh } from "@/features/ui/uiSlice";
import { fetchBoardsThunk } from "@/features/boards/boardsThunks";
import { fetchActiveTimer } from "@/features/tasks/tasksSlice";

interface SavingSpinnerProps {
  className?: string;
  size?: number;
}

/**
 * A small, minimal saving spinner that indicates background saving.
 * Listens to the global `ui.isSaving` state from Redux.
 */
export const SavingSpinner = ({ className, size = 16 }: SavingSpinnerProps) => {
  const isSaving = useSelector((state: RootState) => state.ui.isSaving);
  const dispatch = useDispatch<any>();

  const handleRefresh = () => {
    // Trigger global refresh signal for components with local state
    dispatch(triggerRefresh());

    // Refresh Redux-managed global data
    dispatch(fetchBoardsThunk());
    dispatch(fetchActiveTimer());
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleRefresh}
      className={cn(
        "h-8 w-8 rounded-full hover:bg-white/10 text-white transition-all duration-300",
        className,
      )}
      title={isSaving ? "Saving..." : "Refresh data"}
      disabled={isSaving}
    >
      <RotateCw className={cn(isSaving && "animate-spin")} size={size} />
    </Button>
  );
};

export default SavingSpinner;
