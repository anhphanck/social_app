import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../context/UserContext";

export default function Navbar({ user, onLogout, searchQuery, setSearchQuery }) {
  const navigate = useNavigate();
  const ctx = useContext(UserContext);
  const u = user || ctx?.user;
  const logoutHandler = onLogout || ctx?.logout;
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
    value={searchQuery || ""}
    onChange={(e) => setSearchQuery ? setSearchQuery(e.target.value) : void 0}
    className="w-full pl-12 pr-4 py-2 bg-gray-100 rounded-full focus:outline-none font-medium text-sm text-gray-700 placeholder-gray-500"
  />
  </div>
  <div className="flex items-center space-x-4 text-sky-800 z-10">
    <button>💬</button>
    <button>🔔</button>
    <div
      className="flex items-center space-x-2 cursor-pointer"
      onClick={() => navigate('/profile')}
    >
      {u?.avatar ? (
        <img
          src={`http://localhost:5000/uploads/${u.avatar}`}
          alt="avatar"
          className="w-8 h-8 rounded-full object-cover"
        />
      ) : (
        <div className="w-8 h-8 bg-sky-600 rounded-full" />
      )}
      <span className="font-semibold">{u?.username}</span>
    </div>
    <button
      onClick={logoutHandler}
      className="text-red-600 text-sm hover:underline ml-2"
    >
      Đăng xuất
    </button>
  </div>
</div>

  );
}
