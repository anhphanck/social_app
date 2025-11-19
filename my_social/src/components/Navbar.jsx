export default function Navbar({ user, onLogout, searchQuery,setSearchQuery }) {
  return (
   <div className="relative flex items-center justify-between px-6 py-3 bg-sky-200 shadow-md">
  <div className="flex items-center space-x-4 z-10">
    <div className="font-bold text-xl text-sky-700">LOGO</div>
    <button>🏠</button>
    <button>🌙</button>
  </div>

  <div className="relative w-full max-w-lg">
  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-lg">🔍</span>
  <input
    type="text"
    placeholder="Tìm kiếm..."
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
    className="w-full pl-12 pr-4 py-2 bg-gray-100 rounded-full focus:outline-none font-medium text-sm text-gray-700 placeholder-gray-500"
  />
  </div>
{/* <div className="flex items-center gap-2 mb-4">
  <input
    type="text"
    placeholder="Tìm kiếm bài viết hoặc người dùng..."
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
    className="border border-gray-300 rounded-md px-3 py-1 w-full"
  />
  <button
    onClick={handleSearch}
    className="bg-sky-600 text-white px-4 py-1 rounded-md hover:bg-sky-700"
  >
    Tìm
  </button>
</div> */}

  <div className="flex items-center space-x-4 text-sky-800 z-10">
    <button>💬</button>
    <button>🔔</button>
    <div className="flex items-center space-x-2">
      <div className="w-8 h-8 bg-sky-600 rounded-full"></div>
      <span className="font-semibold">{user?.username}</span>
    </div>
    <button
      onClick={onLogout}
      className="text-red-600 text-sm hover:underline ml-2"
    >
      Đăng xuất
    </button>
  </div>
</div>

  );
}
