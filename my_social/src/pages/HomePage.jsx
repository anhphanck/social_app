import { useEffect, useState } from "react";
import axios from "axios";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import Rightbar from "../components/Rightbar";
import CreatePost from "../components/CreatePost";

import EditablePost from "../components/EditablePost";
import { useContext } from "react";
import { UserContext } from "../context/UserContext";

export default function HomePage() {
  const [posts, setPosts] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  const [newPost, setNewPost] = useState("");
  const [files, setFiles] = useState([]); 

  const [editingPost, setEditingPost] = useState(null); 
  const [editFiles, setEditFiles] = useState([]); 
  const [keepImages, setKeepImages] = useState([]); 
  const [editContent, setEditContent] = useState(""); 
  const [searchQuery, setSearchQuery] = useState("");

  const { user, logout, token, selectedClass } = useContext(UserContext);

  const API_URL = "http://localhost:5000/api";



  useEffect(() => {
    if (user) {
      if (!searchQuery.trim()) {
        fetchPosts();
      }
      fetchUsers();
    }
  }, [user, selectedClass]); 

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pid = params.get('postId');
    if (!pid) return;
    const el = document.getElementById(`post-${pid}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [posts]);
  
   
  const fetchPosts = async () => {
    try {
      const token = localStorage.getItem('token');
      const userId = user?.id || null;
      
      
      
      
      let classToFilter = null;
      if (user?.role === 'teacher' && selectedClass) {
        classToFilter = selectedClass;
      } else if (user?.role === 'user' && user?.class) {
        classToFilter = user.class;
      }
      
      let url = userId ? `${API_URL}/posts?user_id=${userId}` : `${API_URL}/posts`;
      if (classToFilter) {
        url += `&class=${classToFilter}`;
      }
      
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.get(url, { headers });
      setPosts(res.data || []);
    } catch (err) {
      console.error("Lỗi khi lấy posts:", err);
      
      setPosts([]);
    }
  };

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      let classToFilter = null;
      if (user?.role === 'teacher' && selectedClass) {
        classToFilter = selectedClass;
      } else if (user?.role === 'user' && user?.class) {
        classToFilter = user.class;
      }
      let url = `${API_URL}/users`;
      if (classToFilter) {
        url += `?class=${classToFilter}`;
      }
      const res = await axios.get(url, { headers });
      setUsers(res.data);
    } catch (err) {
      console.error("Lỗi khi lấy users:", err);
      if (err.response?.status === 401) {
        console.warn("Token không hợp lệ, cần đăng nhập lại");
      }
    }
  };

  const handleAddPost = async (e, filesToUpload) => {
    e.preventDefault();
    if (!user) return;
    if (!newPost.trim() && (!filesToUpload || filesToUpload.length === 0)) return;
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("content", newPost);
      
      if ((user?.role === 'teacher' || user?.role === 'admin') && selectedClass) {
        formData.append("class", selectedClass);
      }

      if (filesToUpload && filesToUpload.length > 0) {
        filesToUpload.forEach((file) => {
          formData.append("images", file);
        });
      }
      
      await axios.post(`${API_URL}/posts`, formData, {
        headers: { 
          "Content-Type": "multipart/form-data",
          ...(token && { Authorization: `Bearer ${token}` })
        },
      });
      await new Promise(resolve => setTimeout(resolve, 1000));
      setNewPost("");
      setFiles([]);
      fetchPosts();
    } catch (err) {
      console.error("Lỗi khi đăng bài:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePin = async (postId, shouldPin) => {
    
    if (!user || (user.role !== 'admin' && user.role !== 'teacher')) {
      alert('Chỉ giáo viên hoặc admin mới được ghim bài viết');
      return;
    }
    if (!token) return;
    if (!shouldPin) {
      const confirmed = window.confirm('Bạn có chắc muốn gỡ ghim bài viết này?');
      if (!confirmed) return;
    }
    try {
      await axios.post(
        `${API_URL}/posts/${postId}/${shouldPin ? 'pin' : 'unpin'}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      fetchPosts();
    } catch (err) {
      console.error('Lỗi cập nhật trạng thái ghim:', err);
      alert(err.response?.data?.message || 'Không thể cập nhật trạng thái ghim');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc muốn xoá bài viết này không?")) return;
    try {
      await axios.delete(`${API_URL}/posts/${id}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      await new Promise(resolve => setTimeout(resolve, 1000));
      fetchPosts(); 
    } catch (err) {
      console.error(err);
    }
  };


  const handleStartEdit = (post) => {
    setEditingPost({ id: post.id, removeImages: false });
    setEditContent(post.content);
    setEditFiles([]);
    
    setKeepImages(post.images || (post.image ? [post.image] : []));
    const el = document.getElementById(`post-${post.id}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  
  const handleSaveEdit = async () => {
    if (!editingPost) return;
    const formData = new FormData();
    formData.append("content", editContent);
    
    
    if (editFiles && editFiles.length > 0) {
      editFiles.forEach((file) => {
        formData.append("images", file);
      });
    }
    
    
    if (editingPost.removeImages) {
      formData.append("removeImages", "true");
    } else if (keepImages && keepImages.length > 0) {
      keepImages.forEach(img => {
        formData.append("keepImages", img);
      });
    }

    try {
      await axios.put(`${API_URL}/posts/${editingPost.id}`, formData, {
        headers: { 
          "Content-Type": "multipart/form-data",
          ...(token && { Authorization: `Bearer ${token}` })
        },
      });
      await new Promise(resolve => setTimeout(resolve, 2000));
      setEditingPost(null);
      setEditFiles([]);
      setKeepImages([]);
      setEditContent("");
      fetchPosts();
    } catch (err) {
      console.error("Lỗi khi lưu chỉnh sửa:", err);
    }
  };

  const handleCancelEdit = () => {
    setEditingPost(null);
    setEditFiles([]);
    setKeepImages([]);
  };

  const handleLogout = () => {
    logout();
    window.location.href = "/auth";
  };
  useEffect(() => {
    const delay = setTimeout(() => {
      const search = async () => {
        const q = searchQuery.trim();
        if (!q) {
          fetchPosts();
          return;
        }
        try {
          let classToFilter = null;
          if (user?.role === 'teacher' && selectedClass) {
            classToFilter = selectedClass;
          } else if (user?.role === 'user' && user?.class) {
            classToFilter = user.class;
          }
          const token = localStorage.getItem('token');
          const userId = user?.id || null;
          let url = `${API_URL}/posts/search?q=${encodeURIComponent(q)}${userId ? `&user_id=${userId}` : ""}`;
          if (classToFilter) {
            url += `&class=${classToFilter}`;
          }
          const headers = token ? { Authorization: `Bearer ${token}` } : {};
          const res = await axios.get(url, { headers });
          setPosts(res.data || []);
        } catch (err) {
          console.error("Lỗi khi tìm kiếm:", err);
        }
      };
      search();
    }, 500);
    return () => clearTimeout(delay);
  }, [searchQuery, selectedClass, user?.role, user?.class]);
  return (
    <div className="h-screen bg-gray-100 flex flex-col overflow-hidden">
      <div className="z-50 shrink-0">
        <Navbar
          user={user}
          onLogout={handleLogout}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />
      </div>

      <div className="flex flex-1 gap-4 p-4 overflow-hidden">
        <div className="w-64 shrink-0 overflow-y-auto hidden md:block">
            <Sidebar />
        </div>

        <main className="flex-1 bg-white p-6 rounded-md shadow-sm overflow-y-auto">
          
          <CreatePost
            newPost={newPost}
            setNewPost={setNewPost}
            onSubmit={handleAddPost}
            loading={loading}
            files={files}
            setFiles={setFiles}
          />

          <div className="mt-4">
            {posts.length === 0 && (
              <p className="text-center text-gray-500">Chưa có bài viết nào.</p>
            )}

            {posts.map((p) => (
              <EditablePost
                key={p.id}
                post={p}
                editingPost={editingPost}
                editContent={editContent}
                editFiles={editFiles}
                setEditFiles={setEditFiles}
                keepImages={keepImages}
                setKeepImages={setKeepImages}
                setEditContent={setEditContent}
                setEditingPost={setEditingPost}
                handleSaveEdit={handleSaveEdit}
                handleCancelEdit={handleCancelEdit}
                handleStartEdit={handleStartEdit}
                handleDelete={handleDelete}
                handleTogglePin={handleTogglePin}
              />
            ))}
          </div>
        </main>

        <div className="w-72 shrink-0 overflow-y-auto hidden lg:block">
            <Rightbar
              users={users}
              pinnedPosts={posts.filter((p) => p.is_pinned)}
              onUnpin={(postId) => handleTogglePin(postId, false)}
            />
        </div>
      </div>
    </div>
  );
}

