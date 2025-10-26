// src/pages/HomePage.jsx
import { useEffect, useState } from "react";
import axios from "axios";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import Rightbar from "../components/Rightbar";
import CreatePost from "../components/CreatePost";
import PostCard from "../components/PostCard";
import Midbar from "../components/Midbar";
export default function HomePage() {
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState("");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingPost, setEditingPost] = useState(null); // { id, content }
  const user = JSON.parse(localStorage.getItem("user"));
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

  const handleAddPost = async () => {
    if (!newPost.trim()) return;
    setLoading(true);
    try {
      await axios.post(`${API_URL}/posts`, { user_id: user.id, content: newPost });
      // ⏳ Giả lập thêm độ trễ 2 giây (hiệu ứng chờ)
    await new Promise(resolve => setTimeout(resolve, 2000));
      setNewPost("");
      fetchPosts();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc muốn xoá bài viết này không?")) return;
    try {
      await axios.delete(`${API_URL}/posts/${id}`);
      fetchPosts();
    } catch (err) {
      console.error(err);
    }
  };

  // gọi khi nhấn "Sửa" trên PostCard
  const handleStartEdit = (post) => {
    setEditingPost({ id: post.id, content: post.content });
    // scroll to that post optionally
    const el = document.getElementById(`post-${post.id}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  // lưu chỉnh sửa
  const handleSaveEdit = async () => {
    if (!editingPost?.content?.trim()) return;
    try {
      await axios.put(`${API_URL}/posts/${editingPost.id}`, {
        content: editingPost.content,
      });
      setEditingPost(null);
      fetchPosts();
    } catch (err) {
      console.error("Lỗi khi cập nhật:", err);
    }
  };

  // huỷ chỉnh sửa
  const handleCancelEdit = () => setEditingPost(null);

  const handleLogout = () => {
    localStorage.removeItem("user");
    window.location.href = "/auth";
  };

  return (
    <div className="flex flex-col min-h-screen ">
    <div className="fixed top-0 left-0 w-full z-50 ">
     <Navbar user={user} onLogout={handleLogout} />
    </div>
     
      <div className="flex flex-1 mt-16">
      
        <div className="w-64 fixed left-0">
         <Sidebar />
        </div>

        <main className="flex-1 p-6 pt-1 bg-gray-50 overflow-y-auto ">
          <div className="max-w-4xl mx-auto ">
            <Midbar />
            <CreatePost
              user={user}
              newPost={newPost}
              setNewPost={setNewPost}
              onSubmit={handleAddPost}
              loading={loading}
            />

            <div className="mt-4">
              {posts.length === 0 && (
                <p className="text-center text-gray-500">Chưa có bài viết nào.</p>
              )}

              {posts.map((p) => (
                <div id={`post-${p.id}`} key={p.id}>
                  {editingPost?.id === p.id ? (
                    <div className="bg-white p-4 rounded-md shadow-sm border border-gray-200 mb-4">
                      <textarea
                        rows="3"
                        value={editingPost.content}
                        onChange={(e) =>
                          setEditingPost({ ...editingPost, content: e.target.value })
                        }
                        className="w-full p-2 border border-gray-300 rounded-md resize-none"
                      />
                      <div className="flex justify-end gap-2 mt-2">
                        <button
                          onClick={handleCancelEdit}
                          className="px-3 py-1 border rounded text-sm"
                        >
                          Huỷ
                        </button>
                        <button
                          onClick={handleSaveEdit}
                          className="px-3 py-1 bg-green-600 text-white rounded text-sm"
                        >
                          Lưu
                        </button>
                      </div>
                    </div>
                  ) : (
                    <PostCard
                      post={p}
                      user={user}
                      onEdit={handleStartEdit}
                      onDelete={handleDelete}
                    />
                  )}
                </div>
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
