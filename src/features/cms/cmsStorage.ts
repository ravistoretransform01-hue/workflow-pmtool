import { cmsApi } from "./cmsApi";
import type { CMSRequest, CMSData, Status, Priority, Member, Label, Tag } from "./types";

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
    // Try to get from localStorage first
    const cachedData = getFromLocalStorage(payload.board_id);

    if (cachedData) {
      console.log(`Using cached CMS data from localStorage for board ${payload.board_id}`);
      return cachedData;
    }

    // If not in cache, fetch from API
    console.log(`Fetching CMS data from API for board ${payload.board_id}`);
    const apiResponse = await cmsApi.getCMSData(payload);

    // Store in localStorage with board-specific key
    const cmsData: CMSData = {
      statuses: apiResponse.statuses,
      priorities: apiResponse.priorities,
      members: apiResponse.members || [],
      labels: apiResponse.labels || [],
      tags: apiResponse.tags || [],
      timestamp: Date.now(),
    };

    saveToLocalStorage(payload.board_id, cmsData);
    return cmsData;
  } catch (error) {
    console.error("Error fetching CMS data:", error);

    // Fallback to cached data even if expired
    const cachedData = getFromLocalStorage(payload.board_id, true);
    if (cachedData) {
      console.log(`Using expired cached CMS data as fallback for board ${payload.board_id}`);
      return cachedData;
    }

    // If no cache available, throw error
    throw new Error("Failed to fetch CMS data and no cache available");
  }
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
  return cmsData.members;
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
 * Get a specific status by ID
 * @param payload - Request payload
 * @param statusId - Status ID to find
 * @returns Status object or undefined
 */
export async function getStatusById(
  payload: CMSRequest,
  statusId: string
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
  priorityId: string
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
  memberId: string
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
  labelId: string
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
  tagId: string
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
      console.log(`CMS cache cleared for board ${boardId}`);
    } else {
      // Clear all board-specific CMS caches
      const keys = Object.keys(localStorage);
      keys.forEach((key) => {
        if (key.startsWith("cms_data_board_")) {
          localStorage.removeItem(key);
        }
      });
      console.log("All CMS caches cleared");
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
function getFromLocalStorage(boardId: number, ignoreExpiry = false): CMSData | null {
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
        console.log(`CMS cache expired for board ${boardId}, will fetch fresh data`);
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
    console.log(`CMS data saved to localStorage for board ${boardId}`);
  } catch (error) {
    console.error("Error saving CMS data to localStorage:", error);
  }
}
