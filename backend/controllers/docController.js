import db from "../config/db.js";
import cloudinary from "../config/cloudinary.js";
import { Readable } from "stream";

export async function ensureDocSchema() {
  try {
    await db.promise().query(
      "CREATE TABLE IF NOT EXISTS project_documents (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, filename VARCHAR(255) NOT NULL, original_name VARCHAR(255) NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)"
    );
  } catch {}
}

export const uploadDocuments = async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    const files = req.files || [];
    if (!files || files.length === 0) return res.status(400).json({ message: "Không có file" });
    const uploads = files.map((f) => new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream({ resource_type: "auto", folder: "social_app/documents" }, (err, result) => {
        if (err) return reject(err);
        resolve(result);
      });
      Readable.from(f.buffer).pipe(stream);
    }));
    const results = await Promise.all(uploads);
    const values = results.map((r, idx) => [userId, r.public_id, files[idx].originalname || null]);
    await db.promise().query("INSERT INTO project_documents (user_id, filename, original_name) VALUES ?", [values]);
    res.json({ message: "Đã tải lên", count: results.length });
  } catch (e) {
    res.status(500).json({ message: "Lỗi tải lên" });
  }
};

const getCloudinaryUrl = (publicId, originalName) => {
  if (!publicId) return null;
  // Cloudinary raw files (zip, docx, etc) usually have extension in public_id
  let isRaw = /\.(zip|docx|doc|xlsx|xls|pptx|ppt|txt|csv|rar)$/i.test(publicId);
  const isVideo = /\.(mp4|mov|avi|mkv)$/i.test(publicId);

  // Fallback: check originalName if publicId doesn't tell us
  if (!isRaw && !isVideo && originalName) {
     isRaw = /\.(zip|docx|doc|xlsx|xls|pptx|ppt|txt|csv|rar)$/i.test(originalName);
  }

  if (isRaw) return cloudinary.url(publicId, { resource_type: "raw", secure: true });
  if (isVideo) return cloudinary.url(publicId, { resource_type: "video", secure: true });
  return cloudinary.url(publicId, { secure: true });
};

export const listDocuments = async (req, res) => {
  try {
    const [rows] = await db.promise().query(
      "SELECT d.id, d.user_id, d.filename, d.original_name, d.created_at, u.username FROM project_documents d LEFT JOIN users u ON d.user_id = u.id ORDER BY d.id DESC"
    );
    const docs = (rows || []).map((r) => ({
      id: r.id,
      user_id: r.user_id,
      username: r.username || null,
      filename: r.filename,
      original_name: r.original_name || r.filename,
      created_at: r.created_at,
      url: r.filename && r.filename.includes('/') ? getCloudinaryUrl(r.filename, r.original_name) : `http://localhost:5000/uploads/${r.filename}`
    }));
    res.json(docs);
  } catch (e) {
    res.status(500).json({ message: "Lỗi lấy danh sách" });
  }
};

export const deleteDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.promise().execute("SELECT filename FROM project_documents WHERE id=?", [id]);
    if (!rows || rows.length === 0) return res.status(404).json({ message: "Không tìm thấy tài liệu" });
    const fname = rows[0].filename;
    // Xóa từ Cloudinary nếu là tài liệu đã upload lên cloud
    if (String(fname).includes('/')) {
      try { await cloudinary.uploader.destroy(fname, { resource_type: 'auto' }); } catch {}
    } else {
      try {
        const fs = await import('fs');
        const path = await import('path');
        const p = path.join(process.cwd(), 'uploads', fname);
        try { fs.unlinkSync(p); } catch {}
      } catch {}
    }
    await db.promise().execute("DELETE FROM project_documents WHERE id=?", [id]);
    res.json({ message: "Đã xóa tài liệu" });
  } catch (e) {
    res.status(500).json({ message: "Lỗi xóa tài liệu" });
  }
};
