import { useNavigate } from "react-router-dom";
import { useContext } from "react";
import { UserContext } from "../context/UserContext";

export default function Sidebar() {
  const navigate = useNavigate();
  const { taskNotifCount } = useContext(UserContext);
  const items = [
    { icon: "🏠", label: "Trang chủ", path: "/" },
    { icon: "📄", label: "Tài liệu lớp học", path: "/documents" },
    { icon: "📝", label: "Task", path: "/tasks" },
    // { icon: "💼", label: "Cuộc họp", path: "/meeting" }
  ];

  return (
    <div className="w-full bg-white shadow-md h-full p-4">
      <ul className="space-y-3">
        {items.map((item, i) => (
          <li
            key={i}
            className="flex items-center justify-between cursor-pointer hover:bg-sky-100 p-2 rounded-md"
            onClick={() => navigate(item.path)}
          >
            <div className="flex items-center space-x-3">
              <span>{item.icon}</span>
              <span className="text-sm font-medium">{item.label}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
