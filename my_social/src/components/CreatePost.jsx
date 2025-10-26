export default function CreatePost({ user, newPost, setNewPost, onSubmit, loading }) {
  return (
  <div className="bg-gray-100 rounded-md shadow-sm p-4 mb-4 border border-gray-300">
    
    {/* Hàng đầu: Ảnh đại diện + Tên người dùng */}
    <div className="flex items-center gap-3 mb-3">
      <div className="w-10 h-10 rounded-full bg-sky-600 flex items-center justify-center text-white font-semibold">
        {user?.username?.[0]?.toUpperCase() || "U"}
      </div>
      <h3 className="font-semibold text-sky-700">{user?.username}</h3>
    </div>

    {/* Hàng thứ hai: Khối textarea + nút chia sẻ */}
    <div>
      <textarea
        rows="2"
        placeholder="Bạn đang nghĩ gì?"
        value={newPost}
        onChange={(e) => setNewPost(e.target.value)}
        className="w-full p-2 rounded-md outline-none resize-none bg-white border border-gray-200 placeholder-gray-500 text-gray-800"
      ></textarea>

      <div className="flex justify-between items-center mt-3 border-t border-gray-200 pt-2">
        <div className="flex space-x-4 text-sky-600 text-sm">
          <button className="flex items-center gap-1 hover:text-sky-700">
            🖼 <span>Thêm ảnh</span>
          </button>
          <button className="flex items-center gap-1 hover:text-sky-700">
            📍 <span>Địa điểm</span>
          </button>
          <button className="flex items-center gap-1 hover:text-sky-700">
            🏷 <span>Gắn thẻ</span>
          </button>
        </div>

        <button
          onClick={onSubmit}
          disabled={loading || !newPost.trim()}
          className="bg-sky-600 text-white px-4 py-1.5 rounded-md hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Đang đăng..." : "Chia sẻ"}
        </button>
      </div>
    </div>
  </div>
);

}
