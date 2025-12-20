import LoginPage from "@/features/auth/pages/LoginPage";
import SignupPage from "@/features/auth/pages/SignupPage";
import HomePage from "@/features/home/pages/HomePage";
import { BrowserRouter, Routes, Route } from "react-router-dom";

const AppRoutes = () => { 

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage /> } />
        <Route path="/login" element={<LoginPage /> } />
        <Route path="/signup" element={<SignupPage /> } />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRoutes;
