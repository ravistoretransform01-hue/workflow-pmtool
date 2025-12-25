import LoginPage from "@/features/auth/pages/LoginPage";
import SignupPage from "@/features/auth/pages/SignupPage";
import LandingPage from "@/features/landing/pages/LandingPage";
import HomePage from "@/features/home/pages/HomePage";
import { BrowserRouter, Routes, Route } from "react-router-dom";

const AppRoutes = () => { 

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage /> } />
        <Route path="/login" element={<LoginPage /> } />
        <Route path="/signup" element={<SignupPage /> } />
        <Route path="/home" element={<HomePage /> } />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRoutes;
