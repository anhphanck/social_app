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
import { verifyToken, verifyAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", getAllPosts);
router.post("/", upload.array("images", 10), createPost); // Cho phép tối đa 10 ảnh
router.put("/:id", upload.array("images", 10), updatePost);
router.delete("/:id", verifyToken, deletePost);
router.post("/:id/pin", verifyAdmin, pinPost);
router.post("/:id/unpin", verifyAdmin, unpinPost);
router.get("/search", searchPosts);
router.post("/react", reactPost);
router.post("/remove-react", removeReact);


export default router;
