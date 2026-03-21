import { createContext, useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import axios from "axios";

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [socketConnected, setSocketConnected] = useState(false);
  const socketRef = useRef(null);
  const [socketInstance, setSocketInstance] = useState(null);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [selectedClass, setSelectedClass] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const storedToken = localStorage.getItem("token");
    const storedClass = localStorage.getItem("selectedClass");
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      if (parsedUser?.role === 'teacher') {
        setSelectedClass(storedClass || 'A');
      } else if (parsedUser?.class) {
        setSelectedClass(parsedUser.class);
      }
    }
    if (storedToken) setToken(storedToken);
    setLoadingUser(false);
  }, []);

  useEffect(() => {
    if (selectedClass) {
      localStorage.setItem("selectedClass", selectedClass);
    }
  }, [selectedClass]);

  useEffect(() => {
    if (!token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocketInstance(null);
        setSocketConnected(false);
      }
      return;
    }
    
    if (socketRef.current && socketRef.current.connected) {
      return;
    }
    
    const socket = io("http://localhost:5000", { 
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });
    socketRef.current = socket;
    setSocketInstance(socket);

    socket.on("connect", () => {
      setSocketConnected(true);
      try {
        socket.emit('get_presence');
      } catch (e) {
        console.warn('Failed to request presence', e);
      }
      if (token) {
        axios.get('http://localhost:5000/api/chats/unreads', { headers: { Authorization: `Bearer ${token}` } })
          .then((res) => setUnreadCounts(res.data || {}))
          .catch(() => {});
      }
    });
    socket.on("disconnect", () => setSocketConnected(false));
    socket.on("connect_error", (err) => console.error('Socket connect_error', err));
    socket.on("private_message", (msg) => {
      const receiver = msg.receiver_id || msg.to;
      const sender = msg.sender_id || msg.from;
      if (!user) return;
      if (String(receiver) !== String(user.id)) return;
      if (String(currentChatId) === String(sender)) return;
      setUnreadCounts((prev) => ({ ...prev, [String(sender)]: (prev[String(sender)] || 0) + 1 }));
    });

    socket.on('presence_update', (payload) => {
      try {
        const arr = (payload && payload.online) || [];
        setOnlineUsers((prev) => {
          const incoming = new Set(arr.map((id) => String(id)));
          if (incoming.size !== prev.size) return incoming;
          for (const id of incoming) {
            if (!prev.has(id)) return incoming;
          }
          return prev;
        });
      } catch (e) {
        console.error('Xử lý lỗi', e);
      }
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocketInstance(null);
      }
    };
  }, [token]);

  useEffect(() => {
    const fetchUnreads = async () => {
      try {
        if (!user || !token) return;
        const res = await axios.get('http://localhost:5000/api/chats/unreads', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUnreadCounts(res.data || {});
      } catch (e) {
        console.error('Failed to fetch unread counts', e);
      }
    };
    fetchUnreads();
  }, [user, token]);

  useEffect(() => {
    const fetchTaskNotif = async () => {
      try {
        if (!user || !token) return;
        const res = await axios.get('http://localhost:5000/api/tasks/notifications/unread-count', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const n = (res && res.data && res.data.count) ? res.data.count : 0;
        setTaskNotifCount(n);
      } catch { console.warn(''); }
    };
    fetchTaskNotif();
  }, [user, token]);

  useEffect(() => {
    const refreshProfile = async () => {
      try {
        if (!user || !token) return;
        if (user.avatar) return;
        const res = await axios.get(`http://localhost:5000/api/users/${user.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const merged = { ...user, ...(res.data?.user || {}) };
        setUser(merged);
        try { localStorage.setItem('user', JSON.stringify(merged)); } catch (err) { console.warn('Persist user failed', err); }
      } catch (e) {
        console.warn('Failed to refresh user profile', e);
      }
    };
    refreshProfile();
  }, [user, token]);

  const logout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser(null);
    setToken(null);
    setUnreadCounts({});
  };

  return (
    <UserContext.Provider value={{ user, setUser, token, setToken, logout, loadingUser, socket: socketInstance, socketConnected, currentChatId, setCurrentChatId, unreadCounts, setUnreadCounts, onlineUsers, setOnlineUsers, selectedClass, setSelectedClass }}>
      {children}
    </UserContext.Provider>
  );
};

export default UserContext;

