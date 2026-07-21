import { useState, useCallback, useEffect, useRef } from "react";
import type { TaskFilters } from "@/features/workload/types/workload-types";
import { filtersApi, type TaskFiltersData } from "@/features/filters/api/filtersApi";

/**
 * Hook for managing task filters
 * Handles: persons, statuses, priorities, labels, groups
 * Reusable across all views
 */
export function useTaskFilters(storageKey?: string) {
  // Helper to load state for a specific key
  const loadState = useCallback((key?: string): TaskFilters => {
    const defaultState: TaskFilters = {
      persons: new Set(),
      statuses: new Set(),
      priorities: new Set(),
      labels: new Set(),
      groups: new Set(),
    };

    if (!key) return defaultState;

    try {
      const saved = localStorage.getItem(`task_filters_${key}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          persons: new Set(parsed.persons || []),
          statuses: new Set(parsed.statuses || []),
          priorities: new Set(parsed.priorities || []),
          labels: new Set(parsed.labels || []),
          groups: new Set(parsed.groups || []),
        };
      }
    } catch (error) {
      console.error("Failed to load task filters from localStorage:", error);
    }

    return defaultState;
  }, []);

  const loadDoneState = useCallback((key?: string): boolean => {
    if (!key) return false;
    try {
      const saved = localStorage.getItem(`task_filters_done_${key}`);
      return saved === "true";
    } catch {
      return false;
    }
  }, []);

  const [taskFilters, setTaskFilters] = useState<TaskFilters>(() => loadState(storageKey));
  const [showDoneItemsOnly, setShowDoneItemsOnly] = useState(() => loadDoneState(storageKey));
  const [isLoadingFilters, setIsLoadingFilters] = useState(false);
  
  // Track which key the current state belongs to
  const loadedKeyRef = useRef(storageKey);
  const isInitialLoadRef = useRef(true);
  const lastSavedStateRef = useRef<string>("");

  // Synchronize state when storageKey changes
  if (storageKey !== loadedKeyRef.current) {
    setTaskFilters(loadState(storageKey));
    setShowDoneItemsOnly(loadDoneState(storageKey));
    loadedKeyRef.current = storageKey;
    isInitialLoadRef.current = true;
    lastSavedStateRef.current = "";
  }

  // Fetch filters from API on mount or storageKey change
  useEffect(() => {
    if (!storageKey) return;

    const fetchFilters = async () => {
      setIsLoadingFilters(true);
      const apiFilters = await filtersApi.getFiltersByBoard(storageKey);
      
      if (apiFilters) {
        // Create a new TaskFilters object from API data
        const newFilters = {
          persons: new Set(apiFilters.persons || []),
          statuses: new Set(apiFilters.statuses || []),
          priorities: new Set(apiFilters.priorities || []),
          labels: new Set(apiFilters.labels || []),
          groups: new Set(apiFilters.groups || []),
        };
        
        setTaskFilters(newFilters);
        
        // Update localStorage
        localStorage.setItem(`task_filters_${storageKey}`, JSON.stringify(apiFilters));
        
        // Mark this as the last saved state so we don't immediately POST it back
        lastSavedStateRef.current = JSON.stringify(apiFilters);
      }
      
      setIsLoadingFilters(false);
      // We've finished the initial sync
      isInitialLoadRef.current = false;
    };

    fetchFilters();
  }, [storageKey]);

  // Save to localStorage and API whenever filters change
  useEffect(() => {
    if (!storageKey || storageKey !== loadedKeyRef.current) return;

    // Don't save during the very first render cycle before useEffects run
    // or while the initial fetch is happening
    if (isInitialLoadRef.current && !lastSavedStateRef.current) return;

    try {
      const stateToSave: TaskFiltersData = {
        persons: Array.from(taskFilters.persons),
        statuses: Array.from(taskFilters.statuses),
        priorities: Array.from(taskFilters.priorities),
        labels: Array.from(taskFilters.labels),
        groups: Array.from(taskFilters.groups),
      };
      
      const stateString = JSON.stringify(stateToSave);
      
      // ONLY save if the state has actually changed from what we last saved/loaded
      if (stateString === lastSavedStateRef.current) return;

      // Save to localStorage
      localStorage.setItem(`task_filters_${storageKey}`, stateString);
      
      // Save to API
      // We skip if it's the very first load and we haven't fetched yet
      if (!isInitialLoadRef.current) {
        filtersApi.saveFilters(storageKey, stateToSave);
        lastSavedStateRef.current = stateString;
      }
    } catch (error) {
      console.error("Failed to save task filters:", error);
    }
  }, [taskFilters, storageKey]);

  // Save done items filter
  useEffect(() => {
    // ONLY save if we have a valid key AND the current state belongs to that key
    if (!storageKey || storageKey !== loadedKeyRef.current) return;
    
    localStorage.setItem(`task_filters_done_${storageKey}`, showDoneItemsOnly.toString());
  }, [showDoneItemsOnly, storageKey]);

  const [openFilterDropdowns, setOpenFilterDropdowns] = useState<Record<string, boolean>>({
    persons: false,
    statuses: false,
    priorities: false,
    labels: false,
    groups: false,
  });

  const addFilter = useCallback(
    (filterType: keyof TaskFilters, value: string) => {
      setTaskFilters((prev) => ({
        ...prev,
        [filterType]: new Set([...prev[filterType], value]),
      }));
    },
    []
  );

  const removeFilter = useCallback(
    (filterType: keyof TaskFilters, value: string) => {
      setTaskFilters((prev) => {
        const newSet = new Set(prev[filterType]);
        newSet.delete(value);
        return {
          ...prev,
          [filterType]: newSet,
        };
      });
    },
    []
  );

  const toggleFilter = useCallback(
    (filterType: keyof TaskFilters, value: string) => {
      setTaskFilters((prev) => {
        const newSet = new Set(prev[filterType]);
        if (newSet.has(value)) {
          newSet.delete(value);
        } else {
          newSet.add(value);
        }
        return {
          ...prev,
          [filterType]: newSet,
        };
      });
    },
    []
  );

  const clearFilters = useCallback(() => {
    setTaskFilters({
      persons: new Set(),
      statuses: new Set(),
      priorities: new Set(),
      labels: new Set(),
      groups: new Set(),
    });
  }, []);

  const clearFilterType = useCallback((filterType: keyof TaskFilters) => {
    setTaskFilters((prev) => ({
      ...prev,
      [filterType]: new Set(),
    }));
  }, []);

  const hasActiveFilters = useCallback(() => {
    return (
      taskFilters.persons.size > 0 ||
      taskFilters.statuses.size > 0 ||
      taskFilters.priorities.size > 0 ||
      taskFilters.labels.size > 0 ||
      taskFilters.groups.size > 0
    );
  }, [taskFilters]);

  const toggleFilterDropdown = useCallback((filterType: string) => {
    setOpenFilterDropdowns((prev) => ({
      ...prev,
      [filterType]: !prev[filterType],
    }));
  }, []);

  const closeFilterDropdown = useCallback((filterType: string) => {
    setOpenFilterDropdowns((prev) => ({
      ...prev,
      [filterType]: false,
    }));
  }, []);

  return {
    // State
    taskFilters,
    openFilterDropdowns,
    showDoneItemsOnly,
    isLoadingFilters,

    // Setters
    setTaskFilters,
    setOpenFilterDropdowns,
    setShowDoneItemsOnly,

    // Filter management
    addFilter,
    removeFilter,
    toggleFilter,
    clearFilters,
    clearFilterType,
    hasActiveFilters,

    // Dropdown management
    toggleFilterDropdown,
    closeFilterDropdown,
  };
}
