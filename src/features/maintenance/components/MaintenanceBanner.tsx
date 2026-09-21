import React, { useLayoutEffect, useRef } from "react";
import { useMaintenance } from "../hooks/useMaintenance";
import { cn } from "@/utils/utils";

interface MaintenanceBannerProps {
  className?: string;
}

export const MaintenanceBanner: React.FC<MaintenanceBannerProps> = ({
  className,
}) => {
  const { isMaintenance, message } = useMaintenance();
  const bannerRef = useRef<HTMLElement>(null);

  // Dynamically set --sidebar-top on document.documentElement so the sidebar is pushed down
  useLayoutEffect(() => {
    if (!isMaintenance) {
      document.documentElement.style.removeProperty("--sidebar-top");
      return;
    }

    const updateHeight = () => {
      if (bannerRef.current) {
        const height = bannerRef.current.offsetHeight;
        document.documentElement.style.setProperty("--sidebar-top", `${height}px`);
      }
    };

    updateHeight();

    window.addEventListener("resize", updateHeight);
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined" && bannerRef.current) {
      resizeObserver = new ResizeObserver(updateHeight);
      resizeObserver.observe(bannerRef.current);
    }

    return () => {
      window.removeEventListener("resize", updateHeight);
      resizeObserver?.disconnect();
      document.documentElement.style.removeProperty("--sidebar-top");
    };
  }, [isMaintenance, message]);

  if (!isMaintenance) {
    return null;
  }

  // Fallback message if response string is empty
  const displayMessage =
    message ||
    "⚠️ System under maintenance — some features may be temporarily unavailable. We'll be back shortly.";

  return (
    <aside
      ref={bannerRef}
      role="alert"
      aria-live="polite"
      className={cn(
        "relative w-full z-40 shrink-0 select-text",
        // Vivid, eye-catching highlighter amber color with high-contrast text
        "bg-amber-400 dark:bg-amber-400 text-stone-950 dark:text-stone-950",
        "border-b border-amber-500 dark:border-amber-500 shadow-md",
        "px-4 py-2 sm:py-2.5",
        "flex items-center justify-center text-center",
        "text-xs sm:text-sm font-semibold tracking-normal",
        "transition-all duration-200",
        className,
      )}
    >
      <p className="leading-snug max-w-7xl mx-auto break-words">
        {displayMessage}
      </p>
    </aside>
  );
};

export default MaintenanceBanner;
