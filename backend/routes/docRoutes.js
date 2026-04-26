import express from "express";
import { verifyToken, verifyAdmin } from "../middleware/authMiddleware.js";
import { uploadDocuments, listDocuments, deleteDocument, downloadDocument } from "../controllers/docController.js";
import { upload } from "../controllers/postController.js";

const router = express.Router();

router.get("/", verifyToken, listDocuments);
router.get("/download/:id", verifyToken, downloadDocument);
router.post("/upload", verifyToken, upload.array("files", 10), uploadDocuments);
router.delete("/:id", verifyToken, deleteDocument);

export default router;

