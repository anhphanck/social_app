import { FaUser, FaLock, FaIdCard } from "react-icons/fa";

const icons = { user: <FaUser />, lock: <FaLock />, id: <FaIdCard /> };

export default function AuthInput({ label, type = "text", icon }) {
  return (
    <div className="w-full">
      <label className="text-sm font-medium">{label}</label>
      <div className="flex items-center border-b border-gray-400 mt-1 pb-1">
        <input
          type={type}
          className="flex-1 bg-transparent outline-none px-2 text-sm"
        />
        <span className="text-gray-600">{icons[icon]}</span>
      </div>
    </div>
  );
}
