import db from "../config/db.js"; 

export const getCommentsByPost = (req, res) => {
  const postId = req.params.postId;
  const userId = (req.user && req.user.id) || req.query.user_id || 0;

  // Lấy comment + reaction counts + reaction của user
  const sql = `
    SELECT c.*, u.username, u.avatar,
      COALESCE(rc.like_count, 0) AS like_count,
      COALESCE(rc.love_count, 0) AS love_count,
      COALESCE(rc.haha_count, 0) AS haha_count,
      COALESCE(rc.sad_count, 0) AS sad_count,
      r.reaction AS user_reaction
    FROM comments c
    JOIN users u ON c.user_id = u.id
    LEFT JOIN (
      SELECT comment_id,
        SUM(reaction='like') AS like_count,
        SUM(reaction='love') AS love_count,
        SUM(reaction='haha') AS haha_count,
        SUM(reaction='sad') AS sad_count
      FROM comment_reactions
      GROUP BY comment_id
    ) rc ON rc.comment_id = c.id
    LEFT JOIN comment_reactions r
      ON r.comment_id = c.id AND r.user_id = ?
    WHERE c.post_id = ?
    ORDER BY c.created_at ASC
  `;

  db.query(sql, [userId, postId], (err, data) => {
    if (err) return res.status(500).json({ message: "Lỗi server" });
    res.json(data || []);
  });
};

export const createComment = (req, res) => {
  const { post_id, parent_id, content } = req.body;
  const user_id = req.user && req.user.id;
  if (!user_id) return res.status(401).json({ message: "Unauthenticated" });
  const sql = "INSERT INTO comments (post_id, parent_id, user_id, content) VALUES (?, ?, ?, ?)";
  db.query(sql, [post_id, parent_id || null, user_id, content], (err, result) => {
    if (err) return res.status(500).json({ message: "Lỗi tạo comment" });
    res.json({ message: "Đã tạo comment", id: result.insertId });
  });
};

export const deleteComment = (req, res) => {
  // 1. Lấy id comment từ URL params
  const { id } = req.params; 
  // 2. Lấy user_id từ body (hoặc thông qua token/session - cách an toàn hơn)
  // Giả sử bạn truyền user_id qua body như trong code FE của bạn
  const user_id = req.user && req.user.id; 

  // 3. Cập nhật SQL: Chỉ xóa khi ID khớp VÀ user_id khớp
  const sql = "DELETE FROM comments WHERE id = ? AND user_id = ?";

  // 4. Truyền cả hai giá trị vào truy vấn
  db.query(sql, [id, user_id], (err, result) => {
    if (err) {
        // Log lỗi chi tiết hơn nếu có thể
        console.error("Database error:", err);
        return res.status(500).json({ message: "Lỗi xóa comment (Database Error)" });
    }

    if (result.affectedRows === 0) {
      // 404: Comment không tồn tại, HOẶC 403: Không có quyền xóa
      return res.status(403).json({ message: "Bạn không có quyền hoặc bình luận không tồn tại" });
    }

    res.json({ message: "Đã xóa comment" });
  });
};


export const reactComment = (req, res) => {
  const { comment_id, reaction } = req.body;
  const user_id = req.user && req.user.id;

  const sql = `
    INSERT INTO comment_reactions (comment_id, user_id, reaction)
    VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE reaction = VALUES(reaction)
  `;

  db.query(sql, [comment_id, user_id, reaction], (err) => {
    if (err) return res.status(500).json({ message: "Lỗi reaction comment" });
    res.json({ message: "Đã phản ứng", reaction });
  });
};


export const removeReactComment = (req, res) => {
  const { comment_id } = req.body;
  const user_id = req.user && req.user.id;

  const sql = "DELETE FROM comment_reactions WHERE comment_id=? AND user_id=?";
  db.query(sql, [comment_id, user_id], (err) => {
    if (err) return res.status(500).json({ message: "Lỗi bỏ reaction" });
    res.json({ message: "Đã bỏ phản ứng" });
  });
};
