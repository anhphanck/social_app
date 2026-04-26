import { createContext, useState, useEffect,  } from "react";
import axios from "axios";
import { API_ORIGIN, API_URL } from "../config/env";

export const UserContext = createContext();
const SOCKET_URL = import.meta.env.VITE_API_BASE_URL || undefined;

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [unreadCounts, setUnreadCounts] = useState({});
<<<<<<< HEAD
  const [taskNotifCount, setTaskNotifCount] = useState(0);
=======
  
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  
  const [selectedClass, setSelectedClass] = useState(null);
>>>>>>> deploy_1

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

<<<<<<< HEAD
=======
  
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
    
<<<<<<< HEAD
    
    const socket = io(SOCKET_URL, { 
=======
    const socket = io(API_ORIGIN, { 
>>>>>>> deploy_2
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
<<<<<<< HEAD
        axios.get('/api/chats/unreads', { headers: { Authorization: `Bearer ${token}` } })
=======
        axios.get(`${API_URL}/chats/unreads`, { headers: { Authorization: `Bearer ${token}` } })
>>>>>>> deploy_2
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
  }, [token]);

  useEffect(() => {
    const fetchUnreads = async () => {
      try {
        if (!user || !token) return;
<<<<<<< HEAD
        const res = await axios.get('/api/chats/unreads', {
=======
        const res = await axios.get(`${API_URL}/chats/unreads`, {
>>>>>>> deploy_2
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
<<<<<<< HEAD
        const res = await axios.get('/api/tasks/notifications/unread-count', {
=======
        const res = await axios.get(`${API_URL}/tasks/notifications/unread-count`, {
>>>>>>> deploy_2
          headers: { Authorization: `Bearer ${token}` }
        });
        const n = (res && res.data && res.data.count) ? res.data.count : 0;
        setTaskNotifCount(n);
      } catch { console.warn(''); }
    };
    fetchTaskNotif();
  }, [user, token]);
>>>>>>> deploy_1

  useEffect(() => {
    const refreshProfile = async () => {
      try {
<<<<<<< HEAD
        if (!token) return;

        const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
        if (!storedUser.id) return;

        const res = await axios.get(`http://localhost:5000/api/users/${storedUser.id}`, {
=======
        if (!user || !token) return;
        if (user.avatar) return;
<<<<<<< HEAD
        const res = await axios.get(`/api/users/${user.id}`, {
>>>>>>> deploy_1
=======
        const res = await axios.get(`${API_URL}/users/${user.id}`, {
>>>>>>> deploy_2
          headers: { Authorization: `Bearer ${token}` }
        });
        
        const fetchedUser = res.data?.user;
        if (fetchedUser) {
           const merged = { ...storedUser, ...fetchedUser };
           if (JSON.stringify(merged) !== JSON.stringify(storedUser)) {
               setUser(merged);
               localStorage.setItem('user', JSON.stringify(merged));
           }
        }
      } catch (e) {
        console.warn('Failed to refresh user profile', e);
      }
    };
    
    if (token) {
        refreshProfile();
    }
  }, [token]); 

  const logout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser(null);
    setToken(null);
    setUnreadCounts({});
  };

  return (
<<<<<<< HEAD
    <UserContext.Provider value={{ user, setUser, token, setToken, logout, loadingUser, unreadCounts, setUnreadCounts, taskNotifCount, setTaskNotifCount }}>
=======
    <UserContext.Provider value={{ user, setUser, token, setToken, logout, loadingUser, socket: socketInstance, socketConnected, currentChatId, setCurrentChatId, unreadCounts, setUnreadCounts, onlineUsers, setOnlineUsers, selectedClass, setSelectedClass }}>
>>>>>>> deploy_1
      {children}
    </UserContext.Provider>
  );
};

export default UserContext;
<<<<<<< HEAD
=======


>>>>>>> deploy_1
