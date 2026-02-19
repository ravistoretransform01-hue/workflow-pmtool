import { Toaster as Sonner } from "sonner";
import { TooltipProvider } from "@/shared/components/ui/tooltip";
import ToasterFromUseToast from "@/shared/components/ToasterFromUseToast";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { TestUserProvider } from "@/contexts/TestUserContext";
import { ProtectedRoute,  ProtectedLayout} from "@/shared/components/ProtectedRoute";

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

const App = () => (
  <TooltipProvider>
    <Sonner />
    <ToasterFromUseToast />
    <BrowserRouter>
      <TestUserProvider>
        {/* <WorkspaceProvider> */}
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<ProtectedLayout />}>
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
                path="board/:boardId/dashboard"
                element={<BoardDashboardPage />}
              />
              <Route
                path="workspace/:workspaceId/doc/:documentId"
                element={<DocumentEditor />}
              />

              <Route path="*" element={<NotFound />} />
            </Route>
          </Route>
        </Routes>
        {/* </WorkspaceProvider> */}
      </TestUserProvider>
    </BrowserRouter>
  </TooltipProvider>
);

export default App;

// import { Toaster as Sonner } from "sonner";
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
