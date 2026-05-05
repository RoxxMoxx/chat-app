require("dotenv").config();

const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const { Server } = require("socket.io");

const app = express();

// ===== SECURITY =====
app.use(helmet());

// ✅ FIXED CORS (ALLOW ALL FOR NOW)
app.use(cors({
  origin: "*"
}));

app.use(express.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
});
app.use(limiter);

// ===== SERVER =====
const server = http.createServer(app);

// ✅ FIXED SOCKET CORS
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// ===== DB =====
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("DB connected"))
  .catch(err => console.log(err));

// ===== MODEL =====
const Message = mongoose.model("Message", new mongoose.Schema({
  to: String,
  from: String,
  text: String,
  createdAt: { type: Date, default: Date.now }
}));

// ===== CLOUDINARY =====
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_KEY,
  api_secret: process.env.CLOUD_SECRET,
});

const upload = multer({ dest: "uploads/" });

// ===== FILE UPLOAD =====
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const result = await cloudinary.uploader.upload(req.file.path);
    res.json({ url: result.secure_url });
  } catch {
    res.status(500).json({ error: "Upload failed" });
  }
});

// ===== USERS =====
const users = {};

// ===== SOCKET =====
io.on("connection", (socket) => {

  socket.on("register_user", async (username) => {
    users[username] = socket.id;

    const msgs = await Message.find({ to: username }).sort({ createdAt: 1 });

    msgs.forEach(msg => {
      socket.emit("receive_message", msg);
    });
  });

  socket.on("send_message", async ({ to, from, text }) => {
    const msgDoc = await Message.create({ to, from, text });

    if (users[to]) {
      io.to(users[to]).emit("receive_message", msgDoc);
    }
  });

  socket.on("disconnect", () => {
    for (let u in users) {
      if (users[u] === socket.id) delete users[u];
    }
  });

});

// ===== TEST =====
app.get("/", (req, res) => {
  res.send("Server running 🚀");
});

// ===== MESSAGES ROUTE =====
app.get("/messages/:user/:target", async (req, res) => {
  const { user, target } = req.params;
  const { page = 0 } = req.query;

  const msgs = await Message.find({
    $or: [
      { from: user, to: target },
      { from: target, to: user }
    ]
  })
    .sort({ createdAt: -1 })
    .skip(page * 20)
    .limit(20);

  res.json(msgs.reverse());
});

// ===== START =====
server.listen(process.env.PORT || 3001, () =>
  console.log("Server running")
);