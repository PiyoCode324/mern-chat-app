// backend/server.js
const express = require("express");
const http = require("http");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config({ path: ".env.development" });

const socket = require("./socket/index"); // socket/index.jsをインポート
const User = require("./models/User");
const Group = require("./models/Group");
const GroupMember = require("./models/GroupMember");
const Message = require("./models/Message");

const app = express();
app.use(cors());
app.use(express.json());

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error(err));

const server = http.createServer(app);

// Socket.IOのインスタンスを初期化し、外部からアクセス可能にする
socket.init(server);

const groupRoutes = require("./routes/groups");
app.use("/api/groups", groupRoutes);

// groupmembers.js の import 方法を変更
// ルーターを返す関数を呼び出し、ioインスタンスを渡す
const createGroupmemberRouter = require("./routes/groupmembers");
const groupmemberRoutes = createGroupmemberRouter(socket.getIo());
app.use("/api/groupmembers", groupmemberRoutes);

const messageRoutes = require("./routes/message");
app.use("/api/messages", messageRoutes);

const userRoutes = require("./routes/user");
app.use("/api/users", userRoutes);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
