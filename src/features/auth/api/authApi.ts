import api from "@/config/axios";
import type {
  LoginRequest,
  SignupRequest,
  AuthResponse,
  ResetPasswordRequest,
  OrganizationsResponse,
} from "@/features/auth/types/types";
import { debugError } from "@/utils/debugLog";

const AUTH_ENDPOINTS = {
  LOGIN: "/loginup",
  SIGNUP: "/signup",
  LOGOUT: "/logout",
  REFRESH: "/refresh",
  ME: "/me",
  FORGOT_PASSWORD: "/auth/forgot-password",
  RESET_PASSWORD: "/auth/reset-password",
  SAVE_FCM_TOKEN: "/save-token",
  GET_ORGANIZATIONS: "/users/me/organizations",
};

export const authApi = {
  /**
   * Login with username and password
   * Uses query parameters as per API spec
   */
  login: async (credentials: LoginRequest): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>(AUTH_ENDPOINTS.LOGIN, null, {
      params: {
        username: credentials.username,
        password: credentials.password,
      },
    });
    return response.data;
  },

  /**
   * Sign up with email, password, and name
   */
  signup: async (data: SignupRequest): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>(AUTH_ENDPOINTS.SIGNUP, data);
    return response.data;
  },

  /**
   * Logout user
   * Note: No API endpoint for logout yet, just clears local state
   */
  logout: async (): Promise<void> => {
    // No API call needed for now
    // Just return successfully
    return Promise.resolve();
  },

  /**
   * Refresh access token
   */
  refreshToken: async (refreshToken: string): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>(AUTH_ENDPOINTS.REFRESH, {
      refresh_token: refreshToken,
    });
    return response.data;
  },

  /**
   * Get current user info
   */
  getCurrentUser: async (): Promise<AuthResponse> => {
    const response = await api.get<AuthResponse>(AUTH_ENDPOINTS.ME);
    return response.data;
  },

  /**
   * Request a password reset link
   */
  forgotPassword: async (
    email: string,
  ): Promise<{ success: boolean; message: string }> => {
    const response = await api.post<{ success: boolean; message: string }>(
      AUTH_ENDPOINTS.FORGOT_PASSWORD,
      null,
      { params: { email } },
    );
    return response.data;
  },

  /**
   * Reset password with key and login
   */
  resetPassword: async (
    data: ResetPasswordRequest,
  ): Promise<{ success: boolean; message: string }> => {
    const response = await api.post<{ success: boolean; message: string }>(
      AUTH_ENDPOINTS.RESET_PASSWORD,
      data,
    );
    return response.data;
  },

  /**
   * Save FCM device token for push notifications
   */
  saveFcmToken: async (token: string): Promise<void> => {
    try {
      await api.post(AUTH_ENDPOINTS.SAVE_FCM_TOKEN, { token: token });
    } catch (error) {
      // Non-fatal: don't block the user even if this fails
      debugError("Failed to save FCM token:", error);
    }
  },

  /**
   * Get all organizations for the current user
   */
  getOrganizations: async (): Promise<OrganizationsResponse> => {
    const response = await api.get<OrganizationsResponse>(
      AUTH_ENDPOINTS.GET_ORGANIZATIONS,
    );
    return response.data;
  },
};
