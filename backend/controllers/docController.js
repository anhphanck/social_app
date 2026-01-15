import db from "../config/db.js";
import cloudinary from "../config/cloudinary.js";
import { Readable } from "stream";
import https from "https";
import fs from "fs";

export async function ensureDocSchema() {
  try {
    await db.promise().query(
      "CREATE TABLE IF NOT EXISTS project_documents (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, filename VARCHAR(255) NOT NULL, original_name VARCHAR(255) NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)"
    );
    try {
      await db.promise().query("ALTER TABLE project_documents ADD COLUMN original_name VARCHAR(255) NULL");
    } catch {}
    try {
      await db.promise().query("ALTER TABLE project_documents ADD COLUMN class_id INT NULL");
    } catch {}
    try {
      await db.promise().query("ALTER TABLE project_documents ADD CONSTRAINT fk_project_documents_class FOREIGN KEY (class_id) REFERENCES classes(id)");
    } catch {}
  } catch {}
}

export const uploadDocuments = async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    let role = "user";
    let userClassId = null;
    try {
      const [[u]] = await db.promise().query("SELECT role, class_id FROM users WHERE id = ?", [userId]);
      role = (u && u.role) || "user";
      userClassId = (u && u.class_id) || null;
    } catch {}
    const classCode = req.query.class || null;
    let targetClassId = null;
    if (role === "admin" || role === "teacher") {
      if (classCode) {
        try {
          const [[c]] = await db.promise().query("SELECT id FROM classes WHERE code = ?", [classCode]);
          targetClassId = c ? c.id : null;
        } catch {}
      }
    } else {
      targetClassId = userClassId;
    }
    const files = req.files || [];
    if (!files || files.length === 0) return res.status(400).json({ message: "Không có file" });
    const uploads = files.map((f) => new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream({ resource_type: "auto", folder: "social_app/documents" }, (err, result) => {
        if (f.path) {
          try { fs.unlinkSync(f.path); } catch (e) {}
        }
        if (err) return reject(err);
        resolve(result);
      });
      if (f.buffer) {
        Readable.from(f.buffer).pipe(stream);
      } else if (f.path) {
        fs.createReadStream(f.path).pipe(stream);
      } else {
        reject(new Error("File content missing"));
      }
    }));
    const results = await Promise.all(uploads);
    const values = results.map((r, idx) => [userId, r.public_id, files[idx].originalname || null, targetClassId]);
    await db.promise().query("INSERT INTO project_documents (user_id, filename, original_name, class_id) VALUES ?", [values]);
    res.json({ message: "Đã tải lên", count: results.length });
  } catch (e) {
    res.status(500).json({ message: "Lỗi tải lên" });
  }
};

const getCloudinaryUrl = (publicId, originalName) => {
  if (!publicId) return null;
  
  // Extract extension
  let ext = "";
  // Check publicId first
  const match = publicId.match(/\.([a-zA-Z0-9]+)$/);
  if (match) {
    ext = match[1].toLowerCase();
  } else if (originalName) {
    // Fallback to originalName
    const match2 = originalName.match(/\.([a-zA-Z0-9]+)$/);
    if (match2) {
      ext = match2[1].toLowerCase();
    }
  }

  // Determine resource type
  // Default to raw for unknown types (safest for download)
  const imageExts = ["jpg", "jpeg", "png", "gif", "bmp", "tiff", "webp", "svg", "heic", "ico", "pdf", "eps", "psd"];
  const videoExts = ["mp4", "mov", "avi", "mkv", "webm", "wmv", "flv", "mpeg", "3gp"];
  
  let resourceType = "image"; // Default for no extension (legacy fallback)
  if (ext) {
    if (videoExts.includes(ext)) resourceType = "video";
    else if (imageExts.includes(ext)) resourceType = "image";
    else resourceType = "raw";
  }

  // Options for download
  const options = { 
    secure: true, 
    resource_type: resourceType,
  };

  return cloudinary.url(publicId, options);
};

export const downloadDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.promise().execute("SELECT filename, original_name, class_id FROM project_documents WHERE id=?", [id]);
    if (!rows || rows.length === 0) return res.status(404).json({ message: "Không tìm thấy tài liệu" });
    
    const { filename: publicId, original_name, class_id } = rows[0];
    let role = "user";
    let userClassId = null;
    try {
      const [[u]] = await db.promise().query("SELECT role, class_id FROM users WHERE id = ?", [req.user && req.user.id]);
      role = (u && u.role) || "user";
      userClassId = (u && u.class_id) || null;
    } catch {}
    if (role === "user") {
      if (!userClassId || !class_id || Number(userClassId) !== Number(class_id)) {
        return res.status(403).json({ message: "Không có quyền tải tài liệu" });
      }
    }

    if (!publicId || !publicId.includes('/')) {
       // Local file, redirect to static path (or stream it)
       // Assuming local uploads are handled by static middleware or we can just redirect
       return res.redirect(`http://localhost:5000/uploads/${publicId}`);
    }

    // It's a cloudinary file
    const url = getCloudinaryUrl(publicId, original_name);
    
    // Fetch and pipe
    https.get(url, (stream) => {
      if (stream.statusCode !== 200) {
        return res.status(stream.statusCode).send("Failed to fetch file from storage");
      }
      
      // Determine content type if possible, or default to generic
      // We can try to guess from original_name
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(original_name || 'download')}"`);
      res.setHeader('Content-Type', stream.headers['content-type'] || 'application/octet-stream');
      
      stream.pipe(res);
    }).on('error', (e) => {
      console.error("Cloudinary fetch error", e);
      res.status(500).send("Error fetching file");
    });

  } catch (e) {
    console.error("Download error", e);
    res.status(500).json({ message: "Lỗi tải tài liệu" });
  }
};

export const listDocuments = async (req, res) => {
  try {
    const uid = req.user && req.user.id;
    let role = "user";
    let userClassId = null;
    try {
      const [[u]] = await db.promise().query("SELECT role, class_id FROM users WHERE id = ?", [uid]);
      role = (u && u.role) || "user";
      userClassId = (u && u.class_id) || null;
    } catch {}
    const classParam = req.query.class || null;
    let rows = [];
    if (role === "admin" || role === "teacher") {
      if (classParam) {
        const query = "SELECT d.id, d.user_id, d.filename, d.original_name, d.created_at, u.username FROM project_documents d LEFT JOIN users u ON d.user_id = u.id LEFT JOIN classes c ON d.class_id = c.id WHERE c.code = ? ORDER BY d.id DESC";
        const [r] = await db.promise().query(query, [classParam]);
        rows = r || [];
      } else {
        rows = [];
      }
    } else {
      const query = "SELECT d.id, d.user_id, d.filename, d.original_name, d.created_at, u.username FROM project_documents d LEFT JOIN users u ON d.user_id = u.id WHERE d.class_id = ? ORDER BY d.id DESC";
      const [r] = await db.promise().query(query, [userClassId]);
      rows = r || [];
    }
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
