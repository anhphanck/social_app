import db from "../config/db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { upload } from "./postController.js";
import path from "path";
import cloudinary from "../config/cloudinary.js";
import { Readable } from "stream";

async function ensureUserSchema() {
  try {
    await db.promise().query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(100) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'user',
        avatar VARCHAR(255) NULL,
        bio TEXT NULL,
        is_approved TINYINT(1) NOT NULL DEFAULT 0,
        token_version INT NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  } catch (e) {
    console.warn("Failed to ensure users table", e);
  }
}

// Ensure optional columns exist for profile features (avatar, bio)
async function ensureUserProfileColumns() {
  try {
    const [cols] = await db.promise().query("SHOW COLUMNS FROM users");
    const names = new Set((cols || []).map((c) => c.Field));
    if (!names.has("avatar")) {
      await db.promise().query("ALTER TABLE users ADD COLUMN avatar VARCHAR(255) NULL");
    }
    if (!names.has("bio")) {
      await db.promise().query("ALTER TABLE users ADD COLUMN bio TEXT NULL");
    }
    if (!names.has("is_approved")) {
      await db.promise().query("ALTER TABLE users ADD COLUMN is_approved TINYINT(1) NOT NULL DEFAULT 0");
      try {
        await db.promise().query("UPDATE users SET is_approved = 1");
      } catch {}
    }
    if (!names.has("token_version")) {
      await db.promise().query("ALTER TABLE users ADD COLUMN token_version INT NOT NULL DEFAULT 0");
    }
  } catch (e) {
    console.warn("Failed to ensure user profile columns", e);
  }
}
async function ensureUserClassColumn() {
  try {
    const [cols] = await db.promise().query("SHOW COLUMNS FROM users LIKE 'class'");
    const exists = Array.isArray(cols) && cols.length > 0;
    if (!exists) {
      await db.promise().query("ALTER TABLE users ADD COLUMN class ENUM('A','B','C','D') NULL");
    }
  } catch (e) {
    console.warn("Failed to ensure user class column", e);
  }
}
async function ensureClassesAndMigrate() {
  try {
    const [classCols] = await db.promise().query("SHOW TABLES LIKE 'classes'");
    if (!classCols || classCols.length === 0) {
      await db.promise().query(`
        CREATE TABLE classes (
          id INT AUTO_INCREMENT PRIMARY KEY,
          code VARCHAR(20) NOT NULL UNIQUE,
          name VARCHAR(255) NULL,
          description TEXT NULL,
          homeroom_teacher_id INT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (homeroom_teacher_id) REFERENCES users(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      for (const code of ["A", "B", "C", "D"]) {
        try { await db.promise().execute("INSERT INTO classes (code, name) VALUES (?, ?)", [code, `Lớp ${code}`]); } catch {}
      }
    }
    const [uCols] = await db.promise().query("SHOW COLUMNS FROM users LIKE 'class_id'");
    if (!uCols || uCols.length === 0) {
      await db.promise().query("ALTER TABLE users ADD COLUMN class_id INT NULL");
      try {
        await db.promise().query("ALTER TABLE users ADD CONSTRAINT fk_users_class FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL");
      } catch {}
      for (const code of ["A", "B", "C", "D"]) {
        try {
          await db.promise().query(`
            UPDATE users u 
            JOIN classes c ON c.code = ?
            SET u.class_id = c.id
            WHERE u.class = ? AND u.class_id IS NULL
          `, [code, code]);
        } catch {}
      }
    }
    const [pCols] = await db.promise().query("SHOW COLUMNS FROM posts LIKE 'class_id'");
    if (!pCols || pCols.length === 0) {
      await db.promise().query("ALTER TABLE posts ADD COLUMN class_id INT NULL");
      try {
        await db.promise().query("ALTER TABLE posts ADD CONSTRAINT fk_posts_class FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL");
      } catch {}
      for (const code of ["A", "B", "C", "D"]) {
        try {
          await db.promise().query(`
            UPDATE posts p 
            JOIN classes c ON c.code = ?
            SET p.class_id = c.id
            WHERE p.class = ? AND p.class_id IS NULL
          `, [code, code]);
        } catch {}
      }
    }
  } catch (e) {
    console.warn("Failed to ensure classes/migration", e);
  }
}
ensureUserSchema();
ensureUserProfileColumns();
ensureUserClassColumn();
ensureClassesAndMigrate();

const SECRET_KEY = "secret_key_demo";

export const registerUser = async (req, res) => {
  const { username, email, password } = req.body;
  console.log("username:", username);
console.log("email:", email);
console.log("password:", password);
  if (!username || !email || !password)
    return res.status(400).json({ message: "Thiếu thông tin" });
  
  try {
    const hashed = await bcrypt.hash(password, 10);
    const q = "INSERT INTO users (username, email, password) VALUES (?, ?, ?)";
    db.query(q, [username, email, hashed], (err) => {
      if (err) {
        console.error(err);
        return res.status(400).json({ message: "Tên hoặc email đã tồn tại" });
      }
      res.json({ message: "Đăng ký thành công" });
    });
  } catch (e) {
    res.status(500).json({ message: "Lỗi server" });
  }
};

export const loginUser = (req, res) => {
  const { email, password } = req.body;

  const q = "SELECT * FROM users WHERE email = ?";
  db.query(q, [email], async (err, data) => {
    if (err) return res.status(500).json({ message: "Lỗi server" });
    if (data.length === 0)
      return res.status(400).json({ message: "Không tìm thấy tài khoản" });

    const user = data[0];
    if (!user.is_approved) {
      return res.status(403).json({ message: "Tài khoản chưa được duyệt bởi admin" });
    }
    const match = await bcrypt.compare(password, user.password);

    if (!match) return res.status(401).json({ message: "Sai mật khẩu" });

    const token = jwt.sign({ id: user.id, ver: user.token_version || 0 }, SECRET_KEY, { expiresIn: "7d" });
    let classCode = user.class || null;
    try {
      if (!classCode && user.class_id) {
        const [[c]] = await db.promise().query("SELECT code FROM classes WHERE id = ?", [user.class_id]);
        classCode = c && c.code ? c.code : null;
      }
    } catch {}
    res.json({
      message: "Đăng nhập thành công",
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role || 'user',
        class: classCode,
        class_id: user.class_id || null,
        avatar: user.avatar || null
      },
      avatar_url: user && user.avatar ? (user.avatar.startsWith('http') ? user.avatar : `http://localhost:5000/uploads/${user.avatar}`) : null
    });
  });
};

export const getAllUsers = async (req, res) => {
  try {
    const classParam = req.query.class; // Filter by class code (A, B, etc.)
    let desiredClassCode = classParam || null;
    let desiredClassId = null;
    // Lấy role + class_id của người xem để mặc định lọc theo lớp của họ
    let viewerRole = "user";
    let viewerClassId = null;
    try {
      const [rows] = await db.promise().execute("SELECT COALESCE(role,'user') AS role, class_id FROM users WHERE id = ?", [req.user && req.user.id]);
      if (rows && rows[0]) {
        viewerRole = rows[0].role || "user";
        viewerClassId = rows[0].class_id || null;
      }
    } catch {}
    if (!desiredClassCode) {
      // Mặc định: user thường chỉ xem lớp của họ
      if (viewerRole === "user" && viewerClassId) {
        desiredClassId = viewerClassId;
      } else if (viewerRole !== "user" && viewerClassId) {
        // Giáo viên/admin: nếu có class_id của chính họ thì dùng mặc định, nếu không phải truyền param class
        desiredClassId = viewerClassId;
      }
    }
    if (desiredClassCode && !desiredClassId) {
      try {
        const [[c]] = await db.promise().query("SELECT id FROM classes WHERE code = ?", [desiredClassCode]);
        desiredClassId = c && c.id ? c.id : null;
      } catch {}
    }
    let whereClause = "";
    const params = [];
    if (desiredClassId) {
      // Bao gồm cả giáo viên quản lý lớp (class_teachers)
      whereClause = "WHERE (u.class_id = ? OR u.id IN (SELECT teacher_id FROM class_teachers WHERE class_id = ?))";
      params.push(desiredClassId, desiredClassId);
    } else if (desiredClassCode) {
      whereClause = "WHERE c.code = ?";
      params.push(desiredClassCode);
    } else if (viewerRole === "user") {
      // Nếu vẫn không xác định được class, và là user, trả về rỗng để tránh hiện tất cả
      return res.json([]);
    }
    const q = `
      SELECT DISTINCT
        u.id, u.username, u.email, COALESCE(u.role,'user') AS role,
        c.code AS class, u.class_id, u.avatar, u.created_at,
        COALESCE(u.is_approved,0) AS is_approved
      FROM users u
      LEFT JOIN classes c ON u.class_id = c.id
      ${whereClause}
      ORDER BY u.id DESC
    `;
    const [results] = await db.promise().query(q, params);
    res.json(results || []);
  } catch (err) {
    console.error("Lỗi lấy users:", err);
    return res.status(500).json({ message: "Lỗi khi lấy danh sách người dùng" });
  }
};

export const getOnlineUsers = async (req, res) => {
  try {
    const onlineMap = req.app.get("onlineUsers");
    const onlineIds = Array.from((onlineMap || new Map()).keys()).map((id) => Number(id));
    if (onlineIds.length === 0) return res.json([]);
    // Xác định lớp mục tiêu: mặc định là lớp của người xem nếu là user
    const classParam = req.query.class || null; // code: A/B/C/D
    let viewerRole = "user";
    let viewerClassId = null;
    try {
      const [rows] = await db.promise().execute("SELECT COALESCE(role,'user') AS role, class_id FROM users WHERE id = ?", [req.user && req.user.id]);
      if (rows && rows[0]) {
        viewerRole = rows[0].role || "user";
        viewerClassId = rows[0].class_id || null;
      }
    } catch {}
    let desiredClassId = null;
    if (classParam) {
      const [[c]] = await db.promise().query("SELECT id FROM classes WHERE code = ?", [classParam]);
      desiredClassId = c && c.id ? c.id : null;
    } else if (viewerClassId) {
      desiredClassId = viewerClassId;
    }
    if (!desiredClassId && viewerRole === "user") {
      // Không xác định được lớp mà là user: không trả về danh sách để tránh hiện tất cả
      return res.json([]);
    }
    const placeholders = onlineIds.map(() => "?").join(",");
    const params = [...onlineIds];
    let where = `u.id IN (${placeholders})`;
    if (desiredClassId) {
      // Bao gồm cả giáo viên quản lý lớp (class_teachers)
      where += " AND (u.class_id = ? OR u.id IN (SELECT teacher_id FROM class_teachers WHERE class_id = ?))";
      params.push(desiredClassId, desiredClassId);
    }
    const sql = `
      SELECT u.id, u.username, u.avatar, c.code AS class, COALESCE(u.role,'user') AS role
      FROM users u
      LEFT JOIN classes c ON u.class_id = c.id
      WHERE ${where}
      ORDER BY u.username ASC
    `;
    const [rows] = await db.promise().query(sql, params);
    const list = (rows || []).map((u) => ({
      id: u.id,
      username: u.username,
      avatar: u.avatar || null,
      avatar_url: u && u.avatar ? (String(u.avatar).startsWith('http') ? u.avatar : `http://localhost:5000/uploads/${u.avatar}`) : null,
      class: u.class || null,
      role: u.role || 'user'
    }));
    res.json(list);
  } catch (err) {
    console.error("Lỗi lấy online users:", err);
    res.status(500).json({ message: "Lỗi server" });
  }
};

export const updateUserRole = (req, res) => {
  const { userId } = req.params;
  const { role } = req.body;

  // Trang admin chỉ cho phép chuyển giữa user <-> teacher (không set được admin từ đây)
  if (!role || !['user', 'teacher'].includes(role)) {
    return res.status(400).json({ message: "Role không hợp lệ. Chỉ được chọn 'user' hoặc 'teacher'" });
  }

  const q = "UPDATE users SET role = ? WHERE id = ?";
  db.query(q, [role, userId], (err, result) => {
    if (err) {
      console.error("Lỗi cập nhật role:", err);
      return res.status(500).json({ message: "Lỗi khi cập nhật role" });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Không tìm thấy user" });
    }

    const actionText = role === 'teacher' ? 'thăng cấp lên giáo viên' : 'chuyển về user';
    res.json({ message: `Đã ${actionText} cho user thành công`, role });
  });
};

export const updateUserClass = async (req, res) => {
  const { userId } = req.params;
  const { class: userClass, class_id } = req.body;
  try {
    let targetId = null;
    if (class_id !== null && class_id !== undefined) {
      targetId = class_id || null;
    } else if (userClass !== null && userClass !== undefined) {
      const [[c]] = await db.promise().query("SELECT id FROM classes WHERE code = ? AND (is_deleted = 0 OR is_deleted IS NULL)", [userClass]);
      if (!c || !c.id) return res.status(400).json({ message: "Lớp không hợp lệ" });
      targetId = c.id;
    }
    const [r] = await db.promise().execute("UPDATE users SET class_id = ?, class = NULL WHERE id = ?", [targetId, userId]);
    if (!r || r.affectedRows === 0) return res.status(404).json({ message: "Không tìm thấy user" });
    let code = null;
    if (targetId) {
      try {
        const [[c]] = await db.promise().query("SELECT code FROM classes WHERE id = ?", [targetId]);
        code = c && c.code ? c.code : null;
      } catch {}
    }
    res.json({ message: "Đã cập nhật lớp cho user thành công", class: code, class_id: targetId });
  } catch (e) {
    return res.status(500).json({ message: "Lỗi khi cập nhật lớp" });
  }
};

export const approveUser = (req, res) => {
  const { userId } = req.params;
  const q = "UPDATE users SET is_approved = 1 WHERE id = ?";
  db.query(q, [userId], (err, result) => {
    if (err) {
      console.error("Lỗi duyệt user:", err);
      return res.status(500).json({ message: "Lỗi khi duyệt user" });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Không tìm thấy user" });
    }
    res.json({ message: "Đã duyệt user" });
  });
};

export const unapproveUser = (req, res) => {
  const { userId } = req.params;
  const q = "UPDATE users SET is_approved = 0, token_version = COALESCE(token_version,0) + 1 WHERE id = ?";
  db.query(q, [userId], (err, result) => {
    if (err) {
      console.error("Lỗi bỏ duyệt user:", err);
      return res.status(500).json({ message: "Lỗi khi bỏ duyệt user" });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Không tìm thấy user" });
    }
    res.json({ message: "Đã bỏ duyệt user" });
  });
};

export const updateProfile = async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ message: "Unauthenticated" });

    const avatarFile = req.file || null;
    const bio = typeof req.body.bio === 'string' ? req.body.bio : null;

    let bioColumnExists = false;
    try {
      const [cols] = await db.promise().query("SHOW COLUMNS FROM users LIKE 'bio'");
      bioColumnExists = Array.isArray(cols) && cols.length > 0;
    } catch {}

    if (bio && !bioColumnExists) {
      try {
        await db.promise().query("ALTER TABLE users ADD COLUMN bio TEXT NULL");
        bioColumnExists = true;
      } catch {}
    }

    const fields = [];
    const params = [];
    if (avatarFile) {
      try {
        const uploadResult = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream({ resource_type: "image", folder: "social_app/avatars" }, (err, result) => {
            if (err) return reject(err);
            resolve(result);
          });
          Readable.from(avatarFile.buffer).pipe(stream);
        });
        fields.push('avatar = ?');
        params.push(uploadResult.secure_url);
      } catch (uploadErr) {
        console.error("Cloudinary upload failed", uploadErr);
        return res.status(500).json({ message: "Upload avatar failed" });
      }
    }
    if (bio && bioColumnExists) {
      fields.push('bio = ?');
      params.push(bio);
    }

    if (fields.length === 0) {
      return res.status(400).json({ message: 'No data to update' });
    }

    params.push(userId);
    const sql = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;
    await db.promise().execute(sql, params);

    const [rows] = await db.promise().execute('SELECT id, username, email, role, avatar' + (bioColumnExists ? ', bio' : '') + ' FROM users WHERE id = ?', [userId]);
    const updated = rows && rows[0];
    res.json({
      message: 'Profile updated',
      user: updated,
      avatar_url: updated && updated.avatar ? (updated.avatar.startsWith('http') ? updated.avatar : `http://localhost:5000/uploads/${updated.avatar}`) : null
    });
  } catch (err) {
    console.error('Failed to update profile:', err);
    res.status(500).json({ message: 'Failed to update profile' });
  }
};

export const getUserById = async (req, res) => {
  try {
    const userId = req.params.id;
    if (!userId) return res.status(400).json({ message: 'Missing user id' });

    // detect optional bio column
    let bioColumnExists = false;
    try {
      const [cols] = await db.promise().query("SHOW COLUMNS FROM users LIKE 'bio'");
      bioColumnExists = Array.isArray(cols) && cols.length > 0;
    } catch {}

    const [rows] = await db.promise().execute(
      `SELECT u.id, u.username, u.email, u.role, c.code AS class, u.class_id, u.avatar${bioColumnExists ? ', u.bio' : ''} 
       FROM users u LEFT JOIN classes c ON u.class_id = c.id WHERE u.id = ?`,
      [userId]
    );
    if (!rows || rows.length === 0) return res.status(404).json({ message: 'User not found' });
    const u = rows[0];
    res.json({
      user: u,
      avatar_url: u && u.avatar ? (u.avatar.startsWith('http') ? u.avatar : `http://localhost:5000/uploads/${u.avatar}`) : null
    });
  } catch (err) {
    console.error('Failed to fetch user by id:', err);
    res.status(500).json({ message: 'Failed to fetch user' });
  }
};
