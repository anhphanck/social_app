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

export const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB per file
});

export const getAllPosts = (req, res) => {
  const userId = req.query.user_id || null;

  const q = `
    SELECT 
      posts.*, 
      users.username, 
      users.avatar,

      -- cảm xúc của người dùng hiện tại
      (SELECT reaction 
         FROM post_reactions 
         WHERE post_id = posts.id AND user_id = ?) AS user_reaction,

      -- đếm theo từng loại reaction
      (SELECT COUNT(*) FROM post_reactions WHERE post_id = posts.id AND reaction = 'like') AS like_count,
      (SELECT COUNT(*) FROM post_reactions WHERE post_id = posts.id AND reaction = 'love') AS love_count,
      (SELECT COUNT(*) FROM post_reactions WHERE post_id = posts.id AND reaction = 'haha') AS haha_count,
      (SELECT COUNT(*) FROM post_reactions WHERE post_id = posts.id AND reaction = 'sad') AS sad_count

    FROM posts
    JOIN users ON posts.user_id = users.id
    ORDER BY posts.created_at DESC
  `;

  db.query(q, [userId], (err, data) => {
    if (err) return res.status(500).json({ message: "Lỗi server" });

    // Lấy tất cả ảnh cho các posts
    const postIds = data.map(p => p.id);
    if (postIds.length === 0) {
      // Nếu không có posts, trả về mảng rỗng với format đúng
      return res.json(data.map((post) => ({
        ...post,
        images: post.image ? [`http://localhost:5000/uploads/${post.image}`] : [],
        image: post.image ? `http://localhost:5000/uploads/${post.image}` : null,
        is_pinned: Boolean(post.is_pinned),
        reactions: {
          like: post.like_count || 0,
          love: post.love_count || 0,
          haha: post.haha_count || 0,
          sad: post.sad_count || 0
        }
      })));
    }

    // Kiểm tra xem bảng post_images có tồn tại không
    const imageQuery = `SELECT post_id, image FROM post_images WHERE post_id IN (${postIds.join(',')}) ORDER BY id ASC`;
    db.query(imageQuery, (imgErr, images) => {
      // Nếu bảng chưa tồn tại, chỉ dùng ảnh cũ
      if (imgErr) {
        console.warn("Bảng post_images chưa tồn tại hoặc lỗi:", imgErr.message);
        const updated = data.map((post) => ({
          ...post,
          images: post.image ? [`http://localhost:5000/uploads/${post.image}`] : [],
          image: post.image ? `http://localhost:5000/uploads/${post.image}` : null,
          is_pinned: Boolean(post.is_pinned),
          reactions: {
            like: post.like_count || 0,
            love: post.love_count || 0,
            haha: post.haha_count || 0,
            sad: post.sad_count || 0
          }
        }));
        return res.json(updated);
      }

      // Nhóm ảnh theo post_id
      const imagesByPost = {};
      images.forEach(img => {
        if (!imagesByPost[img.post_id]) {
          imagesByPost[img.post_id] = [];
        }
        imagesByPost[img.post_id].push(`http://localhost:5000/uploads/${img.image}`);
      });

      const updated = data.map((post) => ({
        ...post,
        // Lấy ảnh từ post_images, nếu không có thì fallback về image cũ (backward compatible)
        images: imagesByPost[post.id] || (post.image ? [`http://localhost:5000/uploads/${post.image}`] : []),
        image: imagesByPost[post.id]?.[0] || (post.image ? `http://localhost:5000/uploads/${post.image}` : null), // Giữ lại cho backward compatible
        is_pinned: Boolean(post.is_pinned),
        // gộp các reaction vào object
        reactions: {
          like: post.like_count,
          love: post.love_count,
          haha: post.haha_count,
          sad: post.sad_count
        }
      }));

      res.json(updated);
    });
  });
};


export const createPost = (req, res) => {
  const { user_id, content } = req.body;
  const files = req.files || [];
  const images = files.map(f => f.filename);

  if (!user_id || (!content && images.length === 0))
    return res.status(400).json({ message: "Thiếu nội dung hoặc ảnh" });

  // Tạo post
  const q = "INSERT INTO posts (user_id, content, image) VALUES (?, ?, ?)";
  const firstImage = images.length > 0 ? images[0] : null; // Giữ lại image cho backward compatible
  
  db.query(q, [user_id, content, firstImage], (err, result) => {
    if (err) {
      console.error("Lỗi khi thêm bài viết:", err);
      return res.status(500).json({ message: "Không thể đăng bài" });
    }

    const postId = result.insertId;

    // Lưu nhiều ảnh vào bảng post_images
    if (images.length > 0) {
      const imageValues = images.map(img => [postId, img]);
      const insertImagesQuery = "INSERT INTO post_images (post_id, image) VALUES ?";
      
      db.query(insertImagesQuery, [imageValues], (imgErr) => {
        if (imgErr) {
          console.error("Lỗi khi lưu ảnh:", imgErr);
          // Vẫn trả về success nhưng log lỗi
        }

        res.json({
          message: "Đăng bài thành công",
          post: {
            id: postId,
            user_id,
            content,
            images: images.map(img => `http://localhost:5000/uploads/${img}`),
            image: images[0] ? `http://localhost:5000/uploads/${images[0]}` : null,
          },
        });
      });
    } else {
      res.json({
        message: "Đăng bài thành công",
        post: {
          id: postId,
          user_id,
          content,
          images: [],
          image: null,
        },
      });
    }
  });
};

export const updatePost = (req, res) => {
  const { id } = req.params;
  const { content, removeImages, keepImages } = req.body;
  const newFiles = req.files || [];
  const newImages = newFiles.map(f => f.filename);

  db.query("SELECT image FROM posts WHERE id=?", [id], (err, result) => {
    if (err) return res.status(500).json({ message: "Lỗi lấy bài viết" });
    if (result.length === 0) return res.status(404).json({ message: "Không tìm thấy bài viết" });

    // Xóa ảnh cũ nếu cần
    if (removeImages === "true" || (Array.isArray(keepImages) && keepImages.length === 0 && newImages.length > 0)) {
      // Lấy tất cả ảnh cũ
      db.query("SELECT image FROM post_images WHERE post_id=?", [id], (imgErr, oldImages) => {
        if (!imgErr && oldImages) {
          oldImages.forEach(img => {
            const filePath = path.join(__dirname, "../uploads", img.image);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
          });
        }
        // Xóa tất cả ảnh cũ
        db.query("DELETE FROM post_images WHERE post_id=?", [id]);
      });
    } else if (Array.isArray(keepImages) && keepImages.length > 0) {
      // Xóa ảnh không được giữ lại
      db.query("SELECT image FROM post_images WHERE post_id=?", [id], (imgErr, oldImages) => {
        if (!imgErr && oldImages) {
          oldImages.forEach(img => {
            if (!keepImages.includes(img.image)) {
              const filePath = path.join(__dirname, "../uploads", img.image);
              if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
              db.query("DELETE FROM post_images WHERE post_id=? AND image=?", [id, img.image]);
            }
          });
        }
      });
    }

    // Cập nhật content
    let q = "UPDATE posts SET content=?";
    const params = [content];

    // Cập nhật image đầu tiên cho backward compatible
    if (newImages.length > 0) {
      q += ", image=?";
      params.push(newImages[0]);
    } else if (removeImages === "true") {
      q += ", image=NULL";
    }

    q += " WHERE id=?";
    params.push(id);

    db.query(q, params, (err) => {
      if (err) return res.status(500).json({ message: "Không thể cập nhật" });

      // Thêm ảnh mới
      if (newImages.length > 0) {
        const imageValues = newImages.map(img => [id, img]);
        const insertImagesQuery = "INSERT INTO post_images (post_id, image) VALUES ?";
        db.query(insertImagesQuery, [imageValues], (imgErr) => {
          if (imgErr) console.error("Lỗi khi lưu ảnh mới:", imgErr);
        });
      }

      res.json({ message: "Cập nhật thành công" });
    });
  });
};

export const deletePost = (req, res) => {
  const postId = req.params.id;

  // Xóa tất cả ảnh từ post_images
  db.query("SELECT image FROM post_images WHERE post_id=?", [postId], (imgErr, images) => {
    if (!imgErr && images) {
      images.forEach(img => {
        const filePath = path.join(__dirname, "../uploads", img.image);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log("🗑 Đã xóa ảnh:", img.image);
        }
      });
    }

    // Xóa bài viết (CASCADE sẽ xóa post_images tự động)
    db.query("DELETE FROM posts WHERE id=?", [postId], (err) => {
      if (err) return res.status(500).json({ message: "Lỗi xóa bài viết" });
      res.json({ message: "Đã xóa bài viết và ảnh" });
    });
  });
};

export const pinPost = (req, res) => {
  const { id } = req.params;
  db.query("UPDATE posts SET is_pinned = 1 WHERE id = ?", [id], (err, result) => {
    if (err) return res.status(500).json({ message: "Không thể ghim bài viết" });
    if (result.affectedRows === 0) return res.status(404).json({ message: "Không tìm thấy bài viết" });
    res.json({ message: "Đã ghim bài viết" });
  });
};

export const unpinPost = (req, res) => {
  const { id } = req.params;
  db.query("UPDATE posts SET is_pinned = 0 WHERE id = ?", [id], (err, result) => {
    if (err) return res.status(500).json({ message: "Không thể gỡ ghim bài viết" });
    if (result.affectedRows === 0) return res.status(404).json({ message: "Không tìm thấy bài viết" });
    res.json({ message: "Đã gỡ ghim bài viết" });
  });
};

export const searchPosts = (req, res) => {
  const { q } = req.query; 
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

//Like bài viết
export const reactPost = (req, res) => {
  const { post_id, user_id, reaction } = req.body;

  const sql = `
    INSERT INTO post_reactions (post_id, user_id, reaction)
    VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE reaction = VALUES(reaction)
  `;

  db.query(sql, [post_id, user_id, reaction], (err) => {
    if (err) return res.status(500).json({ message: "Lỗi reaction" });
    res.json({ message: "Đã phản ứng", reaction });
  });
};


// Bỏ like
export const removeReact = (req, res) => {
  const { post_id, user_id } = req.body;

  db.query(
    "DELETE FROM post_reactions WHERE post_id=? AND user_id=?",
    [post_id, user_id],
    (err) => {
      if (err) return res.status(500).json({ message: "Lỗi bỏ reaction" });
      res.json({ message: "Đã bỏ phản ứng" });
    }
  );
};

