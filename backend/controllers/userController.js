import db from "../config/db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { upload } from "./postController.js";
import path from "path";

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
ensureUserProfileColumns();

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
    res.json({
      message: "Đăng nhập thành công",
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role || 'user',
        avatar: user.avatar || null
      },
      avatar_url: user && user.avatar ? `http://localhost:5000/uploads/${user.avatar}` : null
    });
  });
};

export const getAllUsers = (req, res) => {
  const q = "SELECT id, username, email, COALESCE(role, 'user') as role, avatar, created_at, COALESCE(is_approved,0) AS is_approved FROM users ORDER BY id DESC";
  db.query(q, (err, results) => {
    if (err) {
      console.error("Lỗi lấy users:", err);
      return res.status(500).json({ message: "Lỗi khi lấy danh sách người dùng" });
    }
    res.json(results);
  });
};

export const updateUserRole = (req, res) => {
  const { userId } = req.params;
  const { role } = req.body;

  if (!role || !['user', 'admin'].includes(role)) {
    return res.status(400).json({ message: "Role không hợp lệ. Phải là 'user' hoặc 'admin'" });
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
    res.json({ message: `Đã ${role === 'admin' ? 'thăng cấp' : 'hạ cấp'} user thành công`, role });
  });
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
      fields.push('avatar = ?');
      params.push(avatarFile.filename);
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
      avatar_url: updated && updated.avatar ? `http://localhost:5000/uploads/${updated.avatar}` : null
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

    const select = 'id, username, email, role, avatar' + (bioColumnExists ? ', bio' : '');
    const [rows] = await db.promise().execute(`SELECT ${select} FROM users WHERE id = ?`, [userId]);
    if (!rows || rows.length === 0) return res.status(404).json({ message: 'User not found' });
    const u = rows[0];
    res.json({
      user: u,
      avatar_url: u && u.avatar ? `http://localhost:5000/uploads/${u.avatar}` : null
    });
  } catch (err) {
    console.error('Failed to fetch user by id:', err);
    res.status(500).json({ message: 'Failed to fetch user' });
  }
};
