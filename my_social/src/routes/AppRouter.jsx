import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AuthPage from "../pages/AuthPage";
import HomePage from "../pages/HomePage";
import { useState, useEffect } from "react";

export default function AppRouter() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Load user từ localStorage khi component mount
    const savedUser = localStorage.getItem("user");
    if (savedUser) setUser(JSON.parse(savedUser));
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={user ? <HomePage user={user} setUser={setUser} /> : <Navigate to="/auth" />}
        />
        <Route
          path="/auth"
          element={!user ? <AuthPage setUser={setUser} /> : <Navigate to="/" />}
        />
      </Routes>
    </BrowserRouter>
  );
}
