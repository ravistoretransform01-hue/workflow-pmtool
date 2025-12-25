import { createAsyncThunk } from "@reduxjs/toolkit";
import { authApi } from "./authApi";
import type { LoginRequest, SignupRequest, AuthResponse } from "./types";

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
    return rejectWithValue(
      error.response?.data?.message || "Login failed. Please try again."
    );
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
    return rejectWithValue(
      error.response?.data?.message || "Signup failed. Please try again."
    );
  }
});

export const logoutThunk = createAsyncThunk<
  void,
  void,
  {
    rejectValue: string;
  }
>("auth/logout", async (_, { rejectWithValue }) => {
  try {
    await authApi.logout();
  } catch (error: any) {
    return rejectWithValue(
      error.response?.data?.message || "Logout failed."
    );
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
      error.response?.data?.message || "Token refresh failed."
    );
  }
});
