import { useContext, useEffect, useState } from "react";
import axios from "axios";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import { UserContext } from "../context/UserContext";
import { API_URL } from "../config/env";

export default function TasksPage() {
  const { user, token, selectedClass } = useContext(UserContext);
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
  const [editTaskId, setEditTaskId] = useState(null);
  const [editPriority, setEditPriority] = useState("medium");
  const [editDeadline, setEditDeadline] = useState("");
  const [editAssignees, setEditAssignees] = useState([]);
  const [editDescription, setEditDescription] = useState("");
  const [newAssignedTaskIds, setNewAssignedTaskIds] = useState(new Set());
  const [ackUpdates, setAckUpdates] = useState({});
  const [lastStatus, setLastStatus] = useState({});
  const [gradeInputs] = useState({});
  const [feedbackInputs] = useState({});
  const [gradePerUser, setGradePerUser] = useState({});
  const [feedbackPerUser, setFeedbackPerUser] = useState({});
  const handleDownload = async (e, file, type = 'attachment') => {
    e.preventDefault();
    if (file.id) {
      window.location.href = `${API_URL}/tasks/download/${file.id}?type=${type}`;
    } else {
      window.open(file.url, '_blank');
    }
  };

  useEffect(() => {
    const loadUsers = async () => {
      try {
        if (!token) return;
        let url = `${API_URL}/users`;
        if (user?.role === "teacher" || user?.role === "admin") {
          if (selectedClass) url += `?class=${encodeURIComponent(selectedClass)}`;
        }
        const res = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
        const list = Array.isArray(res.data) ? res.data : [];
        setUsers(list.filter((u) => String(u.role || 'user') === 'user'));
      } catch { console.warn(''); }
    };
    loadUsers();
  }, [token, user?.role, selectedClass]);

  useEffect(() => {
    const run = async () => {
      if (!token) return;
      try {
        let url = `${API_URL}/tasks`;
        if (user?.role === "teacher" || user?.role === "admin") {
          if (selectedClass) url += `?class=${encodeURIComponent(selectedClass)}`;
        }
        const res = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
        setTasks(res.data || []);
      } catch { console.warn(''); }
    };
    run();
  }, [token, user?.role, selectedClass]);


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
      let url = `${API_URL}/tasks`;
      if (user?.role === "teacher" || user?.role === "admin") {
        if (selectedClass) url += `?class=${encodeURIComponent(selectedClass)}`;
      }
      await axios.post(url, fd, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } });
      setTitle("");
      setDescription("");
      setPriority("medium");
      setDeadline("");
      setAssignees([]);
      setFiles([]);
      try {
        let urlList = `${API_URL}/tasks`;
        if (user?.role === "teacher" || user?.role === "admin") {
          if (selectedClass) urlList += `?class=${encodeURIComponent(selectedClass)}`;
        }
        const res = await axios.get(urlList, { headers: { Authorization: `Bearer ${token}` } });
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
      setNewAssignedTaskIds((prev) => {
        const next = new Set(Array.from(prev));
        next.delete(Number(id));
        return next;
      });
      setAckUpdates((prev) => {
        const { [Number(id)]: _, ...rest } = prev;
        return rest;
      });
    } catch {
      alert('Không tải được chi tiết nhiệm vụ');
    }
  };
  const changeStatus = async (id, status) => {
    try {
      if (status === 'in_progress') {
        const fd = new FormData();
        fd.append('status', status);
        const note = submissionNotes[id] || '';
        if (note) fd.append('note', note);
        const files = submissionFiles[id] || [];
        if (!files || files.length === 0) { alert('Vui lòng đính kèm minh chứng'); return; }
        for (const f of files) fd.append('evidence', f);
        const resp = await axios.post(`${API_URL}/tasks/${id}/status`, fd, { headers: { Authorization: `Bearer ${token}` } });
        const newStatus = (resp && resp.data && resp.data.status) ? resp.data.status : null;
        if (newStatus) {
          setTasks((prev) => prev.map((t) => t.id === id ? { ...t, status: newStatus } : t));
          setLastStatus((prev) => ({ ...prev, [Number(id)]: String(newStatus) }));
          try {
            const det = await axios.get(`${API_URL}/tasks/${id}`, { headers: { Authorization: `Bearer ${token}` } });
            setDetails((prev) => ({ ...prev, [id]: det.data }));
          } catch { /* ignore */ }
        }
      } else {
        let body = { status };
        if (status === 'completed') {
          const g = gradeInputs[id];
          const f = feedbackInputs[id];
          if (g !== undefined) body.grade = g;
          if (f !== undefined) body.feedback = f;
        }
        const resp = await axios.post(`${API_URL}/tasks/${id}/status`, body, { headers: { Authorization: `Bearer ${token}` } });
        const newStatus = (resp && resp.data && resp.data.status) ? resp.data.status : null;
        if (newStatus) {
          setTasks((prev) => prev.map((t) => t.id === id ? { ...t, status: newStatus } : t));
          setLastStatus((prev) => ({ ...prev, [Number(id)]: String(newStatus) }));
          try {
            const det = await axios.get(`${API_URL}/tasks/${id}`, { headers: { Authorization: `Bearer ${token}` } });
            setDetails((prev) => ({ ...prev, [id]: det.data }));
          } catch { /* ignore */ }
        }
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

  const gradeUser = async (taskId, userId) => {
    try {
      const key = `${taskId}-${userId}`;
      const body = { user_id: userId };
      const g = gradePerUser[key];
      const f = feedbackPerUser[key];
      if (g !== undefined) body.grade = g;
      if (f !== undefined) body.feedback = f;
      await axios.post(`${API_URL}/tasks/${taskId}/grade`, body, { headers: { Authorization: `Bearer ${token}` } });
      const det = await axios.get(`${API_URL}/tasks/${taskId}`, { headers: { Authorization: `Bearer ${token}` } });
      setDetails((prev) => ({ ...prev, [taskId]: det.data }));
      alert("Đã lưu điểm/ghi chú");
    } catch (err) {
      const msg = err?.response?.data?.message || 'Không thể lưu';
      alert(msg);
    }
  };

  const deleteTask = async (id) => {
    try {
      if (!confirm('Xóa nhiệm vụ này?')) return;
      await axios.delete(`${API_URL}/tasks/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      let url = `${API_URL}/tasks`;
      if (user?.role === "teacher" || user?.role === "admin") {
        if (selectedClass) url += `?class=${encodeURIComponent(selectedClass)}`;
      }
      const res = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
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
    <div className="h-screen bg-gray-100 flex flex-col overflow-hidden">
      <div className="z-50 shrink-0">
        <Navbar />
      </div>
      <div className="flex flex-1 gap-4 p-4 overflow-hidden">
        <div className="w-64 shrink-0 overflow-y-auto">
          <Sidebar />
        </div>
        <div className="flex-1 bg-white p-6 rounded-md shadow-sm overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-xl font-semibold text-sky-700">Quản lý Task</h1>
          </div>

          {/* Giáo viên + admin được tạo nhiệm vụ */}
          {(user?.role === "admin" || user?.role === "teacher") && (
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
                <div className="mb-2">
                  <button
                    type="button"
                    onClick={() => {
                      const allIds = users.map((u) => u.id);
                      const allSelected = assignees.length === allIds.length && allIds.length > 0;
                      setAssignees(allSelected ? [] : allIds);
                    }}
                    className="px-3 py-1 rounded border"
                  >
                    {(assignees.length === users.length && users.length > 0) ? "Bỏ chọn tất cả" : "Chọn tất cả"}
                  </button>
                </div>
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
            <div className="text-sm font-semibold mb-2">{(user?.role === 'admin' || user?.role === 'teacher') ? 'Tất cả nhiệm vụ' : 'Nhiệm vụ của tôi'}</div>
            <div className="space-y-3">
              {tasks.map((t) => (
                <div key={t.id} className="relative border rounded p-3 flex items-center justify-between">
                  {newAssignedTaskIds.has(Number(t.id)) && (
                    <span className="absolute -top-2 -left-2 bg-red-500 text-white text-xs px-1.5 rounded">Mới giao</span>
                  )}
                  {user?.id === t.created_by && ackUpdates[Number(t.id)] && (
                    <span className="absolute -top-2 left-16 bg-yellow-500 text-white text-xs px-1.5 rounded">Cập nhật: {ackUpdates[Number(t.id)]}</span>
                  )}
                  <div>
                    <div className="font-semibold">{t.title}</div>
                    <div className="text-sm text-gray-600">Trạng thái: {(((lastStatus[Number(t.id)] || t.status) === 'completed') ? 'Đã hoàn thành' : (((t.submissions_count ?? (details[t.id]?.submissions?.length ?? 0)) > 0) ? 'Đã nộp' : 'Chưa nộp'))}</div>
                    {t.assignees_usernames && (
                      <div className="text-sm text-gray-600">Giao cho: {String(t.assignees_usernames)}</div>
                    )}
                    {t.deadline && <div className="text-sm text-gray-600">Deadline: {new Date(t.deadline).toLocaleString()}</div>}
                    {((t.latest_grade ?? null) !== null || (t.latest_feedback ?? null)) && (
                      <div className="text-sm text-gray-700">
                        {(t.latest_grade ?? null) !== null && <>Điểm: {t.latest_grade} </>}
                        {(t.latest_feedback ?? null) && <>| Ghi chú: {t.latest_feedback}</>}
                      </div>
                    )}
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
                                  <a href="#" onClick={(e) => handleDownload(e, f)} className="text-xs text-gray-700 underline">Tải</a>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {details[t.id].attachments && details[t.id].attachments.length === 0 && (
                          <div className="text-xs text-gray-500">Không có file được giao</div>
                        )}
                        {(user?.role !== 'admin' && user?.role !== 'teacher') && details[t.id].submissions && (
                          <div>
                            <div className="text-sm font-medium">Minh chứng đã nộp</div>
                            {(() => {
                              const mySubs = (details[t.id].submissions || []).filter((s) => Number(s.user_id) === Number(user?.id));
                              return (
                                <>
                                  <div className="flex flex-wrap gap-2 mt-1">
                                    {mySubs.map((s, idx) => (
                                      <div key={idx} className="flex items-center gap-2">
                                        <a href={s.url} target="_blank" rel="noreferrer" className="text-xs text-sky-700 underline">{s.filename}</a>
                                        <a href="#" onClick={(e) => handleDownload(e, s, 'submission')} className="text-xs text-gray-700 underline">Tải</a>
                                        {s.grade !== null && <span className="text-xs text-gray-700">Điểm: {s.grade}</span>}
                                        {s.feedback && <span className="text-xs text-gray-700">Ghi chú: {s.feedback}</span>}
                                      </div>
                                    ))}
                                  </div>
                                  {mySubs.length === 0 && (
                                    <div className="text-xs text-gray-500">Chưa có minh chứng nào được nộp</div>
                                  )}
                                  {mySubs.some((x) => x.note) && (
                                    <div className="text-xs text-gray-600 mt-1">Ghi chú: {mySubs.map((x) => x.note).filter(Boolean).join(' | ')}</div>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        )}
                        
                        {(user?.role === 'admin' || user?.role === 'teacher') && details[t.id].assignees && details[t.id].assignees.length > 0 && (
                          <div>
                            <div className="text-sm font-medium mt-2">Theo từng người</div>
                            <div className="mt-1 space-y-1">
                              {details[t.id].assignees.map((a) => {
                                const userSubs = (details[t.id].submissions || []).filter((s) => Number(s.user_id) === Number(a.id));
                                const latest = userSubs.length > 0 ? userSubs.reduce((acc, cur) => (new Date(cur.created_at) > new Date(acc.created_at) ? cur : acc), userSubs[0]) : null;
                                const key = `${t.id}-${a.id}`;
                                return (
                                  <div key={a.id} className="space-y-0.5 border rounded p-2">
                                    <div className="text-sm">Giao cho: <span className="font-medium">{a.username}</span></div>
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="text-xs text-gray-700">
                                        {userSubs.length > 0 ? (
                                          <div className="space-y-1">
                                            <div>
                                              <span className="font-medium">Minh chứng:</span>{" "}
                                              <span className="inline-flex flex-wrap gap-2">
                                                {userSubs.map((s, idx) => (
                                                  <span key={idx} className="inline-flex items-center gap-1">
                                                    <a href={s.url} target="_blank" rel="noreferrer" className="text-sky-700 underline">{s.filename}</a>
                                                    <a href="#" onClick={(e) => handleDownload(e, s, 'submission')} className="text-gray-700 underline">Tải</a>
                                                  </span>
                                                ))}
                                              </span>
                                            </div>
                                            {userSubs.some((x) => x.note) && (
                                              <div>
                                                <span className="font-medium">Ghi chú minh chứng:</span>{" "}
                                                <span>{userSubs.map((x) => x.note).filter(Boolean).join(' | ')}</span>
                                              </div>
                                            )}
                                          </div>
                                        ) : (
                                          <span className="text-gray-600">Chưa nộp</span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {latest && (
                                          <>
                                            {latest.grade !== null && <span className="text-xs text-gray-700">Điểm: {latest.grade}</span>}
                                            {latest.feedback && <span className="text-xs text-gray-700">Ghi chú: {latest.feedback}</span>}
                                          </>
                                        )}
                                        <input
                                          type="number"
                                          placeholder="Điểm"
                                          className="border rounded px-2 py-1 w-20"
                                          value={gradePerUser[key] ?? ''}
                                          onChange={(e) => setGradePerUser((prev) => ({ ...prev, [key]: e.target.value }))}
                                        />
                                        <input
                                          type="text"
                                          placeholder="Ghi chú"
                                          className="border rounded px-2 py-1"
                                          value={feedbackPerUser[key] ?? ''}
                                          onChange={(e) => setFeedbackPerUser((prev) => ({ ...prev, [key]: e.target.value }))}
                                        />
                                        <button
                                          onClick={() => gradeUser(t.id, a.id)}
                                          className="px-3 py-1 border rounded"
                                          disabled={userSubs.length === 0}
                                        >
                                          Duyệt
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {user?.role !== 'admin' && user?.role !== 'teacher' && (t.status !== 'completed') && ((t.submissions_count ?? (details[t.id]?.submissions?.length ?? 0)) === 0) && (
                      <div className="flex flex-col gap-2">
                        <textarea
                          placeholder="Ghi chú minh chứng (tùy chọn)"
                          className="border rounded px-3 py-2"
                          value={submissionNotes[t.id] || ''}
                          onChange={(e) => setSubmissionNotes((prev) => ({ ...prev, [t.id]: e.target.value }))}
                        />
                        <div className="flex items-center gap-2">
                          <input
                            type="file"
                            multiple
                            onChange={(e) =>
                              setSubmissionFiles((prev) => ({ ...prev, [t.id]: Array.from(e.target.files || []) }))
                            }
                          />
                          <button
                            onClick={() => changeStatus(t.id, 'in_progress')}
                            disabled={!submissionFiles[t.id] || submissionFiles[t.id].length === 0}
                            className="px-3 py-1 border rounded disabled:opacity-50"
                          >
                            Nộp
                          </button>
                        </div>
                      </div>
                    )}
                    {user?.role !== 'admin' && user?.role !== 'teacher' && (t.status !== 'completed') && ((t.submissions_count ?? (details[t.id]?.submissions?.length ?? 0)) > 0) && (
                      <div className="flex flex-col gap-2">
                        <textarea
                          placeholder="Ghi chú minh chứng (tùy chọn)"
                          className="border rounded px-3 py-2"
                          value={submissionNotes[t.id] || ''}
                          onChange={(e) => setSubmissionNotes((prev) => ({ ...prev, [t.id]: e.target.value }))}
                        />
                        <div className="flex items-center gap-2">
                          <input
                            type="file"
                            multiple
                            onChange={(e) =>
                              setSubmissionFiles((prev) => ({ ...prev, [t.id]: Array.from(e.target.files || []) }))
                            }
                          />
                          <button
                            onClick={() => changeStatus(t.id, 'in_progress')}
                            disabled={!submissionFiles[t.id] || submissionFiles[t.id].length === 0}
                            className="px-3 py-1 border rounded disabled:opacity-50"
                          >
                            Nộp lại
                          </button>
                        </div>
                      </div>
                    )}
                    {(user?.role === 'admin' || user?.role === 'teacher') && (
                      <>
                        <button onClick={() => deleteTask(t.id)} className="px-3 py-1 border rounded text-red-700">Xóa</button>
                        <button onClick={() => openEdit(t)} className="px-3 py-1 border rounded">Sửa</button>
                      </>
                    )}
                  </div>
                  {(user?.role === 'admin' || user?.role === 'teacher') && editTaskId === t.id && (
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
        <div className="w-72 shrink-0"></div>
      </div>
    </div>
  );
}
