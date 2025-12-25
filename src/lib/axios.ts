import axios, { AxiosError, type AxiosResponse } from "axios";

// Create axios instance with production-ready config
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "https://dev-wp-platform.pantheonsite.io/wp-json/wp-platform/v1",
  timeout: 30000, // 30 seconds
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor - Add auth token
api.interceptors.request.use(
  (config) => {
    console.log("Request config:", config.url, config.baseURL, config);
    try {
      const token = localStorage.getItem("access_token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      // localStorage might not be available or token doesn't exist
      console.debug("Token not available:", error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors and token refresh
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error: AxiosError) => {
    // Handle 401 Unauthorized - Token expired
    if (error.response?.status === 401) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      // Redirect to login
      window.location.href = "/login";
    }

    // Handle 403 Forbidden
    if (error.response?.status === 403) {
      console.error("Access forbidden:", error.response.data);
    }

    // Handle 500 Server Error
    if (error.response?.status === 500) {
      console.error("Server error:", error.response.data);
    }

    // Log error for debugging
    console.error("API Error:", {
      status: error.response?.status,
      message: error.message,
      data: error.response?.data,
    });

    return Promise.reject(error);
  }
);

export default api;
