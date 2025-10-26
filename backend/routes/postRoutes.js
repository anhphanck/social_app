import express from "express";
import {
  getAllPosts,
  createPost,
  updatePost,
  deletePost,
  upload,
} from "../controllers/postController.js";

const router = express.Router();

router.get("/", getAllPosts);
router.post("/", upload.single("image"), createPost);
router.put("/:id", upload.single("image"), updatePost);
router.delete("/:id", deletePost);

export default router;
