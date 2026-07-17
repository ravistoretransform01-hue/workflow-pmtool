import React, { useEffect, useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Move } from "lucide-react";

interface TeamsBoardNavigatorProps {
  containerNode: HTMLDivElement | null;
  columnsCount: number;
}

export function TeamsBoardNavigator({ containerNode, columnsCount }: TeamsBoardNavigatorProps) {
  const navigatorRef = useRef<HTMLDivElement>(null);
  
  const [scrollStats, setScrollStats] = useState({
    ratio: 1, 
    leftRatio: 0 
  });

  const [isDragging, setIsDragging] = useState(false);

  const updateScrollStats = useCallback(() => {
    if (!containerNode) return;
    
    // Only show if it is actually scrollable
    if (containerNode.scrollWidth > containerNode.clientWidth) {
      setScrollStats({
        ratio: containerNode.clientWidth / containerNode.scrollWidth,
        leftRatio: containerNode.scrollLeft / containerNode.scrollWidth
      });
    }
  }, [containerNode, isDragging]);

  useEffect(() => {
    if (!containerNode) return;

    containerNode.addEventListener("scroll", updateScrollStats, { passive: true });
    window.addEventListener("resize", updateScrollStats);
    
    // Initial calculation
    setTimeout(updateScrollStats, 100);

    return () => {
      containerNode.removeEventListener("scroll", updateScrollStats);
      window.removeEventListener("resize", updateScrollStats);
    };
  }, [updateScrollStats, containerNode]);

  // Drag logic
  const handlePointerDown = (e: React.PointerEvent) => {
    if (!containerNode || !navigatorRef.current) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    
    setIsDragging(true);

    const navRect = navigatorRef.current.getBoundingClientRect();
    const clickX = e.clientX - navRect.left;
    const clickRatio = clickX / navRect.width;
    
    const thumbWidth = scrollStats.ratio * navRect.width;
    const thumbLeft = scrollStats.leftRatio * navRect.width;
    
    if (clickX < thumbLeft || clickX > thumbLeft + thumbWidth) {
       // Snap center of viewport thumb directly to point clicked
       let targetLeftRatio = clickRatio - (scrollStats.ratio / 2);
       // constrain boundaries
       targetLeftRatio = Math.max(0, Math.min(1 - scrollStats.ratio, targetLeftRatio));
       containerNode.scrollTo({
         left: targetLeftRatio * containerNode.scrollWidth,
         behavior: 'instant'
       });
       // We don't have to manually update scrollStats, the container's "scroll" listener will handle it natively
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !containerNode || !navigatorRef.current) return;
    
    const navRect = navigatorRef.current.getBoundingClientRect();
    const newLeftRatio = (e.clientX - navRect.left - ((scrollStats.ratio * navRect.width) / 2)) / navRect.width;
    
    const boundedRatio = Math.max(0, Math.min(1 - scrollStats.ratio, newLeftRatio));
    containerNode.scrollTo({
      left: boundedRatio * containerNode.scrollWidth,
      behavior: 'instant'
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (!containerNode) return;
    // Push the wheel delta into the horizontal container directly
    const delta = e.deltaX !== 0 ? e.deltaX : e.deltaY;
    containerNode.scrollBy({ left: delta, behavior: 'instant' });
  };

  // Keep navigator hidden on mobile where swiping is natural
  if (columnsCount <= 0) return null;

  return (
    <div 
      className={cn(
        "hidden sm:flex absolute bottom-6 right-6 z-50 p-1.5 rounded-xl",
        "bg-background/90 backdrop-blur-sm border border-border shadow-[0_10px_40px_-5px_rgba(0,0,0,0.2)]"
      )}
    >
      <div 
        ref={navigatorRef}
        className="relative h-12 w-[240px] md:w-[320px] flex gap-1 items-end px-1.5 py-1 cursor-pointer group"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
      >
        {/* Render proportional mini columns */}
        {Array.from({ length: columnsCount }).map((_, i) => (
          <div key={i} className="flex-1 bg-muted-foreground/30 h-[60%] rounded-sm transition-colors group-hover:bg-muted-foreground/40" />
        ))}
        
        {/* Draggable Viewport Rect */}
        <div 
          className="absolute top-0 bottom-0 pointer-events-none rounded-[8px] flex items-center justify-center overflow-hidden transition-colors"
          style={{
            width: `${scrollStats.ratio * 100}%`,
            left: `${scrollStats.leftRatio * 100}%`, // Using Left over Transform for strict bounds without scale artifacts during window resize
            background: 'linear-gradient(135deg, hsla(var(--primary) / 0.15) 0%, hsla(var(--primary) / 0.25) 100%)',
            border: '2px solid hsl(var(--primary))',
            boxShadow: '0 0 10px hsla(var(--primary)/0.2)',
          }}
        >
          <Move className="w-3.5 h-3.5 text-primary opacity-70 drop-shadow-sm shrink-0" strokeWidth={2.5} />
        </div>
      </div>
    </div>
  );
}