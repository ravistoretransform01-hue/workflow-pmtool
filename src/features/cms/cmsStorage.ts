import { debugLog } from "@/lib/debugLog";
import { cmsApi } from "./cmsApi";
import type {
  CMSRequest,
  CMSData,
  Status,
  Priority,
  Member,
  Label,
  Tag,
  Role,
} from "./types";

const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

/**
 * Generate a unique storage key for each board
 */
function getStorageKey(boardId: number): string {
  return `cms_data_board_${boardId}`;
}

/**
 * Get CMS data from localStorage or fetch from API if not available
 * @param payload - Request payload with organization_id, board_id, user_id
 * @returns CMSData with statuses, priorities, and members
 */
export async function getCMSData(payload: CMSRequest): Promise<CMSData> {
  try {
    // Try to get from localStorage first (unless forced refresh)
    const cachedData = getFromLocalStorage(payload.board_id);

    if (cachedData && !payload.forceRefresh) {
      debugLog(
        `Using cached CMS data from localStorage for board ${payload.board_id}`,
      );
      return cachedData;
    }

    // If not in cache or forced refresh, fetch from API
    debugLog(`Fetching CMS data from API for board ${payload.board_id}`);
    const apiResponse = await cmsApi.getCMSData(payload);

    // Store in localStorage with board-specific key
    const cmsData: CMSData = {
      roles: (apiResponse.roles || []).map((r) => ({
        id: String(r.id),
        name: r.name,
      })),
      statuses: (apiResponse.statuses || []).map((s) => ({
        id: String(s.id),
        name: s.name,
        color_code: s.color_code,
        status_order: String(s.status_order),
        required_rating: s.required_rating,
      })),
      priorities: (apiResponse.priorities || []).map((p) => ({
        id: String(p.id),
        name: p.name,
        color_code: p.color_code,
        priority_order: String(p.priority_order),
      })),
      members: (apiResponse.members || []).map((m) => ({
        user_id: String(m.user_id),
        name: m.name,
        email: m.email,
        username: m.username,
        role_id: m.role_id ? String(m.role_id) : undefined,
        board_role_id: m.board_role_id ? Number(m.board_role_id) : undefined,
        board_role_label: m.board_role_label,
        board_role_active:
          m.board_role_active === true ||
          String(m.board_role_active) === "1" ||
          Number(m.board_role_active) === 1,
      })),
      labels: apiResponse.labels || [],
      tags: apiResponse.tags || [],
      timestamp: Date.now(),
      all_board_groups: apiResponse.all_board_groups || [],
      groups: apiResponse.groups || [],
    };

    saveToLocalStorage(payload.board_id, cmsData);

    // Also store user_columns and default_columns separately
    if (apiResponse.user_columns) {
      saveUserColumnsToLocalStorage(payload.board_id, apiResponse.user_columns);
    }
    if (apiResponse.default_columns) {
      saveDefaultColumnsToLocalStorage(
        payload.board_id,
        apiResponse.default_columns,
      );
    }

    return cmsData;
  } catch (error) {
    console.error("Error fetching CMS data:", error);

    // Fallback to cached data even if expired
    const cachedData = getFromLocalStorage(payload.board_id, true);
    if (cachedData) {
      debugLog(
        `Using expired cached CMS data as fallback for board ${payload.board_id}`,
      );
      return cachedData;
    }

    // If no cache available, throw error
    throw new Error("Failed to fetch CMS data and no cache available");
  }
}

/**
 * Get roles from localStorage or fetch if not available
 * @param payload - Request payload
 * @returns Array of Role objects
 */
export async function getRoles(payload: CMSRequest): Promise<Role[]> {
  const cmsData = await getCMSData(payload);
  return cmsData.roles;
}

/**
 * Get statuses from localStorage or fetch if not available
 * @param payload - Request payload
 * @returns Array of Status objects
 */
export async function getStatuses(payload: CMSRequest): Promise<Status[]> {
  const cmsData = await getCMSData(payload);
  return cmsData.statuses;
}

/**
 * Get priorities from localStorage or fetch if not available
 * @param payload - Request payload
 * @returns Array of Priority objects
 */
export async function getPriorities(payload: CMSRequest): Promise<Priority[]> {
  const cmsData = await getCMSData(payload);
  return cmsData.priorities;
}

/**
 * Get members from localStorage or fetch if not available
 * @param payload - Request payload
 * @returns Array of Member objects
 */
export async function getMembers(payload: CMSRequest): Promise<Member[]> {
  const cmsData = await getCMSData(payload);
  const groups = cmsData.groups || [];
  return cmsData.members.map((member) => {
    const memberGroupIds = groups
      .filter((g: any) => 
        g.assigned_users && 
        g.assigned_users.some((uid: any) => String(uid) === String(member.user_id))
      )
      .map((g: any) => String(g.id));
    return {
      ...member,
      group_ids: memberGroupIds,
    };
  });
}

/**
 * Get labels from localStorage or fetch if not available
 * @param payload - Request payload
 * @returns Array of Label objects
 */
export async function getLabels(payload: CMSRequest): Promise<Label[]> {
  const cmsData = await getCMSData(payload);
  return cmsData.labels;
}

/**
 * Get tags from localStorage or fetch if not available
 * @param payload - Request payload
 * @returns Array of Tag objects
 */
export async function getTags(payload: CMSRequest): Promise<Tag[]> {
  const cmsData = await getCMSData(payload);
  return cmsData.tags;
}

/**
 * Get a specific role by ID
 * @param payload - Request payload
 * @param roleId - Role ID to find
 * @returns Role object or undefined
 */
export async function getRoleById(
  payload: CMSRequest,
  roleId: string,
): Promise<Role | undefined> {
  const roles = await getRoles(payload);
  return roles.find((r) => r.id === roleId);
}

/**
 * Get a specific status by ID
 * @param payload - Request payload
 * @param statusId - Status ID to find
 * @returns Status object or undefined
 */
export async function getStatusById(
  payload: CMSRequest,
  statusId: string,
): Promise<Status | undefined> {
  const statuses = await getStatuses(payload);
  return statuses.find((s) => s.id === statusId);
}

/**
 * Get a specific priority by ID
 * @param payload - Request payload
 * @param priorityId - Priority ID to find
 * @returns Priority object or undefined
 */
export async function getPriorityById(
  payload: CMSRequest,
  priorityId: string,
): Promise<Priority | undefined> {
  const priorities = await getPriorities(payload);
  return priorities.find((p) => p.id === priorityId);
}

/**
 * Get a specific member by ID
 * @param payload - Request payload
 * @param memberId - Member ID to find
 * @returns Member object or undefined
 */
export async function getMemberById(
  payload: CMSRequest,
  memberId: string,
): Promise<Member | undefined> {
  const members = await getMembers(payload);
  return members.find((m) => m.user_id === memberId);
}

/**
 * Get a specific label by ID
 * @param payload - Request payload
 * @param labelId - Label ID to find
 * @returns Label object or undefined
 */
export async function getLabelById(
  payload: CMSRequest,
  labelId: string,
): Promise<Label | undefined> {
  const labels = await getLabels(payload);
  return labels.find((l) => l.id === labelId);
}

/**
 * Get a specific tag by ID
 * @param payload - Request payload
 * @param tagId - Tag ID to find
 * @returns Tag object or undefined
 */
export async function getTagById(
  payload: CMSRequest,
  tagId: string,
): Promise<Tag | undefined> {
  const tags = await getTags(payload);
  return tags.find((t) => t.id === tagId);
}

/**
 * Clear CMS data from localStorage for a specific board
 * @param boardId - Board ID to clear cache for (optional, clears all if not provided)
 */
export function clearCMSCache(boardId?: number): void {
  try {
    if (boardId) {
      localStorage.removeItem(getStorageKey(boardId));
      debugLog(`CMS cache cleared for board ${boardId}`);
    } else {
      // Clear all board-specific CMS caches
      const keys = Object.keys(localStorage);
      keys.forEach((key) => {
        if (key.startsWith("cms_data_board_")) {
          localStorage.removeItem(key);
        }
      });
      debugLog("All CMS caches cleared");
    }
  } catch (error) {
    console.error("Error clearing CMS cache:", error);
  }
}

/**
 * Get CMS data from localStorage
 * @param boardId - Board ID to get cache for
 * @param ignoreExpiry - If true, return data even if expired
 * @returns CMSData or null if not found or expired
 */
function getFromLocalStorage(
  boardId: number,
  ignoreExpiry = false,
): CMSData | null {
  try {
    const storageKey = getStorageKey(boardId);
    const stored = localStorage.getItem(storageKey);

    if (!stored) {
      return null;
    }

    const cmsData: CMSData = JSON.parse(stored);

    // Check if cache is expired
    if (!ignoreExpiry) {
      const isExpired = Date.now() - cmsData.timestamp > CACHE_DURATION;
      if (isExpired) {
        debugLog(
          `CMS cache expired for board ${boardId}, will fetch fresh data`,
        );
        return null;
      }
    }

    return cmsData;
  } catch (error) {
    console.error("Error reading CMS data from localStorage:", error);
    return null;
  }
}

/**
 * Save CMS data to localStorage
 * @param boardId - Board ID to save cache for
 * @param cmsData - Data to save
 */
function saveToLocalStorage(boardId: number, cmsData: CMSData): void {
  try {
    const storageKey = getStorageKey(boardId);
    localStorage.setItem(storageKey, JSON.stringify(cmsData));
    debugLog(`CMS data saved to localStorage for board ${boardId}`);
  } catch (error) {
    console.error("Error saving CMS data to localStorage:", error);
  }
}

/**
 * Add a new status to localStorage cache
 * @param boardId - Board ID to update cache for
 * @param newStatus - New status to add
 */
export function addStatusToCache(boardId: number, newStatus: Status): void {
  try {
    let cachedData = getFromLocalStorage(boardId, true);

    if (cachedData) {
      // Cache exists, add to it
      cachedData.statuses.push(newStatus);
      cachedData.timestamp = Date.now(); // Update timestamp
      saveToLocalStorage(boardId, cachedData);
      debugLog(`Added new status to cache for board ${boardId}`);
    } else {
      // Cache doesn't exist, create a new one with just this status
      const newCacheData: CMSData = {
        roles: [],
        statuses: [newStatus],
        priorities: [],
        members: [],
        labels: [],
        tags: [],
        timestamp: Date.now(),
      };
      saveToLocalStorage(boardId, newCacheData);
      debugLog(`Created new cache with status for board ${boardId}`);
    }
  } catch (error) {
    console.error("Error adding status to cache:", error);
  }
}

/**
 * Add a new priority to localStorage cache
 * @param boardId - Board ID to update cache for
 * @param newPriority - New priority to add
 */
export function addPriorityToCache(
  boardId: number,
  newPriority: Priority,
): void {
  try {
    let cachedData = getFromLocalStorage(boardId, true);
    if (cachedData) {
      // Cache exists, add to it
      cachedData.priorities.push(newPriority);
      cachedData.timestamp = Date.now(); // Update timestamp
      saveToLocalStorage(boardId, cachedData);
      debugLog(`Added new priority to cache for board ${boardId}`);
    } else {
      // Cache doesn't exist, create a new one with just this priority
      const newCacheData: CMSData = {
        roles: [],
        statuses: [],
        priorities: [newPriority],
        members: [],
        labels: [],
        tags: [],
        timestamp: Date.now(),
      };
      saveToLocalStorage(boardId, newCacheData);
      debugLog(`Created new cache with priority for board ${boardId}`);
    }
  } catch (error) {
    console.error("Error adding priority to cache:", error);
  }
}

/**
 * Add a new tag to localStorage cache
 * @param boardId - Board ID to update cache for
 * @param newTag - New tag to add
 */
export function addTagToCache(boardId: number, newTag: Tag): void {
  try {
    let cachedData = getFromLocalStorage(boardId, true);
    if (cachedData) {
      // Cache exists, add to it
      cachedData.tags.push(newTag);
      cachedData.timestamp = Date.now(); // Update timestamp
      saveToLocalStorage(boardId, cachedData);
      debugLog(`Added new tag to cache for board ${boardId}`);
    } else {
      // Cache doesn't exist, create a new one with just this tag
      const newCacheData: CMSData = {
        roles: [],
        statuses: [],
        priorities: [],
        members: [],
        labels: [],
        tags: [newTag],
        timestamp: Date.now(),
      };
      saveToLocalStorage(boardId, newCacheData);
      debugLog(`Created new cache with tag for board ${boardId}`);
    }
  } catch (error) {
    console.error("Error adding tag to cache:", error);
  }
}

/**
 * Update an existing status in localStorage cache
 * @param boardId - Board ID to update cache for
 * @param updatedStatus - Updated status object
 */
export function updateStatusInCache(
  boardId: number,
  updatedStatus: Status,
): void {
  try {
    let cachedData = getFromLocalStorage(boardId, true);
    if (cachedData) {
      // Find and update the status
      const statusIndex = cachedData.statuses.findIndex(
        (s) => s.id === updatedStatus.id,
      );
      if (statusIndex !== -1) {
        cachedData.statuses[statusIndex] = updatedStatus;
        cachedData.timestamp = Date.now(); // Update timestamp
        saveToLocalStorage(boardId, cachedData);
        debugLog(`Updated status in cache for board ${boardId}`);
      }
    }
  } catch (error) {
    console.error("Error updating status in cache:", error);
  }
}

/**
 * Delete a status from localStorage cache
 * @param boardId - Board ID to update cache for
 * @param statusId - ID of the status to delete
 */
export function deleteStatusFromCache(boardId: number, statusId: string): void {
  try {
    let cachedData = getFromLocalStorage(boardId, true);
    if (cachedData) {
      // Filter out the deleted status
      cachedData.statuses = cachedData.statuses.filter(
        (s) => String(s.id) !== statusId,
      );
      cachedData.timestamp = Date.now(); // Update timestamp
      saveToLocalStorage(boardId, cachedData);
      debugLog(`Deleted status ${statusId} from cache for board ${boardId}`);
    }
  } catch (error) {
    console.error("Error deleting status from cache:", error);
  }
}

/**
 * Update an existing priority in localStorage cache
 * @param boardId - Board ID to update cache for
 * @param updatedPriority - Updated priority object
 */
export function updatePriorityInCache(
  boardId: number,
  updatedPriority: Priority,
): void {
  try {
    let cachedData = getFromLocalStorage(boardId, true);
    if (cachedData) {
      // Find and update the priority
      const priorityIndex = cachedData.priorities.findIndex(
        (p) => p.id === updatedPriority.id,
      );
      if (priorityIndex !== -1) {
        cachedData.priorities[priorityIndex] = updatedPriority;
        cachedData.timestamp = Date.now(); // Update timestamp
        saveToLocalStorage(boardId, cachedData);
        debugLog(`Updated priority in cache for board ${boardId}`);
      }
    }
  } catch (error) {
    console.error("Error updating priority in cache:", error);
  }
}

/**
 * Delete a priority from localStorage cache
 * @param boardId - Board ID to update cache for
 * @param priorityId - ID of the priority to delete
 */
export function deletePriorityFromCache(
  boardId: number,
  priorityId: string,
): void {
  try {
    let cachedData = getFromLocalStorage(boardId, true);
    if (cachedData) {
      // Filter out the deleted priority
      cachedData.priorities = cachedData.priorities.filter(
        (p) => String(p.id) !== priorityId,
      );
      cachedData.timestamp = Date.now(); // Update timestamp
      saveToLocalStorage(boardId, cachedData);
      debugLog(
        `Deleted priority ${priorityId} from cache for board ${boardId}`,
      );
    }
  } catch (error) {
    console.error("Error deleting priority from cache:", error);
  }
}

/**
 * Get user columns configuration from localStorage
 * @param boardId - Board ID to get columns for
 * @returns User columns configuration or null
 */
export function getUserColumnsFromCache(boardId: number): any {
  try {
    const storageKey = `user_columns_board_${boardId}`;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      return JSON.parse(stored);
    }
    return null;
  } catch (error) {
    console.error("Error reading user columns from localStorage:", error);
    return null;
  }
}

/**
 * Get default columns configuration from localStorage
 * @param boardId - Board ID to get columns for
 * @returns Default columns configuration or null
 */
export function getDefaultColumnsFromCache(boardId: number): any {
  try {
    const storageKey = `default_columns_board_${boardId}`;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      return JSON.parse(stored);
    }
    return null;
  } catch (error) {
    console.error("Error reading default columns from localStorage:", error);
    return null;
  }
}

/**
 * Save user columns configuration to localStorage
 * @param boardId - Board ID to save columns for
 * @param userColumns - User columns configuration
 */
function saveUserColumnsToLocalStorage(
  boardId: number,
  userColumns: any,
): void {
  try {
    const storageKey = `user_columns_board_${boardId}`;
    localStorage.setItem(storageKey, JSON.stringify(userColumns));
    debugLog(`User columns saved to localStorage for board ${boardId}`);
  } catch (error) {
    console.error("Error saving user columns to localStorage:", error);
  }
}

/**
 * Save default columns configuration to localStorage
 * @param boardId - Board ID to save columns for
 * @param defaultColumns - Default columns configuration
 */
function saveDefaultColumnsToLocalStorage(
  boardId: number,
  defaultColumns: any,
): void {
  try {
    const storageKey = `default_columns_board_${boardId}`;
    localStorage.setItem(storageKey, JSON.stringify(defaultColumns));
    debugLog(`Default columns saved to localStorage for board ${boardId}`);
  } catch (error) {
    console.error("Error saving default columns to localStorage:", error);
  }
}
/**
 * Update the order of statuses in localStorage cache
 * @param boardId - Board ID to update cache for
 * @param orderedIds - Array of status IDs in the new order
 */
export function updateStatusesOrderInCache(
  boardId: number,
  orderedIds: string[],
): void {
  try {
    const cachedData = getFromLocalStorage(boardId, true);
    if (cachedData) {
      const statusMap = new Map(cachedData.statuses.map((s) => [String(s.id), s]));
      const nextStatuses: Status[] = orderedIds
        .map((id) => statusMap.get(id))
        .filter((s): s is Status => !!s);

      // If there were statuses in the cache not present in orderedIds, append them
      const orderedIdsSet = new Set(orderedIds);
      cachedData.statuses.forEach((s) => {
        if (!orderedIdsSet.has(String(s.id))) {
          nextStatuses.push(s);
        }
      });

      cachedData.statuses = nextStatuses;
      cachedData.timestamp = Date.now();
      saveToLocalStorage(boardId, cachedData);
      debugLog(`Updated statuses order in cache for board ${boardId}`);
    }
  } catch (error) {
    console.error("Error updating statuses order in cache:", error);
  }
}

/**
 * Update the order of priorities in localStorage cache
 * @param boardId - Board ID to update cache for
 * @param orderedIds - Array of priority IDs in the new order
 */
export function updatePrioritiesOrderInCache(
  boardId: number,
  orderedIds: string[],
): void {
  try {
    const cachedData = getFromLocalStorage(boardId, true);
    if (cachedData) {
      const priorityMap = new Map(
        cachedData.priorities.map((p) => [String(p.id), p]),
      );
      const nextPriorities: Priority[] = orderedIds
        .map((id) => priorityMap.get(id))
        .filter((p): p is Priority => !!p);

      // If there were priorities in the cache not present in orderedIds, append them
      const orderedIdsSet = new Set(orderedIds);
      cachedData.priorities.forEach((p) => {
        if (!orderedIdsSet.has(String(p.id))) {
          nextPriorities.push(p);
        }
      });

      cachedData.priorities = nextPriorities;
      cachedData.timestamp = Date.now();
      saveToLocalStorage(boardId, cachedData);
      debugLog(`Updated priorities order in cache for board ${boardId}`);
    }
  } catch (error) {
    console.error("Error updating priorities order in cache:", error);
  }
}
