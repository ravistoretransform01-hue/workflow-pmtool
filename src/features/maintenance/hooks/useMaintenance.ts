import { useState, useEffect, useCallback, useRef } from "react";
import { maintenanceApi, type MaintenanceStatus } from "../api/maintenanceApi";

const POLL_INTERVAL_MS = 2 * 60 * 1000; // Poll every 2 minutes

export function useMaintenance() {
  const [status, setStatus] = useState<MaintenanceStatus>({
    maintenance: false,
    message: "",
  });
  const [loading, setLoading] = useState<boolean>(false);
  const lastFetchedRef = useRef<number>(0);

  const checkMaintenance = useCallback(async (showLoading = false) => {
    // Only check if user has access token
    const token = localStorage.getItem("access_token");
    if (!token) {
      setStatus({ maintenance: false, message: "" });
      return;
    }

    if (showLoading) setLoading(true);
    try {
      const res = await maintenanceApi.getMaintenanceStatus();
      setStatus(res);
      lastFetchedRef.current = Date.now();
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    // 1. Initial check on mount
    checkMaintenance();

    // 2. Periodic polling interval
    const intervalId = setInterval(() => {
      checkMaintenance();
    }, POLL_INTERVAL_MS);

    // 3. Re-check on tab visibility change or window focus (throttle to at least 30s)
    const handleVisibilityChange = () => {
      if (
        document.visibilityState === "visible" &&
        Date.now() - lastFetchedRef.current > 30000
      ) {
        checkMaintenance();
      }
    };

    const handleFocus = () => {
      if (Date.now() - lastFetchedRef.current > 30000) {
        checkMaintenance();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [checkMaintenance]);

  return {
    isMaintenance: status.maintenance,
    message: status.message,
    loading,
    refetch: () => checkMaintenance(true),
  };
}
