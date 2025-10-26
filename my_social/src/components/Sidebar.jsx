export default function Sidebar() {
  const items = [
    { icon: "📄", label: "Tài liệu" },
    { icon: "🎬", label: "Video" },
    { icon: "📷", label: "Ảnh" },
    { icon: "👥", label: "Nhóm" },
    { icon: "📅", label: "Sự kiện" },
    { icon: "💼", label: "Cuộc họp" },
  ];

  return (
    <div className="w-68 bg-white shadow-md h-screen p-4">
      <ul className="space-y-3">
        {items.map((item, i) => (
          <li
            key={i}
            className="flex items-center space-x-3 cursor-pointer hover:bg-sky-100 p-2 rounded-md"
          >
            <span>{item.icon}</span>
            <span className="text-sm font-medium">{item.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
