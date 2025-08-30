// backend/server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();

// ミドルウェア
app.use(cors());
app.use(express.json());

// HTTP サーバー作成
const server = http.createServer(app);

// Socket.IO セットアップ
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "https://mern-chat-app-frontend.onrender.com",
    ],
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);

  // ユーザーが接続したら自分のルームに join
  socket.on("join", (userId) => {
    socket.userId = userId;
    socket.join(userId);
    console.log(`User ${userId} joined room`);
  });

  // メッセージ送信イベント
  socket.on("sendMessage", (msg) => {
    // 相手に送信（senderは除く）
    // broadcast.to(msg.to)を使うと、送信者以外のルームメンバーにのみ送信される
    // これにより、自分のメッセージは自分には返ってこない
    socket.to(msg.to).emit("receiveMessage", msg);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

// サーバー起動
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
