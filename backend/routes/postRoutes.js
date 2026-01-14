import express from "express";
import {
  getAllPosts,
  createPost,
  updatePost,
  deletePost,
  upload,
  searchPosts,
  reactPost,
  removeReact,
  pinPost,
  unpinPost,
} from "../controllers/postController.js";
import { verifyToken, verifyAdmin, verifyStaff } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", getAllPosts);
router.post("/", verifyToken, upload.array("images", 10), createPost);
router.put("/:id", verifyToken, upload.array("images", 10), updatePost);
router.delete("/:id", verifyToken, deletePost);
// Giáo viên + admin được quyền ghim bài
router.post("/:id/pin", verifyStaff, pinPost);
router.post("/:id/unpin", verifyStaff, unpinPost);
router.get("/search", searchPosts);
router.post("/react", verifyToken, reactPost);
router.post("/remove-react", verifyToken, removeReact);


export default router;
