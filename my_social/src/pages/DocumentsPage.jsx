<<<<<<< HEAD
=======
import { useContext, useEffect, useState, useCallback } from "react";
import axios from "axios";
>>>>>>> deploy_1
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";

export default function DocumentsPage() {
<<<<<<< HEAD
  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <div className="flex gap-4 p-4">
        <Sidebar />
        <div className="flex-1 bg-white p-6 rounded-md shadow-sm">
          <h1 className="text-xl font-semibold text-sky-700">Tài liệu lớp học</h1>
          <div className="mt-4 text-gray-700">Tài liệu sắp cập nhập.</div>
=======
  const { token, user, selectedClass } = useContext(UserContext);
  const API_URL = "/api";
  const [files, setFiles] = useState([]);
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadDocs = useCallback(async () => {
    try {
      if (!token) return;
      let url = `${API_URL}/documents`;
      if (user?.role === "teacher" || user?.role === "admin") {
        if (selectedClass) url += `?class=${encodeURIComponent(selectedClass)}`;
      }
      const res = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
      setDocs(res.data || []);
    } catch { setDocs([]); }
  }, [token, user?.role, selectedClass]);

  const handleDownload = async (e, doc) => {
    e.preventDefault();
    try {
      const res = await axios.get(`/api/documents/download/${doc.id}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      const blob = new Blob([res.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const cd = res.headers['content-disposition'] || '';
      let filename = doc.original_name || 'download';
      const match = cd.match(/filename="([^"]+)"/);
      if (match && match[1]) filename = decodeURIComponent(match[1]);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      const msg = err?.response?.data?.message || 'Không thể tải tài liệu';
      alert(msg);
    }
  };
  const handleDelete = async (doc) => {
    try {
      if (!token) return;
      if (!confirm('Xóa tài liệu này?')) return;
      await axios.delete(`${API_URL}/documents/${doc.id}`, { headers: { Authorization: `Bearer ${token}` } });
      await loadDocs();
      alert('Đã xóa tài liệu');
    } catch (err) {
      const msg = err?.response?.data?.message || 'Không thể xóa tài liệu';
      alert(msg);
    }
  };

  useEffect(() => { loadDocs(); }, [loadDocs]);

  const uploadDocs = async () => {
    try {
      if (!token) return;
      if (!files || files.length === 0) return;
      setLoading(true);
      const fd = new FormData();
      for (const f of files) fd.append("files", f);
      let url = `${API_URL}/documents/upload`;
      if (user?.role === "teacher" || user?.role === "admin") {
        if (selectedClass) url += `?class=${encodeURIComponent(selectedClass)}`;
      }
      await axios.post(url, fd, { headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" } });
      setFiles([]);
      await loadDocs();
      alert("Đã tải lên");
    } catch { alert("Không thể tải lên"); }
    finally { setLoading(false); }
  };

  return (
    <div className="h-screen bg-gray-100 flex flex-col overflow-hidden">
      <div className="z-50 shrink-0">
        <Navbar />
      </div>
      <div className="flex flex-1 gap-4 p-4 overflow-hidden">
        <div className="w-64 shrink-0 overflow-y-auto">
            <Sidebar />
        </div>
        <div className="flex-1 bg-white p-6 rounded-md shadow-sm overflow-y-auto">
          <h1 className="text-xl font-semibold text-sky-700">Chia sẻ tài liệu lớp học</h1>
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
                      <a href="#" onClick={(e) => handleDownload(e, d)} className="text-xs text-gray-700 underline">Tải</a>
                      {(String(d.user_id) === String(user?.id)) && (
                        <button onClick={() => handleDelete(d)} className="text-xs text-red-700 underline">Xóa</button>
                      )}
                    </div>
                  </div>
                ))}
                {docs.length === 0 && <div className="text-xs text-gray-500">Chưa có tài liệu</div>}
              </div>
            </div>
          </div>
>>>>>>> deploy_1
        </div>
        <div className="w-72 shrink-0"></div>
      </div>
    </div>
  );
}

