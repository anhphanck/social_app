import jwt from "jsonwebtoken";
import db from "../config/db.js";

const SECRET_KEY = process.env.JWT_SECRET || "secret_key_demo";

export function verifyTokenSocket(token) {
	if (!token) throw new Error("No token provided");
	try {
		const payload = jwt.verify(token, SECRET_KEY);
		return payload;
	} catch (err) {
		throw err;
	}
}

export function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Missing token" });
  try {
    const payload = jwt.verify(token, SECRET_KEY);
    db.query("SELECT COALESCE(token_version,0) AS token_version, COALESCE(is_approved,1) AS is_approved FROM users WHERE id = ?", [payload.id], (err, results) => {
      if (err) return res.status(500).json({ message: "Lỗi server" });
      if (!results || results.length === 0) return res.status(404).json({ message: "User không tồn tại" });
      const row = results[0];
      if ((payload.ver ?? 0) !== (row.token_version ?? 0)) {
        return res.status(401).json({ message: "Token đã bị thu hồi" });
      }
      if ((row.is_approved ?? 1) === 0) {
        return res.status(403).json({ message: "Tài khoản chưa được duyệt" });
      }
      req.user = payload;
      next();
    });
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
}

// Optional token verification - không bắt buộc token
export function optionalVerifyToken(req, res, next) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  const token = authHeader && authHeader.split(" ")[1];
  if (token) {
    try {
      const payload = jwt.verify(token, SECRET_KEY);
      db.query("SELECT COALESCE(token_version,0) AS token_version, COALESCE(is_approved,1) AS is_approved FROM users WHERE id = ?", [payload.id], (err, results) => {
        if (!err && results && results.length > 0) {
          const row = results[0];
          if ((payload.ver ?? 0) === (row.token_version ?? 0) && (row.is_approved ?? 1) !== 0) {
            req.user = payload;
          }
        }
        next();
      });
      return; // prevent double next()
    } catch (err) {
      // Nếu token không hợp lệ, vẫn tiếp tục nhưng không set req.user
    }
  }
  next();
}

// Middleware để kiểm tra role admin
export function verifyAdmin(req, res, next) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Missing token" });
  
  try {
    const payload = jwt.verify(token, SECRET_KEY);
    req.user = payload;
    // Kiểm tra role, token_version, is_approved từ database
    db.query("SELECT COALESCE(role,'user') AS role, COALESCE(token_version,0) AS token_version, COALESCE(is_approved,1) AS is_approved FROM users WHERE id = ?", [payload.id], (err, results) => {
      if (err) return res.status(500).json({ message: "Lỗi server" });
      if (results.length === 0) return res.status(404).json({ message: "User không tồn tại" });
      
      const userRole = results[0].role || 'user';
      const tokenVersion = results[0].token_version ?? 0;
      const isApproved = results[0].is_approved ?? 1;
      if ((payload.ver ?? 0) !== tokenVersion) {
        return res.status(401).json({ message: "Token đã bị thu hồi" });
      }
      if (isApproved === 0) {
        return res.status(403).json({ message: "Tài khoản chưa được duyệt" });
      }
      if (userRole !== 'admin') {
        return res.status(403).json({ message: "Chỉ admin mới có quyền truy cập" });
      }
      
      req.user.role = userRole;
      next();
    });
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
}

