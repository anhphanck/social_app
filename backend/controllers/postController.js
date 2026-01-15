import db from "../config/db.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import cloudinary from "../config/cloudinary.js";
import { Readable } from "stream";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Sử dụng memoryStorage để upload lên Cloudinary
const storage = multer.memoryStorage();

export const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB per file
});

const getPostImageUrl = (image) => {
  if (!image) return null;
  if (image.includes('/') && !image.includes('\\')) {
     // Nếu có chứa / (và không phải đường dẫn window \) thì coi là Cloudinary public_id hoặc URL
     if (image.startsWith('http')) return image;
     return cloudinary.url(image, { secure: true });
  }
  // Fallback cho ảnh cũ lưu local
  return `http://localhost:5000/uploads/${image}`;
};

export const getAllPosts = async (req, res) => {
  try {
    const userId = req.query.user_id || null;
    const classParam = req.query.class || null;
    let desiredClass = null;
    if (req.user && req.user.id) {
      try {
        const [rows] = await db.promise().execute("SELECT role, class_id FROM users WHERE id = ?", [req.user.id]);
        const role = rows && rows[0] ? (rows[0].role || "user") : "user";
        const classId = rows && rows[0] ? rows[0].class_id : null;
        if (role === "user" && classId) {
          try {
            const [[c]] = await db.promise().query("SELECT code FROM classes WHERE id = ?", [classId]);
            desiredClass = c && c.code ? c.code : null;
          } catch {}
        } else if ((role === "teacher" || role === "admin") && classParam) {
          desiredClass = classParam;
        }
      } catch {}
    } else {
      if (classParam) {
        desiredClass = classParam;
      }
    }
    let whereClause = "";
    const queryParams = [userId];
    if (desiredClass) {
      whereClause = "WHERE classes.code = ?";
      queryParams.push(desiredClass);
    }
    const q = `
      SELECT 
        posts.*, 
        users.username, 
        users.avatar,
        classes.code AS class,
        (SELECT reaction FROM post_reactions WHERE post_id = posts.id AND user_id = ?) AS user_reaction,
        (SELECT COUNT(*) FROM post_reactions WHERE post_id = posts.id AND reaction = 'like') AS like_count,
        (SELECT COUNT(*) FROM post_reactions WHERE post_id = posts.id AND reaction = 'love') AS love_count,
        (SELECT COUNT(*) FROM post_reactions WHERE post_id = posts.id AND reaction = 'haha') AS haha_count,
        (SELECT COUNT(*) FROM post_reactions WHERE post_id = posts.id AND reaction = 'sad') AS sad_count
      FROM posts
      JOIN users ON posts.user_id = users.id
      LEFT JOIN classes ON posts.class_id = classes.id
      ${whereClause}
      ORDER BY posts.created_at DESC
    `;
    db.query(q, queryParams, (err, data) => {
      if (err) return res.status(500).json({ message: "Lỗi server" });
      const postIds = data.map(p => p.id);
      if (postIds.length === 0) {
        return res.json(data.map((post) => ({
          ...post,
          images: post.image ? [getPostImageUrl(post.image)] : [],
          image: post.image ? getPostImageUrl(post.image) : null,
          is_pinned: Boolean(post.is_pinned),
          reactions: {
            like: post.like_count || 0,
            love: post.love_count || 0,
            haha: post.haha_count || 0,
            sad: post.sad_count || 0
          }
        })));
      }
      const imageQuery = `SELECT post_id, image FROM post_images WHERE post_id IN (${postIds.join(',')}) ORDER BY id ASC`;
      db.query(imageQuery, (imgErr, images) => {
        if (imgErr) {
          console.warn("Bảng post_images chưa tồn tại hoặc lỗi:", imgErr.message);
          const updated = data.map((post) => ({
            ...post,
            images: post.image ? [getPostImageUrl(post.image)] : [],
            image: post.image ? getPostImageUrl(post.image) : null,
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
        const imagesByPost = {};
        images.forEach(img => {
          if (!imagesByPost[img.post_id]) {
            imagesByPost[img.post_id] = [];
          }
          imagesByPost[img.post_id].push(getPostImageUrl(img.image));
        });
        const updated = data.map((post) => ({
          ...post,
          images: imagesByPost[post.id] || (post.image ? [getPostImageUrl(post.image)] : []),
          image: imagesByPost[post.id]?.[0] || (post.image ? getPostImageUrl(post.image) : null),
          is_pinned: Boolean(post.is_pinned),
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
  } catch (e) {
    res.status(500).json({ message: "Lỗi server" });
  }
};


export const createPost = async (req, res) => {
  try {
    const authUserId = req.user && req.user.id;
    const { content } = req.body;
    const files = req.files || [];
    
    // Upload files to Cloudinary
    const uploadedImages = [];
    if (files.length > 0) {
      const uploads = files.map((f) => new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream({ resource_type: "image", folder: "social_app/posts" }, (err, result) => {
          if (err) return reject(err);
          resolve(result.public_id);
        });
        if (f.buffer) {
          Readable.from(f.buffer).pipe(stream);
        } else {
          reject(new Error("File content missing"));
        }
      }));
      
      try {
        const results = await Promise.all(uploads);
        uploadedImages.push(...results);
      } catch (e) {
        console.error("Upload error:", e);
        return res.status(500).json({ message: "Lỗi upload ảnh" });
      }
    }

    if (!authUserId || (!content && uploadedImages.length === 0))
      return res.status(400).json({ message: "Thiếu nội dung hoặc ảnh" });

    db.query("SELECT class_id FROM users WHERE id = ?", [authUserId], (userErr, userRows) => {
      if (userErr) {
        console.error("Lỗi lấy class của user:", userErr);
        return res.status(500).json({ message: "Lỗi server" });
      }

      const userClassId = userRows && userRows[0] ? userRows[0].class_id : null;

      const q = "INSERT INTO posts (user_id, content, image, class_id) VALUES (?, ?, ?, ?)";
      const firstImage = uploadedImages.length > 0 ? uploadedImages[0] : null;
      
      db.query(q, [authUserId, content, firstImage, userClassId], (err, result) => {
      if (err) {
        console.error("Lỗi khi thêm bài viết:", err);
        return res.status(500).json({ message: "Không thể đăng bài" });
      }

      const postId = result.insertId;

      // Lưu nhiều ảnh vào bảng post_images
      if (uploadedImages.length > 0) {
        const imageValues = uploadedImages.map(img => [postId, img]);
        const insertImagesQuery = "INSERT INTO post_images (post_id, image) VALUES ?";
        
        db.query(insertImagesQuery, [imageValues], (imgErr) => {
          if (imgErr) {
            console.error("Lỗi khi lưu ảnh:", imgErr);
          }

          res.json({
            message: "Đăng bài thành công",
            post: {
              id: postId,
              user_id: authUserId,
              content,
              class_id: userClassId,
              images: uploadedImages.map(img => getPostImageUrl(img)),
              image: firstImage ? getPostImageUrl(firstImage) : null,
            },
          });
        });
      } else {
        res.json({
          message: "Đăng bài thành công",
          post: {
            id: postId,
            user_id: authUserId,
            content,
            class_id: userClassId,
            images: [],
            image: null,
          },
        });
      }
      });
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Lỗi server" });
  }
};

export const updatePost = async (req, res) => {
  const { id } = req.params;
  const { content, removeImages, keepImages } = req.body;
  const authUserId = req.user && req.user.id;
  const newFiles = req.files || [];

  db.query("SELECT user_id, image FROM posts WHERE id=?", [id], async (err, result) => {
    if (err) return res.status(500).json({ message: "Lỗi lấy bài viết" });
    if (result.length === 0) return res.status(404).json({ message: "Không tìm thấy bài viết" });
    const ownerId = result[0].user_id;
    if (!authUserId || String(ownerId) !== String(authUserId)) {
      return res.status(403).json({ message: "Không có quyền sửa bài viết" });
    }

    // Upload new files
    const newImages = [];
    if (newFiles.length > 0) {
      const uploads = newFiles.map((f) => new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream({ resource_type: "image", folder: "social_app/posts" }, (err, result) => {
          if (err) return reject(err);
          resolve(result.public_id);
        });
        if (f.buffer) {
          Readable.from(f.buffer).pipe(stream);
        } else {
          reject(new Error("File content missing"));
        }
      }));
      try {
        const results = await Promise.all(uploads);
        newImages.push(...results);
      } catch (e) {
        console.error("Upload error:", e);
        return res.status(500).json({ message: "Lỗi upload ảnh mới" });
      }
    }

    // Xóa ảnh cũ nếu cần
    if (removeImages === "true" || (Array.isArray(keepImages) && keepImages.length === 0 && newImages.length > 0)) {
      // Lấy tất cả ảnh cũ
      db.query("SELECT image FROM post_images WHERE post_id=?", [id], (imgErr, oldImages) => {
        if (!imgErr && oldImages) {
          oldImages.forEach(img => {
            if (img.image.includes('/') && !img.image.startsWith('http')) {
               cloudinary.uploader.destroy(img.image);
            } else {
               const filePath = path.join(__dirname, "../uploads", img.image);
               if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            }
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
            // keepImages chứa full URL, cần extract filename/public_id để so sánh?
            // Client gửi lên keepImages là list các URL.
            // Nếu URL chứa public_id thì giữ, ko thì xóa.
            // Nhưng logic so sánh URL với DB value hơi phức tạp.
            // Giả sử client gửi keepImages là list các "image value" (filename hoặc public_id) thì dễ hơn.
            // Nếu client gửi URL, ta phải parse.
            
            // Check if img.image is inside keepImages (assuming keepImages contains raw values or we need check URL)
            // Simplification: assume keepImages contains the DB values (filename/public_id) or verify logic
            
            // Let's rely on simple string inclusion check if exact match fails
            const isKept = keepImages.some(k => k.includes(img.image));
            
            if (!isKept) {
              if (img.image.includes('/') && !img.image.startsWith('http')) {
                 cloudinary.uploader.destroy(img.image);
              } else {
                 const filePath = path.join(__dirname, "../uploads", img.image);
                 if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
              }
              db.query("DELETE FROM post_images WHERE post_id=? AND image=?", [id, img.image]);
            }
          });
        }
      });
    }

    // Cập nhật content
    let q = "UPDATE posts SET content=?";
    const params = [content];

    // Cập nhật image đầu tiên cho backward compatible (ưu tiên ảnh mới nhất hoặc ảnh cũ còn lại)
    // Logic này hơi phức tạp vì cần biết ảnh nào còn lại. 
    // Tạm thời update image=NULL nếu removeImages=true, hoặc update thành ảnh mới đầu tiên.
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
        if (img.image.includes('/') && !img.image.startsWith('http')) {
           cloudinary.uploader.destroy(img.image);
        } else {
           const filePath = path.join(__dirname, "../uploads", img.image);
           if (fs.existsSync(filePath)) {
             try { fs.unlinkSync(filePath); } catch(e) {}
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

export const searchPosts = async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ message: "Thiếu từ khóa tìm kiếm" });
  let desiredClass = null;
  const classParam = req.query.class || null;
  const viewerUserId = (req.query.user_id || (req.user && req.user.id)) || null;
  if (req.user && req.user.id) {
    try {
      const [rows] = await db.promise().execute("SELECT role, class_id FROM users WHERE id = ?", [req.user.id]);
      const role = rows && rows[0] ? (rows[0].role || "user") : "user";
      const classId = rows && rows[0] ? rows[0].class_id : null;
      if (role === "user" && classId) {
        try {
          const [[c]] = await db.promise().query("SELECT code FROM classes WHERE id = ?", [classId]);
          desiredClass = c && c.code ? c.code : null;
        } catch {}
      } else if ((role === "teacher" || role === "admin") && classParam) {
        desiredClass = classParam;
      }
    } catch {}
  } else {
    if (classParam) {
      desiredClass = classParam;
    }
  }
  const keyword = `%${q}%`;
  const whereParts = ["(posts.content LIKE ? OR users.username LIKE ?)"];
  const params = [viewerUserId, keyword, keyword];
  if (desiredClass) {
    whereParts.unshift("classes.code = ?");
    params.splice(1, 0, desiredClass);
  }
  const sql = `
    SELECT posts.*, users.username, users.avatar, classes.code AS class,
    (SELECT reaction FROM post_reactions WHERE post_id = posts.id AND user_id = ?) AS user_reaction,
    (SELECT COUNT(*) FROM post_reactions WHERE post_id = posts.id AND reaction = 'like') AS like_count,
    (SELECT COUNT(*) FROM post_reactions WHERE post_id = posts.id AND reaction = 'love') AS love_count,
    (SELECT COUNT(*) FROM post_reactions WHERE post_id = posts.id AND reaction = 'haha') AS haha_count,
    (SELECT COUNT(*) FROM post_reactions WHERE post_id = posts.id AND reaction = 'sad') AS sad_count
    FROM posts
    JOIN users ON posts.user_id = users.id
    LEFT JOIN classes ON posts.class_id = classes.id
    WHERE ${whereParts.join(" AND ")}
    ORDER BY posts.created_at DESC
  `;
  db.query(sql, params, (err, data) => {
    if (err) {
      console.error("Lỗi tìm kiếm:", err);
      return res.status(500).json({ message: "Lỗi server khi tìm kiếm" });
    }

    const postIds = data.map(p => p.id);
    if (postIds.length === 0) {
      return res.json(data.map((post) => ({
        ...post,
        images: post.image ? [getPostImageUrl(post.image)] : [],
        image: post.image ? getPostImageUrl(post.image) : null,
        is_pinned: Boolean(post.is_pinned)
      })));
    }

    const imageQuery = `SELECT post_id, image FROM post_images WHERE post_id IN (${postIds.join(',')}) ORDER BY id ASC`;
    db.query(imageQuery, (imgErr, images) => {
      if (imgErr) {
        const updated = data.map((post) => ({
          ...post,
          images: post.image ? [getPostImageUrl(post.image)] : [],
          image: post.image ? getPostImageUrl(post.image) : null,
          is_pinned: Boolean(post.is_pinned)
        }));
        return res.json(updated);
      }

      const imagesByPost = {};
      images.forEach(img => {
        if (!imagesByPost[img.post_id]) imagesByPost[img.post_id] = [];
        imagesByPost[img.post_id].push(getPostImageUrl(img.image));
      });

      const updated = data.map((post) => ({
        ...post,
        images: imagesByPost[post.id] || (post.image ? [getPostImageUrl(post.image)] : []),
        image: imagesByPost[post.id]?.[0] || (post.image ? getPostImageUrl(post.image) : null),
        is_pinned: Boolean(post.is_pinned),
        reactions: {
          like: post.like_count || 0,
          love: post.love_count || 0,
          haha: post.haha_count || 0,
          sad: post.sad_count || 0
        }
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
