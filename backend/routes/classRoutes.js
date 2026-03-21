import express from "express";
import { verifyAdmin, verifyToken } from "../middleware/authMiddleware.js";
import { ensureClassSchema, listClasses, createClass, updateClass, deleteClass } from "../controllers/classController.js";

const router = express.Router();

router.use(async (req, res, next) => { await ensureClassSchema(); next(); });
router.get("/", verifyToken, listClasses);
router.post("/", verifyAdmin, createClass);
router.put("/:id", verifyAdmin, updateClass);
router.delete("/:id", verifyAdmin, deleteClass);

export default router;

