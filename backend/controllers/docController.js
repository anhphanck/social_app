import db from "../config/db.js";

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
    const values = files.map((f) => [userId, f.filename, f.originalname || null]);
    await db.promise().query("INSERT INTO project_documents (user_id, filename, original_name) VALUES ?", [values]);
    res.json({ message: "Đã tải lên", count: files.length });
  } catch (e) {
    res.status(500).json({ message: "Lỗi tải lên" });
  }
};

export const listDocuments = async (req, res) => {
  try {
    const [rows] = await db.promise().query(
      "SELECT d.id, d.user_id, d.filename, d.original_name, d.created_at, u.username FROM project_documents d LEFT JOIN users u ON d.user_id = u.id ORDER BY d.id DESC"
    );
    const docs = (rows || []).map((r) => ({ id: r.id, user_id: r.user_id, username: r.username || null, filename: r.filename, original_name: r.original_name || r.filename, created_at: r.created_at, url: `http://localhost:5000/uploads/${r.filename}` }));
    res.json(docs);
  } catch (e) {
    res.status(500).json({ message: "Lỗi lấy danh sách" });
  }
};

