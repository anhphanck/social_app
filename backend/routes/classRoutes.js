import express from "express";
import { verifyAdmin, verifyToken } from "../middleware/authMiddleware.js";
import { listClasses, createClass, updateClass, deleteClass } from "../controllers/classController.js";

const router = express.Router();
router.get("/", verifyToken, listClasses);
router.post("/", verifyAdmin, createClass);
router.put("/:id", verifyAdmin, updateClass);
router.delete("/:id", verifyAdmin, deleteClass);

export default router;

