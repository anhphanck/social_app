import express from "express";
import { verifyToken, verifyAdmin } from "../middleware/authMiddleware.js";
import { ensureDocSchema, uploadDocuments, listDocuments, deleteDocument, downloadDocument } from "../controllers/docController.js";
import { upload } from "../controllers/postController.js";

const router = express.Router();

router.use(async (req, res, next) => { await ensureDocSchema(); next(); });
router.get("/", verifyToken, listDocuments);
router.get("/download/:id", verifyToken, downloadDocument);
router.post("/upload", verifyToken, upload.array("files", 10), uploadDocuments);
router.delete("/:id", verifyToken, deleteDocument);

export default router;
