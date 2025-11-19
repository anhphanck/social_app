import db from "../config/db.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../uploads")); 
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueName + path.extname(file.originalname));
  },
});

export const upload = multer({ storage });

export const getAllPosts = (req, res) => {
  const q = `
    SELECT posts.*, users.username, users.avatar 
    FROM posts 
    JOIN users ON posts.user_id = users.id
    ORDER BY posts.created_at DESC
  `;
  db.query(q, (err, data) => {
    if (err) return res.status(500).json({ message: "Lỗi server" });

    const updated = data.map((post) => ({
      ...post,
      image: post.image ? `http://localhost:5000/uploads/${post.image}` : null,
    }));

    res.json(updated);
  });
};

export const createPost = (req, res) => {
  const { user_id, content } = req.body;
  const image = req.file ? req.file.filename : null;

  if (!user_id || (!content && !image))
    return res.status(400).json({ message: "Thiếu nội dung hoặc ảnh" });

  const q = "INSERT INTO posts (user_id, content, image) VALUES (?, ?, ?)";
  db.query(q, [user_id, content, image], (err, result) => {
    if (err) {
      console.error("❌ Lỗi khi thêm bài viết:", err);
      return res.status(500).json({ message: "Không thể đăng bài" });
    }

    res.json({
      message: "Đăng bài thành công",
      post: {
        id: result.insertId,
        user_id,
        content,
        image: image ? `http://localhost:5000/uploads/${image}` : null,
      },
    });
  });
};

export const updatePost = (req, res) => {
  const { id } = req.params;
  const { content, removeImage } = req.body;
  const newImage = req.file ? req.file.filename : null;

  db.query("SELECT image FROM posts WHERE id=?", [id], (err, result) => {
    if (err) return res.status(500).json({ message: "Lỗi lấy bài viết" });
    if (result.length === 0) return res.status(404).json({ message: "Không tìm thấy bài viết" });

    const oldImage = result[0].image;

    if (removeImage && oldImage) {
      const filePath = path.join(__dirname, "../uploads", oldImage);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    if (newImage && oldImage) {
      const filePath = path.join(__dirname, "../uploads", oldImage);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    let q = "UPDATE posts SET content=?";
    const params = [content];

    if (removeImage) {
      q += ", image=NULL";
    } else if (newImage) {
      q += ", image=?";
      params.push(newImage);
    }

    q += " WHERE id=?";
    params.push(id);

    db.query(q, params, (err) => {
      if (err) return res.status(500).json({ message: "Không thể cập nhật" });
      res.json({ message: "Cập nhật thành công" });
    });
  });
};

export const deletePost = (req, res) => {
  const postId = req.params.id;

  db.query("SELECT image FROM posts WHERE id=?", [postId], (err, data) => {
    if (err) return res.status(500).json({ message: "Lỗi lấy ảnh" });
    if (data.length === 0) return res.status(404).json({ message: "Không tìm thấy bài viết" });

    const oldImage = data[0].image;

    if (oldImage) {
      const filePath = path.join(__dirname, "../uploads", oldImage);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log("🗑 Đã xóa ảnh:", oldImage);
      }
    }

    db.query("DELETE FROM posts WHERE id=?", [postId], (err) => {
      if (err) return res.status(500).json({ message: "Lỗi xóa bài viết" });
      res.json({ message: "Đã xóa bài viết và ảnh" });
    });
  });
};

// 🔍 Tìm kiếm bài viết theo nội dung hoặc tên người dùng
export const searchPosts = (req, res) => {
  const { q } = req.query; // lấy từ khóa từ URL: /api/posts/search?q=abc
  if (!q) return res.status(400).json({ message: "Thiếu từ khóa tìm kiếm" });

  const sql = `
    SELECT posts.*, users.username, users.avatar
    FROM posts
    JOIN users ON posts.user_id = users.id
    WHERE posts.content LIKE ? OR users.username LIKE ?
    ORDER BY posts.created_at DESC
  `;

  const keyword = `%${q}%`;

  db.query(sql, [keyword, keyword], (err, data) => {
    if (err) {
      console.error("Lỗi tìm kiếm:", err);
      return res.status(500).json({ message: "Lỗi server khi tìm kiếm" });
    }

    const updated = data.map((post) => ({
      ...post,
      image: post.image ? `http://localhost:5000/uploads/${post.image}` : null,
    }));

    res.json(updated);
  });
};
