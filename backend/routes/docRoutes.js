import express from "express";
import { verifyToken } from "../middleware/authMiddleware.js";
import { ensureDocSchema, uploadDocuments, listDocuments } from "../controllers/docController.js";
import { upload } from "../controllers/postController.js";

const router = express.Router();

router.use(async (req, res, next) => { await ensureDocSchema(); next(); });
router.get("/", verifyToken, listDocuments);
router.post("/upload", verifyToken, upload.array("files", 10), uploadDocuments);

export default router;

