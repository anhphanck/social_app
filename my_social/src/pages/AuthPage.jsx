import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import AuthCard from "../components/AuthCard";
import AuthInput from "../components/AuthInput";
import { useNavigate } from "react-router-dom";

export default function AuthPage({ setUser }) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const API_URL = "http://localhost:5000/api/users";
  const navigate = useNavigate();
  const transition = { duration: 0.6, ease: "easeInOut" };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      if (isLogin) {
        const res = await axios.post(`${API_URL}/login`, {
          email: formData.email,
          password: formData.password,
        });
        localStorage.setItem("user", JSON.stringify(res.data.user));
        setUser(res.data.user);  
        setMessage("Đăng nhập thành công!");
        navigate("/"); // sau này là HomePage
      } else {
        await axios.post(`${API_URL}/register`, {
          username: formData.username,
          email: formData.email,
          password: formData.password,
        });
        setMessage("Đăng ký thành công! Vui lòng đăng nhập.");
        setIsLogin(true);
      }
    } catch (err) {
      setMessage(
        err.response?.data?.error || "Lỗi kết nối tới server. Thử lại sau."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex justify-center items-center overflow-hidden bg-gradient-to-r from-sky-400 to-gray-300 relative">
      <motion.img
        src="/palm.png"
        alt="Palm"
        animate={{
          x: isLogin ? 350 : -350,
          rotate: [0, 2, -2, 0],
        }}
        transition={{
          x: { duration: 0.8, ease: "easeInOut" },
          rotate: { duration: 6, repeat: Infinity, ease: "easeInOut" },
        }}
        className="absolute -bottom-10 w-[350px] sm:w-[450px] mix-blend-multiply"
        style={{ transformOrigin: "100% 100%" }}
      />

      <AnimatePresence mode="wait">
        {isLogin ? (
          <motion.div
            key="login"
            initial={{ x: -200, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 200, opacity: 0 }}
            transition={transition}
            className="z-10"
          >
            <AuthCard
              title="Đăng nhập"
              footer={
                <button
                  onClick={() => setIsLogin(false)}
                  className="font-semibold text-sky-700 hover:underline"
                >
                  Tạo tài khoản mới
                </button>
              }
            >
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <AuthInput
                  label="Email"
                  name="email"
                  icon="user"
                  value={formData.email}
                  onChange={handleChange}
                />
                <AuthInput
                  label="Mật khẩu"
                  name="password"
                  type="password"
                  icon="lock"
                  value={formData.password}
                  onChange={handleChange}
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="mt-4 bg-gradient-to-r from-sky-400 to-sky-600 text-white py-2 rounded-full shadow-md hover:opacity-90 disabled:opacity-60"
                >
                  {loading ? "Đang xử lý..." : "Đăng nhập"}
                </button>
                {message && (
                  <p className="text-center text-sm text-red-600 mt-2">
                    {message}
                  </p>
                )}
              </form>
            </AuthCard>
          </motion.div>
        ) : (
          <motion.div
            key="register"
            initial={{ x: 200, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -200, opacity: 0 }}
            transition={transition}
            className="z-10"
          >
            <AuthCard
              title="Đăng ký"
              footer={
                <button
                  onClick={() => setIsLogin(true)}
                  className="font-semibold text-sky-700 hover:underline"
                >
                  Đã có tài khoản
                </button>
              }
            >
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <AuthInput
                  label="Tên người dùng"
                  name="username"
                  icon="id"
                  value={formData.username}
                  onChange={handleChange}
                />
                <AuthInput
                  label="Email"
                  name="email"
                  icon="user"
                  value={formData.email}
                  onChange={handleChange}
                />
                <AuthInput
                  label="Mật khẩu"
                  name="password"
                  type="password"
                  icon="lock"
                  value={formData.password}
                  onChange={handleChange}
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="mt-4 bg-gradient-to-r from-sky-400 to-sky-600 text-white py-2 rounded-full shadow-md hover:opacity-90 disabled:opacity-60"
                >
                  {loading ? "Đang xử lý..." : "Đăng ký"}
                </button>
                {message && (
                  <p className="text-center text-sm text-red-600 mt-2">
                    {message}
                  </p>
                )}
              </form>
            </AuthCard>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
