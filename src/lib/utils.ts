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
