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
  const [file, setFile] = useState(null); // chỉ cho bài đăng mới

  const [editingPost, setEditingPost] = useState(null); // { id, content, image, removeImage }
  const [editFile, setEditFile] = useState(null); // ảnh cho bài đang sửa
  const [editContent, setEditContent] = useState(""); // nội dung sửa
  const [searchQuery, setSearchQuery] = useState("");

  const { user, logout,  } = useContext(UserContext);

  const API_URL = "http://localhost:5000/api";



  useEffect(() => {
    fetchPosts();
    fetchUsers();
  }, []);
  
   
  const fetchPosts = async () => {
    try {
      const res = await axios.get(`${API_URL}/posts`);
      setPosts(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${API_URL}/users`);
      setUsers(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddPost = async (e) => {
    e.preventDefault();
    if (!user) return;
    if (!newPost.trim() && !file) return;
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("user_id", user.id);
      formData.append("content", newPost);
      if (file) formData.append("image", file);
      
      await axios.post(`${API_URL}/posts`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      await new Promise(resolve => setTimeout(resolve, 1000));
      setNewPost("");
      setFile(null);
      fetchPosts();
    } catch (err) {
      console.error("Lỗi khi đăng bài:", err);
    } finally {
      setLoading(false);
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
    setEditingPost({ id: post.id, removeImage: false });
    setEditContent(post.content);
    setEditFile(null);
    const el = document.getElementById(`post-${post.id}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  
  const handleSaveEdit = async () => {
    if (!editingPost) return;
    const formData = new FormData();
    formData.append("content", editContent);
    if (editFile) formData.append("image", editFile);
    if (editingPost.removeImage) formData.append("removeImage", "true");

    try {
      await axios.put(`${API_URL}/posts/${editingPost.id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      await new Promise(resolve => setTimeout(resolve, 2000));
      setEditingPost(null);
      setEditFile(null);
      setEditContent("");
      fetchPosts();
    } catch (err) {
      console.error("Lỗi khi lưu chỉnh sửa:", err);
    }
  };

  const handleCancelEdit = () => {
    setEditingPost(null);
    setEditFile(null);
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
    <div className="flex flex-col min-h-screen">
      {/* NAV */}
      <div className="fixed top-0 left-0 w-full z-50">
        <Navbar
         user={user} 
         onLogout={handleLogout} 
         searchQuery={searchQuery}
         setSearchQuery={setSearchQuery}
         />
         
      </div>

      <div className="flex flex-1 mt-16">
        <div className="w-64 fixed left-0">
          <Sidebar />
        </div>

        <main className="flex-1 p-6 pt-1 bg-gray-50 overflow-y-auto">
          <div className="max-w-4xl mx-auto">
            <Midbar />
            <CreatePost
              
              newPost={newPost}
              setNewPost={setNewPost}
              onSubmit={handleAddPost}
              loading={loading}
              file={file}
              setFile={setFile}
            />

            <div className="mt-4">
              {posts.length === 0 && (
                <p className="text-center text-gray-500">
                  Chưa có bài viết nào.
                </p>
              )}

              {posts.map((p) => (
                <EditablePost
                  key={p.id}
                  post={p}
                  editingPost={editingPost}
                  editContent={editContent}
                  editFile={editFile}
                  setEditFile={setEditFile}
                  setEditContent={setEditContent}
                  setEditingPost={setEditingPost}
                  handleSaveEdit={handleSaveEdit}
                  handleCancelEdit={handleCancelEdit}
                  handleStartEdit={handleStartEdit}
                  handleDelete={handleDelete}
                  
                />
              ))}
            </div>
          </div>
        </main>

        <div className="bg-gray-50 fixed right-0">
          <Rightbar users={users} />
        </div>
      </div>
    </div>
  );
}