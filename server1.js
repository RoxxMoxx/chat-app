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

// SERVE UPLOADED FILES
app.use("/uploads", express.static("uploads"));

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" },
});

// ================= DB =================
mongoose.connect(
  "mongodb+srv://eaunoit:123456QQQQ@cluster0.9dxgjmh.mongodb.net/chat-app"
);

mongoose.connection.on("connected", () => {
  console.log("MongoDB connected");
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

// ================= JWT =================
const verifyToken = (token) => {
  try {
    return jwt.verify(token, "secretkey");
  } catch {
    return null;
  }
};

// ================= FILE STORAGE =================
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) =>
    cb(null, Date.now() + path.extname(file.originalname)),
});

const upload = multer({ storage });

// ================= AUTH =================

// SIGNUP
app.post("/signup", async (req, res) => {
  const { username, password } = req.body;

  const hashed = await bcrypt.hash(password, 10);

  await new User({ username, password: hashed }).save();

  res.json({ message: "User created" });
});

// LOGIN
app.post("/login", async (req, res) => {
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
});

// ================= AVATAR UPLOAD =================
app.post("/upload-avatar", upload.single("file"), async (req, res) => {
  const { username } = req.body;

  const user = await User.findOneAndUpdate(
    { username },
    { avatar: `/uploads/${req.file.filename}` },
    { new: true }
  );

  res.json({ avatar: user.avatar });
});

// ================= SOCKET =================

let users = {};
let onlineUsers = {};

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // ADD ONLINE USER
  socket.on("add_user", (username) => {
    onlineUsers[socket.id] = username;
    io.emit("online_users", Object.values(onlineUsers));
  });

  // JOIN ROOM (SECURE)
  socket.on("join_room", async ({ room, token }) => {
    const decoded = verifyToken(token);
    if (!decoded) return socket.emit("error", "Invalid token");

    socket.join(room);
    users[socket.id] = { username: decoded.username, room };

    const messages = await Message.find({ room }).sort({ time: 1 });

    socket.emit("load_messages", messages);

    socket.to(room).emit("receive_message", {
      message: `${decoded.username} joined`,
      system: true,
    });
  });

  // SEND MESSAGE
  socket.on("send_message", async (msg) => {
    const user = users[socket.id];
    if (!user) return;

    const newMsg = new Message({
      username: user.username,
      room: user.room,
      message: msg,
    });

    await newMsg.save();

    io.to(user.room).emit("receive_message", {
      username: user.username,
      message: msg,
    });
  });

  // TYPING
  socket.on("typing", ({ room, username }) => {
    socket.to(room).emit("user_typing", username);
  });

  // SEEN
  socket.on("message_seen", ({ room }) => {
    socket.to(room).emit("message_seen");
  });

  // DISCONNECT
  socket.on("disconnect", () => {
    delete users[socket.id];
    delete onlineUsers[socket.id];
    io.emit("online_users", Object.values(onlineUsers));
  });
});

// ================= START =================
server.listen(3001, () => {
  console.log("Server running on port 3001");
});