import { useContext, useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import { UserContext } from "../context/UserContext";
import axios from "axios";

export default function ProfilePage() {
  const { user, setUser, token } = useContext(UserContext);
  const params = useParams();
  const viewingId = params.id ? Number(params.id) : null;
  const isSelf = !viewingId || (user && Number(user.id) === viewingId);
  const [bio, setBio] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const API_URL = "http://localhost:5000/api";

  useEffect(() => {
    if (isSelf) {
      if (user) setBio(user.bio || "");
    } else if (viewingId && token) {
      (async () => {
        try {
          const res = await axios.get(`${API_URL}/users/${viewingId}`, { headers: { Authorization: `Bearer ${token}` } });
          const other = res?.data?.user;
          setBio(other?.bio || "");
        } catch (e) { console.warn('Failed to load user profile', e); }
      })();
    }
  }, [user, viewingId, token, isSelf]);

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
      if (bio) fd.append('bio', bio);
      const res = await axios.put(`${API_URL}/users/profile`, fd, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res && res.data && res.data.user) {
        const updated = res.data.user;
        const newUser = { ...user, ...updated };
        setUser(newUser);
        localStorage.setItem('user', JSON.stringify(newUser));
        alert('Cập nhật hồ sơ thành công');
      }
    } catch (e) {
      console.error('Update profile failed', e);
      alert('Không thể cập nhật hồ sơ');
    }
  };

  const avatarUrl = isSelf
    ? (user?.avatar ? `http://localhost:5000/uploads/${user.avatar}` : null)
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
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <div className="flex gap-4 p-4">
        <Sidebar />
        <div className="flex-1 bg-white p-6 rounded-md shadow-sm">
          <h1 className="text-xl font-semibold text-sky-700">Trang cá nhân</h1>
          <div className="mt-6 flex items-start gap-6">
            <div>
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
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700">Giới thiệu</label>
              <textarea
                value={bio}
                onChange={(e) => isSelf && setBio(e.target.value)}
                className="mt-2 w-full min-h-32 p-3 border rounded-md"
                placeholder="Viết vài dòng giới thiệu về bạn..."
              />
              {isSelf && (
                <button onClick={onSave} className="mt-4 px-4 py-2 bg-sky-600 text-white rounded hover:bg-sky-700">Lưu thay đổi</button>
              )}
            </div>
          </div>
        </div>
        <div className="w-72"></div>
      </div>
    </div>
  );
}
