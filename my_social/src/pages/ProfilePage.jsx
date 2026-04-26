import { useContext, useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import { UserContext } from "../context/UserContext";
import axios from "axios";
import { API_URL, UPLOADS_URL } from "../config/env";

export default function ProfilePage() {
  const { user, setUser, token } = useContext(UserContext);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const params = useParams();
  const viewingId = params.id ? Number(params.id) : null;
  const isSelf = !viewingId || (user && Number(user.id) === viewingId);
  const [bio, setBio] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [bioDirty, setBioDirty] = useState(false);

  useEffect(() => {
    if (isSelf && user && !bioDirty) {
      setBio(user.bio || "");
    }
  }, [isSelf, user?.id, bioDirty]);

  useEffect(() => {
    if (!isSelf && viewingId && token) {
      (async () => {
        try {
          const res = await axios.get(`${API_URL}/users/${viewingId}`, { headers: { Authorization: `Bearer ${token}` } });
          const other = res?.data?.user;
          setBio(other?.bio || "");
          setBioDirty(false);
        } catch (e) { }
      })();
    }
  }, [isSelf, viewingId, token]);

  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => { try { URL.revokeObjectURL(url); } catch (err) { console.warn('revokeObjectURL failed', err); } };
  }, [file]);

  const onSave = async () => {
    try {
      const fd = new FormData();
      if (file) fd.append('avatar', file);
      fd.append('bio', bio ?? "");
      const res = await axios.put(`${API_URL}/users/profile`, fd, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res && res.data && res.data.user) {
        const updated = res.data.user;
        const newUser = { ...user, ...updated };
        setUser(newUser);
        localStorage.setItem('user', JSON.stringify(newUser));
        setBioDirty(false);
        alert('Cập nhật hồ sơ thành công');
      }
    } catch (e) {
      console.error('Update profile failed', e);
      alert('Không thể cập nhật hồ sơ');
    }
  };

  const avatarUrl = isSelf
    ? (user?.avatar ? (user.avatar.startsWith('http') ? user.avatar : `${UPLOADS_URL}/${user.avatar}`) : null)
    : null;
  const [otherAvatarUrl, setOtherAvatarUrl] = useState(null);
  useEffect(() => {
    if (!isSelf && viewingId && token) {
      (async () => {
        try {
          const res = await axios.get(`${API_URL}/users/${viewingId}`, { headers: { Authorization: `Bearer ${token}` } });
          const url = res?.data?.avatar_url || null;
          setOtherAvatarUrl(url);
        } catch (err) { console.warn('load avatar_url failed', err); }
      })();
    }
  }, [isSelf, viewingId, token]);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col overflow-x-hidden">
      <div className="z-50 shrink-0">
        <Navbar />
      </div>
      <div className="md:hidden px-3 sm:px-4 pt-2">
        <button
          onClick={() => setMobileSidebarOpen(true)}
          className="px-3 py-2 rounded-md bg-white border text-sm font-medium text-sky-700"
        >
          ☰ Menu
        </button>
      </div>
      <div className="flex flex-1 gap-3 p-3 sm:p-4 overflow-hidden">
        <div className="w-64 shrink-0 overflow-y-auto hidden md:block">
            <Sidebar />
        </div>
        <div className="flex-1 bg-white p-4 sm:p-6 rounded-md shadow-sm overflow-y-auto min-w-0">
          <h1 className="text-xl font-semibold text-sky-700">Trang cá nhân</h1>
          <div className="mt-6 flex flex-col items-start gap-6 md:flex-row">
            <div className="w-full md:w-auto">
              <div className="w-28 h-28 rounded-full bg-gray-200 overflow-hidden">
                {(() => {
                  const displayAvatar = preview || (isSelf ? avatarUrl : otherAvatarUrl);
                  if (displayAvatar) {
                    return <img src={displayAvatar} alt="avatar" className="w-full h-full object-cover" />;
                  }
                  return <div className="w-full h-full flex items-center justify-center text-gray-500">No Avatar</div>;
                })()}
              </div>
              {isSelf && (
                <input
                  type="file"
                  accept="image/*"
                  className="mt-3"
                  onChange={(e) => {
                    const files = e.target && e.target.files ? e.target.files : null;
                    const picked = files && files.length > 0 ? files[0] : null;
                    setFile(picked);
                  }}
                />
              )}
            </div>
            <div className="flex-1 w-full min-w-0">
              <label className="block text-sm font-medium text-gray-700">Giới thiệu</label>
              <textarea
                value={bio}
                onChange={(e) => { setBio(e.target.value); setBioDirty(true); }}
                className="mt-2 w-full min-h-32 p-3 border rounded-md"
                placeholder="Viết vài dòng giới thiệu về bạn..."
              />
              {isSelf && (
                <button onClick={onSave} className="mt-4 px-4 py-2 bg-sky-600 text-white rounded hover:bg-sky-700">Lưu thay đổi</button>
              )}
            </div>
          </div>
        </div>
        <div className="w-72 shrink-0 hidden lg:block"></div>
      </div>
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileSidebarOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-72 max-w-[85vw]">
            <Sidebar onNavigate={() => setMobileSidebarOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
