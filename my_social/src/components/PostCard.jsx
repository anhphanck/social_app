
import React from "react";
import { useContext } from "react";
import { UserContext } from "../context/UserContext";

export default function PostCard({ post, onEdit, onDelete }) {
  const { user } = useContext(UserContext);
  return (
    <div className="bg-white p-4 rounded-md shadow-sm border border-gray-200 mb-4">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-sky-600 flex items-center justify-center text-white">
            {post.username?.charAt(0)?.toUpperCase() || "U"}
          </div>
          <div>
            <h3 className="font-semibold text-sky-700">{post.username}</h3>
            <div className="text-xs text-gray-400">
              {new Date(post.created_at).toLocaleString()}
            </div>
          </div>
        </div>

        {user && post.user_id === user.id && (
          <div className="space-x-3 text-sm">
            <button
              onClick={() => onEdit(post)}
              className="text-sky-600 hover:underline"
            >
              Sửa
            </button>
            <button
              onClick={() => onDelete(post.id)}
              className="text-red-600 hover:underline"
            >
              Xoá
            </button>
          </div>
        )}
      </div>

      <div className="mt-2 text-gray-800">
        {post.content}
        {post.image && (
            <img
              src={post.image}
              alt="post"
              className="rounded-md mt-2 max-h-80 w-full object-cover"
            />
          )}

      </div>

      <div className="flex space-x-4 mt-3 text-gray-600 text-sm">
        <button>❤️ Thích</button>
        <button>💬 Bình luận</button>
        <button>↗️ Chia sẻ</button>
      </div>
    </div>
  );
}
