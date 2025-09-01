// // backend/server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config({ path: ".env.development" });

const socketHandler = require("./socket");
const User = require("./models/User");
const Group = require("./models/Group");
const Message = require("./models/Message");

const app = express();
app.use(cors());
app.use(express.json());

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error(err));

const server = http.createServer(app);

// Socket.IO セットアップ
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "https://mern-chat-app-frontend-zk7s.onrender.com",
    ],
    methods: ["GET", "POST"],
  },
});

// Socket.IO処理を別ファイルに分離
socketHandler(io);

const groupRoutes = require("./routes/groups");
app.use("/api/groups", groupRoutes);

// この行を修正
const messageRoutes = require("./routes/message");
app.use("/api/messages", messageRoutes);

const userRoutes = require("./routes/user");
app.use("/api/users", userRoutes);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
