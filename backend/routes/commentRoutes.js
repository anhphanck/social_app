import express from "express";
import {
  getCommentsByPost,
  createComment,
  reactComment,
  removeReactComment,
  deleteComment
} from "../controllers/commentController.js";

const router = express.Router();

router.get("/:postId", getCommentsByPost);
router.post("/", createComment);
router.delete("/:id", deleteComment);
router.post("/react", reactComment);
router.post("/remove-react", removeReactComment);

export default router;
