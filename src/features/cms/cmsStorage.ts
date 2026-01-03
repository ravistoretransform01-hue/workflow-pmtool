import { cmsApi } from "./cmsApi";
import type { CMSRequest, CMSData, Status, Priority } from "./types";

const STORAGE_KEY = "cms_data";
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

/**
 * Get CMS data from localStorage or fetch from API if not available
 * @param payload - Request payload with organization_id, board_id, user_id
 * @returns CMSData with statuses and priorities
 */
export async function getCMSData(payload: CMSRequest): Promise<CMSData> {
  try {
    // Try to get from localStorage first
    const cachedData = getFromLocalStorage();

    if (cachedData) {
      console.log("Using cached CMS data from localStorage");
      return cachedData;
    }

    // If not in cache, fetch from API
    console.log("Fetching CMS data from API");
    const apiResponse = await cmsApi.getCMSData(payload);

    // Store in localStorage
    const cmsData: CMSData = {
      statuses: apiResponse.statuses,
      priority: apiResponse.priority,
      timestamp: Date.now(),
    };

    saveToLocalStorage(cmsData);
    return cmsData;
  } catch (error) {
    console.error("Error fetching CMS data:", error);

    // Fallback to cached data even if expired
    const cachedData = getFromLocalStorage(true);
    if (cachedData) {
      console.log("Using expired cached CMS data as fallback");
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
  return cmsData.priority;
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
 * Clear CMS data from localStorage
 */
export function clearCMSCache(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    console.log("CMS cache cleared");
  } catch (error) {
    console.error("Error clearing CMS cache:", error);
  }
}

/**
 * Get CMS data from localStorage
 * @param ignoreExpiry - If true, return data even if expired
 * @returns CMSData or null if not found or expired
 */
function getFromLocalStorage(ignoreExpiry = false): CMSData | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (!stored) {
      return null;
    }

    const cmsData: CMSData = JSON.parse(stored);

    // Check if cache is expired
    if (!ignoreExpiry) {
      const isExpired = Date.now() - cmsData.timestamp > CACHE_DURATION;
      if (isExpired) {
        console.log("CMS cache expired, will fetch fresh data");
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
 * @param cmsData - Data to save
 */
function saveToLocalStorage(cmsData: CMSData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cmsData));
    console.log("CMS data saved to localStorage");
  } catch (error) {
    console.error("Error saving CMS data to localStorage:", error);
  }
}
