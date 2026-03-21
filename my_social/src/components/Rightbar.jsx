import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../context/UserContext";
import Chat from "./Chat";
import axios from "axios";

export default function Rightbar({ users = [], pinnedPosts = [], onUnpin }) {
  const navigate = useNavigate();
  const { setCurrentChatId, unreadCounts, onlineUsers, setUnreadCounts, user } =
    useContext(UserContext);

  const [avatarUrls, setAvatarUrls] = useState({});
  const API_URL = "http://localhost:5000/api";

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!users.length) return;

      const next = {};
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const fetches = users.map(async (u) => {
        if (!u) return;

        if (u.avatar) {
          next[u.id] = u.avatar.startsWith("http")
            ? u.avatar
            : `http://localhost:5000/uploads/${u.avatar}`;
          return;
        }

        try {
          const res = await axios.get(`${API_URL}/users/${u.id}`, { headers });
          const url = res?.data?.avatar_url || null;
          if (url) next[u.id] = url;
        } catch (err) {
          console.log(err);
        }
      });

      await Promise.all(fetches);

      if (!cancelled) setAvatarUrls(next);
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [users]);

  const scrollToPost = (id) => {
    const el = document.getElementById(`post-${id}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const onlineList = users.filter(
    (u) => onlineUsers && onlineUsers.has(String(u.id))
  );

  return (
    <div className="w-72 p-4 space-y-4 bg-white rounded-md shadow-sm">
      
      {/* PINNED POSTS */}
      <div className="bg-white shadow-sm p-3 rounded-md max-h-60 overflow-y-auto">
        <h3 className="font-semibold text-sky-700 mb-2">📌 Bài viết đã ghim</h3>

        {!pinnedPosts.length && (
          <div className="text-sm text-gray-500">
            Chưa có bài viết nào được ghim
          </div>
        )}

        {pinnedPosts.map((post) => (
          <div
            key={post.id}
            className="border border-gray-100 rounded-md p-2 mb-2 text-sm cursor-pointer hover:bg-gray-50"
            onClick={() => scrollToPost(post.id)}
          >
            <div className="font-semibold text-gray-800 line-clamp-1">
              {post.username}
            </div>

            <div className="text-gray-600 mt-1 line-clamp-2">
              {post.content || "Không có nội dung"}
            </div>

            <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
              <span>
                {post.created_at
                  ? new Date(post.created_at).toLocaleString("vi-VN")
                  : ""}
              </span>

              {(user?.role === "admin" || user?.role === "teacher") && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm("Bạn có chắc muốn gỡ ghim?")) {
                      onUnpin?.(post.id);
                    }
                  }}
                  className="text-red-500 hover:underline"
                >
                  Gỡ ghim
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ONLINE USERS */}
      <div className="bg-white shadow-sm p-3 rounded-md">
        <h3 className="font-semibold text-sky-700 mb-2">🟢 Đang hoạt động</h3>

        {!onlineList.length && (
          <div className="text-sm text-gray-500">
            Không có bạn nào đang online
          </div>
        )}

        {onlineList.slice(0, 4).map((u) => (
          <div key={u.id} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="cursor-pointer"
                onClick={() => navigate(`/profile/${u.id}`)}
              >
                {(avatarUrls[u.id] || u.avatar) ? (
                  <img
                    src={
                      avatarUrls[u.id] ||
                      (u.avatar?.startsWith("http")
                        ? u.avatar
                        : `http://localhost:5000/uploads/${u.avatar}`)
                    }
                    alt=""
                    className="w-7 h-7 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-sky-600 flex items-center justify-center text-white text-xs">
                    {u.username?.charAt(0)?.toUpperCase() || "U"}
                  </div>
                )}
              </div>

              <div className="text-sm">🟢 {u.username}</div>

              {unreadCounts?.[String(u.id)] > 0 && (
                <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded">
                  {unreadCounts[String(u.id)]}
                </span>
              )}
            </div>

            <button
              onClick={() => {
                setCurrentChatId(u.id);
                setUnreadCounts((prev) => ({
                  ...prev,
                  [String(u.id)]: 0,
                }));
              }}
              className="text-xs text-sky-600"
            >
              Chat
            </button>
          </div>
        ))}
      </div>

      {/* ALL USERS */}
      <div className="bg-white shadow-sm p-3 rounded-md max-h-64 overflow-y-auto">
        <h3 className="font-semibold text-sky-700 mb-2">
          👥 Tất cả người dùng
        </h3>

        {users.map((u) => (
          <div key={u.id} className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <div
                className="cursor-pointer"
                onClick={() => navigate(`/profile/${u.id}`)}
              >
                {(avatarUrls[u.id] || u.avatar) ? (
                  <img
                    src={
                      avatarUrls[u.id] ||
                      (u.avatar?.startsWith("http")
                        ? u.avatar
                        : `http://localhost:5000/uploads/${u.avatar}`)
                    }
                    alt=""
                    className="w-7 h-7 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-sky-600 flex items-center justify-center text-white text-xs">
                    {u.username?.charAt(0)?.toUpperCase() || "U"}
                  </div>
                )}
              </div>

              <div className="text-sm text-gray-800">{u.username}</div>
            </div>

            <button
              onClick={() => setCurrentChatId(u.id)}
              className="text-xs text-sky-600"
            >
              Chat
            </button>
          </div>
        ))}
      </div>

      <Chat users={users} />
    </div>
  );
}