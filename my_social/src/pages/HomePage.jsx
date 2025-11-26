import { useEffect, useState } from "react";
import axios from "axios";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import Rightbar from "../components/Rightbar";
import CreatePost from "../components/CreatePost";
import Midbar from "../components/Midbar";
import EditablePost from "../components/EditablePost";
import { useContext } from "react";
import { UserContext } from "../context/UserContext";

export default function HomePage() {
  const [posts, setPosts] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  const [newPost, setNewPost] = useState("");
  const [files, setFiles] = useState([]); // nhiều ảnh cho bài đăng mới

  const [editingPost, setEditingPost] = useState(null); // { id, content, images, removeImages }
  const [editFiles, setEditFiles] = useState([]); // nhiều ảnh cho bài đang sửa
  const [keepImages, setKeepImages] = useState([]); // ảnh cũ muốn giữ lại
  const [editContent, setEditContent] = useState(""); // nội dung sửa
  const [searchQuery, setSearchQuery] = useState("");

  const { user, logout, token } = useContext(UserContext);

  const API_URL = "http://localhost:5000/api";



  useEffect(() => {
    if (user) {
      fetchPosts();
      fetchUsers();
    }
  }, [user]);
  
   
  const fetchPosts = async () => {
    try {
      const token = localStorage.getItem('token');
      const userId = user?.id || null;
      const url = userId ? `${API_URL}/posts?user_id=${userId}` : `${API_URL}/posts`;
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.get(url, { headers });
      setPosts(res.data || []);
    } catch (err) {
      console.error("Lỗi khi lấy posts:", err);
      // Nếu lỗi, vẫn set mảng rỗng để không crash
      setPosts([]);
    }
  };

  const fetchUsers = async () => {
    try {
      // API users yêu cầu token, nhưng có thể không có token
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.get(`${API_URL}/users`, { headers });
      setUsers(res.data);
    } catch (err) {
      console.error("Lỗi khi lấy users:", err);
      // Nếu lỗi 401, có thể do chưa đăng nhập hoặc token hết hạn
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
      formData.append("user_id", user.id);
      formData.append("content", newPost);
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
    if (!user || user.role !== 'admin') {
      alert('Chỉ admin mới được ghim bài viết');
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
      await axios.delete(`${API_URL}/posts/${id}`);
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
    // Giữ lại tất cả ảnh hiện có
    setKeepImages(post.images || (post.image ? [post.image] : []));
    const el = document.getElementById(`post-${post.id}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  
  const handleSaveEdit = async () => {
    if (!editingPost) return;
    const formData = new FormData();
    formData.append("content", editContent);
    
    // Thêm ảnh mới
    if (editFiles && editFiles.length > 0) {
      editFiles.forEach((file) => {
        formData.append("images", file);
      });
    }
    
    // Xử lý ảnh cũ
    if (editingPost.removeImages) {
      formData.append("removeImages", "true");
    } else if (keepImages && keepImages.length > 0) {
      // Gửi danh sách ảnh muốn giữ lại (chỉ tên file, không phải full URL)
      keepImages.forEach(img => {
        const filename = img.includes('/uploads/') ? img.split('/uploads/')[1] : img;
        formData.append("keepImages", filename);
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
        if (!searchQuery.trim()) {
          fetchPosts();
          return;
        }

        try {
          const res = await axios.get(
            `${API_URL}/posts/search?q=${encodeURIComponent(searchQuery)}`
          );
          setPosts(res.data);
        } catch (err) {
          console.error("Lỗi khi tìm kiếm:", err);
        }
      };

      search(); 
    }, 500); 

    return () => clearTimeout(delay);
  }, [searchQuery]);
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="sticky top-0 z-50">
        <Navbar
          user={user}
          onLogout={handleLogout}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />
      </div>

      <div className="flex gap-4 p-4">
        <div className="w-64">
          <div className="sticky top-16">
            <Sidebar />
          </div>
        </div>

        <main className="flex-1 bg-white p-6 rounded-md shadow-sm h-[calc(100vh-4rem)] overflow-y-auto">
          <Midbar />
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

        <div className="w-72">
          <div className="sticky top-16">
            <Rightbar
              users={users}
              pinnedPosts={posts.filter((p) => p.is_pinned)}
              onUnpin={(postId) => handleTogglePin(postId, false)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
