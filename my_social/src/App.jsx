import { useContext } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { UserContext } from "./context/UserContext";
import AuthPage from "./pages/AuthPage";
import HomePage from "./pages/HomePage";
import DocumentsPage from "./pages/DocumentsPage";
import TasksPage from "./pages/TasksPage";
import MeetingPage from "./pages/MeetingPage";
import ProfilePage from "./pages/ProfilePage";

export default function App() {
  const { user, loadingUser } = useContext(UserContext);

  if (loadingUser) return <div className="h-screen flex justify-center items-center">Loading...</div>;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={user ? <HomePage /> : <Navigate to="/auth" replace />} />
        <Route path="/auth" element={!user ? <AuthPage /> : <Navigate to="/" replace />} />
        <Route path="/documents" element={user ? <DocumentsPage /> : <Navigate to="/auth" replace />} />
        <Route path="/meeting" element={user ? <MeetingPage /> : <Navigate to="/auth" replace />} />
        <Route path="/tasks" element={user ? (user.role === 'admin' ? <TasksPage /> : <Navigate to="/" replace />) : <Navigate to="/auth" replace />} />
        <Route path="/profile" element={user ? <ProfilePage /> : <Navigate to="/auth" replace />} />
        <Route path="/profile/:id" element={user ? <ProfilePage /> : <Navigate to="/auth" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
