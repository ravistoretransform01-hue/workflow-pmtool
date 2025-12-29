import { useState, useEffect } from "react";
import { ChevronUp, ChevronDown, FileText } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Badge } from "@/shared/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/shared/components/ui/collapsible";

export interface DoneItems1Status {
  name: string;
  color: string;
}

interface DoneItems1Props {
  hideDoneItems: boolean;
  onHideDoneItemsChange: (hide: boolean) => void;
  selectedDoneStatuses: Set<string>;
  onDoneStatusesChange: (statuses: Set<string>) => void;
  availableStatuses: DoneItems1Status[];
  className?: string;
  storageKeyPrefix?: string;
}

export function DoneItems1({
  hideDoneItems,
  onHideDoneItemsChange,
  selectedDoneStatuses,
  onDoneStatusesChange,
  availableStatuses,
  className = "",
}: DoneItems1Props) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [doneItemsExpanded, setDoneItemsExpanded] = useState(true);

  const toggleStatus = (statusName: string) => {
    const newSet = new Set(selectedDoneStatuses);
    if (newSet.has(statusName)) {
      newSet.delete(statusName);
    } else {
      newSet.add(statusName);
    }
    onDoneStatusesChange(newSet);
  };

  const getStatusBgColor = (color: string) => {
    if (color.startsWith("custom-")) {
      return color.replace("custom-", "");
    }
    // Map common color names to Tailwind classes
    const colorMap: Record<string, string> = {
      "bg-gray-500": "#6b7280",
      "bg-red-500": "#ef4444",
      "bg-orange-500": "#f97316",
      "bg-yellow-500": "#eab308",
      "bg-green-500": "#22c55e",
      "bg-blue-500": "#3b82f6",
      "bg-purple-500": "#a855f7",
      "bg-pink-500": "#ec4899",
    };
    return colorMap[color] || color;
  };


  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Checkbox
        id="done-items-filter"
        checked={hideDoneItems}
        onCheckedChange={(value) => onHideDoneItemsChange(value === true)}
      />
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <label
            className="text-sm font-medium cursor-pointer text-foreground hover:text-primary transition-colors"
            onClick={(e) => {
              e.preventDefault();
              setPopoverOpen(true);
            }}
          >
            Done Items
            {selectedDoneStatuses.size > 0 && (
              <span className="ml-1 text-xs text-muted-foreground">
                ({selectedDoneStatuses.size})
              </span>
            )}
          </label>
        </PopoverTrigger>
        <PopoverContent
          className="w-80 p-4 bg-background border border-border z-50"
          align="start"
        >
          <div className="space-y-4">
            {/* Done Items Collapsible */}
            <Collapsible
              open={doneItemsExpanded}
              onOpenChange={setDoneItemsExpanded}
            >
              <CollapsibleTrigger className="flex items-center justify-between w-full p-3 border border-primary rounded-lg text-foreground hover:bg-muted/50 transition-colors">
                <span className="font-medium">Done Items</span>
                {doneItemsExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-4">
                <p className="text-sm text-muted-foreground mb-3">
                  Select which statuses count as "done":
                </p>

                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {availableStatuses.map((status) => (
                    <div
                      key={status.name}
                      className="flex items-center gap-3 py-1 cursor-pointer"
                      onClick={() => toggleStatus(status.name)}
                    >
                      <Checkbox
                        checked={selectedDoneStatuses.has(status.name)}
                        onCheckedChange={() => toggleStatus(status.name)}
                      />
                      <Badge
                        className="text-white text-xs px-2 py-0.5"
                        style={{
                          backgroundColor: getStatusBgColor(status.color),
                        }}
                      >
                        {status.name}
                      </Badge>
                    </div>
                  ))}
                </div>

                {availableStatuses.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No statuses available
                  </p>
                )}
              </CollapsibleContent>
            </Collapsible>

            {/* Save View Button */}
            <div className="pt-3 border-t border-border">
              <Button
                variant="ghost"
                size="sm"
                className="w-full gap-2"
                onClick={() => setPopoverOpen(false)}
              >
                <FileText className="h-4 w-4" />
                Save view
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

// Type for items that can be filtered
interface FilterableItem {
  id: string;
  status?: string[] | null;
  [key: string]: unknown;
}

/**
 * Helper function to filter out items with "done" statuses
 */
export function applyDoneItems1Filter<T extends FilterableItem>(
  items: T[],
  selectedDoneStatuses: Set<string>,
  hideDoneItems: boolean
): T[] {
  if (!hideDoneItems || selectedDoneStatuses.size === 0) {
    return items;
  }

  return items.filter((item) => {
    // Check if any of the item's statuses match the done statuses
    const itemStatuses = item.status || [];
    const hasDoneStatus = itemStatuses.some(
      (status) =>
        selectedDoneStatuses.has(status.toLowerCase()) ||
        selectedDoneStatuses.has(status)
    );

    // Hide items that have a done status
    return !hasDoneStatus;
  });
}

/**
 * Hook to manage DoneItems1 filter state with localStorage persistence
 */
export function useDoneItems1State(storageKeyPrefix: string = "done-items") {
  const [hideDoneItems, setHideDoneItems] = useState<boolean>(() => {
    const stored = localStorage.getItem(`${storageKeyPrefix}-hide`);
    return stored ? JSON.parse(stored) : false;
  });

  const [selectedDoneStatuses, setSelectedDoneStatuses] = useState<Set<string>>(
    () => {
      const stored = localStorage.getItem(`${storageKeyPrefix}-statuses`);
      return stored
        ? new Set(JSON.parse(stored))
        : new Set([
            "done",
            "Done",
            "complete",
            "Complete",
            "completed",
            "Completed",
          ]);
    }
  );

  useEffect(() => {
    localStorage.setItem(
      `${storageKeyPrefix}-hide`,
      JSON.stringify(hideDoneItems)
    );
  }, [hideDoneItems, storageKeyPrefix]);

  useEffect(() => {
    localStorage.setItem(
      `${storageKeyPrefix}-statuses`,
      JSON.stringify(Array.from(selectedDoneStatuses))
    );
  }, [selectedDoneStatuses, storageKeyPrefix]);

  return {
    hideDoneItems,
    setHideDoneItems,
    selectedDoneStatuses,
    setSelectedDoneStatuses,
  };
}

export default DoneItems1;
