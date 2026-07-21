// import { Navigate } from 'react-router-dom';
// import { useAuth } from '@/hooks/useAuth';

// interface ProtectedRouteProps {
//   children: React.ReactNode;
// }

// export function ProtectedRoute({ children }: ProtectedRouteProps) {
//   const { isAuthenticated } = useAuth();

//   // Check if user is logged in
//   if (!isAuthenticated) {
//     return <Navigate to="/login" replace />;
//   }

//   return <>{children}</>;
// }

import { Navigate, Outlet, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { SidebarProvider } from "@/shared/ui/sidebar";
import { AppSidebar } from "@/shared/layouts/AppSidebar";
import { Header } from "@/shared/layouts/Header";
import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { setUser, switchOrganization } from "@/features/auth/services/authSlice";
import type { AppDispatch } from "@/store";
import type { User } from "@/features/auth/types/types";

function ProtectedRoute() {
  const { isAuthenticated, user } = useAuth();
  const { orgId } = useParams<{ orgId: string }>();
  const dispatch = useDispatch<AppDispatch>();

  // Restore user data from localStorage on app load if user is not in Redux
  useEffect(() => {
    if (isAuthenticated && !user) {
      const userData = localStorage.getItem("user_data");
      if (userData) {
        try {
          const parsedUser = JSON.parse(userData) as User;
          dispatch(setUser(parsedUser));
        } catch (e) {
          console.error("Failed to parse user data from localStorage:", e);
        }
      }
    }
  }, [isAuthenticated, user, dispatch]);

  // Synchronize organization ID from URL if it exists and differs from current user state
  // This ensures the current tab always prioritizes its own URL
  useEffect(() => {
    if (isAuthenticated && user && orgId) {
      const urlOrgId = parseInt(orgId, 10);
      if (!isNaN(urlOrgId) && user.organization_id !== urlOrgId) {
        // Verify if user is actually a member of this organization
        const isMember = user.organizations?.some(
          (org) => org.organization_id === urlOrgId
        );

        if (isMember) {
          dispatch(switchOrganization(urlOrgId));
        }
      }
    }
  }, [isAuthenticated, user?.organization_id, orgId, dispatch]);

  // Listen for localStorage changes from other tabs to keep Redux in sync
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "user_data" && e.newValue) {
        try {
          const parsedUser = JSON.parse(e.newValue) as User;
          // Only update if the user_id matches (to avoid cross-user issues)
          // but allow the organization_id to be updated via Redux
          if (user && parsedUser.user_id === user.user_id) {
            // Check if we need to force a re-sync with our URL
            const urlOrgId = orgId ? parseInt(orgId, 10) : null;
            if (urlOrgId && !isNaN(urlOrgId) && parsedUser.organization_id !== urlOrgId) {
               // The storage changed but it doesn't match THIS tab's URL
               // The URL sync effect above will handle switching it back to what THIS tab needs
               return;
            }
            dispatch(setUser(parsedUser));
          }
        } catch (err) {
          console.error("Failed to sync state from storage event:", err);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [user, orgId, dispatch]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

 function ProtectedLayout() {
  return (
    <SidebarProvider defaultOpen className="flex h-screen overflow-hidden">
      <div className="flex w-full h-full overflow-hidden">
        <AppSidebar />
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto custom-scrollbar">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

export { ProtectedRoute, ProtectedLayout };