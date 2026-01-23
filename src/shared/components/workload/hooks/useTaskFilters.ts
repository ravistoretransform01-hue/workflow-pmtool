import { useState, useCallback } from "react";
import type { TaskFilters } from "../utils/workload-types";

/**
 * Hook for managing task filters
 * Handles: persons, statuses, priorities, labels, groups
 * Reusable across all views
 */
export function useTaskFilters() {
  const [taskFilters, setTaskFilters] = useState<TaskFilters>({
    persons: new Set(),
    statuses: new Set(),
    priorities: new Set(),
    labels: new Set(),
    groups: new Set(),
  });

  const [openFilterDropdowns, setOpenFilterDropdowns] = useState<Record<string, boolean>>({
    persons: false,
    statuses: false,
    priorities: false,
    labels: false,
    groups: false,
  });

  const [showDoneItemsOnly, setShowDoneItemsOnly] = useState(false);

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
