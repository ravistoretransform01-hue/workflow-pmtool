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

import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { SidebarProvider } from "@/shared/components/ui/sidebar";
import { AppSidebar } from "@/shared/components/AppSidebar";
import { Header } from "@/shared/components/Header";
import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { setUser } from "@/features/auth/authSlice";
import type { AppDispatch } from "@/app/store";
import type { User } from "@/features/auth/types";

function ProtectedRoute() {
  const { isAuthenticated, user } = useAuth();
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
          <main className="flex-1 overflow-hidden">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

export { ProtectedRoute, ProtectedLayout };