import React, { useEffect, useState, useRef, useCallback } from "react";

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
    } else {
      setScrollStats({
        ratio: 1,
        leftRatio: 0
      });
    }
  }, [containerNode, isDragging]);

  useEffect(() => {
    if (!containerNode) return;

    containerNode.addEventListener("scroll", updateScrollStats, { passive: true });
    window.addEventListener("resize", updateScrollStats);
    
    // Watch size/content changes of the scroll container to capture dynamic content loading
    const resizeObserver = new ResizeObserver(() => {
      updateScrollStats();
    });
    
    resizeObserver.observe(containerNode);
    
    // Observe child element to watch column structure updates
    const child = containerNode.firstElementChild;
    if (child) {
      resizeObserver.observe(child);
    }
    
    // Initial calculation
    updateScrollStats();
    const timer = setTimeout(updateScrollStats, 100);

    return () => {
      containerNode.removeEventListener("scroll", updateScrollStats);
      window.removeEventListener("resize", updateScrollStats);
      resizeObserver.disconnect();
      clearTimeout(timer);
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

  const containerWidth = 140;
  const horizontalPadding = 6;
  const innerWidth = containerWidth - (horizontalPadding * 2);
  const thumbWidth = Math.max(24, scrollStats.ratio * innerWidth);
  const maxLeftRatio = scrollStats.ratio >= 1 ? 0 : 1 - scrollStats.ratio;
  const boundedLeftRatio = Math.max(0, Math.min(maxLeftRatio, scrollStats.leftRatio));
  
  // Actually, standard math for thumbLeft:
  // We want thumb to slide exactly from `horizontalPadding` up to `containerWidth - horizontalPadding - thumbWidth`.
  // The available travel distance is innerWidth - thumbWidth.
  // The scroll percentage is boundedLeftRatio / maxLeftRatio.
  
  const scrollPercent = maxLeftRatio > 0 ? boundedLeftRatio / maxLeftRatio : 0;
  const finalThumbLeft = horizontalPadding + scrollPercent * (innerWidth - thumbWidth);

  return (
    <div className="hidden sm:block absolute bottom-6 right-6 z-50">
      <style>{`
        .jira-scroll-map {
            width: ${containerWidth}px;
            height: 48px;
            background: #f4f5f7;
            border-radius: 14px;
            padding: 6px;
            position: relative;
            overflow: hidden;
            box-shadow:
                inset 0 1px 2px rgba(9,30,66,.08),
                0 1px 3px rgba(9,30,66,.08);
        }
        
        /* Dark mode overrides (optional fallback if in dark mode context) */
        .dark .jira-scroll-map {
            background: #0f172a;
            box-shadow: inset 0 1px 2px rgba(0,0,0,.5), 0 1px 3px rgba(0,0,0,.5);
        }
        
        .dark .jira-scroll-map::before {
            background: repeating-linear-gradient(to right, #1e293b 0px, #1e293b 5px, transparent 5px, transparent 16px);
        }

        .jira-scroll-map::before {
            content: "";
            position: absolute;
            inset: 8px;
            border-radius: 8px;
            background:
                repeating-linear-gradient(
                    to right,
                    #e4e7eb 0px,
                    #e4e7eb 5px,
                    transparent 5px,
                    transparent 16px
                );
            opacity: .9;
        }

        .jira-scroll-thumb {
            position: absolute;
            top: 6px;
            height: 36px;
            border: 3px solid #0c66e4;
            border-radius: 8px;
            background: rgba(255,255,255,.65);
            backdrop-filter: blur(2px);
            box-sizing: border-box;
            cursor: grab;
            transition: left 0.1s ease-out, transform 0.2s ease;
            display: flex;
            justify-content: space-evenly;
            align-items: center;
            z-index: 2;
        }
        
        .dark .jira-scroll-thumb {
            background: rgba(15, 23, 42, 0.65);
            border-color: #3b82f6;
        }

        .jira-scroll-thumb:active {
            cursor: grabbing;
            transform: scale(1.02);
            transition: left 0s, transform 0.2s ease;
        }

        .jira-scroll-thumb span {
            width: 3px;
            height: 70%;
            background: #ffffff;
            border-radius: 2px;
            opacity: .95;
        }
        
        .dark .jira-scroll-thumb span {
            background: #ffffff;
        }
      `}</style>

      <div 
        ref={navigatorRef}
        className="jira-scroll-map cursor-pointer"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
      >
        <div 
          className="jira-scroll-thumb"
          style={{
            width: `${thumbWidth}px`,
            left: `${finalThumbLeft}px`
          }}
        >
          {/* Vertical internal grid bars based on thumb width */}
          {Array.from({ length: Math.min(4, Math.max(1, Math.floor(thumbWidth / 12))) }).map((_, i) => (
            <span key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}