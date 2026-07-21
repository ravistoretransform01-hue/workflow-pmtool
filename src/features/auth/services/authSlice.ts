import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { type AuthState, type User } from "@/features/auth/types/types";
import {
  loginThunk,
  signupThunk,
  logoutThunk,
  refreshTokenThunk,
} from "@/features/auth/services/authThunks";
import { clearCMSCache } from "@/features/cms/services/cmsStorage";
import { debugLog } from "@/utils/debugLog";

const getUserFromStorage = (): User | null => {
  try {
    const userData = localStorage.getItem("user_data");
    return userData ? JSON.parse(userData) : null;
  } catch (e) {
    return null;
  }
};

const initialState: AuthState = {
  user: getUserFromStorage(),
  token: localStorage.getItem("access_token"),
  refreshToken: localStorage.getItem("refresh_token"),
  loading: false,
  error: null,
  isAuthenticated: !!localStorage.getItem("access_token"),
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    // Clear error
    clearError: (state) => {
      state.error = null;
    },
    // Logout
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.error = null;
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("user_id");
      localStorage.removeItem("user_data");
      clearCMSCache();
      localStorage.clear();
    },
    // Set user
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      localStorage.setItem("user_data", JSON.stringify(action.payload));
    },
    // Switch Organization
    switchOrganization: (state, action: PayloadAction<number>) => {
      if (state.user) {
        state.user.organization_id = action.payload;
        
        // Update role if available in organization list
        const orgInfo = state.user.organizations?.find(
          (o) => o.organization_id === action.payload
        );
        if (orgInfo) {
          state.user.role_id = orgInfo.role_id;
          state.user.role_label = orgInfo.role_label;
        }
        
        localStorage.setItem("user_data", JSON.stringify(state.user));
        
        // Clear cache but don't reload here as we'll handle navigation in components
        clearCMSCache();
      }
    },
  },
  extraReducers: (builder) => {
    // Login
    builder
      .addCase(loginThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.access_token;
        state.refreshToken = action.payload.refresh_token;
        state.isAuthenticated = true;
        localStorage.setItem("access_token", action.payload.access_token);
        localStorage.setItem("refresh_token", action.payload.refresh_token);
        localStorage.setItem("user_id", String(action.payload.user.user_id));
        localStorage.setItem("user_data", JSON.stringify(action.payload.user));
        
        // Log token expiration info
        try {
          const parts = action.payload.access_token.split(".");
          const payload = JSON.parse(atob(parts[1]));
          const exp = new Date(payload.exp * 1000);
          const now = new Date();
          const expiresIn = Math.round((exp.getTime() - now.getTime()) / 1000);
          debugLog("🔐 Login successful!");
          debugLog("⏰ Token expires in:", expiresIn + "s");
          debugLog("📅 Token expires at:", exp.toLocaleString());
        } catch (e) {
          debugLog("Could not decode token expiration");
        }
      })
      .addCase(loginThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Login failed";
        state.isAuthenticated = false;
      });

    // Signup
    builder
      .addCase(signupThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(signupThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.access_token;
        state.refreshToken = null;
        state.isAuthenticated = true;
        localStorage.setItem("access_token", action.payload.access_token);
      })
      .addCase(signupThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Signup failed";
        state.isAuthenticated = false;
      });

    // Logout
    builder
      .addCase(logoutThunk.pending, (state) => {
        state.loading = true;
      })
      .addCase(logoutThunk.fulfilled, (state) => {
        state.loading = false;
        state.user = null;
        state.token = null;
        state.refreshToken = null;
        state.isAuthenticated = false;
        state.error = null;
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("user_id");
        localStorage.removeItem("user_data");
        // Ensure CMS cache is cleared on async logout
        clearCMSCache();
        localStorage.clear();
      })
      .addCase(logoutThunk.rejected, (state) => {
        state.loading = false;
        // Still logout even if API call fails
        state.user = null;
        state.token = null;
        state.refreshToken = null;
        state.isAuthenticated = false;
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("user_id");
        localStorage.removeItem("user_data");
      });

    // Refresh Token
    builder
      .addCase(refreshTokenThunk.fulfilled, (state, action) => {
        state.token = action.payload.access_token;
        state.user = action.payload.user;
        localStorage.setItem("access_token", action.payload.access_token);
      })
      .addCase(refreshTokenThunk.rejected, (state) => {
        // If refresh fails, logout user
        state.user = null;
        state.token = null;
        state.refreshToken = null;
        state.isAuthenticated = false;
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("user_id");
        localStorage.removeItem("user_data");
      });
  },
});

export const { clearError, logout, setUser, switchOrganization } = authSlice.actions;
export default authSlice.reducer;
