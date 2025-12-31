import { useDispatch, useSelector } from "react-redux";
import { useCallback } from "react";
import type { RootState, AppDispatch } from "@/app/store";
import { loginThunk, signupThunk, logoutThunk } from "@/features/auth/authThunks";
import { clearError, setUser } from "@/features/auth/authSlice";
import type { LoginRequest, SignupRequest } from "@/features/auth/types";
import { userApi } from "@/features/auth/userAPI";

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

  const fetchUserMeta = useCallback(
    async () => {
      try {
        const userMeta = await userApi.getUserMeta();
        
        // Update user with meta data
        if (user) {
          const updatedUser = {
            ...user,
            email: userMeta.email,
            phone: userMeta.phone,
            mobile_phone: userMeta.mobile_phone,
            location: userMeta.location,
          };
          dispatch(setUser(updatedUser));
        }
        
        return userMeta;
      } catch (error) {
        console.error("Failed to fetch user meta:", error);
        throw error;
      }
    },
    [dispatch, user]
  );

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
    fetchUserMeta,
  };
};
