
import React from "react";
import PostCard from "../components/PostCard";
export default function EditablePost({
  post,
  editingPost,
  editContent,
  editFile,
  setEditFile,
  setEditContent,
  setEditingPost,
  handleSaveEdit,
  handleCancelEdit,
  handleStartEdit,
  handleDelete,
  user,
}) {
  return (
    <div id={`post-${post.id}`} key={post.id}>
      {editingPost?.id === post.id ? (
        <div className="bg-white p-4 rounded-md shadow-sm border border-gray-200 mb-4">
          {/* Nhập nội dung */}
          <textarea
            rows="3"
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md resize-none mb-3"
          />

          {/* Hiển thị ảnh cũ */}
          {post.image && !editingPost.removeImage && !editFile && (
            <div className="relative mb-3">
              <img
                src={`http://localhost:5000/uploads/${post.image}`}
                alt="post"
                className="rounded-md max-h-60 object-cover w-full"
              />
              <button
                type="button"
                onClick={() =>
                  setEditingPost({ ...editingPost, removeImage: true })
                }
                className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded hover:bg-black"
              >
                ✕
              </button>
            </div>
          )}

          {/* Ảnh mới (nếu chọn) */}
          {editFile && (
            <div className="relative mb-3">
              <img
                src={URL.createObjectURL(editFile)}
                alt="preview"
                className="rounded-md max-h-60 object-cover w-full"
              />
              <button
                type="button"
                onClick={() => setEditFile(null)}
                className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-md hover:bg-red-600"
              >
                ✕
              </button>
            </div>
          )}

          {/* Chọn ảnh mới */}
          <div className="mb-3">
            <label
              htmlFor="editImage"
              className="flex items-center gap-1 text-sky-600 cursor-pointer hover:text-sky-700 text-sm"
            >
              🖼 <span>Chọn ảnh mới</span>
            </label>
            <input
              id="editImage"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setEditFile(e.target.files[0])}
            />
          </div>

          {/* Nút hành động */}
          <div className="flex justify-end gap-2">
            <button
              onClick={handleCancelEdit}
              className="px-3 py-1 border rounded text-sm"
            >
              Huỷ
            </button>
            <button
              onClick={handleSaveEdit}
              className="px-3 py-1 bg-green-600 text-white rounded text-sm"
            >
              Lưu
            </button>
          </div>
        </div>
      ) : (
        <PostCard
          post={post}
          user={user}
          onEdit={handleStartEdit}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
