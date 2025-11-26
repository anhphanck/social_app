import { useContext, useEffect, useState } from "react";
import axios from "axios";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import { UserContext } from "../context/UserContext";

export default function TasksPage() {
  const { user, token, setTaskNotifCount, socket } = useContext(UserContext);
  const [users, setUsers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [details, setDetails] = useState({});
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [deadline, setDeadline] = useState("");
  const [assignees, setAssignees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState([]);
  const API_URL = "http://localhost:5000/api";
  const [editTaskId, setEditTaskId] = useState(null);
  const [editPriority, setEditPriority] = useState("medium");
  const [editDeadline, setEditDeadline] = useState("");
  const [editAssignees, setEditAssignees] = useState([]);
  const [editDescription, setEditDescription] = useState("");

  useEffect(() => {
    const init = async () => {
      try {
        if (!token) return;
        await axios.post(`${API_URL}/tasks/notifications/mark-read`, {}, { headers: { Authorization: `Bearer ${token}` } });
        setTaskNotifCount(0);
      } catch { /* ignore */ }
    };
    init();
  }, [token, setTaskNotifCount]);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        if (!token) return;
        const res = await axios.get(`${API_URL}/users`, { headers: { Authorization: `Bearer ${token}` } });
        setUsers(res.data || []);
      } catch { console.warn(''); }
    };
    loadUsers();
  }, [token]);

  useEffect(() => {
    const run = async () => {
      if (!token) return;
      try {
        const res = await axios.get(`${API_URL}/tasks`, { headers: { Authorization: `Bearer ${token}` } });
        setTasks(res.data || []);
      } catch { console.warn(''); }
    };
    run();
  }, [token]);

  useEffect(() => {
    if (!socket) return;
    const handler = (payload) => {
      try {
        if (!payload || !payload.type) return;
        if (['task_updated','assigned','status_changed','ack'].includes(payload.type)) {
          axios.get(`${API_URL}/tasks`, { headers: { Authorization: `Bearer ${token}` } })
            .then((res) => setTasks(res.data || []))
            .catch(() => {});
          if (payload.task_id) {
            axios.get(`${API_URL}/tasks/${payload.task_id}`, { headers: { Authorization: `Bearer ${token}` } })
              .then((det) => setDetails((prev) => ({ ...prev, [payload.task_id]: det.data })))
              .catch(() => {});
          }
        }
      } catch { void 0; }
    };
    socket.on('task_notification', handler);
    return () => { try { socket.off('task_notification', handler); } catch { void 0; } };
  }, [socket, token]);

  const createTask = async () => {
    try {
      setLoading(true);
      const fd = new FormData();
      fd.append('title', title);
      fd.append('description', description);
      fd.append('priority', priority);
      if (deadline) fd.append('deadline', deadline);
      fd.append('assignees', JSON.stringify(assignees));
      for (const f of files) fd.append('attachments', f);
      await axios.post(`${API_URL}/tasks`, fd, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } });
      setTitle("");
      setDescription("");
      setPriority("medium");
      setDeadline("");
      setAssignees([]);
      setFiles([]);
      try {
        const res = await axios.get(`${API_URL}/tasks`, { headers: { Authorization: `Bearer ${token}` } });
        setTasks(res.data || []);
      } catch { console.warn(''); }
      alert("Đã tạo nhiệm vụ");
    } catch (err) {
      const msg = err?.response?.data?.message || "Không thể tạo nhiệm vụ";
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  const [submissionFiles, setSubmissionFiles] = useState({});
  const [submissionNotes, setSubmissionNotes] = useState({});
  const openDetail = async (id) => {
    try {
      const res = await axios.get(`${API_URL}/tasks/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setDetails((prev) => ({ ...prev, [id]: res.data }));
    } catch {
      alert('Không tải được chi tiết nhiệm vụ');
    }
  };
  const changeStatus = async (id, status) => {
    try {
      if (status === 'pending_review') {
        const fd = new FormData();
        fd.append('status', status);
        const note = submissionNotes[id] || '';
        if (note) fd.append('note', note);
        const files = submissionFiles[id] || [];
        if (!files || files.length === 0) { alert('Vui lòng đính kèm minh chứng'); return; }
        for (const f of files) fd.append('evidence', f);
        await axios.post(`${API_URL}/tasks/${id}/status`, fd, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } });
      } else {
        await axios.post(`${API_URL}/tasks/${id}/status`, { status }, { headers: { Authorization: `Bearer ${token}` } });
      }
      try {
        const res = await axios.get(`${API_URL}/tasks`, { headers: { Authorization: `Bearer ${token}` } });
        setTasks(res.data || []);
      } catch { console.warn(''); }
    } catch (err) {
      const msg = err?.response?.data?.message || 'Không thể cập nhật';
      alert(msg);
    }
  };

  const deleteTask = async (id) => {
    try {
      if (!confirm('Xóa nhiệm vụ này?')) return;
      await axios.delete(`${API_URL}/tasks/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      const res = await axios.get(`${API_URL}/tasks`, { headers: { Authorization: `Bearer ${token}` } });
      setTasks(res.data || []);
    } catch (err) {
      const msg = err?.response?.data?.message || 'Không thể xóa nhiệm vụ';
      alert(msg);
    }
  };

  

  const toggleAssignee = (uid) => {
    setAssignees((prev) => prev.includes(uid) ? prev.filter((i) => i !== uid) : [...prev, uid]);
  };
  const toggleEditAssignee = (uid) => {
    setEditAssignees((prev) => prev.includes(uid) ? prev.filter((i) => i !== uid) : [...prev, uid]);
  };
  const openEdit = (t) => {
    setEditTaskId(t.id);
    setEditPriority(t.priority || 'medium');
    const dl = t.deadline ? new Date(t.deadline) : null;
    const local = dl ? new Date(dl.getTime() - dl.getTimezoneOffset()*60000).toISOString().slice(0,16) : "";
    setEditDeadline(local);
    const ids = (t.assignees ? String(t.assignees).split(',').map((x) => Number(x)).filter(Boolean) : []);
    setEditAssignees(ids);
    setEditDescription(t.description || "");
  };
  const cancelEdit = () => {
    setEditTaskId(null);
    setEditPriority('medium');
    setEditDeadline("");
    setEditAssignees([]);
    setEditDescription("");
  };
  const saveEdit = async () => {
    try {
      if (!editTaskId) return;
      await axios.put(`${API_URL}/tasks/${editTaskId}`, { priority: editPriority, deadline: editDeadline || null, assignees: editAssignees, description: editDescription }, { headers: { Authorization: `Bearer ${token}` } });
      const res = await axios.get(`${API_URL}/tasks`, { headers: { Authorization: `Bearer ${token}` } });
      setTasks(res.data || []);
      try {
        const det = await axios.get(`${API_URL}/tasks/${editTaskId}`, { headers: { Authorization: `Bearer ${token}` } });
        setDetails((prev) => ({ ...prev, [editTaskId]: det.data }));
      } catch { void 0; }
      cancelEdit();
    } catch { alert('Không thể cập nhật nhiệm vụ'); }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <div className="flex gap-4 p-4">
        <Sidebar />
        <div className="flex-1 bg-white p-6 rounded-md shadow-sm">
          <h1 className="text-xl font-semibold text-sky-700">Quản lý Task</h1>

          {user?.role === "admin" && (
            <div className="mt-4 p-4 border rounded-md">
              <div className="text-sm font-semibold mb-2">Tạo nhiệm vụ mới</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Tiêu đề" className="border rounded px-3 py-2" />
                <select value={priority} onChange={(e) => setPriority(e.target.value)} className="border rounded px-3 py-2">
                  <option value="low">Thấp</option>
                  <option value="medium">Trung bình</option>
                  <option value="high">Cao</option>
                  <option value="urgent">Gấp</option>
                </select>
                <input value={deadline} onChange={(e) => setDeadline(e.target.value)} type="datetime-local" className="border rounded px-3 py-2" />
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Mô tả" className="border rounded px-3 py-2" />
              </div>
              <div className="mt-2">
                <label className="text-sm mb-1">Đính kèm</label>
                <input type="file" multiple onChange={(e) => setFiles(Array.from(e.target.files || []))} className="block" />
                {files.length > 0 && <div className="text-xs text-gray-600 mt-1">{files.length} file đã chọn</div>}
              </div>
              <div className="mt-3">
                <div className="text-sm mb-1">Assign to</div>
                <div className="flex flex-wrap gap-2">
                  {users.length === 0 && (
                    <div className="text-xs text-gray-500">Không có danh sách nhân viên. Vui lòng kiểm tra lại quyền truy cập hoặc tạo mới user.</div>
                  )}
                  {users.map((u) => (
                    <button key={u.id} type="button" onClick={() => toggleAssignee(u.id)} className={`px-3 py-1 rounded border ${assignees.includes(u.id) ? 'bg-sky-600 text-white' : 'bg-white'}`}>
                      {u.username}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-3">
                <button onClick={createTask} disabled={loading || !title || assignees.length === 0} className="px-4 py-2 bg-sky-600 text-white rounded disabled:opacity-50">{loading ? "Đang lưu..." : "Giao việc"}</button>
              </div>
            </div>
          )}

          <div className="mt-6">
            <div className="text-sm font-semibold mb-2">{user?.role === 'admin' ? 'Tất cả nhiệm vụ' : 'Nhiệm vụ của tôi'}</div>
            <div className="space-y-3">
              {tasks.map((t) => (
                <div key={t.id} className="border rounded p-3 flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{t.title}</div>
                    <div className="text-sm text-gray-600">Trạng thái: {t.status}</div>
                    {t.assignees_usernames && (
                      <div className="text-sm text-gray-600">Giao cho: {String(t.assignees_usernames)}</div>
                    )}
                    {t.deadline && <div className="text-sm text-gray-600">Deadline: {new Date(t.deadline).toLocaleString()}</div>}
                    <div className="mt-2">
                      <button onClick={() => openDetail(t.id)} className="text-xs text-sky-600 underline">Xem chi tiết</button>
                    </div>
                    {details[t.id] && (
                      <div className="mt-2 space-y-2">
                        {details[t.id].task?.description && (
                          <div className="text-sm">Mô tả: {details[t.id].task.description}</div>
                        )}
                        {details[t.id].creator && (
                          <div className="text-sm">Giao bởi: <span className="font-medium">{details[t.id].creator.username}</span></div>
                        )}
                        {details[t.id].assignees && details[t.id].assignees.length > 0 && (
                          <div className="text-sm">Giao cho: {details[t.id].assignees.map((a) => a.username).join(', ')}</div>
                        )}
                        {details[t.id].attachments && details[t.id].attachments.length > 0 && (
                          <div>
                            <div className="text-sm font-medium">File được giao</div>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {details[t.id].attachments.map((f, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                  <a href={f.url} target="_blank" rel="noreferrer" className="text-xs text-sky-700 underline">{f.filename}</a>
                                  <a href={`${API_URL}/files/${encodeURIComponent(f.filename)}`} className="text-xs text-gray-700 underline">Tải</a>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {details[t.id].attachments && details[t.id].attachments.length === 0 && (
                          <div className="text-xs text-gray-500">Không có file được giao</div>
                        )}
                        {details[t.id].submissions && details[t.id].submissions.length > 0 && (
                          <div>
                            <div className="text-sm font-medium">Minh chứng đã nộp</div>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {details[t.id].submissions.map((s, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                  <a href={s.url} target="_blank" rel="noreferrer" className="text-xs text-sky-700 underline">{s.filename}</a>
                                  <a href={`${API_URL}/files/${encodeURIComponent(s.filename)}`} className="text-xs text-gray-700 underline">Tải</a>
                                </div>
                              ))}
                            </div>
                            {details[t.id].submissions && details[t.id].submissions.some((x) => x.note) && (
                              <div className="text-xs text-gray-600 mt-1">Ghi chú: {details[t.id].submissions.map((x) => x.note).filter(Boolean).join(' | ')}</div>
                            )}
                          </div>
                        )}
                        {details[t.id].submissions && details[t.id].submissions.length === 0 && (
                          <div className="text-xs text-gray-500">Chưa có minh chứng nào được nộp</div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {user?.role !== 'admin' && (
                      <>
                        {t.status === 'new' && (
                          <button onClick={() => changeStatus(t.id, 'in_progress')} className="px-3 py-1 border rounded">Nhận việc</button>
                        )}
                        {t.status === 'in_progress' && (
                          <div className="flex flex-col gap-2">
                            <textarea placeholder="Ghi chú minh chứng (tùy chọn)" className="border rounded px-3 py-2"
                              value={submissionNotes[t.id] || ''}
                              onChange={(e) => setSubmissionNotes((prev) => ({ ...prev, [t.id]: e.target.value }))}
                            />
                            <div className="flex items-center gap-2">
                              <input type="file" multiple onChange={(e) => setSubmissionFiles((prev) => ({ ...prev, [t.id]: Array.from(e.target.files || []) }))} />
                              <button onClick={() => changeStatus(t.id, 'pending_review')} disabled={!submissionFiles[t.id] || submissionFiles[t.id].length === 0} className="px-3 py-1 border rounded disabled:opacity-50">Hoàn thành</button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                    {user?.role === 'admin' && (
                      <>
                        {t.status === 'pending_review' && <button onClick={() => changeStatus(t.id, 'closed')} className="px-3 py-1 border rounded">Duyệt</button>}
                        <button onClick={() => deleteTask(t.id)} className="px-3 py-1 border rounded text-red-700">Xóa</button>
                        <button onClick={() => openEdit(t)} className="px-3 py-1 border rounded">Sửa</button>
                      </>
                    )}
                  </div>
                  {user?.role === 'admin' && editTaskId === t.id && (
                    <div className="mt-2 p-2 border rounded">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <select value={editPriority} onChange={(e) => setEditPriority(e.target.value)} className="border rounded px-3 py-2">
                          <option value="low">Thấp</option>
                          <option value="medium">Trung bình</option>
                          <option value="high">Cao</option>
                          <option value="urgent">Gấp</option>
                        </select>
                        <input value={editDeadline} onChange={(e) => setEditDeadline(e.target.value)} type="datetime-local" className="border rounded px-3 py-2" />
                        <div className="flex flex-wrap gap-2">
                          {users.map((u) => (
                            <button key={u.id} type="button" onClick={() => toggleEditAssignee(u.id)} className={`px-3 py-1 rounded border ${editAssignees.includes(u.id) ? 'bg-sky-600 text-white' : 'bg-white'}`}>
                              {u.username}
                            </button>
                          ))}
                        </div>
                        <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} placeholder="Mô tả" className="border rounded px-3 py-2 md:col-span-3" />
                      </div>
                      <div className="mt-2 flex gap-2">
                        <button onClick={saveEdit} className="px-3 py-1 bg-sky-600 text-white rounded">Lưu</button>
                        <button onClick={cancelEdit} className="px-3 py-1 border rounded">Hủy</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {tasks.length === 0 && <div className="text-gray-500 text-sm">Chưa có nhiệm vụ</div>}
            </div>
          </div>
        </div>
        <div className="w-72"></div>
      </div>
    </div>
  );
}
