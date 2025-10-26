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
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  const [newPost, setNewPost] = useState("");
  const [file, setFile] = useState(null); // chỉ cho bài đăng mới

  const [editingPost, setEditingPost] = useState(null); // { id, content, image, removeImage }
  const [editFile, setEditFile] = useState(null); // ảnh cho bài đang sửa
  const [editContent, setEditContent] = useState(""); // nội dung sửa

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

  // 🟢 Đăng bài mới
  const handleAddPost = async (e) => {
    e.preventDefault();
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

  // 🔴 Xoá bài viết
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

  // ✏️ Bắt đầu sửa
  const handleStartEdit = (post) => {
    setEditingPost({ id: post.id, removeImage: false });
    setEditContent(post.content);
    setEditFile(null);
    const el = document.getElementById(`post-${post.id}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  // 💾 Lưu chỉnh sửa
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

  // ❌ Huỷ chỉnh sửa
  const handleCancelEdit = () => {
    setEditingPost(null);
    setEditFile(null);
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    window.location.href = "/auth";
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* NAV */}
      <div className="fixed top-0 left-0 w-full z-50">
        <Navbar user={user} onLogout={handleLogout} />
      </div>

      <div className="flex flex-1 mt-16">
        <div className="w-64 fixed left-0">
          <Sidebar />
        </div>

        <main className="flex-1 p-6 pt-1 bg-gray-50 overflow-y-auto">
          <div className="max-w-4xl mx-auto">
            <Midbar />
            <CreatePost
              user={user}
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
                <div id={`post-${p.id}`} key={p.id}>
                  {editingPost?.id === p.id ? (
                    <div className="bg-white p-4 rounded-md shadow-sm border border-gray-200 mb-4">
                      {/* Nhập nội dung */}
                      <textarea
                        rows="3"
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md resize-none mb-3"
                      />

                      {/* Hiển thị ảnh cũ */}
                      {p.image && !editingPost.removeImage && !editFile && (
                        <div className="relative mb-3">
                          <img
                            src={`http://localhost:5000/uploads/${p.image}`}
                            alt="post"
                            className="rounded-md max-h-60 object-cover w-full"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setEditingPost({ ...editingPost, removeImage: true })
                            }
                            className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded hover:bg-black"
                          >
                            ✕
                          </button>
                        </div>
                      )}

                      {/* Ảnh mới (nếu chọn) */}
                      {editFile && (
                        <div className="relative mb-3">
                          <img
                            src={URL.createObjectURL(editFile)}
                            alt="preview"
                            className="rounded-md max-h-60 object-cover w-full"
                          />
                          <button
                            type="button"
                            onClick={() => setEditFile(null)}
                            className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-md hover:bg-red-600"
                          >
                            ✕
                          </button>
                        </div>
                      )}

                      {/* Chọn ảnh mới */}
                      <div className="mb-3">
                        <label
                          htmlFor="editImage"
                          className="flex items-center gap-1 text-sky-600 cursor-pointer hover:text-sky-700 text-sm"
                        >
                          🖼 <span>Chọn ảnh mới</span>
                        </label>
                        <input
                          id="editImage"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => setEditFile(e.target.files[0])}
                        />
                      </div>

                      {/* Nút hành động */}
                      <div className="flex justify-end gap-2">
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
