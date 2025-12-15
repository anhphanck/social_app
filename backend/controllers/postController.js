import db from "../config/db.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import cloudinary from "../config/cloudinary.js";
import { Readable } from "stream";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storage = multer.memoryStorage();

export const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }
});

function uploadBufferToCloudinary(file, options = {}) {
  return new Promise((resolve, reject) => {
    const uploadOptions = { resource_type: "image", folder: "social_app", ...options };
    const stream = cloudinary.uploader.upload_stream(uploadOptions, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
    Readable.from(file.buffer).pipe(stream);
  });
}

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
        images: post.image ? [post.image.includes('/') ? cloudinary.url(post.image, { secure: true }) : `http://localhost:5000/uploads/${post.image}`] : [],
        image: post.image ? (post.image.includes('/') ? cloudinary.url(post.image, { secure: true }) : `http://localhost:5000/uploads/${post.image}`) : null,
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
          images: post.image ? [post.image.includes('/') ? cloudinary.url(post.image, { secure: true }) : `http://localhost:5000/uploads/${post.image}`] : [],
          image: post.image ? (post.image.includes('/') ? cloudinary.url(post.image, { secure: true }) : `http://localhost:5000/uploads/${post.image}`) : null,
          is_pinned: Boolean(post.is_pinned),
          reactions: {
            like: post.like_count || 0,
            love: post.like_count || 0,
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
        const val = img.image;
        const url = val && val.includes('/') ? cloudinary.url(val, { secure: true }) : `http://localhost:5000/uploads/${val}`;
        imagesByPost[img.post_id].push(url);
      });

      const updated = data.map((post) => ({
        ...post,
        // Lấy ảnh từ post_images, nếu không có thì fallback về image cũ (backward compatible)
        images: imagesByPost[post.id] || (post.image ? [post.image.includes('/') ? cloudinary.url(post.image, { secure: true }) : `http://localhost:5000/uploads/${post.image}`] : []),
        image: imagesByPost[post.id]?.[0] || (post.image ? (post.image.includes('/') ? cloudinary.url(post.image, { secure: true }) : `http://localhost:5000/uploads/${post.image}`) : null),
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


export const createPost = async (req, res) => {
  const authUserId = req.user && req.user.id;
  const { content } = req.body;
  const files = req.files || [];
  
  if (!authUserId || (!content && files.length === 0))
    return res.status(400).json({ message: "Thiếu nội dung hoặc ảnh" });

  // Tạo post
  try {
    const uploads = [];
    for (const f of files) {
      uploads.push(uploadBufferToCloudinary(f));
    }
    const results = await Promise.all(uploads);
    const publicIds = results.map(r => r.public_id);
    const urls = results.map(r => r.secure_url);

    const q = "INSERT INTO posts (user_id, content, image) VALUES (?, ?, ?)";
    const firstPublicId = publicIds.length > 0 ? publicIds[0] : null;

    db.query(q, [authUserId, content, firstPublicId], (err, result) => {
      if (err) {
        console.error("Lỗi khi thêm bài viết:", err);
        return res.status(500).json({ message: "Không thể đăng bài" });
      }

      const postId = result.insertId;

      if (publicIds.length > 0) {
        const imageValues = publicIds.map(pid => [postId, pid]);
        const insertImagesQuery = "INSERT INTO post_images (post_id, image) VALUES ?";
        db.query(insertImagesQuery, [imageValues], (imgErr) => {
          if (imgErr) console.error("Lỗi khi lưu ảnh:", imgErr);
        });
      }

      res.json({
        message: "Đăng bài thành công",
        post: {
          id: postId,
          user_id: authUserId,
          content,
          images: urls,
          image: urls[0] || null,
        },
      });
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Không thể đăng bài" });
  }
};

export const updatePost = (req, res) => {
  const { id } = req.params;
  const { content, removeImages, keepImages } = req.body;
  const authUserId = req.user && req.user.id;
  const newFiles = req.files || [];
  
  db.query("SELECT user_id, image FROM posts WHERE id= ?", [id], (err, result) => {
    if (err) return res.status(500).json({ message: "Lỗi lấy bài viết" });
    if (result.length === 0) return res.status(404).json({ message: "Không tìm thấy bài viết" });
    const ownerId = result[0].user_id;
    if (!authUserId || String(ownerId) !== String(authUserId)) {
      return res.status(403).json({ message: "Không có quyền sửa bài viết" });
    }

    // Xử lý danh sách ảnh giữ lại
    let keepList = [];
    if (keepImages !== undefined) {
      const raw = Array.isArray(keepImages) ? keepImages : [keepImages];
      keepList = raw.filter(Boolean).map((val) => {
        const s = String(val);
        if (s.includes("/uploads/")) return s.split("/uploads/")[1];
        if (s.includes("res.cloudinary.com")) {
          const m = s.match(/\/upload\/(?:v\d+\/)?(.+?)(\.[^\/]+)?$/);
          return m && m[1] ? m[1] : s;
        }
        return s;
      });
    }

    // Xóa ảnh cũ nếu cần
    if (removeImages === "true" || (Array.isArray(keepList) && keepList.length === 0 && newFiles.length > 0)) {
      // Lấy tất cả ảnh cũ
      db.query("SELECT image FROM post_images WHERE post_id= ?", [id], (imgErr, oldImages) => {
        if (!imgErr && oldImages) {
          oldImages.forEach(img => {
            if (String(img.image).includes('/')) {
              cloudinary.uploader.destroy(img.image).catch(() => {});
            } else {
              const filePath = path.join(__dirname, "../uploads", img.image);
              if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            }
          });
        }
        // Xóa tất cả ảnh cũ
        db.query("DELETE FROM post_images WHERE post_id= ?", [id]);
      });
    } else if (Array.isArray(keepList) && keepList.length > 0) {
      // Xóa ảnh không được giữ lại
      db.query("SELECT image FROM post_images WHERE post_id= ?", [id], (imgErr, oldImages) => {
        if (!imgErr && oldImages) {
          oldImages.forEach(img => {
            if (!keepList.includes(img.image)) {
              if (String(img.image).includes('/')) {
                cloudinary.uploader.destroy(img.image).catch(() => {});
              } else {
                const filePath = path.join(__dirname, "../uploads", img.image);
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
              }
              db.query("DELETE FROM post_images WHERE post_id= ? AND image= ?", [id, img.image]);
            }
          });
        }
      });
    }

    // Cập nhật content
    let q = "UPDATE posts SET content=?";
    const params = [content];

    // Cập nhật image đầu tiên cho backward compatible
    if (newFiles.length > 0) {
      q += ", image=?";
      params.push(null);
    } else if (removeImages === "true") {
      q += ", image=NULL";
    }

    q += " WHERE id=?";
    params.push(id);

    db.query(q, params, (err) => {
      if (err) return res.status(500).json({ message: "Không thể cập nhật" });

      // Thêm ảnh mới lên Cloudinary
      (async () => {
        if (newFiles.length > 0) {
          try {
            const results = await Promise.all(newFiles.map((f) => uploadBufferToCloudinary(f)));
            const publicIds = results.map(r => r.public_id);
            if (publicIds.length > 0) {
              const imageValues = publicIds.map(pid => [id, pid]);
              const insertImagesQuery = "INSERT INTO post_images (post_id, image) VALUES ?";
              db.query(insertImagesQuery, [imageValues], (imgErr) => {
                if (imgErr) console.error("Lỗi khi lưu ảnh mới:", imgErr);
              });
              // cập nhật image đầu tiên cho backward compatible
              db.query("UPDATE posts SET image=? WHERE id=?", [publicIds[0], id]);
            }
          } catch (e) {
            console.error("Upload ảnh mới thất bại", e);
          }
        }
      })();

      res.json({ message: "Cập nhật thành công" });
    });
  });
};

export const deletePost = (req, res) => {
  const postId = req.params.id;

  // Xóa tất cả ảnh từ post_images
  db.query("SELECT image FROM post_images WHERE post_id= ?", [postId], (imgErr, images) => {
    if (!imgErr && images) {
      images.forEach(img => {
        if (String(img.image).includes('/')) {
          cloudinary.uploader.destroy(img.image).catch(() => {});
        } else {
          const filePath = path.join(__dirname, "../uploads", img.image);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
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

    const postIds = data.map(p => p.id);
    if (postIds.length === 0) {
      return res.json(data.map((post) => ({
        ...post,
        images: post.image ? [post.image.includes('/') ? cloudinary.url(post.image, { secure: true }) : `http://localhost:5000/uploads/${post.image}`] : [],
        image: post.image ? (post.image.includes('/') ? cloudinary.url(post.image, { secure: true }) : `http://localhost:5000/uploads/${post.image}`) : null,
        is_pinned: Boolean(post.is_pinned)
      })));
    }

    const imageQuery = `SELECT post_id, image FROM post_images WHERE post_id IN (${postIds.join(',')}) ORDER BY id ASC`;
    db.query(imageQuery, (imgErr, images) => {
      if (imgErr) {
        const updated = data.map((post) => ({
          ...post,
          images: post.image ? [post.image.includes('/') ? cloudinary.url(post.image, { secure: true }) : `http://localhost:5000/uploads/${post.image}`] : [],
          image: post.image ? (post.image.includes('/') ? cloudinary.url(post.image, { secure: true }) : `http://localhost:5000/uploads/${post.image}`) : null,
          is_pinned: Boolean(post.is_pinned)
        }));
        return res.json(updated);
      }

      const imagesByPost = {};
      images.forEach(img => {
        if (!imagesByPost[img.post_id]) imagesByPost[img.post_id] = [];
        const val = img.image;
        const url = val && val.includes('/') ? cloudinary.url(val, { secure: true }) : `http://localhost:5000/uploads/${val}`;
        imagesByPost[img.post_id].push(url);
      });

      const updated = data.map((post) => ({
        ...post,
        images: imagesByPost[post.id] || (post.image ? [post.image.includes('/') ? cloudinary.url(post.image, { secure: true }) : `http://localhost:5000/uploads/${post.image}`] : []),
        image: imagesByPost[post.id]?.[0] || (post.image ? (post.image.includes('/') ? cloudinary.url(post.image, { secure: true }) : `http://localhost:5000/uploads/${post.image}`) : null),
        is_pinned: Boolean(post.is_pinned)
      }));

      res.json(updated);
    });
  });
};

//Like bài viết
export const reactPost = (req, res) => {
  const { post_id, reaction } = req.body;
  const user_id = req.user && req.user.id;

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
  const { post_id } = req.body;
  const user_id = req.user && req.user.id;

  db.query(
    "DELETE FROM post_reactions WHERE post_id=? AND user_id=?",
    [post_id, user_id],
    (err) => {
      if (err) return res.status(500).json({ message: "Lỗi bỏ reaction" });
      res.json({ message: "Đã bỏ phản ứng" });
    }
  );
};

