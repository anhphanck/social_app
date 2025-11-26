import express from "express";
import {
  getCommentsByPost,
  createComment,
  reactComment,
  removeReactComment,
  deleteComment
} from "../controllers/commentController.js";
import { verifyToken, optionalVerifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/:postId", optionalVerifyToken, getCommentsByPost);
router.post("/", verifyToken, createComment);
router.delete("/:id", verifyToken, deleteComment);
router.post("/react", verifyToken, reactComment);
router.post("/remove-react", verifyToken, removeReactComment);

export default router;
