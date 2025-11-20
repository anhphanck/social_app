import { useContext } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { UserContext } from "../context/UserContext";
import AuthPage from "../pages/AuthPage";
import HomePage from "../pages/HomePage";

export default function AppRouter() {
  const { user, loadingUser } = useContext(UserContext);

  if (loadingUser) return <div className="h-screen flex justify-center items-center">Loading...</div>;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={user ? <HomePage /> : <Navigate to="/auth" replace />} />
        <Route path="/auth" element={!user ? <AuthPage /> : <Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
