import express from "express";
import chatController from "../controllers/chatController.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { upload } from "../controllers/postController.js";
import cloudinary from "../config/cloudinary.js";
import { Readable } from "stream";
import path from "path";

const router = express.Router();

// GET /api/chats/conversation/:userA/:userB
router.get("/conversation/:userA/:userB", chatController.getConversation);

router.get('/unreads', verifyToken, chatController.getUnreadCounts);
router.post('/mark-read', verifyToken, chatController.markConversationRead);

// POST /api/chats/upload - upload a file for chat messages
// field name: 'file'
router.post("/upload", upload.single("file"), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: "No file uploaded" });
        const mimetype = req.file.mimetype || "";
        let file_type = "file";
        if (mimetype.startsWith("image/")) file_type = "image";
        else if (mimetype.startsWith("video/")) file_type = "video";
        else file_type = "file";

        const streamUpload = () => new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream({ resource_type: "auto", folder: "social_app/chats" }, (err, result) => {
                if (err) return reject(err);
                resolve(result);
            });
            Readable.from(req.file.buffer).pipe(stream);
        });

        const result = await streamUpload();
        return res.json({ file_url: result.secure_url, file_type, filename: result.public_id });
    } catch (e) {
        return res.status(500).json({ message: "Upload failed" });
    }
});

// DELETE /api/chats/message/:id - soft-delete a message (sender only)
router.delete('/message/:id', verifyToken, chatController.deleteMessage);

export default router;
