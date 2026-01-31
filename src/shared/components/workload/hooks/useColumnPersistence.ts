import { useState, useCallback, useEffect } from "react";

const DEFAULT_VISIBLE_COLUMNS = [
  "item",
  "status",
  "priority",
  "description",
  "estimatedDate",
  "estimatedTime",
  "progress",
  "person",
  "tags",
  "timer",
  "time",
];

const DEFAULT_TABS = [
  "Main Table",
  "List",
  "Kanban",
  "Calendar",
  "Workload",
  "Time",
  "Recurring",
  "Completed",
  "Gantt",
  "SOP",
  "Doc",
  "Updates",
  "Dashboard",
];

/**
 * Hook for managing column visibility, tab order, and column labels
 * Persists to localStorage
 * Reusable across all views
 */
export function useColumnPersistence(boardId: string) {
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem(`board-visible-columns-${boardId}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return Object.fromEntries(DEFAULT_VISIBLE_COLUMNS.map((col) => [col, true]));
      }
    }
    return Object.fromEntries(DEFAULT_VISIBLE_COLUMNS.map((col) => [col, true]));
  });

  const [viewTabs, setViewTabs] = useState<string[]>(() => {
    const savedTabs = localStorage.getItem(`board-tabs-${boardId}`);
    if (savedTabs) {
      try {
        const parsed = JSON.parse(savedTabs);
        const allTabs = [...new Set([...parsed, ...DEFAULT_TABS])];
        return allTabs.filter((tab) => DEFAULT_TABS.includes(tab));
      } catch {
        return DEFAULT_TABS;
      }
    }
    return DEFAULT_TABS;
  });

  const [columnLabels, setColumnLabels] = useState<Record<string, string>>({});

  // Persist visible columns to localStorage
  useEffect(() => {
    localStorage.setItem(`board-visible-columns-${boardId}`, JSON.stringify(visibleColumns));
  }, [visibleColumns, boardId]);

  // Persist view tabs to localStorage
  useEffect(() => {
    localStorage.setItem(`board-tabs-${boardId}`, JSON.stringify(viewTabs));
  }, [viewTabs, boardId]);

  const toggleColumnVisibility = useCallback((columnId: string) => {
    setVisibleColumns((prev) => ({
      ...prev,
      [columnId]: !prev[columnId],
    }));
  }, []);

  const showColumn = useCallback((columnId: string) => {
    setVisibleColumns((prev) => ({
      ...prev,
      [columnId]: true,
    }));
  }, []);

  const hideColumn = useCallback((columnId: string) => {
    setVisibleColumns((prev) => ({
      ...prev,
      [columnId]: false,
    }));
  }, []);

  const isColumnVisible = useCallback(
    (columnId: string) => visibleColumns[columnId] !== false,
    [visibleColumns]
  );

  const reorderTabs = useCallback((newTabs: string[]) => {
    setViewTabs(newTabs);
  }, []);

  const updateColumnLabel = useCallback((columnId: string, newLabel: string) => {
    setColumnLabels((prev) => ({
      ...prev,
      [columnId]: newLabel,
    }));
  }, []);

  const getColumnLabel = useCallback(
    (columnId: string, defaultLabel: string) => {
      return columnLabels[columnId] || defaultLabel;
    },
    [columnLabels]
  );

  return {
    // State
    visibleColumns,
    viewTabs,
    columnLabels,

    // Setters
    setVisibleColumns,
    setViewTabs,
    setColumnLabels,

    // Column visibility
    toggleColumnVisibility,
    showColumn,
    hideColumn,
    isColumnVisible,

    // Tab management
    reorderTabs,

    // Column labels
    updateColumnLabel,
    getColumnLabel,
  };
}
