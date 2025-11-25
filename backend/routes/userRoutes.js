import express from "express";
import { registerUser, loginUser, getAllUsers } from "../controllers/userController.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/", verifyToken, getAllUsers); // User thường cần token để xem danh sách users

export default router;
