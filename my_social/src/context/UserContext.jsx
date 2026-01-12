import { createContext, useState, useEffect,  } from "react";
import axios from "axios";

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [taskNotifCount, setTaskNotifCount] = useState(0);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const storedToken = localStorage.getItem("token");
    if (storedUser) setUser(JSON.parse(storedUser));
    if (storedToken) setToken(storedToken);
    setLoadingUser(false);
  }, []);


  useEffect(() => {
    const refreshProfile = async () => {
      try {
        if (!token) return;

        const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
        if (!storedUser.id) return;

        const res = await axios.get(`http://localhost:5000/api/users/${storedUser.id}`, {
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
    <UserContext.Provider value={{ user, setUser, token, setToken, logout, loadingUser, unreadCounts, setUnreadCounts, taskNotifCount, setTaskNotifCount }}>
      {children}
    </UserContext.Provider>
  );
};

export default UserContext;
