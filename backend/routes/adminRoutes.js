import express from "express";
import { getAllUsers, updateUserRole } from "../controllers/userController.js";
import { verifyAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

// Tất cả routes trong adminRoutes đều yêu cầu verifyAdmin
router.get("/users", verifyAdmin, getAllUsers);
router.put("/users/:userId/role", verifyAdmin, updateUserRole);

export default router;

