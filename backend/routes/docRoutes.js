import express from "express";
import { verifyToken, verifyAdmin } from "../middleware/authMiddleware.js";
import { ensureDocSchema, uploadDocuments, listDocuments, deleteDocument } from "../controllers/docController.js";
import { upload } from "../controllers/postController.js";

const router = express.Router();

router.use(async (req, res, next) => { await ensureDocSchema(); next(); });
router.get("/", verifyToken, listDocuments);
router.post("/upload", verifyToken, upload.array("files", 10), uploadDocuments);
router.delete("/:id", verifyAdmin, deleteDocument);

export default router;
