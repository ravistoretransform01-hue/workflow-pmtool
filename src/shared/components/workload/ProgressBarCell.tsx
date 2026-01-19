import { useState, useEffect } from "react";

interface ProgressBarCellProps {
  taskId: string;
  trackedTimeSeconds?: number;
  activeTimerId: string | null;
  estimatedHours?: string | number;
}

export function ProgressBarCell({
  taskId,
  trackedTimeSeconds = 0,
  activeTimerId,
  estimatedHours = "-",
}: ProgressBarCellProps) {
  const [seconds, setSeconds] = useState(trackedTimeSeconds);
  const isRunning = activeTimerId === taskId;

  // Update seconds when trackedTimeSeconds prop changes
  useEffect(() => {
    setSeconds(trackedTimeSeconds);
  }, [trackedTimeSeconds]);

  // Increment seconds when timer is running
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isRunning) {
      interval = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  // Parse estimated hours to get total seconds
  const parseEstimatedHours = (value: string | number): number => {
    if (!value || value === "-") return 0;
    
    const strValue = String(value);
    // Check if it's in "02h 30m" format
    const match = strValue.match(/(\d+)h\s*(\d+)m/);
    if (match) {
      const hours = parseInt(match[1]);
      const minutes = parseInt(match[2]);
      return hours * 3600 + minutes * 60;
    }
    
    // Check if it's in "2h" format
    const hoursMatch = strValue.match(/(\d+)h/);
    if (hoursMatch) {
      return parseInt(hoursMatch[1]) * 3600;
    }
    
    // Otherwise treat as decimal hours
    const numValue = parseFloat(strValue);
    if (!isNaN(numValue)) {
      return numValue * 3600;
    }
    
    return 0;
  };

  // Calculate progress percentage
  const estimatedSeconds = parseEstimatedHours(estimatedHours);
  const percentage = estimatedSeconds > 0 ? (seconds / estimatedSeconds) * 100 : 0;
  
  // Determine bar color based on percentage
  const barColor = percentage >= 100 ? '#ef4444' : '#3c83f6'; // Red if >= 100%, blue otherwise

  return (
    <div className="w-full px-2">
      <div className="relative">
        <div className="relative h-6 w-full overflow-hidden bg-[#9a9aad]" style={{ borderRadius: '0.5rem' }}>
          <div 
            className="h-full transition-all"
            style={{ 
              width: `${Math.min(percentage, 100)}%`,
              backgroundColor: barColor
            }}
          />
        </div>
        <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white">
          {Math.round(percentage)}%
        </span>
      </div>
    </div>
  );
}
