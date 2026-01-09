import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { createServer } from "http";
import { Server as IOServer } from "socket.io";
import path from "path";
import userRoutes from "./routes/userRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import postRoutes from "./routes/postRoutes.js";
import commentRoutes from "./routes/commentRoutes.js";
import { verifyTokenSocket } from "./middleware/authMiddleware.js";

const app = express();
app.use(cors({ origin: ["http://localhost:5173", "http://localhost:5174"], credentials: true }));
app.use(bodyParser.json());

app.use("/api/users", userRoutes); // Cho user thường
app.use("/api/admin", adminRoutes); // Cho admin panel
app.use("/api/posts", postRoutes);
app.use("/uploads", express.static("uploads"));
app.use("/api/comments", commentRoutes);

app.get('/api/files/:filename', (req, res) => {
  try {
    const fname = req.params.filename;
    if (!fname || fname.includes('..') || fname.includes('/') || fname.includes('\\')) {
      return res.status(400).json({ message: 'Invalid filename' });
    }
    const filePath = path.join(process.cwd(), 'uploads', fname);
    return res.download(filePath, fname, (err) => {
      if (err) return res.status(404).json({ message: 'File not found' });
    });
  } catch (e) {
    return res.status(500).json({ message: 'Download failed' });
  }
});

// create HTTP server and attach Socket.IO
const httpServer = createServer(app);

const PORT = 5000;
httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));
