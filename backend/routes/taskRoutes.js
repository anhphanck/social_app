import express from "express";
import { verifyToken, verifyAdmin, verifyStaff } from "../middleware/authMiddleware.js";
import { ensureTaskSchema, createTask, listTasks, updateTask, changeStatus, addComment, getTaskDetail, unreadNotifCount, markNotifsRead, deleteTask, downloadTaskFile } from "../controllers/taskController.js";
import { upload } from "../controllers/postController.js";

const router = express.Router();

router.use(async (req, res, next) => { await ensureTaskSchema(); next(); });

// Giáo viên + admin được tạo / sửa / xoá Task
router.post("/", verifyStaff, upload.array("attachments", 10), createTask);
router.get("/", verifyToken, listTasks);
router.get("/download/:id", downloadTaskFile); // type query param: attachment | submission
router.get("/:id", verifyToken, getTaskDetail);
router.put("/:id", verifyStaff, updateTask);
router.post("/:id/status", verifyToken, upload.array("evidence", 10), changeStatus);
router.post("/:id/comment", verifyToken, addComment);
router.get("/notifications/unread-count", verifyToken, unreadNotifCount);
router.post("/notifications/mark-read", verifyToken, markNotifsRead);
router.delete("/:id", verifyStaff, deleteTask);

export default router;
