import { useContext, useEffect, useState } from "react";
import axios from "axios";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import { UserContext } from "../context/UserContext";

export default function DocumentsPage() {
  const { token } = useContext(UserContext);
  const API_URL = "http://localhost:5000/api";
  const [files, setFiles] = useState([]);
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadDocs = async () => {
    try {
      if (!token) return;
      const res = await axios.get(`${API_URL}/documents`, { headers: { Authorization: `Bearer ${token}` } });
      setDocs(res.data || []);
    } catch { setDocs([]); }
  };

  useEffect(() => { loadDocs(); }, [token]);

  const uploadDocs = async () => {
    try {
      if (!token) return;
      if (!files || files.length === 0) return;
      setLoading(true);
      const fd = new FormData();
      for (const f of files) fd.append("files", f);
      await axios.post(`${API_URL}/documents/upload`, fd, { headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" } });
      setFiles([]);
      await loadDocs();
      alert("Đã tải lên");
    } catch { alert("Không thể tải lên"); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <div className="flex gap-4 p-4">
        <Sidebar />
        <div className="flex-1 bg-white p-6 rounded-md shadow-sm">
          <h1 className="text-xl font-semibold text-sky-700">Chia sẻ tài liệu dự án</h1>
          <div className="mt-4">
            <div className="p-4 border rounded-md">
              <div className="text-sm font-semibold mb-2">Tải lên tài liệu</div>
              <input type="file" multiple onChange={(e) => setFiles(Array.from(e.target.files || []))} />
              {files.length > 0 && <div className="text-xs text-gray-600 mt-1">{files.length} file đã chọn</div>}
              <div className="mt-2">
                <button onClick={uploadDocs} disabled={loading || files.length === 0} className="px-4 py-2 bg-sky-600 text-white rounded disabled:opacity-50">{loading ? "Đang tải..." : "Tải lên"}</button>
              </div>
            </div>
            <div className="mt-6">
              <div className="text-sm font-semibold mb-2">Danh sách tài liệu</div>
              <div className="space-y-2">
                {docs.map((d, idx) => (
                  <div key={d.id} className="flex items-center justify-between border rounded p-2">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-sky-600 text-white flex items-center justify-center text-xs">{idx + 1}</div>
                      <div>
                        <div className="text-sm font-medium">{d.original_name}</div>
                        <div className="text-xs text-gray-500">Người tải lên: {d.username || d.user_id}</div>
                        <div className="text-xs text-gray-500">{new Date(d.created_at).toLocaleString()}</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <a href={d.url} target="_blank" rel="noreferrer" className="text-xs text-sky-700 underline">Xem</a>
                      <a href={`${API_URL}/files/${encodeURIComponent(d.filename)}`} className="text-xs text-gray-700 underline">Tải</a>
                    </div>
                  </div>
                ))}
                {docs.length === 0 && <div className="text-xs text-gray-500">Chưa có tài liệu</div>}
              </div>
            </div>
          </div>
        </div>
        <div className="w-72"></div>
      </div>
    </div>
  );
}
