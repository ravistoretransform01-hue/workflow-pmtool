import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { type AuthState, type User } from "./types";
import {
  loginThunk,
  signupThunk,
  logoutThunk,
  refreshTokenThunk,
} from "./authThunks";

const initialState: AuthState = {
  user: null,
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
    },
    // Set user
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
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
        
        // Log token expiration info
        try {
          const parts = action.payload.access_token.split('.');
          const payload = JSON.parse(atob(parts[1]));
          const exp = new Date(payload.exp * 1000);
          const now = new Date();
          const expiresIn = Math.round((exp.getTime() - now.getTime()) / 1000);
          console.log("🔐 Login successful!");
          console.log("⏰ Token expires in:", expiresIn + "s");
          console.log("📅 Token expires at:", exp.toLocaleString());
        } catch (e) {
          console.log("Could not decode token expiration");
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
      });
  },
});

export const { clearError, logout, setUser } = authSlice.actions;
export default authSlice.reducer;
