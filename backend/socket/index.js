// backend/socket/index.js
const Message = require("../models/Message");

const socketHandler = (io) => {
  io.on("connection", (socket) => {
    console.log("New client connected:", socket.id);

    // 個人ルーム
    socket.on("join", (userId) => {
      socket.userId = userId;
      socket.join(userId);
      console.log(`User ${userId} joined personal room`);
    });

    // -----------------------------
    // グループチャット専用
    // -----------------------------
    socket.on("joinGroup", ({ groupId, userId }) => {
      socket.userId = userId;
      socket.join(groupId);
      console.log(`User ${userId} joined group ${groupId}`);
    });

    socket.on("groupMessage", async (msg) => {
      try {
        const newMessage = new Message({
          group: msg.groupId,
          sender: msg.sender,
          text: msg.text,
        });
        await newMessage.save();

        // グループ内の全員に送信（送信者も含む）
        io.to(msg.groupId).emit("receiveGroupMessage", msg);
      } catch (err) {
        console.error("Group message save error:", err);
      }
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });
};

module.exports = socketHandler;
