/**
 * Column Persistence Utility
 * 
 * Provides a single source of truth for column configuration management.
 * Handles storage, retrieval, and syncing of column metadata including labels, visibility, and order.
 * 
 * Storage structure:
 * {
 *   columnOrder: string[],          // Order of columns
 *   columns: {
 *     [columnId]: {
 *       label: string,              // Custom or default label
 *       visible: boolean,           // Column visibility state
 *       position: number,           // Position in order
 *     }
 *   }
 * }
 */

const STORAGE_PREFIX = "workload-columns";
const VISIBILITY_PREFIX = "board-visible-columns";
const COLLAPSED_PREFIX = "board-collapsed-columns";
const WIDTHS_PREFIX = "board-column-widths";

interface ColumnConfig {
  label: string;
  visible: boolean;
  position: number;
}

interface StoragePayload {
  columnOrder: string[];
  columns: Record<string, ColumnConfig>;
}

/**
 * Get the storage key for a board's column configuration
 */
function getStorageKey(boardId: string | number): string {
  return `${STORAGE_PREFIX}-${boardId}`;
}

/**
 * Get full column configuration from localStorage for a board
 */
export function getColumnConfiguration(
  boardId: string | number
): StoragePayload | null {
  try {
    const key = getStorageKey(boardId);
    const stored = localStorage.getItem(key);

    if (!stored) {
      return null;
    }

    const parsed: StoragePayload = JSON.parse(stored);

    // Validate structure
    if (
      !Array.isArray(parsed.columnOrder) ||
      typeof parsed.columns !== "object"
    ) {
      console.warn("Invalid column configuration structure");
      return null;
    }

    return parsed;
  } catch (error) {
    console.error("Error reading column configuration:", error);
    return null;
  }
}

/**
 * Get label for a specific column
 */
export function getColumnLabel(
  boardId: string | number,
  columnId: string,
  defaultLabel: string = ""
): string {
  try {
    const config = getColumnConfiguration(boardId);

    if (config?.columns?.[columnId]?.label) {
      return config.columns[columnId].label;
    }

    return defaultLabel;
  } catch (error) {
    console.error("Error getting column label:", error);
    return defaultLabel;
  }
}

/**
 * Update a column's label
 */
export function updateColumnLabel(
  boardId: string | number,
  columnId: string,
  newLabel: string
): boolean {
  try {
    let config = getColumnConfiguration(boardId) || {
      columnOrder: [],
      columns: {},
    };

    // Ensure column exists in config
    if (!config.columns[columnId]) {
      config.columns[columnId] = {
        label: newLabel,
        visible: true,
        position: Object.keys(config.columns).length + 1,
      };
    } else {
      config.columns[columnId].label = newLabel;
    }

    // Ensure column is in order if not already
    if (!config.columnOrder.includes(columnId)) {
      config.columnOrder.push(columnId);
    }

    // Save to localStorage
    const key = getStorageKey(boardId);
    localStorage.setItem(key, JSON.stringify(config));

    console.log(
      `Column label updated for board ${boardId}, column ${columnId}:`,
      newLabel
    );
    return true;
  } catch (error) {
    console.error("Error updating column label:", error);
    return false;
  }
}

/**
 * Update multiple column labels at once
 */
export function updateColumnLabels(
  boardId: string | number,
  labelUpdates: Record<string, string>
): boolean {
  try {
    let config = getColumnConfiguration(boardId) || {
      columnOrder: [],
      columns: {},
    };

    Object.entries(labelUpdates).forEach(([columnId, newLabel]) => {
      if (!config.columns[columnId]) {
        config.columns[columnId] = {
          label: newLabel,
          visible: true,
          position: Object.keys(config.columns).length + 1,
        };
      } else {
        config.columns[columnId].label = newLabel;
      }

      // Ensure column is in order
      if (!config.columnOrder.includes(columnId)) {
        config.columnOrder.push(columnId);
      }
    });

    const key = getStorageKey(boardId);
    localStorage.setItem(key, JSON.stringify(config));

    console.log(`Column labels updated for board ${boardId}`);
    return true;
  } catch (error) {
    console.error("Error updating column labels:", error);
    return false;
  }
}

/**
 * Get column order for a board
 */
export function getColumnOrder(boardId: string | number): string[] {
  try {
    const config = getColumnConfiguration(boardId);
    return config?.columnOrder || [];
  } catch (error) {
    console.error("Error getting column order:", error);
    return [];
  }
}

/**
 * Update column order for a board
 */
export function updateColumnOrder(
  boardId: string | number,
  newOrder: string[]
): boolean {
  try {
    let config = getColumnConfiguration(boardId) || {
      columnOrder: [],
      columns: {},
    };

    config.columnOrder = newOrder;

    const key = getStorageKey(boardId);
    localStorage.setItem(key, JSON.stringify(config));

    console.log(`Column order updated for board ${boardId}`);
    return true;
  } catch (error) {
    console.error("Error updating column order:", error);
    return false;
  }
}

/**
 * Update full column configuration with order and all column data
 */
export function updateFullColumnConfiguration(
  boardId: string | number,
  columnOrder: string[],
  columns: Record<string, ColumnConfig>
): boolean {
  try {
    const payload: StoragePayload = {
      columnOrder,
      columns,
    };

    const key = getStorageKey(boardId);
    localStorage.setItem(key, JSON.stringify(payload));

    console.log(`Full column configuration updated for board ${boardId}`);
    console.log(payload);
    return true;
  } catch (error) {
    console.error("Error updating full column configuration:", error);
    return false;
  }
}

/**
 * Clear all column configuration for a board
 */
export function clearColumnConfiguration(boardId: string | number): void {
  try {
    const key = getStorageKey(boardId);
    localStorage.removeItem(key);
    console.log(`Column configuration cleared for board ${boardId}`);
  } catch (error) {
    console.error("Error clearing column configuration:", error);
  }
}

/**
 * Get all column visibility states (helper for related storage)
 */
export function getVisibleColumns(boardId: string | number): Record<string, boolean> {
  try {
    const key = `${VISIBILITY_PREFIX}-${boardId}`;
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error("Error getting visible columns:", error);
    return {};
  }
}

/**
 * Update visibility of a column
 */
export function updateColumnVisibility(
  boardId: string | number,
  columnId: string,
  visible: boolean
): void {
  try {
    const key = `${VISIBILITY_PREFIX}-${boardId}`;
    const current = getVisibleColumns(boardId);
    current[columnId] = visible;
    localStorage.setItem(key, JSON.stringify(current));
  } catch (error) {
    console.error("Error updating column visibility:", error);
  }
}

/**
 * Get collapsed columns state (helper for related storage)
 */
export function getCollapsedColumns(
  boardId: string | number
): Record<string, boolean> {
  try {
    const key = `${COLLAPSED_PREFIX}-${boardId}`;
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error("Error getting collapsed columns:", error);
    return {};
  }
}

/**
 * Update collapse state of a column
 */
export function updateColumnCollapsed(
  boardId: string | number,
  columnId: string,
  collapsed: boolean
): void {
  try {
    const key = `${COLLAPSED_PREFIX}-${boardId}`;
    const current = getCollapsedColumns(boardId);
    current[columnId] = collapsed;
    localStorage.setItem(key, JSON.stringify(current));
  } catch (error) {
    console.error("Error updating column collapsed state:", error);
  }
}

/**
 * Get column widths (helper for related storage)
 */
export function getColumnWidths(boardId: string | number): Record<string, string> {
  try {
    const key = `${WIDTHS_PREFIX}-${boardId}`;
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error("Error getting column widths:", error);
    return {};
  }
}

/**
 * Update width of a column
 */
export function updateColumnWidth(
  boardId: string | number,
  columnId: string,
  width: string
): void {
  try {
    const key = `${WIDTHS_PREFIX}-${boardId}`;
    const current = getColumnWidths(boardId);
    current[columnId] = width;
    localStorage.setItem(key, JSON.stringify(current));
  } catch (error) {
    console.error("Error updating column width:", error);
  }
}

/**
 * Validate if all related localStorage entries exist for a board
 * Returns an object with status of each storage entry
 */
export function validateColumnStorageIntegrity(
  boardId: string | number
): {
  configuration: boolean;
  visibility: boolean;
  collapsed: boolean;
  widths: boolean;
  allPresent: boolean;
} {
  const configKey = getStorageKey(boardId);
  const visibilityKey = `${VISIBILITY_PREFIX}-${boardId}`;
  const collapsedKey = `${COLLAPSED_PREFIX}-${boardId}`;
  const widthsKey = `${WIDTHS_PREFIX}-${boardId}`;

  const configuration = localStorage.getItem(configKey) !== null;
  const visibility = localStorage.getItem(visibilityKey) !== null;
  const collapsed = localStorage.getItem(collapsedKey) !== null;
  const widths = localStorage.getItem(widthsKey) !== null;

  return {
    configuration,
    visibility,
    collapsed,
    widths,
    allPresent: configuration && visibility && collapsed && widths,
  };
}

/**
 * Clear all column-related storage for a board (comprehensive cleanup)
 */
export function clearAllColumnStorage(boardId: string | number): void {
  try {
    const configKey = getStorageKey(boardId);
    const visibilityKey = `${VISIBILITY_PREFIX}-${boardId}`;
    const collapsedKey = `${COLLAPSED_PREFIX}-${boardId}`;
    const widthsKey = `${WIDTHS_PREFIX}-${boardId}`;

    localStorage.removeItem(configKey);
    localStorage.removeItem(visibilityKey);
    localStorage.removeItem(collapsedKey);
    localStorage.removeItem(widthsKey);

    console.log(`All column storage cleared for board ${boardId}`);
  } catch (error) {
    console.error("Error clearing all column storage:", error);
  }
}

/**
 * Merge API response with existing localStorage configuration
 * Used when syncing with server
 */
export function mergeColumnConfigWithAPI(
  boardId: string | number,
  apiColumns: Record<string, any>
): void {
  try {
    let config = getColumnConfiguration(boardId) || {
      columnOrder: [],
      columns: {},
    };

    // Merge API columns into config, preserving local customizations where applicable
    Object.entries(apiColumns).forEach(([columnId, columnData]) => {
      if (!config.columns[columnId]) {
        config.columns[columnId] = {
          label: columnData.label || columnId,
          visible: columnData.visible !== false,
          position: columnData.position || 0,
        };
      } else {
        // Only update if API has different data and local hasn't been customized recently
        // This preserves recent local edits
        if (columnData.label) {
          config.columns[columnId].label = columnData.label;
        }
        if (typeof columnData.visible !== "undefined") {
          config.columns[columnId].visible = columnData.visible;
        }
        if (columnData.position) {
          config.columns[columnId].position = columnData.position;
        }
      }
    });

    // Update order based on position
    const sortedColumns = Object.entries(config.columns)
      .sort(([, a], [, b]) => (a.position || 0) - (b.position || 0))
      .map(([colId]) => colId);

    config.columnOrder = sortedColumns;

    const key = getStorageKey(boardId);
    localStorage.setItem(key, JSON.stringify(config));

    console.log(`Column configuration merged with API for board ${boardId}`);
  } catch (error) {
    console.error("Error merging column configuration with API:", error);
  }
}
