import db from "../config/db.js";

export async function ensureTaskSchema() {
  try {
    await db.promise().query(
      "CREATE TABLE IF NOT EXISTS tasks (id INT AUTO_INCREMENT PRIMARY KEY, title VARCHAR(255) NOT NULL, description TEXT NULL, priority VARCHAR(20) DEFAULT 'medium', deadline DATETIME NULL, status VARCHAR(30) DEFAULT 'new', created_by INT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)"
    );
    await db.promise().query(
      "CREATE TABLE IF NOT EXISTS task_assignments (id INT AUTO_INCREMENT PRIMARY KEY, task_id INT NOT NULL, user_id INT NOT NULL, UNIQUE KEY uniq_task_user (task_id, user_id))"
    );
    await db.promise().query(
      "CREATE TABLE IF NOT EXISTS task_comments (id INT AUTO_INCREMENT PRIMARY KEY, task_id INT NOT NULL, user_id INT NOT NULL, content TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)"
    );
    await db.promise().query(
      "CREATE TABLE IF NOT EXISTS task_notifications (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, task_id INT NOT NULL, type VARCHAR(30) NOT NULL, message VARCHAR(255) NULL, is_read TINYINT(1) DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)"
    );
    await db.promise().query(
      "CREATE TABLE IF NOT EXISTS task_files (id INT AUTO_INCREMENT PRIMARY KEY, task_id INT NOT NULL, filename VARCHAR(255) NOT NULL, uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP)"
    );
    await db.promise().query(
      "CREATE TABLE IF NOT EXISTS task_submissions (id INT AUTO_INCREMENT PRIMARY KEY, task_id INT NOT NULL, user_id INT NOT NULL, filename VARCHAR(255) NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)"
    );
    try {
      await db.promise().query("ALTER TABLE task_submissions ADD COLUMN note TEXT NULL");
    } catch {}
  } catch {}
}

export const createTask = async (req, res) => {
  try {
    let { title, description, priority, deadline, assignees } = req.body;
    title = typeof title === 'string' ? title.trim() : title;
    // normalize assignees from string to array BEFORE validation
    if (typeof assignees === "string") {
      try {
        const parsed = JSON.parse(assignees);
        if (Array.isArray(parsed)) assignees = parsed;
      } catch {
        assignees = assignees.split(",").map((s) => Number(s)).filter(Boolean);
      }
    }
    if (!title || !Array.isArray(assignees) || assignees.length === 0) {
      return res.status(400).json({ message: "Thiếu dữ liệu" });
    }
    const createdBy = req.user && req.user.id;
    let dl = deadline || null;
    if (typeof dl === "string" && dl.includes("T")) {
      const base = dl.replace("T", " ");
      dl = base.length === 16 ? base + ":00" : base;
    }
    const [result] = await db.promise().execute(
      "INSERT INTO tasks (title, description, priority, deadline, status, created_by) VALUES (?, ?, ?, ?, 'new', ?)",
      [title, description || null, priority || "medium", dl, createdBy]
    );
    const taskId = result.insertId;
    const values = assignees.map((uid) => [taskId, uid]);
    await db.promise().query("INSERT INTO task_assignments (task_id, user_id) VALUES ?", [values]);
    const files = req.files || [];
    if (files.length > 0) {
      const fvals = files.map((f) => [taskId, f.filename]);
      await db.promise().query("INSERT INTO task_files (task_id, filename) VALUES ?", [fvals]);
    }
    const msg = `Nhiệm vụ mới: ${title}`;
    for (const uid of assignees) {
      await db.promise().execute(
        "INSERT INTO task_notifications (user_id, task_id, type, message) VALUES (?, ?, 'assigned', ?)",
        [uid, taskId, msg]
      );
    }
    try {
      const io = req.app.get("io");
      const online = req.app.get("onlineUsers");
      for (const uid of assignees) {
        const set = online && online.get && online.get(String(uid));
        if (set && set.size > 0) {
          for (const sid of set.values()) {
            io.to(sid).emit("task_notification", { type: "assigned", task_id: taskId, title });
          }
        }
      }
    } catch {}
    res.json({ message: "Đã tạo nhiệm vụ", id: taskId });
  } catch (e) {
    res.status(500).json({ message: "Lỗi tạo nhiệm vụ" });
  }
};

export const listTasks = async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    let role = "user";
    try {
      const [rows] = await db.promise().execute("SELECT role FROM users WHERE id = ?", [userId]);
      role = (rows && rows[0] && rows[0].role) || "user";
    } catch {}
    if (role === "admin") {
      const [rows] = await db.promise().query(
        "SELECT t.*, GROUP_CONCAT(a.user_id) AS assignees, GROUP_CONCAT(u.username) AS assignees_usernames FROM tasks t LEFT JOIN task_assignments a ON t.id=a.task_id LEFT JOIN users u ON a.user_id = u.id GROUP BY t.id ORDER BY t.created_at DESC"
      );
      return res.json(rows || []);
    }
    const [rows] = await db.promise().execute(
      "SELECT t.*, GROUP_CONCAT(a.user_id) AS assignees, GROUP_CONCAT(u.username) AS assignees_usernames FROM tasks t JOIN task_assignments a ON t.id=a.task_id JOIN users u ON a.user_id = u.id WHERE a.user_id=? GROUP BY t.id ORDER BY t.created_at DESC",
      [userId]
    );
    res.json(rows || []);
  } catch (e) {
    res.status(500).json({ message: "Lỗi lấy danh sách nhiệm vụ" });
  }
};

export const updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { deadline, priority, assignees } = req.body;
    const fields = [];
    const params = [];
    if (deadline !== undefined) {
      fields.push("deadline = ?");
      params.push(deadline || null);
    }
    if (priority) {
      fields.push("priority = ?");
      params.push(priority);
    }
    if (fields.length > 0) {
      params.push(id);
      await db.promise().execute(`UPDATE tasks SET ${fields.join(", ")} WHERE id = ?`, params);
    }
    if (Array.isArray(assignees)) {
      await db.promise().execute("DELETE FROM task_assignments WHERE task_id = ?", [id]);
      if (assignees.length > 0) {
        const values = assignees.map((uid) => [id, uid]);
        await db.promise().query("INSERT INTO task_assignments (task_id, user_id) VALUES ?", [values]);
      }
    }
    res.json({ message: "Đã cập nhật nhiệm vụ" });
  } catch (e) {
    res.status(500).json({ message: "Lỗi cập nhật nhiệm vụ" });
  }
};

export const changeStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user && req.user.id;
    let role = "user";
    try {
      const [rows] = await db.promise().execute("SELECT role FROM users WHERE id = ?", [userId]);
      role = (rows && rows[0] && rows[0].role) || "user";
    } catch {}
    const [assign] = await db.promise().execute("SELECT 1 FROM task_assignments WHERE task_id=? AND user_id=?", [id, userId]);
    const isAssignee = assign && assign.length > 0;
    const allowedUser = ["in_progress", "pending_review"];
    const allowedAdmin = ["closed"];
    if (role !== "admin" && !isAssignee) return res.status(403).json({ message: "Không có quyền" });
    if (role === "admin") {
      if (!allowedAdmin.includes(status)) return res.status(400).json({ message: "Trạng thái không hợp lệ" });
    } else {
      if (!allowedUser.includes(status)) return res.status(400).json({ message: "Trạng thái không hợp lệ" });
    }
    if (role !== "admin" && status === "pending_review") {
      const files = req.files || [];
      if (!files || files.length === 0) {
        return res.status(400).json({ message: "Yêu cầu đính kèm minh chứng" });
      }
      const note = typeof req.body.note === 'string' ? req.body.note : null;
      const vals = files.map((f) => [id, userId, f.filename, note]);
      await db.promise().query("INSERT INTO task_submissions (task_id, user_id, filename, note) VALUES ?", [vals]);
    }
    await db.promise().execute("UPDATE tasks SET status=? WHERE id=?", [status, id]);
    const [taskRows] = await db.promise().execute("SELECT title FROM tasks WHERE id=?", [id]);
    const title = taskRows && taskRows[0] && taskRows[0].title;
    if (role === "admin") {
      const [assRows] = await db.promise().execute("SELECT user_id FROM task_assignments WHERE task_id=?", [id]);
      for (const r of assRows || []) {
        await db.promise().execute(
          "INSERT INTO task_notifications (user_id, task_id, type, message) VALUES (?, ?, 'status_changed', ?)",
          [r.user_id, id, `Trạng thái nhiệm vụ cập nhật: ${status}`]
        );
      }
      try {
        const io = req.app.get("io");
        const online = req.app.get("onlineUsers");
        for (const r of assRows || []) {
          const set = online && online.get && online.get(String(r.user_id));
          if (set && set.size > 0) {
            for (const sid of set.values()) {
              io.to(sid).emit("task_notification", { type: "status_changed", task_id: id, status });
            }
          }
        }
      } catch {}
    } else {
      const [creator] = await db.promise().execute("SELECT created_by FROM tasks WHERE id=?", [id]);
      const adminId = creator && creator[0] && creator[0].created_by;
      if (adminId) {
        await db.promise().execute(
          "INSERT INTO task_notifications (user_id, task_id, type, message) VALUES (?, ?, 'ack', ?)",
          [adminId, id, `Người nhận đã cập nhật trạng thái: ${status}`]
        );
        try {
          const io = req.app.get("io");
          const online = req.app.get("onlineUsers");
          const set = online && online.get && online.get(String(adminId));
          if (set && set.size > 0) {
            for (const sid of set.values()) {
              io.to(sid).emit("task_notification", { type: "ack", task_id: id, status });
            }
          }
        } catch {}
      }
    }
    res.json({ message: "Đã đổi trạng thái" });
  } catch (e) {
    res.status(500).json({ message: "Lỗi đổi trạng thái" });
  }
};

export const addComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user && req.user.id;
    if (!content) return res.status(400).json({ message: "Thiếu nội dung" });
    await db.promise().execute("INSERT INTO task_comments (task_id, user_id, content) VALUES (?, ?, ?)", [id, userId, content]);
    res.json({ message: "Đã thêm comment" });
  } catch (e) {
    res.status(500).json({ message: "Lỗi thêm comment" });
  }
};

export const getTaskDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.promise().execute("SELECT * FROM tasks WHERE id=?", [id]);
    if (!rows || rows.length === 0) return res.status(404).json({ message: "Không tìm thấy nhiệm vụ" });
    const task = rows[0];
    const [assRows] = await db.promise().execute("SELECT u.id AS user_id, u.username FROM task_assignments a JOIN users u ON a.user_id = u.id WHERE a.task_id=?", [id]);
    const [comRows] = await db.promise().execute("SELECT * FROM task_comments WHERE task_id=? ORDER BY created_at ASC", [id]);
    const [fileRows] = await db.promise().execute("SELECT filename FROM task_files WHERE task_id=? ORDER BY id ASC", [id]);
    const [subRows] = await db.promise().execute("SELECT user_id, filename, created_at, note FROM task_submissions WHERE task_id=? ORDER BY id ASC", [id]);
    let creator = null;
    try {
      const [cRows] = await db.promise().execute("SELECT u.id, u.username FROM users u WHERE u.id = ?", [task.created_by]);
      creator = (cRows && cRows[0]) || null;
    } catch {}
    const attachments = (fileRows || []).map((f) => ({ filename: f.filename, url: `http://localhost:5000/uploads/${f.filename}` }));
    const submissions = (subRows || []).map((s) => ({ user_id: s.user_id, filename: s.filename, url: `http://localhost:5000/uploads/${s.filename}`, created_at: s.created_at, note: s.note || null }));
    const assignees = (assRows || []).map((r) => ({ id: r.user_id, username: r.username }));
    res.json({ task, creator, assignees, comments: comRows || [], attachments, submissions });
  } catch (e) {
    res.status(500).json({ message: "Lỗi lấy chi tiết" });
  }
};

export const unreadNotifCount = async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    const [rows] = await db.promise().execute("SELECT COUNT(*) AS c FROM task_notifications WHERE user_id=? AND is_read=0", [userId]);
    const c = rows && rows[0] && rows[0].c ? rows[0].c : 0;
    res.json({ count: c });
  } catch (e) {
    res.status(500).json({ message: "Lỗi lấy số thông báo" });
  }
};

export const markNotifsRead = async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    await db.promise().execute("UPDATE task_notifications SET is_read=1 WHERE user_id=?", [userId]);
    res.json({ message: "Đã đánh dấu đã đọc" });
  } catch (e) {
    res.status(500).json({ message: "Lỗi đánh dấu đã đọc" });
  }
};

export const deleteTask = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user && req.user.id;
    const [rows] = await db.promise().execute("SELECT created_by, status FROM tasks WHERE id=?", [id]);
    if (!rows || rows.length === 0) return res.status(404).json({ message: "Không tìm thấy nhiệm vụ" });
    const t = rows[0];
    if (String(t.created_by) !== String(userId)) return res.status(403).json({ message: "Chỉ người giao mới được xóa" });
    if (t.status !== 'closed') return res.status(400).json({ message: "Chỉ xóa nhiệm vụ đã hoàn thành" });

    const [fileRows] = await db.promise().execute("SELECT filename FROM task_files WHERE task_id=?", [id]);
    const [subRows] = await db.promise().execute("SELECT filename FROM task_submissions WHERE task_id=?", [id]);
    const names = [...(fileRows || []).map((r) => r.filename), ...(subRows || []).map((r) => r.filename)];
    try {
      const fs = await import('fs');
      const path = await import('path');
      for (const n of names) {
        if (!n) continue;
        const p = path.join(process.cwd(), 'uploads', n);
        try { fs.unlinkSync(p); } catch {}
      }
    } catch {}

    await db.promise().execute("DELETE FROM task_files WHERE task_id=?", [id]);
    await db.promise().execute("DELETE FROM task_submissions WHERE task_id=?", [id]);
    await db.promise().execute("DELETE FROM task_assignments WHERE task_id=?", [id]);
    await db.promise().execute("DELETE FROM task_comments WHERE task_id=?", [id]);
    await db.promise().execute("DELETE FROM task_notifications WHERE task_id=?", [id]);
    await db.promise().execute("DELETE FROM tasks WHERE id=?", [id]);
    res.json({ message: "Đã xóa nhiệm vụ" });
  } catch (e) {
    res.status(500).json({ message: "Lỗi xóa nhiệm vụ" });
  }
};

