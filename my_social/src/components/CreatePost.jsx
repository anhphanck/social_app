export default function CreatePost({ user, newPost, setNewPost, onSubmit, loading, file, setFile }) {
  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  return (
    <div className="bg-gray-100 rounded-md shadow-sm p-4 mb-4 border border-gray-300">
      {/* Hàng đầu: Ảnh đại diện + Tên người dùng */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-sky-600 flex items-center justify-center text-white font-semibold">
          {user?.username?.[0]?.toUpperCase() || "U"}
        </div>
        <h3 className="font-semibold text-sky-700">{user?.username}</h3>
      </div>

      {/* Ô nhập nội dung */}
      <textarea
        rows="2"
        placeholder="Bạn đang nghĩ gì?"
        value={newPost}
        onChange={(e) => setNewPost(e.target.value)}
        className="w-full p-2 rounded-md outline-none resize-none bg-white border border-gray-200 placeholder-gray-500 text-gray-800"
      ></textarea>

      {/* Hiển thị ảnh nếu có */}
      {file && (
        <div className="mt-3 relative">
          <img
            src={URL.createObjectURL(file)}
            alt="preview"
            className="rounded-md max-h-60 object-cover w-full"
          />
          <button
            type="button"
            onClick={() => setFile(null)}
            className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-md hover:bg-red-600"
          >
            ✕
          </button>
        </div>
      )}

      <div className="flex justify-between items-center mt-3 border-t border-gray-200 pt-2">
        <div className="flex space-x-4 text-sky-600 text-sm">
          {/* Nút chọn ảnh */}
          <label
            htmlFor="imageUpload"
            className="flex items-center gap-1 cursor-pointer hover:text-sky-700"
          >
            🖼 <span>Thêm ảnh</span>
          </label>
          <input
            id="imageUpload"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <button className="flex items-center gap-1 hover:text-sky-700">
            📍 <span>Địa điểm</span>
          </button>
          <button className="flex items-center gap-1 hover:text-sky-700">
            🏷 <span>Gắn thẻ</span>
          </button>
        </div>

        <button
          onClick={(e) => onSubmit(e, file)}
          disabled={loading || (!newPost.trim() && !file)}
          className="bg-sky-600 text-white px-4 py-1.5 rounded-md hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Đang đăng..." : "Chia sẻ"}
        </button>
      </div>
    </div>
  );
}
