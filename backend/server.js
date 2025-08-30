// backend/server.js
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config();

const app = express();
const corsOptions = {
  origin: [
    "http://localhost:5173", // 開発用
    "https://mern-chat-app-frontend-zk7s.onrender.com", // 本番用
  ],
  credentials: true,
};
app.use(cors(corsOptions));

app.use(express.json());

const server = http.createServer(app);

// Socket.IO 初期化
const io = new Server(server, {
  cors: {
    origin: "*", // 開発中はワイルドカードでOK、後でフロントURLに変更
    methods: ["GET", "POST"],
  },
});

// 接続確認
io.on("connection", (socket) => {
  console.log("a user connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("user disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
