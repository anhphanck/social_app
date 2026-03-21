import express from "express";
import { verifyToken, verifyAdmin, verifyStaff } from "../middleware/authMiddleware.js";
import { upload } from "../controllers/postController.js";
import { 
  createTask, 
  listTasks, 
  downloadTaskFile, 
  getTaskDetail, 
  updateTask, 
  changeStatus, 
  gradeSubmission, 
  addComment, 
  unreadNotifCount, 
  markNotifsRead, 
  deleteTask,
} from "../controllers/taskController.js";

const router = express.Router();

router.use(async (req, res, next) => { await ensureTaskSchema(); next(); });
router.post("/", verifyStaff, upload.array("attachments", 10), createTask);
router.get("/", verifyToken, listTasks);
router.get("/download/:id", downloadTaskFile);
router.get("/:id", verifyToken, getTaskDetail);
router.put("/:id", verifyStaff, updateTask);
router.post("/:id/status", verifyToken, upload.array("evidence", 10), changeStatus);
router.post("/:id/grade", verifyStaff, gradeSubmission);
router.post("/:id/comment", verifyToken, addComment);
router.get("/notifications/unread-count", verifyToken, unreadNotifCount);
router.post("/notifications/mark-read", verifyToken, markNotifsRead);
router.delete("/:id", verifyStaff, deleteTask);

export default router;
