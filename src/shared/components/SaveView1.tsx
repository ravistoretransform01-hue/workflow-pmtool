import React, { useState, useEffect } from 'react';
import { Save, Check } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { toast } from 'sonner';

export interface SaveView1State {
  // Column order (for Kanban cards, etc.)
  columnOrder?: string[];
  selectedLabels?: string[];
  
  // Filter states
  searchQuery?: string;
  myItemsChecked?: boolean;
  myTeamChecked?: boolean;
  selectedTeamMembers?: string[];
  hideDoneItems?: boolean;
  selectedDoneStatuses?: string[];
  
  // Hide filters
  hidePersonFilter?: string[];
  hidePriorityFilter?: string[];
  hideStatusFilter?: string[];
  hideTagFilter?: string[];
  
  // Only show filters
  showPersonFilter?: string[];
  showPriorityFilter?: string[];
  showStatusFilter?: string[];
  showTagFilter?: string[];
  showBoardFilter?: string[];
  
  // Card fields visibility
  visibleFields?: {
    groupName?: boolean;
    assignees?: boolean;
    comments?: boolean;
  };
  
  // Custom data (for extensibility)
  customData?: Record<string, unknown>;
}

interface SaveView1Props {
  storageKey: string;
  getCurrentState: () => SaveView1State;
  onLoadState?: (state: SaveView1State) => void;
  className?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'icon';
  showLabel?: boolean;
}

export function SaveView1({
  storageKey,
  getCurrentState,
  onLoadState,
  className = '',
  variant = 'outline',
  size = 'default',
  showLabel = true,
}: SaveView1Props) {
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = () => {
    try {
      const currentState = getCurrentState();
      localStorage.setItem(storageKey, JSON.stringify(currentState));
      setIsSaved(true);
      toast.success('View saved successfully');
      
      // Reset the saved indicator after 2 seconds
      setTimeout(() => {
        setIsSaved(false);
      }, 2000);
    } catch (error) {
      console.error('Error saving view:', error);
      toast.error('Failed to save view');
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleSave}
      className={`border-border ${className}`}
    >
      {isSaved ? (
        <Check className="h-4 w-4 mr-2 text-green-500" />
      ) : (
        <Save className="h-4 w-4 mr-2" />
      )}
      {showLabel && (isSaved ? 'Saved!' : 'Save View')}
    </Button>
  );
}

/**
 * Hook to load a saved view state from localStorage
 */
export function useSavedView(storageKey: string): SaveView1State | null {
  const [savedState, setSavedState] = useState<SaveView1State | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        setSavedState(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading saved view:', error);
    }
  }, [storageKey]);

  return savedState;
}

/**
 * Helper function to load saved view from localStorage
 */
export function loadSavedView(storageKey: string): SaveView1State | null {
  try {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error loading saved view:', error);
  }
  return null;
}

/**
 * Helper function to save view to localStorage
 */
export function saveView(storageKey: string, state: SaveView1State): boolean {
  try {
    localStorage.setItem(storageKey, JSON.stringify(state));
    return true;
  } catch (error) {
    console.error('Error saving view:', error);
    return false;
  }
}

export default SaveView1;
