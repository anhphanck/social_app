import { useNavigate } from "react-router-dom";

export default function Sidebar() {
  const navigate = useNavigate();
  const items = [
    { icon: "🏠", label: "Trang chủ", path: "/" },
    { icon: "📄", label: "Tài liệu dự án", path: "/documents" },
    { icon: "📝", label: "Task", path: "/tasks" },
    { icon: "💼", label: "Cuộc họp", path: "/meeting" }
  ];

  return (
    <div className="w-68 bg-white shadow-md h-screen p-4">
      <ul className="space-y-3">
        {items.map((item, i) => (
          <li
            key={i}
            className="flex items-center space-x-3 cursor-pointer hover:bg-sky-100 p-2 rounded-md"
            onClick={() => navigate(item.path)}
          >
            <span>{item.icon}</span>
            <span className="text-sm font-medium">{item.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// import React, { useContext, useEffect, useState } from "react";
// import axios from "axios";
// import { UserContext } from "../context/UserContext";

// const API_URL = "http://localhost:5000/api";

// // ========================== CommentCard ==========================
// function CommentCard({ comment, onReply }) {
//   const { user } = useContext(UserContext);
//   const [reaction, setReaction] = useState(comment.user_reaction || null);
//   const [counts, setCounts] = useState(comment.reactions || { like:0, love:0, haha:0, sad:0 });
//   const [showMenu, setShowMenu] = useState(false);
//   const [holdTimer, setHoldTimer] = useState(null);
//   const [showReplies, setShowReplies] = useState(false);

//   const icons = { like:"👍", love:"❤️", haha:"😂", sad:"😢" };

//   const sendReaction = async (type) => {
//     if (!user) return;
//     try {
//       await axios.post(`${API_URL}/comments/react`, {
//         comment_id: comment.id,
//         user_id: user.id,
//         reaction: type,
//       });
//       const updated = { ...counts };
//       if (reaction) updated[reaction]--;
//       updated[type] = (updated[type] || 0) + 1;
//       setCounts(updated);
//       setReaction(type);
//       setShowMenu(false);
//     } catch(err) {
//       console.error("Error reacting comment:", err);
//     }
//   };

//   const removeReaction = async () => {
//     if (!user || !reaction) return;
//     try {
//       await axios.post(`${API_URL}/comments/remove-react`, {
//         comment_id: comment.id,
//         user_id: user.id,
//       });
//       const updated = { ...counts };
//       updated[reaction]--;
//       setCounts(updated);
//       setReaction(null);
//     } catch(err) {
//       console.error("Error removing reaction:", err);
//     }
//   };

//   const handleMouseDown = () => {
//     const timer = setTimeout(() => setShowMenu(true), 500);
//     setHoldTimer(timer);
//   };
//   const handleMouseUp = () => clearTimeout(holdTimer);

//  return (
//     <div className="pl-4 border-l border-gray-300 mt-2 relative">
//       <div className="flex gap-2 items-center">
//         <strong>{comment.username}</strong>
//         <span className="text-gray-400 text-xs">
//           {new Date(comment.created_at).toLocaleString()}
//         </span>
//       </div>
//       <div>{comment.content}</div>

//       {/* Reaction + Reply */}
//       <div className="flex gap-2 text-sm mt-1 relative">
//         <button
//           onMouseDown={handleMouseDown}
//           onMouseUp={handleMouseUp}
//           onClick={() => reaction === "like" ? removeReaction() : sendReaction("like")}
//           className="flex items-center gap-1 select-none"
//         >
//           {reaction ? icons[reaction] : "👍"}{" "}
//           {Object.values(counts).reduce((a,b)=>a+b,0) || ""}
//         </button>

//         {comment.replies && comment.replies.length > 0 && (
//           <button onClick={() => setShowReplies(!showReplies)}>
//             {showReplies ? "Ẩn replies" : "Xem replies"}
//           </button>
//         )}

//         <button onClick={() => onReply(comment.id)}>Reply</button>

//         {showMenu && (
//           <div className="absolute bg-white border shadow-md rounded-xl p-1 flex gap-1 bottom-6 z-20" onMouseLeave={() => setShowMenu(false)}>
//             {Object.keys(icons).map(k => (
//               <button key={k} className="text-xl" onClick={() => sendReaction(k)}>
//                 {icons[k]}
//               </button>
//             ))}
//           </div>
//         )}
//       </div>

//       {/* Nested replies */}
//       {showReplies && comment.replies?.map(reply => (
//         <CommentCard key={reply.id} comment={reply} onReply={onReply} />
//       ))}
//     </div>
//   );
// }


// // ========================== CommentList ==========================
// function CommentList({ postId }) {
//   const { user } = useContext(UserContext);
//   const [comments, setComments] = useState([]);
//   const [replyTo, setReplyTo] = useState(null);
//   const [newContent, setNewContent] = useState("");

//   const buildNestedComments = (flat) => {
//     if (!Array.isArray(flat)) return [];
//     const map = {};
//     flat.forEach(c => (map[c.id] = { ...c, replies: [] }));
//     const nested = [];
//     flat.forEach(c => {
//       if (c.parent_id) map[c.parent_id]?.replies.push(map[c.id]);
//       else nested.push(map[c.id]);
//     });
//     return nested;
//   };

//   const loadComments = async () => {
//     if (!user) return;
//     try {
//       const res = await axios.get(`${API_URL}/comments/${postId}?user_id=${user.id}`);
//       const nested = buildNestedComments(res.data);
//       // Chỉ hiện bình luận gốc
//       setComments(nested.map(c => ({ ...c, replies: c.replies })));
//     } catch(err) {
//       console.error("Error loading comments:", err);
//       setComments([]);
//     }
//   };

//   useEffect(() => { loadComments(); }, [postId, user]);

//   const submitComment = async () => { /* ... như trước ... */ };

//   return (
//     <div className="mt-4">
//       {comments.map(c => (
//         <CommentCard key={c.id} comment={c} onReply={setReplyTo} />
//       ))}

//       {replyTo !== null && (
//         <div className="mt-2 flex gap-2 items-center">
//           <span className="text-gray-500">Replying to {replyTo}</span>
//           <input
//             value={newContent}
//             onChange={(e) => setNewContent(e.target.value)}
//             className="border rounded-md p-1 flex-1"
//             placeholder="Viết bình luận..."
//           />
//           <button onClick={submitComment} className="text-white bg-sky-600 p-1 rounded-md">
//             Gửi
//           </button>
//         </div>
//       )}
//     </div>
//   );
// }

// // ========================== PostCard ==========================
// export default function PostCard({ post, onEdit, onDelete }) {
//   const { user } = useContext(UserContext);
//   const [reaction, setReaction] = useState(post.user_reaction || null);
//   const [counts, setCounts] = useState(post.reactions || { like:0, love:0, haha:0, sad:0 });
//   const [showMenu, setShowMenu] = useState(false);
//   const [showCommentInput, setShowCommentInput] = useState(false);
//   const [holdTimer, setHoldTimer] = useState(null);

//   const icons = { like:"👍", love:"❤️", haha:"😂", sad:"😢" };

//   const sendReaction = async (type) => {
//     if (!user) return;
//     try {
//       await axios.post(`${API_URL}/posts/react`, {
//         post_id: post.id,
//         user_id: user.id,
//         reaction: type,
//       });
//       const updated = { ...counts };
//       if (reaction) updated[reaction]--;
//       updated[type] = (updated[type] || 0) + 1;
//       setCounts(updated);
//       setReaction(type);
//       setShowMenu(false);
//     } catch(err) {
//       console.error("Error reacting post:", err);
//     }
//   };

//   const removeReaction = async () => {
//     if (!user || !reaction) return;
//     try {
//       await axios.post(`${API_URL}/posts/remove-react`, {
//         post_id: post.id,
//         user_id: user.id,
//       });
//       const updated = { ...counts };
//       updated[reaction]--;
//       setCounts(updated);
//       setReaction(null);
//     } catch(err) {
//       console.error("Error removing reaction:", err);
//     }
//   };

//   const handleMouseDown = () => {
//     const timer = setTimeout(() => setShowMenu(true), 500);
//     setHoldTimer(timer);
//   };
//   const handleMouseUp = () => clearTimeout(holdTimer);

//   return (
//     <div className="bg-white p-4 rounded-md shadow-sm border border-gray-200 mb-4">
//       <div className="flex justify-between items-center mb-2">
//         <div className="flex items-center gap-3">
//           <div className="w-9 h-9 rounded-full bg-sky-600 flex items-center justify-center text-white">
//             {post.username?.charAt(0)?.toUpperCase() || "U"}
//           </div>
//           <div>
//             <h3 className="font-semibold text-sky-700">{post.username}</h3>
//             <div className="text-xs text-gray-400">
//               {new Date(post.created_at).toLocaleString()}
//             </div>
//           </div>
//         </div>

//         {user && post.user_id === user.id && (
//           <div className="space-x-3 text-sm">
//             <button onClick={() => onEdit(post)} className="text-sky-600 hover:underline">
//               Sửa
//             </button>
//             <button onClick={() => onDelete(post.id)} className="text-red-600 hover:underline">
//               Xoá
//             </button>
//           </div>
//         )}
//       </div>

//       <div className="mt-2 text-gray-800">
//         {post.content}
//         {post.image && (
//           <img
//             src={post.image}
//             alt="post"
//             className="rounded-md mt-2 max-h-80 w-full object-cover"
//           />
//         )}
//       </div>

//       {/* Reaction bar */}
//       <div className="flex space-x-4 mt-3 text-gray-600 text-sm relative">
//         <button
//           onMouseDown={handleMouseDown}
//           onMouseUp={handleMouseUp}
//           onClick={() => reaction === "like" ? removeReaction() : sendReaction("like")}
//           className="flex items-center gap-1 select-none"
//         >
//           {reaction ? icons[reaction] : "👍"}{" "}
//           {Object.values(counts).reduce((a,b)=>a+b,0) || ""}
//         </button>

//         <button onClick={() => setShowCommentInput(!showCommentInput)}>💬 Bình luận</button>
//         <button>↗️ Chia sẻ</button>

//         {showMenu && (
//           <div
//             className="absolute bg-white border shadow-md rounded-xl p-2 flex gap-2 bottom-8 z-20"
//             onMouseLeave={() => setShowMenu(false)}
//           >
//             {Object.keys(icons).map(k => (
//               <button key={k} className="text-2xl" onClick={() => sendReaction(k)}>
//                 {icons[k]}
//               </button>
//             ))}
//           </div>
//         )}
//       </div>

//       {/* Comment Section */}
//       {showCommentInput && <CommentList postId={post.id} showInput={true} />}
//     </div>
//   );
// }

