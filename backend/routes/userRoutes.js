import express from "express";
import { registerUser, loginUser, getAllUsers, updateUserRole  } from "../controllers/userController.js";
import { verifyToken, verifyAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/", verifyAdmin, getAllUsers); // Chỉ admin mới xem được danh sách users
router.put("/:userId/role", verifyAdmin, updateUserRole); // Chỉ admin mới thay đổi role

export default router;
