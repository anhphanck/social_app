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
  // store online user ids as a Set for quick lookup
  const [onlineUsers, setOnlineUsers] = useState(new Set());

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const storedToken = localStorage.getItem("token");
    if (storedUser) setUser(JSON.parse(storedUser));
    if (storedToken) setToken(storedToken);
    setLoadingUser(false);
  }, []);

  useEffect(() => {
    if (!token) {
      // Nếu không có token, disconnect socket nếu đang kết nối
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocketInstance(null);
        setSocketConnected(false);
      }
      return;
    }
    
    // Nếu đã có socket và đang kết nối, không tạo lại
    if (socketRef.current && socketRef.current.connected) {
      return;
    }
    
    // Disconnect socket cũ nếu có
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
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
      // ask server for current presence to populate onlineUsers immediately
      try {
        socket.emit('get_presence');
      } catch (e) {
        console.warn('Failed to request presence', e);
      }
      // fetch unread counts when user comes online
      if (token) {
        axios.get('http://localhost:5000/api/chats/unreads', { headers: { Authorization: `Bearer ${token}` } })
          .then((res) => setUnreadCounts(res.data || {}))
          .catch(() => {});
      }
    });
    socket.on("disconnect", () => setSocketConnected(false));
    socket.on("connect_error", (err) => console.error('Socket connect_error', err));

    socket.on("private_message", (msg) => {
      // if message is for current user and chat not open, increment unread
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
        setOnlineUsers(new Set(arr.map((id) => String(id))));
      } catch (e) {
        console.error('presence_update handling failed', e);
      }
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocketInstance(null);
      }
    };
  }, [token, user, currentChatId]);

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
    <UserContext.Provider value={{ user, setUser, token, setToken, logout, loadingUser, socket: socketInstance, socketConnected, currentChatId, setCurrentChatId, unreadCounts, setUnreadCounts, onlineUsers, setOnlineUsers }}>
      {children}
    </UserContext.Provider>
  );
};

export default UserContext;

