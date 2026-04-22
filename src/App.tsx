import { useEffect, useState } from "react";
import devtools from "devtools-detect";
import { Toaster as Sonner } from "sonner";
import { TooltipProvider } from "@/shared/components/ui/tooltip";
import ToasterFromUseToast from "@/shared/components/ToasterFromUseToast";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { TestUserProvider } from "@/contexts/TestUserContext";
import {
  ProtectedRoute,
  ProtectedLayout,
} from "@/shared/components/ProtectedRoute";
import { getFirebaseMessaging, onMessage } from "@/lib/firebase";

// Pages
import LoginPage from "@/features/auth/pages/LoginPage";
import SignupPage from "@/features/auth/pages/SignupPage";
import ForgotPasswordPage from "./features/auth/pages/ForgotPasswordPage";
import ResetPasswordPage from "./features/auth/pages/ResetPasswordPage";
import LandingPage from "@/features/landing/pages/LandingPage";
import HomePage from "@/features/home/pages/HomePage";
import MyWork from "@/pages/MyWork";
import MyTeam from "@/pages/MyTeam";
import AllItems from "@/pages/AllItems";
import MyHabits from "@/pages/MyHabits";
import MembersPage from "@/pages/MembersPage";
import DynamicWorkspace from "@/pages/DynamicWorkspace";
import DynamicBoard from "@/pages/DynamicBoard";
import BoardDashboardPage from "@/pages/BoardDashboardPage";
import DocumentEditor from "@/pages/DocumentEditor";
import NotFound from "@/pages/NotFound";

// import { io } from "socket.io-client";
import { useAppSelector } from "./app/hooks";

const RootPathRedirect = () => {
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);

  if (isAuthenticated && user?.organization_id) {
    return <Navigate to={`/org/${user.organization_id}/home`} replace />;
  }

  return <LandingPage />;
};

const App = () => {
  // socket.io code
  // useEffect(() => {
  //   // 2. Connect to your Buzzer Server
  //   const socket = io("http://35.225.58.131:4000");
  //   socket.on("connect", () => {
  //     console.log("🟢 BEEP! Connected to Buzzer");
  //   });
  //   // 3. The "Ring the Bell" Listener
  //   socket.on("data_changed", (data) => {
  //     console.log("⚡ Signal received from Node.js:", data);

  //     // FOR NOW: Just refresh the whole page
  //     window.location.reload();
  //   });
  //   return () => {
  //     socket.disconnect();
  //   };
  // }, []);
  const [isDevOpen, setIsDevOpen] = useState(devtools.isOpen);

  useEffect(() => {
    const handleChange = (event: any) => {
      const open = event.detail.isOpen;
      setIsDevOpen(open);

      if (open) {
        // Optional: clear some sensitive state if needed
      } else {
        // Reload on close to restore app state safely
        window.location.reload();
      }
    };

    window.addEventListener("devtoolschange", handleChange);
    return () => window.removeEventListener("devtoolschange", handleChange);
  }, []);

  // Show foreground push notifications as Sonner toasts while the tab is open
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    getFirebaseMessaging().then((msg) => {
      if (!msg) return; // unsupported browser / non-secure context
      unsubscribe = onMessage(msg, (payload) => {
        const url = payload.data?.url;

        if (Notification.permission === "granted") {
          const notification = new Notification(
            payload.notification?.title || "New Notification",
            {
              body: payload.notification?.body,
              icon: "/favicon.png",
            },
          );

          notification.onclick = (event) => {
            event.preventDefault();
            if (url) {
              window.open(url, "_blank");
            }
            notification.close();
          };
        }
      });
    });

    return () => unsubscribe?.();
  }, []);

  if (
    isDevOpen &&
    (import.meta.env.PROD ||
      import.meta.env.VITE_FORCE_DEVTOOLS_PROTECTION === "true")
  ) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#0f172a] text-white p-10 text-center font-sans">
        <div className="w-20 h-20 bg-blue-600/20 rounded-full flex items-center justify-center mb-8 animate-pulse">
          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
            </svg>
          </div>
        </div>
        <h1 className="text-4xl font-bold mb-4 tracking-tight">
          Security Access Restricted
        </h1>
        <p className="text-slate-400 max-w-md text-lg leading-relaxed">
          For security reasons, this application cannot be used while Developer
          Tools are open. Please close the console to continue.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-10 px-8 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 active:scale-95"
        >
          Refresh App
        </button>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Sonner />
      <ToasterFromUseToast />
      <BrowserRouter>
        <TestUserProvider>
          {/* <WorkspaceProvider> */}
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<RootPathRedirect />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            <Route element={<ProtectedRoute />}>
              <Route element={<ProtectedLayout />}>
                <Route path="org/:orgId">
                  <Route path="home" element={<HomePage />} />
                  <Route path="my-work" element={<MyWork />} />
                  <Route path="my-team" element={<MyTeam />} />
                  <Route path="all-items" element={<AllItems />} />
                  <Route path="my-habits" element={<MyHabits />} />
                  <Route path="members" element={<MembersPage />} />

                  <Route
                    path="workspace/:workspaceId"
                    element={<DynamicWorkspace />}
                  />
                  <Route path="board/:boardId" element={<DynamicBoard />} />
                  <Route
                    path="board/:boardId/view/:viewName"
                    element={<DynamicBoard />}
                  />
                  <Route
                    path="board/:boardId/view"
                    element={<DynamicBoard />}
                  />
                  <Route
                    path="board/:boardId/dashboard"
                    element={<BoardDashboardPage />}
                  />
                  <Route
                    path="workspace/:workspaceId/doc/:documentId"
                    element={<DocumentEditor />}
                  />
                </Route>

                <Route path="*" element={<NotFound />} />
              </Route>
            </Route>
          </Routes>
          {/* </WorkspaceProvider> */}
        </TestUserProvider>
      </BrowserRouter>
    </TooltipProvider>
  );
};
export default App;

// import { useEffect } from "react";
// import { TooltipProvider } from "@/shared/components/ui/tooltip";
// import { BrowserRouter, Routes, Route } from "react-router-dom";
// import { SidebarProvider } from "@/shared/components/ui/sidebar";
// import { AppSidebar } from "@/shared/components/AppSidebar";
// import { Header } from "@/shared/components/Header";
// import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
// import { TestUserProvider } from "@/contexts/TestUserContext";
// import { ProtectedRoute } from "@/shared/components/ProtectedRoute";

// // Pages
// import LoginPage from "@/features/auth/pages/LoginPage";
// import SignupPage from "@/features/auth/pages/SignupPage";
// import LandingPage from "@/features/landing/pages/LandingPage";
// import HomePage from "@/features/home/pages/HomePage";
// import MyWork from "@/pages/MyWork";
// import MyTeam from "@/pages/MyTeam";
// import AllItems from "@/pages/AllItems";
// import MyHabits from "@/pages/MyHabits";
// import DynamicWorkspace from "@/pages/DynamicWorkspace";
// import DynamicBoard from "@/pages/DynamicBoard";
// import BoardDashboardPage from "@/pages/BoardDashboardPage";
// import DocumentEditor from "@/pages/DocumentEditor";
// import NotFound from "@/pages/NotFound";

// const App = () => (
//   <TooltipProvider>
//     <Sonner />
//     <BrowserRouter>
//       <TestUserProvider>
//         <WorkspaceProvider>
//           <Routes>
//             {/* Public Routes */}
//             <Route path="/" element={<LandingPage />} />
//             <Route path="/login" element={<LoginPage />} />
//             <Route path="/signup" element={<SignupPage />} />

//             {/* Protected Routes with Layout */}
//             <Route
//               path="/*"
//               element={
//                 <ProtectedRoute>
//                   <SidebarProvider defaultOpen={true} className="flex">
//                     <div className="min-h-screen flex w-full">
//                       <AppSidebar />
//                       <div className="flex-1 flex flex-col">
//                         <Header />
//                         <main className="flex-1 overflow-auto">
//                           <Routes>
//                             <Route path="/home" element={<HomePage />} />
//                             <Route path="/my-work" element={<MyWork />} />
//                             <Route path="/my-team" element={<MyTeam />} />
//                             <Route path="/all-items" element={<AllItems />} />
//                             <Route path="/my-habits" element={<MyHabits />} />
//                             <Route path="/workspace/:workspaceId" element={<DynamicWorkspace />} />
//                             <Route path="/workspace/:workspaceId/board/:boardId" element={<DynamicBoard />} />
//                             <Route path="/workspace/:workspaceId/board/:boardId/dashboard" element={<BoardDashboardPage />} />
//                             <Route path="/workspace/:workspaceId/doc/:documentId" element={<DocumentEditor />} />
//                             {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
//                             <Route path="*" element={<NotFound />} />
//                           </Routes>
//                         </main>
//                       </div>
//                     </div>
//                   </SidebarProvider>
//                 </ProtectedRoute>
//               }
//             />
//           </Routes>
//         </WorkspaceProvider>
//       </TestUserProvider>
//     </BrowserRouter>
//   </TooltipProvider>
// );

// export default App;
