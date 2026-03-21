import db from "../config/db.js";
export async function addMessage(msg) {
  const sql = `INSERT INTO messages (sender_id, receiver_id, content, file_url, file_type) VALUES (?, ?, ?, ?, ?)`;
  const params = [msg.from, msg.to, msg.content || null, msg.file_url || null, msg.file_type || 'text'];
  try {
    const [result] = await db.promise().execute(sql, params);
    const insertId = result.insertId;
    const [rows] = await db.promise().execute('SELECT * FROM messages WHERE id = ?', [insertId]);
    return rows[0];
  } catch (err) {
    console.error('Failed to add message to DB:', err);
    throw err;
  }
}

export async function getConversation(req, res) {
  const { userA, userB } = req.params;
  const sql = `
    SELECT * FROM messages
    WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
    ORDER BY created_at ASC
    LIMIT 500
  `;
  try {
    const [rows] = await db.promise().execute(sql, [userA, userB, userB, userA]);
    res.json(rows);
  } catch (err) {
    console.error('Failed to fetch conversation:', err);
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
}

export async function getUnreadCounts(req, res) {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ message: 'Unauthenticated' });
    const [rows] = await db.promise().execute(
      'SELECT sender_id, COUNT(*) AS count FROM messages WHERE receiver_id = ? AND is_read = 0 AND is_deleted = 0 GROUP BY sender_id',
      [userId]
    );
    const result = {};
    for (const r of rows) {
      result[String(r.sender_id)] = Number(r.count) || 0;
    }
    res.json(result);
  } catch (err) {
    console.error('Failed to fetch unread counts:', err);
    res.status(500).json({ message: 'Failed to fetch unread counts' });
  }
}

export async function markConversationRead(req, res) {
  try {
    const userId = req.user && req.user.id;
    const { otherId } = req.body || {};
    if (!userId) return res.status(401).json({ message: 'Unauthenticated' });
    if (!otherId) return res.status(400).json({ message: 'Missing otherId' });
    const [result] = await db.promise().execute(
      'UPDATE messages SET is_read = 1 WHERE receiver_id = ? AND sender_id = ? AND is_read = 0',
      [userId, otherId]
    );
    res.json({ updated: result.affectedRows || 0 });
  } catch (err) {
    console.error('Failed to mark conversation read:', err);
    res.status(500).json({ message: 'Failed to mark conversation read' });
  }
}

export async function deleteMessage(req, res) {
  const messageId = req.params.id;
  const userId = req.user && req.user.id;
  if (!userId) return res.status(401).json({ message: 'Unauthenticated' });

  try {
    const [result] = await db.promise().execute(
      'UPDATE messages SET is_deleted = 1, content = NULL, file_url = NULL, file_type = ? WHERE id = ? AND sender_id = ?',
      ['text', messageId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Message not found or not allowed' });
    }

    const [rows] = await db.promise().execute('SELECT * FROM messages WHERE id = ?', [messageId]);
    const updated = rows[0];
    try {
      if (req && req.app && req.app.get) {
        const io = req.app.get('io');
        if (io) io.emit('message_deleted', updated);
      }
    } catch (emitErr) {
      console.warn('Failed to emit message_deleted event:', emitErr);
    }

    res.json(updated);
  } catch (err) {
    console.error('Failed to delete message:', err);
    res.status(500).json({ message: 'Failed to delete message' });
  }
}

export default { addMessage, getConversation, getUnreadCounts, markConversationRead, deleteMessage };
