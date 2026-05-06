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


// ================= SECURITY =================

app.use(helmet());

app.use(cors({
  origin: "*"
}));

app.use(express.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
});

app.use(limiter);


// ================= SERVER =================

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});


// ================= DATABASE =================

mongoose.connect(process.env.MONGO_URI)

  .then(() => {
    console.log("✅ DB connected");
  })

  .catch(err => {
    console.log(err);
  });


// ================= MESSAGE MODEL =================

const Message = mongoose.model(

  "Message",

  new mongoose.Schema({

    to: String,

    from: String,

    text: String,

    // text / image / voice / etc
    type: {
      type: String,
      default: "text"
    },

    // message seen status
    seen: {
      type: Boolean,
      default: false
    },

    createdAt: {
      type: Date,
      default: Date.now
    }

  })

);


// ================= CLOUDINARY =================

cloudinary.config({

  cloud_name: process.env.CLOUD_NAME,

  api_key: process.env.CLOUD_KEY,

  api_secret: process.env.CLOUD_SECRET,

});


// ================= FILE UPLOAD =================

const upload = multer({
  dest: "uploads/"
});

app.post(

  "/upload",

  upload.single("file"),

  async (req, res) => {

    try {

      const result = await cloudinary.uploader.upload(
        req.file.path
      );

      res.json({

        url: result.secure_url

      });

    } catch {

      res.status(500).json({

        error: "Upload failed"

      });

    }

  }

);


// ================= ONLINE USERS =================

const users = {};


// ================= SOCKET =================

io.on("connection", (socket) => {

  console.log("⚡ User connected");

  // REGISTER USER
  socket.on(

    "register_user",

    async (username) => {

      users[username] = socket.id;

      console.log("👤 Registered:", username);

      // SEND OLD MESSAGES
      const msgs = await Message.find({

        to: username

      }).sort({

        createdAt: 1

      });

      msgs.forEach(msg => {

        socket.emit(
          "receive_message",
          msg
        );

      });

    }

  );


  // SEND MESSAGE
  socket.on(

    "send_message",

    async ({ to, from, text, type }) => {

      try {

        const msgDoc = await Message.create({

          to,
          from,
          text,

          type: type || "text",

          seen: false

        });

        // SEND TO RECEIVER
        if (users[to]) {

          io.to(users[to]).emit(
            "receive_message",
            msgDoc
          );

        }

        // SEND BACK TO SENDER
        socket.emit(
          "message_sent",
          msgDoc
        );

      } catch (err) {

        console.log(err);

      }

    }

  );


  // MESSAGE SEEN
  socket.on(

    "message_seen",

    async (messageId) => {

      try {

        await Message.findByIdAndUpdate(

          messageId,

          {
            seen: true
          }

        );

      } catch (err) {

        console.log(err);

      }

    }

  );


  // TYPING
  socket.on(

    "typing",

    ({ to, from }) => {

      if (users[to]) {

        io.to(users[to]).emit(

          "typing",

          from

        );

      }

    }

  );


  // DISCONNECT
  socket.on("disconnect", () => {

    console.log("❌ User disconnected");

    for (let u in users) {

      if (users[u] === socket.id) {

        delete users[u];

      }

    }

  });

});


// ================= TEST ROUTE =================

app.get("/", (req, res) => {

  res.send("Server running 🚀");

});


// ================= LOAD OLD MESSAGES =================

app.get(

  "/messages/:user/:target",

  async (req, res) => {

    const { user, target } = req.params;

    const { page = 0 } = req.query;

    const msgs = await Message.find({

      $or: [

        {
          from: user,
          to: target
        },

        {
          from: target,
          to: user
        }

      ]

    })

      .sort({

        createdAt: -1

      })

      .skip(page * 20)

      .limit(20);

    res.json(

      msgs.reverse()

    );

  }

);


// ================= START =================

server.listen(

  process.env.PORT || 3001,

  () => {

    console.log("🚀 Server running");

  }

);