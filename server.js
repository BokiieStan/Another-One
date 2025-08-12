import express from "express";
import multer from "multer";
import { Server } from "socket.io";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Parse JSON for text posts and comments
app.use(express.json());

const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

let posts = [];
let anonCounter = 1;

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(uploadsDir));

app.post("/upload", upload.single("file"), (req, res) => {
  const anonName = `Anonymous${anonCounter++}`;
  const newPost = {
    id: posts.length + 1,
    name: anonName,
    type: req.file ? "file" : "unknown",
    file: req.file ? `/uploads/${req.file.filename}` : null,
    mimeType: req.file ? req.file.mimetype : null,
    originalName: req.file ? req.file.originalname : null,
    text: null,
    comments: [],
    createdAt: Date.now(),
  };
  posts.push(newPost);
  io.emit("newPost", newPost);
  res.json({ success: true, post: newPost });
});

// Create a new text-only post
app.post("/postText", (req, res) => {
  const { text } = req.body || {};
  if (!text || typeof text !== "string" || !text.trim()) {
    return res.status(400).json({ success: false, message: "Text is required" });
  }
  const anonName = `Anonymous${anonCounter++}`;
  const newPost = {
    id: posts.length + 1,
    name: anonName,
    type: "text",
    file: null,
    mimeType: null,
    originalName: null,
    text: text.trim(),
    comments: [],
    createdAt: Date.now(),
  };
  posts.push(newPost);
  io.emit("newPost", newPost);
  res.json({ success: true, post: newPost });
});

app.get("/posts", (req, res) => {
  res.json(posts);
});

// Add a comment to a post
app.post("/posts/:id/comments", (req, res) => {
  const id = Number(req.params.id);
  const { text } = req.body || {};
  const post = posts.find((p) => p.id === id);
  if (!post) return res.status(404).json({ success: false, message: "Post not found" });
  if (!text || typeof text !== "string" || !text.trim()) {
    return res.status(400).json({ success: false, message: "Text is required" });
  }
  const comment = {
    id: `${id}-${post.comments.length + 1}`,
    text: text.trim(),
    createdAt: Date.now(),
  };
  post.comments.push(comment);
  io.emit("newComment", { postId: id, comment });
  res.json({ success: true, comment });
});

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
