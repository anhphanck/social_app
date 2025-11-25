import { useContext } from "react";
import { UserContext } from "../context/UserContext";
import Chat from "./Chat";

export default function Rightbar({ users }) {
  const { setCurrentChatId, unreadCounts, onlineUsers, setUnreadCounts } = useContext(UserContext);

  return (
    <div className="w-72 p-4 space-y-4 flex-1 bg-white mt-2 ">

      <div className="bg-white shadow-sm p-3 rounded-md h-50">
        <h3 className="font-semibold text-sky-700 mb-2">📌 Bài viết đã ghim</h3>
        <div className="text-sm text-gray-700">user1: Xin chào mọi người!</div>
      </div>
      
      <div className="bg-white shadow-sm p-3 rounded-md h-35">
        <h3 className="font-semibold text-sky-700 mb-2">🟢 Bạn bè đang online</h3>
        {(() => {
          const onlineList = users.filter((u) => onlineUsers && onlineUsers.has && onlineUsers.has(String(u.id)));
          if (!onlineList || onlineList.length === 0) return <div className="text-sm text-gray-500">Không có bạn nào đang online</div>;
          return onlineList.slice(0, 4).map((u) => (
            <div key={u.id} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="text-sm">🟢 {u.username}</div>
                {unreadCounts && unreadCounts[String(u.id)] > 0 && (
                  <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded">{unreadCounts[String(u.id)]}</span>
                )}
              </div>
              <button onClick={() => { setCurrentChatId(u.id); try { setUnreadCounts((prev) => ({ ...prev, [String(u.id)]: 0 })); } catch(e){} }} className="text-xs text-sky-600">Chat</button>
            </div>
          ));
        })()}
      </div>

      <div className="bg-white shadow-sm p-3 rounded-md max-h-64 overflow-y-auto">
        <h3 className="font-semibold text-sky-700 mb-2">👥 Tất cả người dùng</h3>
        {users.map((u) => (
          <div key={u.id} className="flex items-center justify-between mb-1">
            <div className="text-sm text-gray-800">• {u.username}</div>
            <div className="flex items-center gap-2">
              {unreadCounts[String(u.id)] > 0 && (
                <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded">{unreadCounts[String(u.id)]}</span>
              )}
              <button onClick={() => setCurrentChatId(u.id)} className="text-xs text-sky-600">Chat</button>
            </div>
          </div>
        ))}
      </div>
      <Chat users={users} />
    </div>
  );
}
