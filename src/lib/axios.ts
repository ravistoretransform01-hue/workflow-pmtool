import axios, { AxiosError, type AxiosResponse } from "axios";

// Create axios instance with production-ready config
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL  ,
  timeout: 30000, // 30 seconds
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor - Add auth token
api.interceptors.request.use(
  (config) => {
    try {
      const token = localStorage.getItem("access_token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        console.log("Request with token:", {
          url: config.url,
          method: config.method,
          baseURL: config.baseURL,
          headers: config.headers,
          data: config.data,
        });
      } else {
        console.warn("No token found in localStorage");
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
    console.log("Response received:", {
      url: response.config.url,
      status: response.status,
      data: response.data,
    });
    return response;
  },
  (error: AxiosError) => {
    // Log full error details for debugging
    console.error("API Error Details:", {
      status: error.response?.status,
      statusText: error.response?.statusText,
      message: error.message,
      data: error.response?.data,
      config: {
        url: error.config?.url,
        method: error.config?.method,
        headers: error.config?.headers,
      },
    });

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

    return Promise.reject(error);
  }
);

export default api;
