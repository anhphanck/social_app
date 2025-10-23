import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AuthCard from "../components/AuthCard";
import AuthInput from "../components/AuthInput";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);

  const transition = { duration: 0.6, ease: "easeInOut" };

  return (
    <div className="min-h-screen flex justify-center items-center overflow-hidden bg-gradient-to-r from-sky-400 to-gray-300 relative">
      {/* Cây dừa */}
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

      {/* Form chuyển động */}
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
              <form className="flex flex-col gap-4">
                <AuthInput label="Tài khoản" icon="user" />
                <AuthInput label="Mật khẩu" type="password" icon="lock" />
                <button
                  type="submit"
                  className="mt-4 bg-gradient-to-r from-sky-400 to-sky-600 text-white py-2 rounded-full shadow-md hover:opacity-90"
                >
                  Đăng nhập
                </button>
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
              <form className="flex flex-col gap-4">
                <AuthInput label="Tên người dùng" icon="id" />
                <AuthInput label="Tài khoản" icon="user" />
                <AuthInput label="Mật khẩu" type="password" icon="lock" />
                <button
                  type="submit"
                  className="mt-4 bg-gradient-to-r from-sky-400 to-sky-600 text-white py-2 rounded-full shadow-md hover:opacity-90"
                >
                  Đăng ký
                </button>
              </form>
            </AuthCard>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
