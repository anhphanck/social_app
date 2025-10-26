import db from "../config/db.js";

// Lấy tất cả bài viết
export const getAllPosts = (req, res) => {
  const q = `
    SELECT posts.*, users.username, users.avatar 
    FROM posts JOIN users ON posts.user_id = users.id
    ORDER BY posts.created_at DESC
  `;
  db.query(q, (err, data) => {
    if (err) return res.status(500).json({ message: "Lỗi server" });
    res.json(data);
  });
};

// Tạo bài viết
export const createPost = (req, res) => {
  const { user_id, content, image } = req.body;
  if (!user_id || !content)
    return res.status(400).json({ message: "Thiếu nội dung" });

  const q = "INSERT INTO posts (user_id, content, image) VALUES (?, ?, ?)";
  db.query(q, [user_id, content, image || null], (err, result) => {
    if (err) return res.status(500).json({ message: "Không thể đăng bài" });
    res.json({ id: result.insertId, message: "Đăng bài thành công" });
  });
};

// Cập nhật bài viết
export const updatePost = (req, res) => {
  const { id } = req.params;
  const { content } = req.body;
  const q = "UPDATE posts SET content=? WHERE id=?";
  db.query(q, [content, id], (err) => {
    if (err) return res.status(500).json({ message: "Không thể cập nhật" });
    res.json({ message: "Cập nhật thành công" });
  });
};

// Xóa bài viết
export const deletePost = (req, res) => {
  const { id } = req.params;
  db.query("DELETE FROM posts WHERE id=?", [id], (err) => {
    if (err) return res.status(500).json({ message: "Không thể xóa" });
    res.json({ message: "Xóa thành công" });
  });
};
