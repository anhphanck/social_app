import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { createServer } from "http";
import { Server as IOServer } from "socket.io";
import userRoutes from "./routes/userRoutes.js";
import postRoutes from "./routes/postRoutes.js";
import commentRoutes from "./routes/commentRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import chatController from "./controllers/chatController.js";
import { verifyTokenSocket } from "./middleware/authMiddleware.js";

const app = express();
app.use(cors({ origin: ["http://localhost:5173", "http://localhost:5174"], credentials: true }));
app.use(bodyParser.json());

app.use("/api/users", userRoutes);
app.use("/api/posts", postRoutes);
app.use("/uploads", express.static("uploads"));
app.use("/api/comments", commentRoutes);
app.use("/api/chats", chatRoutes);

// create HTTP server and attach Socket.IO
const httpServer = createServer(app);
const io = new IOServer(httpServer, {
	cors: { origin: ["http://localhost:5173", "http://localhost:5174"], methods: ["GET", "POST"], credentials: true },
});

// expose io so controllers/routes can emit
app.set('io', io);

// track connected sockets per user
const onlineUsers = new Map(); // userId -> Set(socketId)
app.set('onlineUsers', onlineUsers);

// engine-level errors
if (io && io.engine) {
	io.engine.on && io.engine.on('connection_error', (err) => console.error('Engine connection_error:', err));
}

io.use((socket, next) => {
	// log handshake for debugging
	try {
		const origin = socket.handshake.headers.origin || socket.handshake.headers.host;
		const token = socket.handshake.auth && socket.handshake.auth.token;
		console.log('Socket handshake:', { id: socket.id, origin, tokenPresent: !!token });
	} catch (e) {
		console.warn('Handshake log failed', e);
	}
	next();
});

io.on('connection', (socket) => {
	console.log('Socket connected', socket.id);
	const token = socket.handshake.auth && socket.handshake.auth.token;
	let socketUserId = null;
	if (token) {
		try {
			const payload = verifyTokenSocket(token);
			socketUserId = payload.id;
			const key = String(socketUserId);
			const set = onlineUsers.get(key) || new Set();
			set.add(socket.id);
			onlineUsers.set(key, set);
			socket.user = payload;
			console.log('User connected:', socketUserId, '=>', socket.id, 'connections=', set.size);
				// broadcast presence update (list of online user ids)
				try {
					io.emit('presence_update', { online: Array.from(onlineUsers.keys()) });
				} catch (e) {
					console.warn('Failed to emit presence_update', e);
				}
		} catch (err) {
			console.warn('Socket authentication failed:', err.message);
			socket.emit('error', 'Authentication error');
			socket.disconnect(true);
			return;
		}
	}

	socket.on('private_message', (payload, callback) => {
		console.log('private_message received from', socket.id, payload && { to: payload.to, client_id: payload.client_id });
		const senderId = socket.user && socket.user.id ? socket.user.id : payload.from;
		const msg = { from: senderId, to: payload.to, content: payload.content, file_url: payload.file_url || null, file_type: payload.file_type || 'text', timestamp: Date.now() };
		if (chatController && typeof chatController.addMessage === 'function') {
			chatController.addMessage(msg).then((saved) => {
				const savedWithClient = { ...saved, client_id: payload.client_id || null };
				const toSet = onlineUsers.get(String(payload.to));
				if (toSet && toSet.size > 0) {
					for (const sid of toSet) io.to(sid).emit('private_message', savedWithClient);
				}
				// ack to sender
				if (typeof callback === 'function') callback({ success: true, message: savedWithClient });
			}).catch((e) => {
				console.error('Error saving message:', e);
				if (typeof callback === 'function') callback({ success: false, error: e.message || String(e) });
			});

			// respond to presence queries from clients
			socket.on('get_presence', () => {
				try {
					socket.emit('presence_update', { online: Array.from(onlineUsers.keys()) });
				} catch (e) {
					console.warn('Failed to respond to get_presence', e);
				}
			});
		} else {
			const toSet = onlineUsers.get(String(payload.to));
			if (toSet && toSet.size > 0) for (const sid of toSet) io.to(sid).emit('private_message', msg);
			if (typeof callback === 'function') callback({ success: true, message: msg });
		}
	});

	socket.on('disconnect', () => {
		console.log('Socket disconnected', socket.id, 'userId=', socketUserId);
		if (socketUserId) {
			const key = String(socketUserId);
			const set = onlineUsers.get(key);
			if (set) {
				set.delete(socket.id);
				if (set.size === 0) onlineUsers.delete(key);
				else onlineUsers.set(key, set);
			}
			// broadcast presence update after disconnect
			try {
				io.emit('presence_update', { online: Array.from(onlineUsers.keys()) });
			} catch (e) {
				console.warn('Failed to emit presence_update after disconnect', e);
			}
		}
	});
});

const PORT = 5000;
httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));
