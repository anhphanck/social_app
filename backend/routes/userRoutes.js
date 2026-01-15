import express from "express";
import { registerUser, loginUser, getAllUsers, updateProfile, getUserById, getOnlineUsers } from "../controllers/userController.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { upload } from "../controllers/postController.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/", verifyToken, getAllUsers); // User thường cần token để xem danh sách users
router.get("/online", verifyToken, getOnlineUsers);
router.put('/profile', verifyToken, upload.single('avatar'), updateProfile);
router.get('/:id', verifyToken, getUserById);

export default router;
