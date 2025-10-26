export default function Rightbar({ users }) {
  return (
    <div className="w-72 p-4 space-y-4 flex-1 bg-white mt-2 ">
      {/* Bài viết đã ghim */}
      <div className="bg-white shadow-sm p-3 rounded-md h-50">
        <h3 className="font-semibold text-sky-700 mb-2">📌 Bài viết đã ghim</h3>
        <div className="text-sm text-gray-700">user1: Xin chào mọi người!</div>
      </div>

      {/* Bạn bè online */}
      <div className="bg-white shadow-sm p-3 rounded-md h-35">
        <h3 className="font-semibold text-sky-700 mb-2">🟢 Bạn bè đang online</h3>
        {users.slice(0, 2).map((u) => (
          <p key={u.id} className="text-sm">🟢 {u.username}</p>
        ))}
      </div>

      {/* Tất cả người dùng */}
      <div className="bg-white shadow-sm p-3 rounded-md max-h-64 overflow-y-auto">
        <h3 className="font-semibold text-sky-700 mb-2">👥 Tất cả người dùng</h3>
        {users.map((u) => (
          <p key={u.id} className="text-sm text-gray-800 mb-1">• {u.username}</p>
        ))}
      </div>
    </div>
  );
}
