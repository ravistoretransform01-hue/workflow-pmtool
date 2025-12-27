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

 function ProtectedRoute() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

 function ProtectedLayout() {
  return (
    <SidebarProvider defaultOpen className="flex">
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <Header />
          <main className="flex-1 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

export { ProtectedRoute, ProtectedLayout };