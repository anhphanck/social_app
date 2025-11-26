import express from "express";
import chatController from "../controllers/chatController.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { upload } from "../controllers/postController.js";
import path from "path";

const router = express.Router();

// GET /api/chats/conversation/:userA/:userB
router.get("/conversation/:userA/:userB", chatController.getConversation);

router.get('/unreads', verifyToken, chatController.getUnreadCounts);
router.post('/mark-read', verifyToken, chatController.markConversationRead);

// POST /api/chats/upload - upload a file for chat messages
// field name: 'file'
router.post("/upload", upload.single("file"), (req, res) => {
	if (!req.file) return res.status(400).json({ message: "No file uploaded" });
	const filename = req.file.filename;
	const fileUrl = `http://localhost:5000/uploads/${filename}`;
	const mimetype = req.file.mimetype || "";
	let file_type = "file";
	if (mimetype.startsWith("image/")) file_type = "image";
	else if (mimetype.startsWith("video/")) file_type = "video";
	else file_type = "file";

	res.json({ file_url: fileUrl, file_type, filename });
});

// DELETE /api/chats/message/:id - soft-delete a message (sender only)
router.delete('/message/:id', verifyToken, chatController.deleteMessage);

export default router;
