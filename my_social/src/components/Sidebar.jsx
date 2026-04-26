import { useNavigate } from "react-router-dom";
import { useContext } from "react";
import { UserContext } from "../context/UserContext";

export default function Sidebar({ className = "", onNavigate }) {
  const navigate = useNavigate();
  const { taskNotifCount } = useContext(UserContext);
  const items = [
    { icon: "🏠", label: "Trang chủ", path: "/" },
    { icon: "📄", label: "Tài liệu lớp học", path: "/documents" },
    { icon: "📝", label: "Nhiệm vụ", path: "/tasks" },
  ];

  return (
    <div className={`w-full bg-white shadow-md h-full p-4 ${className}`}>
      <ul className="space-y-3">
        {items.map((item, i) => (
          <li
            key={i}
            className="flex items-center justify-between cursor-pointer hover:bg-sky-100 p-2 rounded-md"
            onClick={() => {
              navigate(item.path);
              onNavigate && onNavigate();
            }}
          >
            <div className="flex items-center space-x-3">
              <span>{item.icon}</span>
              <span className="text-sm font-medium">{item.label}</span>
            </div>
            {}
          </li>
        ))}
      </ul>
    </div>
  );
}
