import db from "../config/db.js";
import cloudinary from "../config/cloudinary.js";
import https from "https";
import fs from "fs";
import { Readable } from "stream";

const getCloudinaryUrl = (publicId, originalName) => {
  if (!publicId) return null;
  
  
  let ext = "";
  
  const match = publicId.match(/\.([a-zA-Z0-9]+)$/);
  if (match) {
    ext = match[1].toLowerCase();
  } else if (originalName) {
    
    const match2 = originalName.match(/\.([a-zA-Z0-9]+)$/);
    if (match2) {
      ext = match2[1].toLowerCase();
    }
  }

  
  
  
  const imageExts = ["jpg", "jpeg", "png", "gif", "bmp", "tiff", "webp", "svg", "heic", "ico", "pdf", "eps", "psd"];
  const videoExts = ["mp4", "mov", "avi", "mkv", "webm", "wmv", "flv", "mpeg", "3gp"];
  
  let resourceType = "image"; 
  if (ext) {
    if (videoExts.includes(ext)) resourceType = "video";
    else if (imageExts.includes(ext)) resourceType = "image";
    else resourceType = "raw";
  }

  
  const options = { 
    secure: true, 
    resource_type: resourceType,
  };

  return cloudinary.url(publicId, options);
};

export const createTask = async (req, res) => {
  try {
    let { title, description, priority, deadline, assignees, class_id, assign_all_class } = req.body;
    title = typeof title === 'string' ? title.trim() : title;
    
    if (typeof assignees === "string") {
      try {
        const parsed = JSON.parse(assignees);
        if (Array.isArray(parsed)) assignees = parsed;
      } catch {
        assignees = assignees.split(",").map((s) => Number(s)).filter(Boolean);
      }
    }
    if (!title) return res.status(400).json({ message: "Thiếu dữ liệu" });
    const createdBy = req.user && req.user.id;
    let dl = deadline || null;
    if (typeof dl === "string" && dl.includes("T")) {
      const base = dl.replace("T", " ");
      dl = base.length === 16 ? base + ":00" : base;
    }
    
    
    const classCodeParam = req.query.class || req.body.class || null;
    let finalClassId = class_id || null;
    if (!finalClassId && classCodeParam) {
      try {
        const [[c]] = await db.promise().query("SELECT id FROM classes WHERE code = ?", [String(classCodeParam).trim().toUpperCase()]);
        finalClassId = c && c.id ? c.id : null;
      } catch {}
    }
    if (!finalClassId) {
      try {
        
        
        
        
        const [uRows] = await db.promise().query("SELECT class_id FROM users WHERE id = ?", [createdBy]);
        if (uRows && uRows[0] && uRows[0].class_id) {
           
           
           
           
           
           
           
           
           if (assignees.length > 0) {
             const [aRows] = await db.promise().query("SELECT class_id FROM users WHERE id = ?", [assignees[0]]);
             if (aRows && aRows[0]) finalClassId = aRows[0].class_id;
           }
        }
      } catch {}
    }
    const assignAll = String(assign_all_class ?? "").toLowerCase() === "1" || String(assign_all_class ?? "").toLowerCase() === "true";
    if (assignAll && finalClassId) {
      try {
        const [uRows] = await db.promise().query("SELECT id FROM users WHERE role='user' AND class_id = ?", [finalClassId]);
        assignees = (uRows || []).map((r) => r.id);
      } catch {}
    }
    if (!Array.isArray(assignees) || assignees.length === 0) {
      return res.status(400).json({ message: "Thiếu danh sách người nhận" });
    }
    
    try {
      const placeholders = assignees.map(() => "?").join(",");
      const [roleRows] = await db.promise().query(
        `SELECT id, COALESCE(role,'user') AS role FROM users WHERE id IN (${placeholders})`,
        assignees
      );
      const invalidRole = (roleRows || []).some((r) => String(r.role || 'user') !== 'user');
      if (invalidRole) {
        return res.status(400).json({ message: "Chỉ được giao nhiệm vụ cho user (học sinh)" });
      }
    } catch {}
    
    if (finalClassId) {
      const placeholders = assignees.map(() => "?").join(",");
      const [rowsAss] = await db.promise().query(
        `SELECT id, class_id FROM users WHERE id IN (${placeholders})`,
        assignees
      );
      const invalid = (rowsAss || []).some((u) => Number(u.class_id) !== Number(finalClassId));
      if (invalid) {
        return res.status(400).json({ message: "Chỉ được giao nhiệm vụ cho user trong đúng lớp" });
      }
    }

    const [result] = await db.promise().execute(
      "INSERT INTO tasks (title, description, priority, deadline, status, created_by, class_id) VALUES (?, ?, ?, ?, 'new', ?, ?)",
      [title, description || null, priority || "medium", dl, createdBy, finalClassId]
    );
    const taskId = result.insertId;
    const values = assignees.map((uid) => [taskId, uid]);
    await db.promise().query("INSERT INTO task_assignments (task_id, user_id) VALUES ?", [values]);
    const files = req.files || [];
    if (files.length > 0) {
      const uploads = files.map((f) => new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream({ resource_type: "auto", folder: "social_app/tasks/attachments" }, (err, result) => {
          if (f.path) { try { fs.unlinkSync(f.path); } catch(e) {} }
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
      const fvals = results.map((r, idx) => [taskId, r.public_id, files[idx].originalname || null]);
      await db.promise().query("INSERT INTO task_files (task_id, filename, original_name) VALUES ?", [fvals]);
    }
    const msg = `Nhiệm vụ mới: ${title}`;
    for (const uid of assignees) {
      await db.promise().execute(
        "INSERT INTO task_notifications (user_id, task_id, type, message) VALUES (?, ?, 'assigned', ?)",
        [uid, taskId, msg]
      );
    }
    
    res.json({ message: "Đã tạo nhiệm vụ", id: taskId });
  } catch (e) {
    console.error("Create task error:", e);
    res.status(500).json({ message: "Lỗi tạo nhiệm vụ: " + e.message });
  }
};

export const listTasks = async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    let role = "user";
    let userClassId = null;
    try {
      const [rows] = await db.promise().execute("SELECT role, class_id FROM users WHERE id = ?", [userId]);
      role = (rows && rows[0] && rows[0].role) || "user";
      userClassId = (rows && rows[0] && rows[0].class_id) || null;
    } catch {}
    
    
    
    const classParam = req.query.class || null; 

    if (role === "admin" || role === "teacher") {
      let whereSql = "";
      const params = [];
      if (classParam) {
         
         whereSql = "WHERE c.code = ?";
         params.push(classParam);
      }

      const query = `
        SELECT t.*, c.code as class_code, GROUP_CONCAT(a.user_id) AS assignees, GROUP_CONCAT(u.username) AS assignees_usernames,
        (SELECT COUNT(*) FROM task_submissions s WHERE s.task_id = t.id) AS submissions_count,
        (SELECT s.grade FROM task_submissions s WHERE s.task_id = t.id ORDER BY s.created_at DESC LIMIT 1) AS latest_grade,
        (SELECT s.feedback FROM task_submissions s WHERE s.task_id = t.id ORDER BY s.created_at DESC LIMIT 1) AS latest_feedback
        FROM tasks t 
        LEFT JOIN classes c ON t.class_id = c.id
        LEFT JOIN task_assignments a ON t.id=a.task_id 
        LEFT JOIN users u ON a.user_id = u.id 
        ${whereSql}
        GROUP BY t.id 
        ORDER BY t.created_at DESC
      `;
      const [rows] = await db.promise().query(query, params);
      return res.json(rows || []);
    }
    
    
    
    
    
    
    
    
    const [rows] = await db.promise().execute(
      `SELECT t.*, c.code as class_code, GROUP_CONCAT(a.user_id) AS assignees, GROUP_CONCAT(u.username) AS assignees_usernames,
       (SELECT COUNT(*) FROM task_submissions s WHERE s.task_id = t.id AND s.user_id = ?) AS submissions_count,
       (SELECT s.grade FROM task_submissions s WHERE s.task_id = t.id AND s.user_id = ? ORDER BY s.created_at DESC LIMIT 1) AS latest_grade,
       (SELECT s.feedback FROM task_submissions s WHERE s.task_id = t.id AND s.user_id = ? ORDER BY s.created_at DESC LIMIT 1) AS latest_feedback
       FROM tasks t 
       LEFT JOIN classes c ON t.class_id = c.id
       JOIN task_assignments a ON t.id=a.task_id 
       JOIN users u ON a.user_id = u.id 
       WHERE a.user_id=? 
       AND (t.class_id IS NULL OR t.class_id = ?)
       GROUP BY t.id 
       ORDER BY t.created_at DESC`,
      [userId, userId, userId, userId, userClassId]
    );
    res.json(rows || []);
  } catch (e) {
    res.status(500).json({ message: "Lỗi lấy danh sách nhiệm vụ" });
  }
};

export const updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { deadline, priority, assignees, description } = req.body;
    const fields = [];
    const params = [];
    if (deadline !== undefined) {
      let dl = deadline || null;
      if (typeof dl === "string" && dl.includes("T")) {
        const base = dl.replace("T", " ");
        dl = base.length === 16 ? base + ":00" : base;
      }
      fields.push("deadline = ?");
      params.push(dl);
    }
    if (priority) {
      fields.push("priority = ?");
      params.push(priority);
    }
    if (description !== undefined) {
      fields.push("description = ?");
      params.push(description || null);
    }
    if (fields.length > 0) {
      params.push(id);
      await db.promise().execute(`UPDATE tasks SET ${fields.join(", ")} WHERE id = ?`, params);
    }
    if (Array.isArray(assignees)) {
      try {
        const placeholders = assignees.map(() => "?").join(",");
        const [roleRows] = await db.promise().query(
          `SELECT id, COALESCE(role,'user') AS role FROM users WHERE id IN (${placeholders})`,
          assignees
        );
        const invalidRole = (roleRows || []).some((r) => String(r.role || 'user') !== 'user');
        if (invalidRole) {
          return res.status(400).json({ message: "Chỉ được giao nhiệm vụ cho user (học sinh)" });
        }
      } catch {}
      
      let taskClassId = null;
      try {
        const [[t]] = await db.promise().query("SELECT class_id FROM tasks WHERE id = ?", [id]);
        taskClassId = t && t.class_id ? t.class_id : null;
      } catch {}
      if (taskClassId) {
        const placeholders = assignees.map(() => "?").join(",");
        const [rowsAss] = await db.promise().query(
          `SELECT id, class_id FROM users WHERE id IN (${placeholders})`,
          assignees
        );
        const invalid = (rowsAss || []).some((u) => Number(u.class_id) !== Number(taskClassId));
        if (invalid) {
          return res.status(400).json({ message: "Người nhận phải thuộc đúng lớp của nhiệm vụ" });
        }
      }
      await db.promise().execute("DELETE FROM task_assignments WHERE task_id = ?", [id]);
      if (assignees.length > 0) {
        const values = assignees.map((uid) => [id, uid]);
        await db.promise().query("INSERT INTO task_assignments (task_id, user_id) VALUES ?", [values]);
      }
    }
    try {
      const [assRows] = await db.promise().execute("SELECT user_id FROM task_assignments WHERE task_id=?", [id]);
      for (const r of assRows || []) {
        await db.promise().execute(
          "INSERT INTO task_notifications (user_id, task_id, type, message) VALUES (?, ?, 'task_updated', ?)",
          [r.user_id, id, "Nhiệm vụ đã được cập nhật"]
        );
      }
      
    } catch {}
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
    const allowedUser = ["in_progress"];
    const allowedManager = ["completed"]; 
    const isManager = role === "admin" || role === "teacher";

    
    if (!isManager && !isAssignee) {
      return res.status(403).json({ message: "Không có quyền" });
    }

    if (isManager ? !allowedManager.includes(status) : !allowedUser.includes(status)) {
      return res.status(400).json({ message: "Trạng thái không hợp lệ" });
    }
    let newStatus = status;
    if (!isManager && status === "in_progress") {
      const files = req.files || [];
      if (!files || files.length === 0) {
        return res.status(400).json({ message: "Yêu cầu đính kèm minh chứng" });
      }
      const note = typeof req.body.note === 'string' ? req.body.note : null;
      const uploads = files.map((f) => new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream({ resource_type: "auto", folder: "social_app/tasks/submissions" }, (err, result) => {
          if (f.path) { try { fs.unlinkSync(f.path); } catch(e) {} }
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
      const vals = results.map((r, idx) => [id, userId, r.public_id, note, files[idx].originalname || null]);
      await db.promise().query("INSERT INTO task_submissions (task_id, user_id, filename, note, original_name) VALUES ?", [vals]);
      newStatus = "in_progress";
    }
    await db.promise().execute("UPDATE tasks SET status=? WHERE id=?", [newStatus, id]);
    const [taskRows] = await db.promise().execute("SELECT title FROM tasks WHERE id=?", [id]);
    const title = taskRows && taskRows[0] && taskRows[0].title;
    if (isManager) {
      const [assRows] = await db.promise().execute("SELECT user_id FROM task_assignments WHERE task_id=?", [id]);
      if (status === "completed") {
        const gradeRaw = req.body && (req.body.grade ?? null);
        const feedback = typeof req.body.feedback === "string" ? req.body.feedback : null;
        let grade = null;
        if (gradeRaw !== null && gradeRaw !== undefined) {
          const num = Number(gradeRaw);
          if (Number.isFinite(num)) grade = num;
        }
        if (grade !== null || feedback !== null) {
          const [[latest]] = await db.promise().query(
            "SELECT id FROM task_submissions WHERE task_id = ? ORDER BY created_at DESC LIMIT 1",
            [id]
          );
          const latestId = latest && latest.id ? latest.id : null;
          if (latestId) {
            await db.promise().execute(
              "UPDATE task_submissions SET grade = COALESCE(?, grade), feedback = COALESCE(?, feedback) WHERE id = ?",
              [grade, feedback, latestId]
            );
          }
        }
      }
      for (const r of assRows || []) {
        await db.promise().execute(
          "INSERT INTO task_notifications (user_id, task_id, type, message) VALUES (?, ?, 'status_changed', ?)",
          [r.user_id, id, `Trạng thái nhiệm vụ cập nhật: ${newStatus}`]
        );
      }
      
    } else {
      const [creator] = await db.promise().execute("SELECT created_by FROM tasks WHERE id=?", [id]);
      const adminId = creator && creator[0] && creator[0].created_by;
      if (adminId) {
        await db.promise().execute(
          "INSERT INTO task_notifications (user_id, task_id, type, message) VALUES (?, ?, 'ack', ?)",
          [adminId, id, `Người nhận đã cập nhật trạng thái: ${status}`]
        );
        
      }
    }
    res.json({ message: "Đã đổi trạng thái", status: newStatus });
  } catch (e) {
    console.error("Change status error:", e);
    res.status(500).json({ message: "Lỗi đổi trạng thái: " + (e && e.message ? e.message : "unknown") });
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
    const [fileRows] = await db.promise().execute("SELECT id, filename, original_name FROM task_files WHERE task_id=? ORDER BY id ASC", [id]);
    const [subRows] = await db.promise().execute("SELECT id, user_id, filename, original_name, created_at, note, grade, feedback FROM task_submissions WHERE task_id=? ORDER BY id ASC", [id]);
    let creator = null;
    try {
      const [cRows] = await db.promise().execute("SELECT u.id, u.username FROM users u WHERE u.id = ?", [task.created_by]);
      creator = (cRows && cRows[0]) || null;
    } catch {}
    const attachments = (fileRows || []).map((f) => ({ id: f.id, filename: f.filename, original_name: f.original_name, url: f.filename && String(f.filename).includes('/') ? getCloudinaryUrl(f.filename, f.original_name) : `http://localhost:5000/uploads/${f.filename}` }));
    const submissions = (subRows || []).map((s) => ({ id: s.id, user_id: s.user_id, filename: s.filename, original_name: s.original_name, url: s.filename && String(s.filename).includes('/') ? getCloudinaryUrl(s.filename, s.original_name) : `http://localhost:5000/uploads/${s.filename}`, created_at: s.created_at, note: s.note || null, grade: s.grade ?? null, feedback: s.feedback ?? null }));
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
    

    const [fileRows] = await db.promise().execute("SELECT filename FROM task_files WHERE task_id=?", [id]);
    const [subRows] = await db.promise().execute("SELECT filename FROM task_submissions WHERE task_id=?", [id]);
    const names = [...(fileRows || []).map((r) => r.filename), ...(subRows || []).map((r) => r.filename)];
    for (const n of names) {
      if (!n) continue;
      if (String(n).includes('/')) {
        try { await cloudinary.uploader.destroy(n, { resource_type: 'auto' }); } catch {}
      } else {
        try {
          const fs = await import('fs');
          const path = await import('path');
          const p = path.join(process.cwd(), 'uploads', n);
          try { fs.unlinkSync(p); } catch {}
        } catch {}
      }
    }

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

export const downloadTaskFile = async (req, res) => {
  try {
    const { id } = req.params;
    const { type } = req.query; 
    
    let table = "task_files";
    if (type === "submission") table = "task_submissions";
    
    
    
    const [rows] = await db.promise().execute(`SELECT filename, original_name FROM ${type === "submission" ? "task_submissions" : "task_files"} WHERE id=?`, [id]);
    
    if (!rows || rows.length === 0) return res.status(404).json({ message: "Không tìm thấy file" });
    
    const { filename: publicId, original_name } = rows[0];

    if (!publicId || !publicId.includes('/')) {
       return res.redirect(`http://localhost:5000/uploads/${publicId}`);
    }

    const url = getCloudinaryUrl(publicId, original_name);
    
    https.get(url, (stream) => {
      if (stream.statusCode !== 200) {
        return res.status(stream.statusCode).send("Failed to fetch file");
      }
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(original_name || 'download')}"`);
      res.setHeader('Content-Type', stream.headers['content-type'] || 'application/octet-stream');
      stream.pipe(res);
    }).on('error', (e) => {
      res.status(500).send("Error fetching file");
    });

  } catch (e) {
    res.status(500).json({ message: "Lỗi tải file" });
  }
};

export const gradeSubmission = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user && req.user.id;
    const role = req.user && req.user.role;
    if (role !== "admin" && role !== "teacher") return res.status(403).json({ message: "Chỉ giáo viên hoặc admin" });
    const targetUserId = Number(req.body.user_id);
    const gradeRaw = req.body && (req.body.grade ?? null);
    const feedback = typeof req.body.feedback === "string" ? req.body.feedback : null;
    if (!targetUserId) return res.status(400).json({ message: "Thiếu user_id" });
    const [[latest]] = await db.promise().query(
      "SELECT id FROM task_submissions WHERE task_id = ? AND user_id = ? ORDER BY created_at DESC LIMIT 1",
      [id, targetUserId]
    );
    const latestId = latest && latest.id ? latest.id : null;
    if (!latestId) return res.status(404).json({ message: "User chưa nộp minh chứng" });
    let grade = null;
    if (gradeRaw !== null && gradeRaw !== undefined) {
      const num = Number(gradeRaw);
      if (Number.isFinite(num)) grade = num;
    }
    await db.promise().execute(
      "UPDATE task_submissions SET grade = COALESCE(?, grade), feedback = COALESCE(?, feedback) WHERE id = ?",
      [grade, feedback, latestId]
    );
    res.json({ message: "Đã lưu điểm/ghi chú" });
  } catch (e) {
    res.status(500).json({ message: "Lỗi lưu điểm/ghi chú" });
  }
};

