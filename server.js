require("dotenv").config();

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

// Serve uploaded files
app.use("/uploads", express.static("uploads"));

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" },
});

// ================= DATABASE =================
mongoose.connect(process.env.MONGO_URI);

mongoose.connection.on("connected", () => {
  console.log("MongoDB connected");
});

mongoose.connection.on("error", (err) => {
  console.log("MongoDB error:", err);
});

// ================= MODELS =================
const User = mongoose.model(
  "User",
  new mongoose.Schema({
    username: String,
    password: String,
    avatar: String,
  })
);

const Message = mongoose.model(
  "Message",
  new mongoose.Schema({
    username: String,
    room: String,
    message: String,
    time: { type: Date, default: Date.now },
  })
);

// ================= FILE STORAGE =================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

// ================= AUTH ROUTES =================

// SIGNUP
app.post("/signup", async (req, res) => {
  try {
    const { username, password } = req.body;

    const hashed = await bcrypt.hash(password, 10);

    const user = new User({
      username,
      password: hashed,
    });

    await user.save();

    res.json({ message: "User created" });
  } catch (err) {
    res.status(500).json({ error: "Signup failed" });
  }
});

// LOGIN
app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user) return res.json({ error: "User not found" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.json({ error: "Wrong password" });

    const token = jwt.sign({ username }, "secretkey");

    res.json({
      token,
      username,
      avatar: user.avatar || "",
    });
  } catch (err) {
    res.status(500).json({ error: "Login failed" });
  }
});

// ================= AVATAR UPLOAD =================
app.post("/upload-avatar", upload.single("file"), async (req, res) => {
  try {
    const { username } = req.body;

    const user = await User.findOneAndUpdate(
      { username },
      { avatar: `/uploads/${req.file.filename}` },
      { new: true }
    );

    res.json({ avatar: user.avatar });
  } catch (err) {
    res.status(500).json({ error: "Upload failed" });
  }
});

// ================= SOCKET =================

let users = {};
let onlineUsers = {};

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Track online users
  socket.on("add_user", (username) => {
    onlineUsers[socket.id] = username;
    io.emit("online_users", Object.values(onlineUsers));
  });

  // Join room with JWT verification
  socket.on("join_room", async ({ room, token }) => {
    try {
      const decoded = jwt.verify(token, "secretkey");

      socket.join(room);
      users[socket.id] = { username: decoded.username, room };

      const messages = await Message.find({ room }).sort({ time: 1 });

      socket.emit("load_messages", messages);

      socket.to(room).emit("receive_message", {
        message: `${decoded.username} joined`,
        system: true,
      });
    } catch (err) {
      socket.emit("error", "Invalid token");
    }
  });

  // Send message
  socket.on("send_message", async (msg) => {
    const user = users[socket.id];
    if (!user) return;

    const newMessage = new Message({
      username: user.username,
      room: user.room,
      message: msg,
    });

    await newMessage.save();

    io.to(user.room).emit("receive_message", {
      username: user.username,
      message: msg,
    });
  });

  // Typing indicator
  socket.on("typing", ({ room, username }) => {
    socket.to(room).emit("user_typing", username);
  });

  // Disconnect
  socket.on("disconnect", () => {
    delete users[socket.id];
    delete onlineUsers[socket.id];

    io.emit("online_users", Object.values(onlineUsers));
  });
});

// ================= START SERVER =================
const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log("Server running on port", PORT);
});