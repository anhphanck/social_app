import React, { useContext, useEffect, useState } from "react";
import axios from "axios";
import { UserContext } from "../context/UserContext";

const API_URL = "http://localhost:5000/api";

// ========================== CommentCard ==========================
// ========================== CommentCard ==========================
function CommentCard({ comment, onReply, onDelete }) {
  const { user } = useContext(UserContext);
  const [reaction, setReaction] = useState(comment.user_reaction || null);
  const [counts, setCounts] = useState(comment.reactions || { like: 0, love: 0, haha: 0, sad: 0 });
  const [showMenu, setShowMenu] = useState(false);
  const [holdTimer, setHoldTimer] = useState(null);
  const [showReplies, setShowReplies] = useState(false);

  const icons = { like: "👍", love: "❤️", haha: "😂", sad: "😢" };

  const sendReaction = async (type) => {
    if (!user) return;
    try {
      await axios.post(`${API_URL}/comments/react`, {
        comment_id: comment.id,
        user_id: user.id,
        reaction: type,
      });

      const updated = { ...counts };
      if (reaction) updated[reaction] = Math.max(0, updated[reaction] - 1);
      updated[type] = (updated[type] || 0) + 1;

      setCounts(updated);
      setReaction(type);
      setShowMenu(false);
    } catch (err) {
      console.error("Error reacting comment:", err);
    }
  };

  const removeReaction = async () => {
    if (!user || !reaction) return;
    try {
      await axios.post(`${API_URL}/comments/remove-react`, {
        comment_id: comment.id,
        user_id: user.id,
      });

      const updated = { ...counts };
      updated[reaction] = Math.max(0, updated[reaction] - 1);

      setCounts(updated);
      setReaction(null);
    } catch (err) {
      console.error("Error removing reaction:", err);
    }
  };

  const handleMouseDown = () => {
    const timer = setTimeout(() => setShowMenu(true), 500);
    setHoldTimer(timer);
  };
  const handleMouseUp = () => {
    if (holdTimer) {
      clearTimeout(holdTimer);
      setHoldTimer(null);
    }
  };
  useEffect(() => () => { if (holdTimer) clearTimeout(holdTimer); }, [holdTimer]);

  // render reaction icons
  const renderReactions = () => {
    const entries = Object.entries(counts).filter(([_, c]) => c > 0);
    if (!entries.length) return null;

    const sorted = entries.sort((a, b) => b[1] - a[1]);
    const total = entries.reduce((sum, [_, c]) => sum + c, 0);

    return (
      <div className="flex items-center gap-1 text-sm mt-1">
        {sorted.map(([type]) => <span key={type} className="text-lg">{icons[type]}</span>)}
        <span className="text-gray-500">{total}</span>
      </div>
    );
  };

  return (
    <div className="pl-4 border-l border-gray-300 mt-2 relative">
      <div className="flex gap-2 items-center">
        <strong>{comment.username}</strong>
        <span className="text-gray-400 text-xs">
          {comment.created_at ? new Date(comment.created_at).toLocaleString() : ""}
        </span>
      </div>

      <div>{comment.content}</div>

      {renderReactions()}

      <div className="flex gap-2 text-sm mt-1 relative">
        <button
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onClick={() => (reaction === "like" ? removeReaction() : sendReaction("like"))}
          className="flex items-center gap-1 select-none"
        >
          {reaction ? icons[reaction] : "👍"}
        </button>

        {comment.replies?.length > 0 && (
          <button onClick={() => setShowReplies(!showReplies)}>
            {showReplies ? "Ẩn replies" : "Xem replies"}
          </button>
        )}

        <button onClick={() => onReply(comment.id)}>Reply</button>

        {/* 🔥 NÚT XÓA */}
        {user?.id === comment.user_id && (
          <button
            className="text-red-500 ml-2"
            onClick={() => onDelete(comment.id)}
          >
            Xóa
          </button>
        )}

        {showMenu && (
          <div
            className="absolute bg-white border shadow-md rounded-xl p-1 flex gap-1 bottom-6 z-20"
            onMouseLeave={() => setShowMenu(false)}
          >
            {Object.keys(icons).map((k) => (
              <button key={k} className="text-xl" onClick={() => sendReaction(k)}>
                {icons[k]}
              </button>
            ))}
          </div>
        )}
      </div>

      {showReplies &&
        comment.replies?.map((reply) => (
          <CommentCard
            key={reply.id}
            comment={reply}
            onReply={onReply}
            onDelete={onDelete}
          />
        ))}
    </div>
  );
}

// ========================== CommentList ==========================
function CommentList({ postId, showInput }) {
  const { user } = useContext(UserContext);
  const [comments, setComments] = useState([]);
  const [replyTo, setReplyTo] = useState(null);
  const [newContent, setNewContent] = useState("");
  const [loading, setLoading] = useState(false);

  const buildNestedComments = (flat) => {
    if (!Array.isArray(flat)) return [];
    const map = {};
    flat.forEach((c) => (map[c.id] = { ...c, replies: [] }));

    const nested = [];
    flat.forEach((c) => {
      if (c.parent_id) map[c.parent_id]?.replies.push(map[c.id]);
      else nested.push(map[c.id]);
    });
    return nested;
  };

  const loadComments = async () => {
    setLoading(true);
    try {
      const url = `${API_URL}/comments/${postId}${user?.id ? `?user_id=${user.id}` : ""}`;
      const res = await axios.get(url);

      setComments(buildNestedComments(res.data));
    } catch (err) {
      console.error("Error loading comments:", err);
      setComments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadComments(); }, [postId, user?.id]);

  const submitComment = async () => {
    const trimmed = newContent.trim();
    if (!trimmed || !user) return;

    try {
      await axios.post(`${API_URL}/comments`, {
        post_id: postId,
        user_id: user.id,
        content: trimmed,
        parent_id: replyTo || null,
      });

      setNewContent("");
      setReplyTo(null);
      await loadComments();
    } catch (err) {
      console.error("Error creating comment:", err);
    }
  };

  const deleteComment = async (commentId) => {
    if (!user) return;
    if (!window.confirm("Bạn có chắc muốn xóa bình luận này?")) return;

    try {
      // 1. Dùng axios.delete và truyền ID vào URL (cho req.params.id)
      await axios.delete(`${API_URL}/comments/${commentId}`, {
        // 2. Truyền user_id vào body. Với axios.delete, bạn phải dùng thuộc tính 'data'
        data: {
          user_id: user.id, // Giá trị này sẽ đi vào req.body.user_id ở backend
        },
      });

      await loadComments();
    } catch (err) {
      console.error("Error deleting comment:", err);
      // Xử lý lỗi hiển thị cho người dùng
    }
};

  return (
    <div className="mt-4">
      {showInput && replyTo === null && (
        <div className="mt-2 flex gap-2 items-center">
          <input
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            className="border rounded-md p-1 flex-1"
            placeholder="Viết bình luận..."
          />
          <button onClick={submitComment} className="text-white bg-sky-600 p-1 rounded-md">
            Gửi
          </button>
        </div>
      )}

      {replyTo !== null && (
        <div className="mt-2 flex gap-2 items-center">
          <span className="text-gray-500">Replying to {replyTo}</span>
          <input
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            className="border rounded-md p-1 flex-1"
            placeholder="Viết trả lời..."
          />
          <button onClick={submitComment} className="text-white bg-sky-600 p-1 rounded-md">
            Gửi
          </button>
          <button
            onClick={() => {
              setReplyTo(null);
              setNewContent("");
            }}
            className="text-gray-600 ml-2"
          >
            Hủy
          </button>
        </div>
      )}

      {loading && <div className="text-sm text-gray-500 mt-2">Đang tải bình luận...</div>}

      {comments.map((c) => (
        <CommentCard
          key={c.id}
          comment={c}
          onReply={(id) => setReplyTo(id)}
          onDelete={deleteComment}
        />
      ))}
    </div>
  );
}

// ========================== PostCard ==========================
// ========================== PostCard ==========================
export default function PostCard({ post, onEdit, onDelete }) {
  const { user } = useContext(UserContext);
  const [reaction, setReaction] = useState(post.user_reaction || null);
  const [counts, setCounts] = useState(post.reactions || { like: 0, love: 0, haha: 0, sad: 0 });
  const [showMenu, setShowMenu] = useState(false);
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [holdTimer, setHoldTimer] = useState(null);

  const icons = { like: "👍", love: "❤️", haha: "😂", sad: "😢" };

  const sendReaction = async (type) => {
    if (!user) return;
    try {
      await axios.post(`${API_URL}/posts/react`, { post_id: post.id, user_id: user.id, reaction: type });
      const updated = { ...counts };
      if (reaction) updated[reaction] = Math.max(0, (updated[reaction] || 0) - 1);
      updated[type] = (updated[type] || 0) + 1;
      setCounts(updated);
      setReaction(type);
      setShowMenu(false);
    } catch (err) { console.error("Error reacting post:", err); }
  };

  const removeReaction = async () => {
    if (!user || !reaction) return;
    try {
      await axios.post(`${API_URL}/posts/remove-react`, { post_id: post.id, user_id: user.id });
      const updated = { ...counts };
      updated[reaction] = Math.max(0, (updated[reaction] || 0) - 1);
      setCounts(updated);
      setReaction(null);
    } catch (err) { console.error("Error removing reaction:", err); }
  };

  const handleMouseDown = () => { const timer = setTimeout(() => setShowMenu(true), 500); setHoldTimer(timer); };
  const handleMouseUp = () => { if (holdTimer) { clearTimeout(holdTimer); setHoldTimer(null); } };
  useEffect(() => () => { if (holdTimer) clearTimeout(holdTimer); }, [holdTimer]);

  const renderReactions = () => {
    const entries = Object.entries(counts).filter(([_, c]) => c > 0);
    if (!entries.length) return null;
    const sorted = entries.sort((a, b) => b[1] - a[1]);
    const total = entries.reduce((sum, [_, c]) => sum + c, 0);
    return (
      <div className="flex items-center gap-2 text-sm mt-1">
        <div className="flex items-center gap-1">
          {sorted.map(([type]) => <span key={type} className="text-lg">{icons[type]}</span>)}
          <span className="text-gray-500">{total}</span>
        </div>
        {post.comment_count > 0 && <span className="text-gray-500 ml-2">{post.comment_count} bình luận</span>}
      </div>
    );
  };

  return (
    <div className="bg-white p-4 rounded-md shadow-sm border border-gray-200 mb-4">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-sky-600 flex items-center justify-center text-white">
            {post.username?.charAt(0)?.toUpperCase() || "U"}
          </div>
          <div>
            <h3 className="font-semibold text-sky-700">{post.username}</h3>
            <div className="text-xs text-gray-400">{post.created_at ? new Date(post.created_at).toLocaleString() : ""}</div>
          </div>
        </div>
        {user && post.user_id === user.id && (
          <div className="space-x-3 text-sm">
            <button onClick={() => onEdit(post)} className="text-sky-600 hover:underline">Sửa</button>
            <button onClick={() => onDelete(post.id)} className="text-red-600 hover:underline">Xoá</button>
          </div>
        )}
      </div>

      <div className="mt-2 text-gray-800">
        {post.content}
        {post.image && <img src={post.image} alt="post" className="rounded-md mt-2 max-h-80 w-full object-cover" />}
      </div>

      {renderReactions()}

      <div className="flex space-x-4 mt-1 text-sm relative">
        <button
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onClick={() => reaction === "like" ? removeReaction() : sendReaction("like")}
          className={`flex items-center gap-1 select-none ${reaction === "like" ? "text-blue-600" : "text-gray-500"}`}
        >
          👍
        </button>
        <button onClick={() => setShowCommentInput(s => !s)} className="text-gray-500">💬 Bình luận</button>
        <button className="text-gray-500">↗️ Chia sẻ</button>

        {showMenu && (
          <div className="absolute bg-white border shadow-md rounded-xl p-2 flex gap-2 bottom-8 z-20" onMouseLeave={() => setShowMenu(false)}>
            {Object.keys(icons).map((k) => <button key={k} className="text-2xl" onClick={() => sendReaction(k)}>{icons[k]}</button>)}
          </div>
        )}
      </div>

      {showCommentInput && <CommentList postId={post.id} showInput={true} />}
    </div>
  );
};