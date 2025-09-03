// backend/socket/index.js
const Message = require("../models/Message"); // このインポートは、今後の機能拡張のために残しておきます

let io;

const socketHandler = (socket) => {
  console.log("New client connected:", socket.id);

  // 個人ルーム
  socket.on("join", (userId) => {
    socket.userId = userId;
    socket.join(userId);
    console.log(`User ${userId} joined personal room`);
  });

  // グループチャット専用
  socket.on("joinGroup", ({ groupId, userId }) => {
    socket.userId = userId;
    socket.join(groupId);
    console.log(`User ${userId} joined group ${groupId}`);
  });

  // メッセージ送信のロジック (保存ロジックを削除)
  socket.on("groupMessage", (msg) => {
    // クライアントから受け取ったメッセージをそのままグループ内の全員に送信
    // メッセージの保存はbackend/routes/message.jsで行う
    io.to(msg.group).emit("receiveGroupMessage", msg);
  });

  // 既読ステータス更新のロジック
  socket.on("readStatusUpdated", (updatedMessage) => {
    io.to(updatedMessage.group.toString()).emit(
      "readStatusUpdated",
      updatedMessage
    );
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
