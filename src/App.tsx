import { TooltipProvider } from "@/shared/components/ui/tooltip";
import { SidebarProvider } from "@/shared/components/ui/sidebar";
import { AppSidebar } from "@/shared/components/AppSidebar";
import { Header } from "@/shared/components/Header";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Pages
import LoginPage from "@/features/auth/pages/LoginPage";
import SignupPage from "@/features/auth/pages/SignupPage";
import LandingPage from "@/features/landing/pages/LandingPage";
import HomePage from "@/features/home/pages/HomePage";
// import NotFound from "@/pages/NotFound";

const App = () => (
  <TooltipProvider>
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        {/* Protected Routes with Layout */}
        <Route
          path="/*"
          element={
            <SidebarProvider defaultOpen={true}>
              <div className="min-h-screen flex w-full">
                <AppSidebar />
                <div className="flex-1 flex flex-col">
                  {/* <Header /> */}
                  <main className="flex-1 overflow-auto">
                    <Routes>
                      <Route path="/home" element={<HomePage />} />
                      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                      {/* <Route path="*" element={<NotFound />} /> */}
                    </Routes>
                  </main>
                </div>
              </div>
            </SidebarProvider>
          }
        />
      </Routes>
    </BrowserRouter>
  </TooltipProvider>
);

export default App;
