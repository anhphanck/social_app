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
    if (!token) return;
    if (socketRef.current) return;
    const socket = io("http://localhost:5000", { auth: { token } });
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

