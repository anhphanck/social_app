import express from "express";
import { getAllUsers, updateUserRole, updateUserClass, approveUser, unapproveUser } from "../controllers/userController.js";
import { verifyAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/users", verifyAdmin, getAllUsers);
router.put("/users/:userId/role", verifyAdmin, updateUserRole);
router.put("/users/:userId/class", verifyAdmin, updateUserClass);
router.put("/users/:userId/approve", verifyAdmin, approveUser);
router.put("/users/:userId/unapprove", verifyAdmin, unapproveUser);

export default router;

