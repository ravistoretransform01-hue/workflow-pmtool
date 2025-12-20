import LoginPage from "@/features/auth/pages/LoginPage";
import HomePage from "@/features/home/pages/HomePage";
import { BrowserRouter, Routes, Route } from "react-router-dom";

const AppRoutes = () => { 

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage /> } />
        <Route path="/login" element={<LoginPage /> } />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRoutes;
