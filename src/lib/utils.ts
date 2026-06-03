import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getOrganizationId = (): number | null => {
  const userDataRaw = localStorage.getItem("user_data");
  if (!userDataRaw) return null;

  try {
    const userData = JSON.parse(userDataRaw);
    const orgId = userData?.organization_id;

    if (!orgId) return null;

    const parsed = Number(orgId);
    return Number.isNaN(parsed) ? null : parsed;
  } catch {
    return null;
  }
};

export const getCurrentUserId = (): number | null => {
  const userDataRaw = localStorage.getItem("user_data");
  if (!userDataRaw) return null;

  try {
    const userData = JSON.parse(userDataRaw);
    const orgId = userData?.user_id;

    if (!orgId) return null;

    const parsed = Number(orgId);
    return Number.isNaN(parsed) ? null : parsed;
  } catch {
    return null;
  }
};

export const clearAllBrowserStorage = () => {
  try {
    localStorage.clear();
    sessionStorage.clear();
  } catch (error) {
    console.error("Failed to clear browser storage:", error);
  }
};

export async function copyToClipboard(text: string): Promise<boolean> {
  // Use the Clipboard API if available (only works in secure contexts like HTTPS or localhost)
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.error("Clipboard API failed: ", err);
    }
  }

  // Fallback: use a hidden textarea and document.execCommand('copy')
  // This works in non-secure contexts
  try {
    const textArea = document.createElement("textarea");
    textArea.value = text;

    // Ensure the textarea is off-screen
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    textArea.style.top = "0";
    document.body.appendChild(textArea);

    textArea.focus();
    textArea.select();

    const successful = document.execCommand("copy");
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error("Fallback copy method failed: ", err);
    return false;
  }
}
export function isClientRole(roleName: string | null | undefined): boolean {
  if (!roleName) return false;
  return roleName.toLowerCase().includes("client");
}

export {
  parseApiDateTime,
  formatApiDateTimeToLocale,
  formatApiDateToShortDate,
  formatApiTime,
  timeAgoFromApiDate,
} from "./dates";

export { sortBy } from "./sorting";
