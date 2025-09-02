// backend/socket/index.js
const Message = require("../models/Message"); // ここでMessageモデルをインポート

let io;

const socketHandler = (socket) => {
  console.log("New client connected:", socket.id);

  socket.on("join", (userId) => {
    socket.userId = userId;
    socket.join(userId);
    console.log(`User ${userId} joined personal room`);
  });

  socket.on("joinGroup", ({ groupId, userId }) => {
    socket.userId = userId;
    socket.join(groupId);
    console.log(`User ${userId} joined group ${groupId}`);
  });

  // 💡 ここにメッセージ送信のロジックを追加
  socket.on("groupMessage", async (msg) => {
    try {
      // MongoDBに新しいメッセージを保存
      const newMessage = new Message({
        group: msg.groupId,
        sender: msg.sender,
        text: msg.text,
        readBy: [msg.sender], // 送信者自身を既読リストに含める
      });
      await newMessage.save();

      // 同じグループの全員に、保存されたメッセージを送信
      io.to(msg.groupId).emit("receiveGroupMessage", newMessage);
    } catch (err) {
      console.error("Group message save error:", err);
    }
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
};

module.exports = {
  init: (httpServer) => {
    const { Server } = require("socket.io");
    io = new Server(httpServer, {
      cors: {
        origin: [
          "http://localhost:5173",
          "https://mern-chat-app-frontend-zk7s.onrender.com",
        ],
        methods: ["GET", "POST"],
      },
    });

    io.on("connection", socketHandler);
    return io;
  },
  getIo: () => {
    if (!io) {
      throw new Error("Socket.io not initialized!");
    }
    return io;
  },
};
