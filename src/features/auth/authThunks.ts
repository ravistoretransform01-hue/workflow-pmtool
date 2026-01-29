import { createAsyncThunk } from "@reduxjs/toolkit";
import { authApi } from "./authApi";
import type { LoginRequest, SignupRequest, AuthResponse } from "./types";
import axios from "@/lib/axios";

export const loginThunk = createAsyncThunk<
  AuthResponse,
  LoginRequest,
  {
    rejectValue: string;
  }
>("auth/login", async (credentials, { rejectWithValue }) => {
  try {
    const response = await authApi.login(credentials);
    return response;
  } catch (error: any) {
    // Handle error response format
    const errorData = error.response?.data;
    let errorMessage = "Login failed. Please try again.";

    if (errorData?.message) {
      // If message is an array, get the first message's text
      if (Array.isArray(errorData.message)) {
        errorMessage = errorData.message[0]?.message || errorMessage;
      } else if (typeof errorData.message === "string") {
        errorMessage = errorData.message;
      }
    }

    return rejectWithValue(errorMessage);
  }
});

export const signupThunk = createAsyncThunk<
  AuthResponse,
  SignupRequest,
  {
    rejectValue: string;
  }
>("auth/signup", async (data, { rejectWithValue }) => {
  try {
    const response = await authApi.signup(data);
    return response;
  } catch (error: any) {
    // Handle error response format
    const errorData = error.response?.data;
    let errorMessage = "Signup failed. Please try again.";

    if (errorData?.message) {
      // If message is an array, get the first message's text
      if (Array.isArray(errorData.message)) {
        errorMessage = errorData.message[0]?.message || errorMessage;
      } else if (typeof errorData.message === "string") {
        errorMessage = errorData.message;
      }
    }

    return rejectWithValue(errorMessage);
  }
});

export const logoutThunk = createAsyncThunk<
  void,
  void,
  {
    rejectValue: string;
  }
>("auth/logout", async (_, {}) => {
  try {
    // Stop any running timer before logout
    const token = localStorage.getItem("access_token");
    const activeTimerId = sessionStorage.getItem("activeTimerId");

    if (activeTimerId && token) {
      try {
        // Get the base URL from localStorage or use default
        const baseUrl = axios.defaults.baseURL || "";
        const url = `${baseUrl}/tasks/time/stop`;
        const payload = JSON.stringify({ task_id: activeTimerId });

        // Create headers
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        };

        // Use fetch with keepalive to ensure request completes
        await fetch(url, {
          method: "POST",
          body: payload,
          headers,
          keepalive: true,
        }).catch((error) => {
          console.error("Failed to stop timer before logout:", error);
        });

        // Clear the active timer ID
        sessionStorage.removeItem("activeTimerId");
      } catch (error) {
        console.error("Error stopping timer before logout:", error);
      }
    }

    // Proceed with logout
    await authApi.logout();
    return;
  } catch (error: any) {
    // Even if logout API fails, we still want to clear local state
    // So we don't reject, just return
    console.error("Logout API error:", error);
    return;
  }
});

export const refreshTokenThunk = createAsyncThunk<
  AuthResponse,
  string,
  {
    rejectValue: string;
  }
>("auth/refreshToken", async (refreshToken, { rejectWithValue }) => {
  try {
    const response = await authApi.refreshToken(refreshToken);
    return response;
  } catch (error: any) {
    return rejectWithValue(
      error.response?.data?.message || "Token refresh failed.",
    );
  }
});
