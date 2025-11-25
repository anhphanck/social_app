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
		req.user = payload;
		next();
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
			req.user = payload;
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
		
		// Kiểm tra role từ database
		db.query("SELECT role FROM users WHERE id = ?", [payload.id], (err, results) => {
			if (err) return res.status(500).json({ message: "Lỗi server" });
			if (results.length === 0) return res.status(404).json({ message: "User không tồn tại" });
			
			const userRole = results[0].role || 'user';
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

