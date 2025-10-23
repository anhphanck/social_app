import { BrowserRouter, Routes, Route } from "react-router-dom";
import AuthPage from "../pages/AuthPage";
import HomePage from "../pages/HomePage"; // bạn có thể tạo sau này

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Trang đăng nhập/đăng ký */}
        <Route path="/" element={<AuthPage />} />

        {/* Sau này khi đăng nhập xong, chuyển sang Home */}
        <Route path="/home" element={<HomePage />} />
      </Routes>
    </BrowserRouter>
  );
}
