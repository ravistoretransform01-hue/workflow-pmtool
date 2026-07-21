import { useState, useCallback } from "react";

/**
 * Hook for managing popover open/close state
 * Ensures only one popover is open at a time
 * Reusable across all views
 */
export function usePopoverState() {
  const [openPopoverId, setOpenPopoverId] = useState<string | null>(null);

  const openPopover = useCallback((popoverId: string) => {
    setOpenPopoverId(popoverId);
  }, []);

  const closePopover = useCallback(() => {
    setOpenPopoverId(null);
  }, []);

  const togglePopover = useCallback((popoverId: string) => {
    setOpenPopoverId((prev) => (prev === popoverId ? null : popoverId));
  }, []);

  const isPopoverOpen = useCallback(
    (popoverId: string) => openPopoverId === popoverId,
    [openPopoverId]
  );

  return {
    openPopoverId,
    setOpenPopoverId,
    openPopover,
    closePopover,
    togglePopover,
    isPopoverOpen,
  };
}
