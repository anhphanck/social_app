import express from "express";
import { getAllUsers, updateUserRole, approveUser } from "../controllers/userController.js";
import { verifyAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

// Tất cả routes trong adminRoutes đều yêu cầu verifyAdmin
router.get("/users", verifyAdmin, getAllUsers);
router.put("/users/:userId/role", verifyAdmin, updateUserRole);
router.put("/users/:userId/approve", verifyAdmin, approveUser);

export default router;

