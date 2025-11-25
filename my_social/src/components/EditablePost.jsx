import { useContext, useState } from "react";
import { UserContext } from "../context/UserContext";
import React from "react";
import PostCard from "../components/PostCard";

export default function EditablePost({
  post,
  editingPost,
  editContent,
  editFiles,
  setEditFiles,
  keepImages,
  setKeepImages,
  setEditContent,
  setEditingPost,
  handleSaveEdit,
  handleCancelEdit,
  handleStartEdit,
  handleDelete,
}) {
  const { user } = useContext(UserContext);
  const [removingImageIndex, setRemovingImageIndex] = useState(null);

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setEditFiles([...editFiles, ...selectedFiles]);
  };

  const removeNewFile = (index) => {
    const newFiles = editFiles.filter((_, i) => i !== index);
    setEditFiles(newFiles);
  };

  const removeOldImage = (index) => {
    const newKeepImages = keepImages.filter((_, i) => i !== index);
    setKeepImages(newKeepImages);
  };

  const allImages = [
    ...keepImages.map(img => ({ type: 'old', url: img })),
    ...editFiles.map((file, idx) => ({ type: 'new', file, index: idx }))
  ];

  return (
    <div id={`post-${post.id}`} key={post.id}>
      {editingPost?.id === post.id ? (
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 mb-4">
          {/* Nhập nội dung */}
          <textarea
            rows="3"
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg resize-none mb-3 focus:outline-none focus:ring-2 focus:ring-sky-500"
            placeholder="Viết nội dung..."
          />

          {/* Hiển thị tất cả ảnh (cũ + mới) */}
          {allImages.length > 0 && (
            <div className="mb-3 grid grid-cols-2 gap-2">
              {allImages.map((item, idx) => (
                <div key={idx} className="relative">
                  <img
                    src={item.type === 'old' ? item.url : URL.createObjectURL(item.file)}
                    alt={`edit-${idx}`}
                    className="rounded-lg max-h-40 object-cover w-full"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (item.type === 'old') {
                        removeOldImage(idx);
                      } else {
                        removeNewFile(item.index);
                      }
                    }}
                    className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-md hover:bg-red-600"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Chọn ảnh mới */}
          <div className="mb-3">
            <label
              htmlFor="editImages"
              className="flex items-center gap-1 text-sky-600 cursor-pointer hover:text-sky-700 text-sm"
            >
              🖼 <span>Thêm ảnh mới ({editFiles.length}/10)</span>
            </label>
            <input
              id="editImages"
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Nút hành động */}
          <div className="flex justify-end gap-2">
            <button
              onClick={handleCancelEdit}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition"
            >
              Huỷ
            </button>
            <button
              onClick={handleSaveEdit}
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition"
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
