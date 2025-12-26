import { useDispatch, useSelector } from "react-redux";
import { useCallback } from "react";
import type { RootState, AppDispatch } from "@/app/store";
import { loginThunk, signupThunk, logoutThunk } from "@/features/auth/authThunks";
import { clearError } from "@/features/auth/authSlice";
import type { LoginRequest, SignupRequest } from "@/features/auth/types";

export const useAuth = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user, token, loading, error, isAuthenticated } = useSelector(
    (state: RootState) => state.auth
  );

  const login = useCallback(
    async (credentials: LoginRequest) => {
      const result = await dispatch(loginThunk(credentials));
      return result;
    },
    [dispatch]
  );

  const signup = useCallback(
    async (data: SignupRequest) => {
      const result = await dispatch(signupThunk(data));
      return result;
    },
    [dispatch]
  );

  const logout = useCallback(async () => {
    const result = await dispatch(logoutThunk());
    return result;
  }, [dispatch]);

  const clearAuthError = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);

  return {
    user,
    token,
    loading,
    error,
    isAuthenticated,
    login,
    signup,
    logout,
    clearAuthError,
  };
};
