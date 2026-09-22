import { useEffect, useRef } from "react";

interface OverlayStackItem {
  id: string;
  close: () => void;
}

// Global stack of currently open overlays (modals, sheets, drawers)
const overlayStack: OverlayStackItem[] = [];
let programmaticBackCount = 0;
let isListenerAttached = false;

function ensurePopStateListener() {
  if (isListenerAttached || typeof window === "undefined") return;
  isListenerAttached = true;

  window.addEventListener("popstate", () => {
    // If this popstate event was triggered by our own programmatic history.back() cleanup, consume it and ignore
    if (programmaticBackCount > 0) {
      programmaticBackCount--;
      return;
    }

    // If an overlay is currently open, close the topmost overlay
    if (overlayStack.length > 0) {
      const topOverlay = overlayStack.pop();
      if (topOverlay) {
        topOverlay.close();
      }
    }
  });
}

export interface UseOverlayHistoryOptions {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  enabled?: boolean;
}

/**
 * Hook that connects a modal, sheet, or overlay to the browser history.
 * When the overlay opens, it pushes a synthetic history entry.
 * When the user triggers back navigation (Android back button, iOS edge swipe, or browser back),
 * the overlay closes without navigating away from the current page.
 */
export function useOverlayHistory({
  open,
  onOpenChange,
  enabled = true,
}: UseOverlayHistoryOptions) {
  const overlayIdRef = useRef<string | null>(null);
  const isClosedByPopstateRef = useRef(false);
  const onOpenChangeRef = useRef(onOpenChange);
  onOpenChangeRef.current = onOpenChange;

  useEffect(() => {
    ensurePopStateListener();
  }, []);

  useEffect(() => {
    if (!enabled) return;

    if (open) {
      // Generate a unique ID for this overlay instance
      const id = "overlay_" + Math.random().toString(36).slice(2, 9) + "_" + Date.now();
      overlayIdRef.current = id;
      isClosedByPopstateRef.current = false;

      // Register the close callback in the global stack
      const stackItem: OverlayStackItem = {
        id,
        close: () => {
          isClosedByPopstateRef.current = true;
          onOpenChangeRef.current?.(false);
        },
      };
      overlayStack.push(stackItem);

      // Push history state so back button / gesture triggers popstate
      try {
        const currentState = window.history.state || {};
        window.history.pushState(
          {
            ...currentState,
            __overlayId: id,
          },
          ""
        );
      } catch (err) {
        console.warn("Failed to push overlay history state:", err);
      }

      return () => {
        // Cleanup when overlay closes or unmounts
        const currentId = overlayIdRef.current;
        if (!currentId) return;

        // Remove from global stack if still present
        const index = overlayStack.findIndex((item) => item.id === currentId);
        if (index !== -1) {
          overlayStack.splice(index, 1);
        }

        // If closed via UI (not via back gesture), pop the synthetic history entry
        if (!isClosedByPopstateRef.current) {
          try {
            if (window.history.state?.__overlayId === currentId) {
              programmaticBackCount++;
              window.history.back();
            }
          } catch (err) {
            console.warn("Failed to pop overlay history state:", err);
          }
        }

        overlayIdRef.current = null;
        isClosedByPopstateRef.current = false;
      };
    }
  }, [open, enabled]);
}

export default useOverlayHistory;
