import db from "../config/db.js";

export async function ensureClassSchema() {
  try {
    await db.promise().query(`
      CREATE TABLE IF NOT EXISTS classes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(20) NOT NULL UNIQUE,
        name VARCHAR(255) NULL,
        description TEXT NULL,
        homeroom_teacher_id INT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (homeroom_teacher_id) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    // New mapping table to support multiple homeroom teachers per class
    await db.promise().query(`
      CREATE TABLE IF NOT EXISTS class_teachers (
        class_id INT NOT NULL,
        teacher_id INT NOT NULL,
        PRIMARY KEY (class_id, teacher_id),
        FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
        FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    const [rows] = await db.promise().query("SELECT code FROM classes");
    const existing = new Set((rows || []).map((r) => r.code));
    const defaults = ["A", "B", "C", "D"].filter((c) => !existing.has(c));
    for (const code of defaults) {
      await db.promise().execute("INSERT INTO classes (code, name) VALUES (?, ?)", [code, `Lớp ${code}`]);
    }
  } catch {}
}

export async function listClasses(req, res) {
  try {
    const uid = req.user && req.user.id;
    if (!uid) {
      const [rows] = await db.promise().query(`
        SELECT c.id, c.code, c.name, c.description, c.homeroom_teacher_id, c.created_at,
               GROUP_CONCAT(ct.teacher_id) AS homeroom_teacher_ids,
               GROUP_CONCAT(u.username) AS homeroom_teacher_usernames
        FROM classes c
        LEFT JOIN class_teachers ct ON c.id = ct.class_id
        LEFT JOIN users u ON ct.teacher_id = u.id
        GROUP BY c.id
        ORDER BY c.code ASC
      `);
      return res.json(rows || []);
    }
    let role = "user";
    try {
      const [[row]] = await db.promise().query("SELECT role FROM users WHERE id = ?", [uid]);
      role = row && row.role ? row.role : "user";
    } catch {}
    if (role === "teacher") {
      const [rows] = await db.promise().query(`
        SELECT c.id, c.code, c.name, c.description, c.homeroom_teacher_id, c.created_at,
               GROUP_CONCAT(ct.teacher_id) AS homeroom_teacher_ids,
               GROUP_CONCAT(u.username) AS homeroom_teacher_usernames
        FROM classes c
        LEFT JOIN class_teachers ct ON c.id = ct.class_id
        LEFT JOIN users u ON ct.teacher_id = u.id
        WHERE ct.teacher_id = ?
        GROUP BY c.id
        ORDER BY c.code ASC
      `, [uid]);
      return res.json(rows || []);
    }
    const [rows] = await db.promise().query(`
      SELECT c.id, c.code, c.name, c.description, c.homeroom_teacher_id, c.created_at,
             GROUP_CONCAT(ct.teacher_id) AS homeroom_teacher_ids,
             GROUP_CONCAT(u.username) AS homeroom_teacher_usernames
      FROM classes c
      LEFT JOIN class_teachers ct ON c.id = ct.class_id
      LEFT JOIN users u ON ct.teacher_id = u.id
      GROUP BY c.id
      ORDER BY c.code ASC
    `);
    res.json(rows || []);
  } catch {
    res.status(500).json({ message: "Lỗi lấy danh sách lớp" });
  }
}

export async function createClass(req, res) {
  try {
    const { code, name, description, homeroom_teacher_id, homeroom_teacher_ids } = req.body;
    if (!code) return res.status(400).json({ message: "Thiếu mã lớp" });
    const up = String(code).trim().toUpperCase();
    let teacherId = homeroom_teacher_id || null;
    const teacherIds = Array.isArray(homeroom_teacher_ids) ? homeroom_teacher_ids : (teacherId ? [teacherId] : []);
    if (teacherIds.length > 0) {
      const placeholders = teacherIds.map(() => "?").join(",");
      const [rows] = await db.promise().query(`SELECT id, role FROM users WHERE id IN (${placeholders})`, teacherIds);
      const invalid = (rows || []).some((r) => (r.role || "user") !== "teacher");
      if (invalid || rows.length !== teacherIds.length) return res.status(400).json({ message: "Danh sách giáo viên không hợp lệ" });
    }
    await db.promise().execute(
      "INSERT INTO classes (code, name, description, homeroom_teacher_id) VALUES (?, ?, ?, ?)",
      [up, name || null, description || null, teacherId || null]
    );
    // Get inserted class id
    const [[c]] = await db.promise().query("SELECT id FROM classes WHERE code = ?", [up]);
    const classId = c && c.id ? c.id : null;
    if (classId && teacherIds.length > 0) {
      const values = teacherIds.map((tid) => [classId, tid]);
      await db.promise().query("INSERT IGNORE INTO class_teachers (class_id, teacher_id) VALUES ?", [values]);
    }
    res.json({ message: "Đã tạo lớp", code: up });
  } catch (e) {
    res.status(400).json({ message: "Không thể tạo lớp" });
  }
}

export async function updateClass(req, res) {
  try {
    const { id } = req.params;
    const { code, name, description, homeroom_teacher_id, homeroom_teacher_ids } = req.body;
    const fields = [];
    const params = [];
    if (code) {
      fields.push("code = ?");
      params.push(String(code).trim().toUpperCase());
    }
    if (name !== undefined) {
      fields.push("name = ?");
      params.push(name || null);
    }
    if (description !== undefined) {
      fields.push("description = ?");
      params.push(description || null);
    }
    if (homeroom_teacher_id !== undefined) {
    let teacherId = homeroom_teacher_id || null;
    if (teacherId) {
      const [[row]] = await db.promise().query("SELECT role FROM users WHERE id = ?", [teacherId]);
      if (!row) return res.status(400).json({ message: "Không tìm thấy giáo viên" });
      if ((row.role || "user") !== "teacher") return res.status(400).json({ message: "homeroom_teacher_id phải là giáo viên" });
    }
      fields.push("homeroom_teacher_id = ?");
    params.push(teacherId || null);
    }
    if (fields.length === 0) return res.status(400).json({ message: "Không có dữ liệu cập nhật" });
    params.push(id);
    const sql = `UPDATE classes SET ${fields.join(", ")} WHERE id = ?`;
    const [result] = await db.promise().execute(sql, params);
    if (!result || result.affectedRows === 0) return res.status(404).json({ message: "Không tìm thấy lớp" });
    // Update multi teachers mapping
    if (homeroom_teacher_ids !== undefined) {
      const teacherIds = Array.isArray(homeroom_teacher_ids) ? homeroom_teacher_ids : [];
      if (teacherIds.length > 0) {
        const placeholders = teacherIds.map(() => "?").join(",");
        const [rows] = await db.promise().query(`SELECT id, role FROM users WHERE id IN (${placeholders})`, teacherIds);
        const invalid = (rows || []).some((r) => (r.role || "user") !== "teacher");
        if (invalid || rows.length !== teacherIds.length) return res.status(400).json({ message: "Danh sách giáo viên không hợp lệ" });
      }
      await db.promise().execute("DELETE FROM class_teachers WHERE class_id = ?", [id]);
      if (teacherIds.length > 0) {
        const values = teacherIds.map((tid) => [id, tid]);
        await db.promise().query("INSERT IGNORE INTO class_teachers (class_id, teacher_id) VALUES ?", [values]);
      }
    }
    res.json({ message: "Đã cập nhật lớp" });
  } catch {
    res.status(500).json({ message: "Lỗi cập nhật lớp" });
  }
}

export async function deleteClass(req, res) {
  try {
    const { id } = req.params;
    
    // Set class_id to NULL for related entities before deleting
    await db.promise().query("UPDATE users SET class_id = NULL WHERE class_id = ?", [id]);
    await db.promise().query("UPDATE posts SET class_id = NULL WHERE class_id = ?", [id]);
    await db.promise().query("UPDATE project_documents SET class_id = NULL WHERE class_id = ?", [id]);
    // Also delete from class_teachers mapping
    await db.promise().query("DELETE FROM class_teachers WHERE class_id = ?", [id]);

    const [r] = await db.promise().execute("DELETE FROM classes WHERE id = ?", [id]);
    if (!r || r.affectedRows === 0) return res.status(404).json({ message: "Không tìm thấy lớp" });
    res.json({ message: "Đã xóa lớp" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Lỗi xóa lớp" });
  }
}
