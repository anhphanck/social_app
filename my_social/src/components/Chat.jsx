import { useEffect, useRef, useState, useContext } from "react";
import axios from "axios";
import { UserContext } from "../context/UserContext";

export default function Chat({ users = [] }) {
  const { user, token, socket, currentChatId, setCurrentChatId, setUnreadCounts } = useContext(UserContext);
  const [messages, setMessages] = useState([]);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const messagesRef = useRef(null);
  const API_URL = "http://localhost:5000/api";

  // create/revoke object URL for preview to avoid memory leaks
  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => {
      try { URL.revokeObjectURL(url); } catch (e) { /* ignore */ }
    };
  }, [file]);

  useEffect(() => {
    if (!currentChatId || !user) return;
    let cancelled = false;
    // auto-scroll to bottom whenever messages change
    // we'll add an effect below for scrolling; here just load messages
    (async () => {
      try {
        const res = await axios.get(`${API_URL}/chats/conversation/${user.id}/${currentChatId}`);
        if (!cancelled) setMessages(res.data || []);
      } catch (e) {
        console.error('Failed to load conversation', e);
      }
    })();

    // clear unread for this chat
    setUnreadCounts((prev) => ({ ...prev, [String(currentChatId)]: 0 }));

    const handleIncoming = (msg) => {
      const sender = msg.sender_id || msg.from;
      const receiver = msg.receiver_id || msg.to;
      // only append if it's part of this conversation
      if (String(sender) === String(currentChatId) || String(receiver) === String(currentChatId)) {
        setMessages((prev) => [...prev, msg]);
      }
    };

    const handleDeleted = (updatedMsg) => {
      // if the deleted message belongs to this conversation, update it
      const sender = updatedMsg.sender_id || updatedMsg.sender_id;
      const receiver = updatedMsg.receiver_id || updatedMsg.receiver_id;
      if (String(sender) === String(currentChatId) || String(receiver) === String(currentChatId)) {
        setMessages((prev) => prev.map((m) => (String(m.id) === String(updatedMsg.id) ? updatedMsg : m)));
      }
    };

    if (socket) {
      socket.on('private_message', handleIncoming);
      socket.on('message_deleted', handleDeleted);
    }
    return () => {
      cancelled = true;
      if (socket) socket.off('private_message', handleIncoming);
      if (socket) socket.off('message_deleted', handleDeleted);
      // do not clear currentChatId here — cleanup runs on dependency changes
      // closing the chat should be handled by the UI (Close button)
    };
  }, [currentChatId, user?.id, socket]);

  // scroll to bottom when messages change
  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [messages]);

  // show other user's name instead of id
  const [otherName, setOtherName] = useState(null);
  useEffect(() => {
    if (!currentChatId) {
      setOtherName(null);
      return;
    }
    
    // Tìm user trong danh sách users đã có (từ Rightbar)
    if (users && users.length > 0) {
      const found = users.find((u) => String(u.id) === String(currentChatId));
      if (found) {
        setOtherName(found.username);
        return;
      }
    }
    
    // Nếu không tìm thấy trong danh sách, fetch từ API
    (async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await axios.get(`${API_URL}/users`, { headers });
        const found = (res.data || []).find((u) => String(u.id) === String(currentChatId));
        setOtherName(found ? found.username : `User ${currentChatId}`);
      } catch (e) {
        console.warn('Failed to fetch users for name', e);
        // Nếu không fetch được, hiển thị ID
        setOtherName(`User ${currentChatId}`);
      }
    })();
  }, [currentChatId, users]);

  const send = async () => {
    if (!text.trim() && !file) return;
    let attachment = null;
    if (file) {
      const fd = new FormData(); fd.append('file', file);
      try { const r = await axios.post(`${API_URL}/chats/upload`, fd, { headers: { Authorization: `Bearer ${token}` } }); attachment = r.data; } catch (e) { console.error('Upload failed', e); }
    }
    const payload = { to: currentChatId, content: text, file_url: attachment?.file_url || null, file_type: attachment?.file_type || null };
    const clientId = `tmp-${Date.now()}`;
    setMessages((prev) => [...prev, { id: clientId, sender_id: user.id, receiver_id: currentChatId, content: payload.content, file_url: payload.file_url, created_at: new Date().toISOString() }]);
    if (socket) {
      socket.emit('private_message', { ...payload, client_id: clientId }, (ack) => {
        if (ack && ack.success && ack.message) {
          const saved = ack.message;
          setMessages((prev) => prev.map((m) => (String(m.id) === String(clientId) ? saved : m)));
        } else if (ack && ack.success === false) console.error('Server failed to save message', ack.error);
      });
    }
    setText(''); setFile(null);
  };

  return currentChatId ? (
    <div className="fixed inset-0 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-2xl bg-white rounded shadow-lg overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center">
          <div className="font-semibold">Chat với {otherName || currentChatId}</div>
          <button onClick={() => setCurrentChatId(null)} className="text-sm text-sky-600">Đóng</button>
        </div>
        <div className="p-4 h-96 overflow-y-auto" ref={messagesRef}>
          {messages.map((m) => (
            <div key={m.id} className={`mb-3 ${String(m.sender_id) === String(user.id) ? 'text-right' : 'text-left'}`}>
              <div className="inline-block align-top">
                <div className={`inline-block px-3 py-2 rounded ${String(m.sender_id) === String(user.id) ? 'bg-sky-500 text-white' : 'bg-gray-100 text-gray-800'}`}>
                  {m.is_deleted ? <em className="text-sm text-gray-500">Tin nhắn đã bị xóa</em> : <>
                    {m.content}
                    {m.file_url && (
                      <div className="mt-2">
                        {(m.file_type && m.file_type.startsWith('image/')) ? (
                          <>
                            <img src={m.file_url} className="max-w-xs rounded cursor-pointer" alt="img" onClick={() => window.open(m.file_url, '_blank')} />
                            <div className="mt-1"><a href={m.file_url} download target="_blank" rel="noreferrer" className="text-sm underline">Tải file</a></div>
                          </>
                        ) : (
                          <a href={m.file_url} download target="_blank" rel="noreferrer" className="text-sm underline">Tải file</a>
                        )}
                      </div>
                    )}
                  </>}</div>

                {/* three-dot menu for sender */}
                {String(m.sender_id) === String(user.id) && !m.is_deleted && (
                  <div className="inline-block ml-2 relative">
                    <button onClick={() => setOpenMenuId((prev) => (prev === m.id ? null : m.id))} className="px-2 py-1 text-gray-600">⋯</button>
                    {openMenuId === m.id && (
                      <div className="absolute right-0 mt-1 bg-white border rounded shadow p-1 z-10">
                        <button className="text-sm text-red-600 px-3 py-1" onClick={async () => {
                          // only allow deletion for persisted messages (numeric id)
                          if (String(m.id).startsWith('tmp-')) { alert('Tin nhắn chưa được lưu, không thể xóa.'); setOpenMenuId(null); return; }
                          try {
                            const res = await axios.delete(`${API_URL}/chats/message/${m.id}`, { headers: { Authorization: `Bearer ${token}` } });
                            if (res && res.data) {
                              setMessages((prev) => prev.map((pm) => (String(pm.id) === String(res.data.id) ? res.data : pm)));
                            }
                          } catch (e) {
                            console.error('Failed to delete message', e);
                            alert('Không thể xóa tin nhắn');
                          } finally { setOpenMenuId(null); }
                        }}>Xóa</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="p-3 border-t">
          {/* file preview moved above the input row so it doesn't overlap controls */}
          {file && (
            <div className="mb-2">
              <div className="flex items-center gap-2 bg-gray-50 p-2 rounded border">
                {previewUrl ? (
                  file.type && file.type.startsWith('image/') ? (
                    <img src={previewUrl} alt={file.name} className="w-20 h-12 object-cover rounded" />
                  ) : (
                    <div className="w-20 h-12 flex items-center justify-center bg-white border rounded text-xs px-1 wrap-break-word">{file.name}</div>
                  )
                ) : null}
                <div className="text-sm">
                  <div className="font-medium">{file.name}</div>
                  <div className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</div>
                </div>
                <div className="ml-auto">
                  <button onClick={() => setFile(null)} className="text-red-500 text-sm px-2">Hủy</button>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2 items-center">
            <input value={text} onChange={(e) => setText(e.target.value)} className="flex-1 p-2 border rounded" placeholder="Gõ tin nhắn..." />
            <label className="px-3 py-2 bg-gray-100 rounded cursor-pointer">
              <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} className="hidden" /> Chọn file
            </label>
            <button onClick={send} className="px-4 py-2 bg-sky-600 text-white rounded">Gửi</button>
          </div>
        </div>
      </div>
    </div>
  ) : null;
}
