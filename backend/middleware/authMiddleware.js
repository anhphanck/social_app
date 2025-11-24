
import jwt from "jsonwebtoken";

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

