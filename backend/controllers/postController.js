import db from "../config/db.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ⚙️ Cấu hình nơi lưu ảnh
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../uploads")); // Đường dẫn tuyệt đối
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueName + path.extname(file.originalname));
  },
});

export const upload = multer({ storage });

// 🧩 Lấy tất cả bài viết
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

// 📝 Tạo bài viết (có thể có ảnh)
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

// ✏️ Cập nhật bài viết (có thể sửa nội dung & ảnh)
export const updatePost = (req, res) => {
  const { id } = req.params;
  const { content, removeImage } = req.body;
  const newImage = req.file ? req.file.filename : null;

  // 🔹 Trước khi update, lấy ảnh cũ ra để xóa nếu cần
  db.query("SELECT image FROM posts WHERE id=?", [id], (err, result) => {
    if (err) return res.status(500).json({ message: "Lỗi lấy bài viết" });
    if (result.length === 0) return res.status(404).json({ message: "Không tìm thấy bài viết" });

    const oldImage = result[0].image;

    // Nếu có yêu cầu xóa ảnh cũ
    if (removeImage && oldImage) {
      const filePath = path.join(__dirname, "../uploads", oldImage);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    // Nếu người dùng upload ảnh mới → xóa ảnh cũ đi
    if (newImage && oldImage) {
      const filePath = path.join(__dirname, "../uploads", oldImage);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    // 🔹 Tạo câu truy vấn UPDATE
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

// 🗑️ Xóa bài viết
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
