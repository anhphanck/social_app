import db from "../config/db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

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
    const match = await bcrypt.compare(password, user.password);

    if (!match) return res.status(401).json({ message: "Sai mật khẩu" });

    const token = jwt.sign({ id: user.id }, SECRET_KEY, { expiresIn: "7d" });
    res.json({
      message: "Đăng nhập thành công",
      token,
      user: { 
        id: user.id, 
        username: user.username, 
        email: user.email,
        role: user.role || 'user'
      },
    });
  });
};

export const getAllUsers = (req, res) => {
  const q = "SELECT id, username, email, COALESCE(role, 'user') as role, created_at FROM users ORDER BY id DESC";
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