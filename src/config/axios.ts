import axios, { AxiosError, type AxiosResponse } from "axios";
import { debugLog, debugWarn, debugError, getTokenInfo } from "@/utils/debugLog";
import { toast } from "@/hooks/use-toast";
 
declare module "axios" {
  export interface AxiosRequestConfig {
    skipAuth?: boolean;
  }
  export interface InternalAxiosRequestConfig {
    skipAuth?: boolean;
  }
}

// Flag to prevent multiple refresh token requests
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
}> = [];

// Track retry attempts to prevent infinite loops
const retryAttempts = new Map<string, number>();
const MAX_RETRIES = 3; // Only retry once per request

// Global loading state tracking
let activeRequests = 0;
let onLoadingChanged: ((isLoading: boolean) => void) | null = null;

export const setLoadingListener = (callback: (isLoading: boolean) => void) => {
  onLoadingChanged = callback;
};

const updateLoadingState = (delta: number) => {
  activeRequests = Math.max(0, activeRequests + delta);
  if (onLoadingChanged) {
    onLoadingChanged(activeRequests > 0);
  }
};

const processQueue = (error: any, token: string | null = null) => {
  debugLog(`[QUEUE] Processing ${failedQueue.length} queued requests...`);
  failedQueue.forEach((prom, index) => {
    debugLog(`[QUEUE] Processing request ${index + 1}/${failedQueue.length}`);
    if (error) {
      debugLog(`[QUEUE] Rejecting request ${index + 1} due to error`);
      prom.reject(error);
    } else {
      debugLog(`[QUEUE] Resolving request ${index + 1} with new token`);
      prom.resolve(token);
    }
  });

  debugLog(`[QUEUE] All queued requests processed`);
  isRefreshing = false;
  failedQueue = [];
};

// Create axios instance with production-ready config
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 30000, // 30 seconds
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor - Add auth token
api.interceptors.request.use(
  (config) => {
    updateLoadingState(1);
    debugLog(`[REQUEST] Step 1: Preparing request to ${config.url}`);

    // skipAuth CHECK
    if (config.skipAuth) {
      debugLog(`[REQUEST] 🔓 Skipping Authorization header for this request`);
      return config;
    }

    try {
      const token = localStorage.getItem("access_token");
      debugLog(`[REQUEST] Step 2: Token found in localStorage: ${!!token}`);
      if (token) {
        const tokenInfo = getTokenInfo(token);
        config.headers.Authorization = `Bearer ${token}`;
        debugLog(`[REQUEST] Step 3: Token attached to Authorization header`);
        debugLog(`[REQUEST] Step 3.1: Token : `, token);
        debugLog(
          `[REQUEST] Step 4: Token expires in: ${tokenInfo?.expiresIn || "unknown"}`,
        );

        if (tokenInfo?.isExpired) {
          debugWarn(`[REQUEST] ⚠️ WARNING: Token is already expired!`);
        }
      } else {
        debugWarn(`[REQUEST] ⚠️ No token found in localStorage`);
      }
    } catch (error) {
      debugLog(`[REQUEST] Error accessing token:`, error);
    }
    debugLog(`[REQUEST] Step 5: Request ready to send`);
    return config;
  },
  (error) => {
    updateLoadingState(-1);
    debugError(`[REQUEST] Error in request interceptor:`, error);
    return Promise.reject(error);
  },
);

// Response interceptor - Handle errors and token refresh
api.interceptors.response.use(
  (response: AxiosResponse) => {
    updateLoadingState(-1);
    debugLog(
      `[RESPONSE] ✅ Success: ${response.config.url} - Status: ${response.status}`,
    );
    return response;
  },
  async (error: AxiosError) => {
    updateLoadingState(-1); // Immediately decrement for this failed request
    debugLog(`\n[ERROR] ========== ERROR DETECTED ==========`);
    const originalRequest = error.config as any;
    const errorData = error.response?.data as any;

    // Create a unique key for this request
    const requestKey = `${originalRequest.method}-${originalRequest.url}`;
    const currentRetries = retryAttempts.get(requestKey) || 0;

    debugLog(`[ERROR] Step 1: Error Status: ${error.response?.status}`);
    debugLog(`[ERROR] Step 2: Error Code: ${errorData?.code}`);
    debugLog(`[ERROR] Step 3: Error Message: ${errorData?.message}`);
    debugLog(`[ERROR] Step 4: Error URL: ${error.config?.url}`);
    debugLog(
      `[ERROR] Step 5: Retry attempt ${currentRetries + 1}/${MAX_RETRIES}`,
    );

    // Handle 403 Forbidden - Check if it's an expired token
    if (error.response?.status === 403) {
      debugLog(`[ERROR] Step 6: Status is 403 Forbidden`);

      // Check if it's a permission error (not token expiration)
      if (
        errorData?.error_type === "insufficient_permissions" ||
        (errorData?.status === "failed" && errorData?.message)
      ) {
        debugLog(`[ERROR] Step 7: ❌ Permission denied error detected`);
        debugLog(`[ERROR] Step 8: Error message: ${errorData?.message}`);
        
        // Show toast notification for permission errors
        toast({
          title: "Permission Denied",
          description: errorData?.message || "You don't have permission to perform this action",
          variant: "destructive",
          duration: 4000,
        });
        
        // Don't retry, just reject the error
        return Promise.reject(error);
      }

      // forceLogout();
      // return Promise.reject(
      //   new Error("Token refresh failed - max retries exceeded"),
      // );

      if (
        errorData?.code === "jwt_auth_invalid_token" ||
        errorData?.code === "jwt_auth_bad_config"
      ) {
        debugLog(`[ERROR] Step 7: ✅ Confirmed - Token is expired`);

        // Prevent infinite retry loops
        if (currentRetries >= MAX_RETRIES) {
          debugError(
            `[ERROR] ❌ Max retries (${MAX_RETRIES}) reached - Stopping refresh attempts`,
          );
          debugError(
            `[ERROR] This indicates the new token is also invalid or user has no permission`,
          );
          retryAttempts.delete(requestKey);
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          localStorage.clear();
          window.location.href = "/login";
          return Promise.reject(
            new Error("Token refresh failed - max retries exceeded"),
          );
        }

        // Increment retry counter
        retryAttempts.set(requestKey, currentRetries + 1);

        debugLog(`\n[REFRESH] ========== STARTING TOKEN REFRESH ==========`);

        // Prevent multiple refresh requests
        if (!isRefreshing) {
          debugLog(
            `[REFRESH] Step 1: Not currently refreshing - Starting refresh process`,
          );
          isRefreshing = true;

          try {
            debugLog(
              `[REFRESH] Step 2: Retrieving refresh_token from localStorage`,
            );
            const refreshToken = localStorage.getItem("refresh_token");
            debugLog(
              `[REFRESH] Step 3: Refresh token found: ${!!refreshToken}`,
            );

            if (!refreshToken) {
              debugError(
                `[REFRESH] ❌ Step 4: No refresh token available - Cannot refresh`,
              );
              debugLog(
                `[REFRESH] Step 5: Clearing all tokens from localStorage`,
              );
              localStorage.removeItem("access_token");
              localStorage.removeItem("refresh_token");
              debugLog(`[REFRESH] Step 6: Redirecting to login page`);
              window.location.href = "/login";
              return Promise.reject(error);
            }

            debugLog(
              `[REFRESH] Step 4: Refresh token available - Proceeding with refresh`,
            );
            debugLog(
              `[REFRESH] Step 5: Preparing POST request to /refresh endpoint`,
            );
            debugLog(`[REFRESH] Step 6: Sending refresh token to server...`);

            // Make refresh token request using plain axios (not our api instance)
            const response = await axios.post(
              `${import.meta.env.VITE_API_URL}/refresh`,
              {
                refresh_token: refreshToken,
              },
              {
                headers: {
                  "Content-Type": "application/json",
                },
              },
            );

            debugLog(
              `[REFRESH] ✅ Step 7: Refresh request successful - Status: ${response.status}`,
            );
            debugLog(`[REFRESH] Step 8: Extracting new tokens from response`);
            const { access_token, refresh_token } = response.data;
            debugLog(
              `[REFRESH] Step 9: New access_token received: ${!!access_token}`,
            );
            debugLog(
              `[REFRESH] Step 10: New refresh_token received: ${!!refresh_token}`,
            );

            // Update tokens in localStorage
            debugLog(
              `[REFRESH] Step 11: Storing new access_token in localStorage`,
            );
            localStorage.setItem("access_token", access_token);

            if (refresh_token) {
              debugLog(
                `[REFRESH] Step 12: Storing new refresh_token in localStorage`,
              );
              localStorage.setItem("refresh_token", refresh_token);
            } else {
              debugLog(
                `[REFRESH] Step 12: No new refresh_token in response - keeping old one`,
              );
            }

            const tokenInfo = getTokenInfo(access_token);
            debugLog(
              `[REFRESH] Step 13: New token expires in: ${tokenInfo?.expiresIn}`,
            );

            // Update the original request with new token
            debugLog(
              `[REFRESH] Step 14: Updating original request with new token`,
            );
            originalRequest.headers.Authorization = `Bearer ${access_token}`;

            // Process queued requests
            debugLog(
              `[REFRESH] Step 15: Processing ${failedQueue.length} queued requests`,
            );
            processQueue(null, access_token);

            // Retry the original request
            debugLog(
              `[REFRESH] Step 16: Retrying original request with new token`,
            );
            debugLog(
              `[REFRESH] ========== TOKEN REFRESH COMPLETE ==========\n`,
            );

            // Clear retry counter on successful refresh
            retryAttempts.delete(requestKey);

            return api(originalRequest);
          } catch (refreshError: any) {
            debugError(`[REFRESH] ❌ Step 7: Token refresh failed`);
            debugError(
              `[REFRESH] Step 8: Error message: ${refreshError.message}`,
            );
            debugError(
              `[REFRESH] Step 9: Error status: ${refreshError.response?.status}`,
            );

            // Clear tokens and redirect to login
            debugLog(
              `[REFRESH] Step 10: Clearing all tokens from localStorage`,
            );
            localStorage.removeItem("access_token");
            localStorage.removeItem("refresh_token");

            debugLog(
              `[REFRESH] Step 11: Processing queued requests with error`,
            );
            processQueue(refreshError, null);

            debugLog(`[REFRESH] Step 12: Redirecting to login page`);
            window.location.href = "/login";

            return Promise.reject(refreshError);
          }
        } else {
          // If already refreshing, queue the request
          debugLog(
            `[REFRESH] Step 1: Already refreshing - Queueing this request`,
          );
          debugLog(
            `[REFRESH] Step 2: Current queue size: ${failedQueue.length}`,
          );

          return new Promise((resolve, reject) => {
            debugLog(`[REFRESH] Step 3: Adding request to queue`);
            failedQueue.push({ resolve, reject });
            debugLog(`[REFRESH] Step 4: Queue size now: ${failedQueue.length}`);
          })
            .then((token) => {
              debugLog(
                `[REFRESH] Step 5: Queue resolved - Retrying with new token`,
              );
              originalRequest.headers.Authorization = `Bearer ${token}`;
              return api(originalRequest);
            })
            .catch((err) => {
              debugError(
                `[REFRESH] Step 5: Queue rejected - Error:`,
                err.message,
              );
              return Promise.reject(err);
            });
        }
      } else {
        debugLog(`[ERROR] Step 8: ❌ 403 Forbidden but NOT token expiration`);
        debugLog(`[ERROR] Step 9: Error code: ${errorData?.code}`);
        debugLog(`[ERROR] Step 10: Error message: ${errorData?.message}`);
      }
    }

    // Handle 401 Unauthorized
    if (error.response?.status === 401) {
      debugError(`[ERROR] Step 6: Status is 401 Unauthorized`);
      debugLog(`[ERROR] Step 7: Clearing all tokens from localStorage`);
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");

      // Don't redirect if we are already on the login page
      // This allows the error to be handled by the login page and show a toast
      if (window.location.pathname !== "/login") {
        debugLog(`[ERROR] Step 8: Redirecting to login page`);
        window.location.href = "/login";
      } else {
        debugLog(`[ERROR] Step 8: Already on login page, skipping redirect`);
      }
    }

    // Handle 500 Server Error
    if (error.response?.status === 500) {
      debugError(`[ERROR] Step 6: Status is 500 Server Error`);
      debugError(`[ERROR] Step 7: Server error details:`, error.response.data);
    }

    debugLog(`[ERROR] ========== ERROR HANDLING COMPLETE ==========\n`);
    return Promise.reject(error);
  },
);

export default api;
