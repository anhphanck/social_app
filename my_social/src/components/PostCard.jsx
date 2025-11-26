import React, { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { UserContext } from "../context/UserContext";

const API_URL = "http://localhost:5000/api";

// ========================== CommentCard ==========================
// ========================== CommentCard ==========================
function CommentCard({ comment, onReply, onDelete }) {
  const { user } = useContext(UserContext);
  const navigate = useNavigate();
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
        <div className="cursor-pointer" onClick={() => navigate(`/profile/${comment.user_id}`)}>
          {comment.avatar ? (
            <img
              src={`http://localhost:5000/uploads/${comment.avatar}`}
              alt="avatar"
              className="w-7 h-7 rounded-full object-cover"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-sky-600 flex items-center justify-center text-white text-xs">
              {comment.username?.charAt(0)?.toUpperCase() || "U"}
            </div>
          )}
        </div>
        <div className="cursor-pointer" onClick={() => navigate(`/profile/${comment.user_id}`)}>
          <strong>{comment.username}</strong>
        </div>
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
        <div className="mt-3 flex gap-2 items-center">
          <input
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && submitComment()}
            className="border rounded-lg p-2 flex-1 focus:outline-none focus:ring-2 focus:ring-sky-500"
            placeholder="Viết bình luận..."
          />
          <button 
            onClick={submitComment} 
            disabled={!newContent.trim()}
            className="text-white bg-sky-600 px-4 py-2 rounded-lg hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Gửi
          </button>
        </div>
      )}

      {replyTo !== null && (
        <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-gray-500">Đang trả lời</span>
            <button
              onClick={() => {
                setReplyTo(null);
                setNewContent("");
              }}
              className="text-xs text-red-500 hover:text-red-700 ml-auto"
            >
              Hủy
            </button>
          </div>
          <div className="flex gap-2 items-center">
            <input
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && submitComment()}
              className="border rounded-lg p-2 flex-1 focus:outline-none focus:ring-2 focus:ring-sky-500"
              placeholder="Viết trả lời..."
            />
            <button 
              onClick={submitComment} 
              disabled={!newContent.trim()}
              className="text-white bg-sky-600 px-4 py-2 rounded-lg hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Gửi
            </button>
          </div>
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
export default function PostCard({ post, onEdit, onDelete, onTogglePin }) {
  const { user } = useContext(UserContext);
  const navigate = useNavigate();
  const [reaction, setReaction] = useState(post.user_reaction || null);
  const [counts, setCounts] = useState(post.reactions || { like: 0, love: 0, haha: 0, sad: 0 });
  const [showMenu, setShowMenu] = useState(false);
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [holdTimer, setHoldTimer] = useState(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [shareMenuOpen, setShareMenuOpen] = useState(false);

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
      <div className="flex items-center justify-between text-sm mt-2 py-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-full">
            {sorted.slice(0, 3).map(([type]) => (
              <span key={type} className="text-base">{icons[type]}</span>
            ))}
            {total > 0 && (
              <span className="text-gray-700 font-medium ml-1">{total}</span>
            )}
          </div>
        </div>
        {post.comment_count > 0 && (
          <span className="text-gray-600 hover:text-blue-600 cursor-pointer transition-colors">
            {post.comment_count} bình luận
          </span>
        )}
      </div>
    );
  };

  const buildPostUrl = () => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('postId', String(post.id));
      return `${url.origin}${url.pathname}?${url.searchParams.toString()}`;
    } catch {
      return `${window.location.origin}${window.location.pathname}?postId=${post.id}`;
    }
  };
  const shareToFacebook = () => {
    const u = buildPostUrl();
    const q = encodeURIComponent(post.content || '');
    const fb = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(u)}&quote=${q}`;
    window.open(fb, '_blank', 'width=600,height=500');
  };
  const copyLink = async () => {
    const u = buildPostUrl();
    try {
      await navigator.clipboard.writeText(u);
      alert('Đã sao chép liên kết bài viết');
    } catch {
      alert(u);
    }
  };

  return (
    <div id={`post-${post.id}`} className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 mb-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-3">
          <div className="cursor-pointer" onClick={() => navigate(`/profile/${post.user_id}`)}>
            {post.avatar ? (
              <img
                src={`http://localhost:5000/uploads/${post.avatar}`}
                alt="avatar"
                className="w-9 h-9 rounded-full object-cover"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-sky-600 flex items-center justify-center text-white">
                {post.username?.charAt(0)?.toUpperCase() || "U"}
              </div>
            )}
          </div>
          <div className="cursor-pointer" onClick={() => navigate(`/profile/${post.user_id}`)}>
            <h3 className="font-semibold text-sky-700">{post.username}</h3>
            <div className="text-xs text-gray-400">{post.created_at ? new Date(post.created_at).toLocaleString() : ""}</div>
          </div>
        </div>
        <div className="space-x-3 text-sm flex items-center gap-3">
          {user?.role === 'admin' && (
            <button
              onClick={() => onTogglePin && onTogglePin(!post.is_pinned)}
              className={`px-3 py-1 rounded-full text-xs ${post.is_pinned ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}
            >
              {post.is_pinned ? 'Gỡ ghim' : 'Ghim bài'}
            </button>
          )}
          {user && post.user_id === user.id && (
            <>
              <button onClick={() => onEdit(post)} className="text-sky-600 hover:underline">Sửa</button>
              <button onClick={() => onDelete(post.id)} className="text-red-600 hover:underline">Xoá</button>
            </>
          )}
        </div>
      </div>

      {post.is_pinned && (
        <div className="flex items-center gap-2 text-amber-600 text-xs font-semibold uppercase">
          📌 Đã ghim bởi admin
        </div>
      )}
      <div className="mt-2 text-gray-800">
        {post.content}
        
        {/* Hiển thị nhiều ảnh */}
        {post.images && post.images.length > 0 && (
          <div className={`mt-3 rounded-lg overflow-hidden ${
            post.images.length === 1 ? 'grid grid-cols-1' :
            post.images.length === 2 ? 'grid grid-cols-2 gap-1' :
            post.images.length === 3 ? 'grid grid-cols-2 gap-1' :
            'grid grid-cols-2 gap-1'
          }`}>
            {post.images.slice(0, 4).map((img, idx) => (
              <div key={idx} className={`relative ${
                post.images.length === 3 && idx === 0 ? 'row-span-2' : ''
              }`}>
                <img 
                  src={img} 
                  alt={`post-${idx}`} 
                  className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition"
                  style={{ 
                    minHeight: post.images.length === 1 ? '400px' : 
                              post.images.length === 2 ? '300px' : '200px'
                  }}
                  onClick={() => { setViewerIndex(idx); setViewerOpen(true); }}
                />
                {idx === 3 && post.images.length > 4 && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-2xl font-bold">
                    +{post.images.length - 4}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        {/* Backward compatible: hiển thị ảnh cũ nếu không có images */}
        {(!post.images || post.images.length === 0) && post.image && (
          <img src={post.image} alt="post" className="rounded-md mt-2 max-h-80 w-full object-cover" />
        )}
      </div>

      {viewerOpen && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
          <button
            className="absolute top-4 right-4 text-white text-2xl"
            onClick={() => setViewerOpen(false)}
          >
            ✕
          </button>
          <button
            className="absolute left-4 text-white text-3xl"
            onClick={() => setViewerIndex((i) => (i - 1 + post.images.length) % post.images.length)}
          >
            ‹
          </button>
          <img
            src={post.images[viewerIndex]}
            alt={`viewer-${viewerIndex}`}
            className="max-w-[90vw] max-h-[80vh] object-contain rounded-md"
          />
          <button
            className="absolute right-4 text-white text-3xl"
            onClick={() => setViewerIndex((i) => (i + 1) % post.images.length)}
          >
            ›
          </button>
        </div>
      )}

      {renderReactions()}

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
        <div className="flex space-x-6 text-sm relative">
          <button
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onClick={() => reaction === "like" ? removeReaction() : sendReaction("like")}
            className={`flex items-center gap-2 select-none transition-colors ${
              reaction ? "text-blue-600 font-semibold" : "text-gray-600 hover:text-blue-600"
            }`}
          >
            <span className="text-lg">{reaction ? icons[reaction] : "👍"}</span>
            <span>Thích</span>
          </button>
          <button 
            onClick={() => setShowCommentInput(s => !s)} 
            className={`flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors ${
              showCommentInput ? "text-blue-600 font-semibold" : ""
            }`}
          >
            <span className="text-lg">💬</span>
            <span>Bình luận</span>
          </button>
          <div className="relative">
            <button 
              onClick={() => setShareMenuOpen(s => !s)}
              className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors"
            >
              <span className="text-lg">↗️</span>
              <span>Chia sẻ</span>
            </button>
            {shareMenuOpen && (
              <div className="absolute bg-white border shadow-lg rounded-xl p-2 flex flex-col gap-1 z-20 right-0">
                <button onClick={shareToFacebook} className="text-sm px-2 py-1 hover:bg-gray-100 rounded">Chia sẻ Facebook</button>
                <button onClick={copyLink} className="text-sm px-2 py-1 hover:bg-gray-100 rounded">Sao chép liên kết</button>
              </div>
            )}
          </div>

          {showMenu && (
            <div className="absolute bg-white border shadow-lg rounded-xl p-3 flex gap-3 bottom-10 left-0 z-20 animate-fade-in" onMouseLeave={() => setShowMenu(false)}>
              {Object.keys(icons).map((k) => (
                <button 
                  key={k} 
                  className="text-3xl hover:scale-125 transition-transform" 
                  onClick={() => sendReaction(k)}
                  title={k}
                >
                  {icons[k]}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {showCommentInput && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <CommentList postId={post.id} showInput={true} />
        </div>
      )}
    </div>
  );
};
