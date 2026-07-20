import { useEffect } from "react";

interface UseBeforeUnloadOptions {
  message?: string;
  onUnload?: () => Promise<void> | void;
}

/**
 * Hook to prevent page unload when there are unsaved changes or a timer is running
 * Uses both beforeunload (for confirmation) and pagehide (for cleanup)
 * Works for:
 * - Browser tab close
 * - Browser window close
 * - Page refresh (hard reload)
 * - URL change / navigation away
 *
 * @param shouldPrevent - Whether to prevent unload
 * @param options - Configuration options
 *   - message: Custom alert message (note: most browsers ignore custom messages for security)
 *   - onUnload: Callback function to execute before unload (e.g., stop timer)
 */
export function useBeforeUnload(
  shouldPrevent: boolean,
  options?: UseBeforeUnloadOptions,
) {
  useEffect(() => {
    if (!shouldPrevent) return;

    // Handle beforeunload to show confirmation dialog
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // Prevent the default behavior
      event.preventDefault();
      // Chrome requires returnValue to be set
      // Note: Most modern browsers ignore custom messages for security reasons
      // and show their own generic message instead
      event.returnValue = options?.message || "";
      return options?.message || "";
    };

    // Handle pagehide to execute cleanup (e.g., stop timer)
    // pagehide fires reliably even when beforeunload is prevented
    const handlePageHide = (_event: PageTransitionEvent) => {
      // Call the onUnload callback if provided
      // Always call it regardless of persisted state - we want to stop the timer
      // whether the page is being unloaded or cached
      if (options?.onUnload) {
        try {
          options.onUnload();
        } catch (error) {
          console.error("Error in onUnload callback:", error);
        }
      }
    };

    // Add the beforeunload listener for confirmation
    window.addEventListener("beforeunload", handleBeforeUnload);

    // Add the pagehide listener for cleanup
    // pagehide is more reliable than beforeunload for executing code during unload
    window.addEventListener("pagehide", handlePageHide);

    // Cleanup
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [shouldPrevent, options?.message, options?.onUnload]);
}
