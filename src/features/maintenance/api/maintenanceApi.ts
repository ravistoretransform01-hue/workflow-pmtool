import api from "@/config/axios";

export interface MaintenanceStatus {
  maintenance: boolean;
  message: string;
}

export interface MaintenanceResponse {
  code: number;
  status: string;
  data: {
    maintenance: boolean;
    message?: string;
  };
}

export const cleanMaintenanceMessage = (rawMessage?: string): string => {
  if (!rawMessage) return "";
  // Unescape double-escaped apostrophes and backslashes, e.g. "We\\'ll" -> "We'll"
  return rawMessage
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\")
    .trim();
};

export const maintenanceApi = {
  /**
   * Check if system/platform is in maintenance mode.
   * Endpoint: /maintenance
   */
  getMaintenanceStatus: async (): Promise<MaintenanceStatus> => {
    try {
      const response = await api.get<MaintenanceResponse>("/maintenance");
      const data = response.data?.data;

      if (data) {
        return {
          maintenance: Boolean(data.maintenance),
          message: cleanMaintenanceMessage(data.message),
        };
      }

      return { maintenance: false, message: "" };
    } catch (error: any) {
      // If endpoint returns 401 or network error, fail silently without breaking the app
      console.warn("Failed to check maintenance status:", error?.message || error);
      return { maintenance: false, message: "" };
    }
  },
};
