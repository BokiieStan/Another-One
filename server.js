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
    file: req.file ? `/uploads/${req.file.filename}` : null,
  };
  posts.push(newPost);
  io.emit("newPost", newPost);
  res.json({ success: true, post: newPost });
});

app.get("/posts", (req, res) => {
  res.json(posts);
});

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
