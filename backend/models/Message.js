// backend/models/Message.js
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const MessageSchema = new Schema({
  group: { type: Schema.Types.ObjectId, ref: "Group", required: true }, // Group ID
  sender: { type: String, ref: "User", required: true }, // Firebase UID
  text: { type: String, required: true },
  fileUrl: { type: String }, // 将来のファイル送信用
  readBy: [{ type: String }], // 既読管理 (userId 配列)
  createdAt: { type: Date, default: Date.now },
});

// _id はデフォルトで自動生成されるのでフロントで msg._id が使える
module.exports = mongoose.model("Message", MessageSchema);
