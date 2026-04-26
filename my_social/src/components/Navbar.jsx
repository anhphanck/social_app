import { useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../context/UserContext";

export default function Navbar({ user, onLogout, searchQuery, setSearchQuery }) {
  const navigate = useNavigate();
  const ctx = useContext(UserContext);
  const u = user || ctx?.user;
  const logoutHandler = onLogout || ctx?.logout;
  const { selectedClass, setSelectedClass } = ctx || {};
  const [classOptions, setClassOptions] = useState([]);
  useEffect(() => {
    const run = async () => {
      if (!u || u.role !== "teacher") return;
      const token = localStorage.getItem("token");
      if (!token) return;
      try {
        const res = await axios.get("/api/classes", { headers: { Authorization: `Bearer ${token}` } });
        const items = Array.isArray(res.data) ? res.data : [];
        const codes = items.map((c) => c.code).filter(Boolean);
        setClassOptions(codes);
        if (codes.length > 0) {
          if (!selectedClass || !codes.includes(selectedClass)) {
            setSelectedClass && setSelectedClass(codes[0]);
          }
        }
      } catch {}
    };
    run();
  }, [u?.id]);
  
  const isTeacher = u?.role === 'teacher';
  const userClass = u?.class;
  
  return (
   <div className="relative flex items-center justify-between px-6 py-3 bg-sky-200 shadow-md">
  <div className="flex items-center space-x-4 z-10">
    <div className="font-bold text-xl text-sky-700">LOGO</div>
<<<<<<< HEAD
=======
    {isTeacher && (
      <div className="flex items-center space-x-2">
        <span className="text-sm font-medium text-sky-800">Lớp:</span>
        <select
          value={selectedClass || (classOptions[0] || '')}
          onChange={(e) => setSelectedClass && setSelectedClass(e.target.value)}
          className="px-3 py-1.5 bg-white border border-sky-300 rounded-lg text-sm font-medium text-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
        >
          {classOptions.map((code) => (
            <option key={code} value={code}>Lớp {code}</option>
          ))}
        </select>
      </div>
    )}
    {!isTeacher && userClass && (
      <div className="px-3 py-1.5 bg-sky-600 text-white rounded-lg text-sm font-medium">
        Lớp {userClass}
      </div>
    )}
>>>>>>> deploy_1
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
<<<<<<< HEAD

=======
>>>>>>> deploy_1
    <div
      className="flex items-center space-x-2 cursor-pointer"
      onClick={() => navigate('/profile')}
    >
      {u?.avatar ? (
        <img
          src={u.avatar.startsWith('http') ? u.avatar : `/uploads/${u.avatar}`}
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

