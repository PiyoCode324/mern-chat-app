// backend/models/Message.js
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const MessageSchema = new Schema({
  group: { type: Schema.Types.ObjectId, ref: "Group", required: true }, // Group ID
  sender: { type: String, ref: "User", required: true }, // Firebase UID
  text: { type: String }, // テキストメッセージ（任意）
  fileUrl: { type: String }, // ファイルのURL（任意）
  fileType: { type: String }, // 追加: ファイルの種類 (例: "image/png", "audio/mpeg")
  fileName: { type: String }, // 追加: 元のファイル名
  readBy: [{ type: String }], // 既読管理 (userId 配列)
  createdAt: { type: Date, default: Date.now },
});

// text または fileUrl のどちらか必須
MessageSchema.path("text").validate(function (v) {
  return v || this.fileUrl;
}, "Message must have either text or fileUrl");

module.exports = mongoose.model("Message", MessageSchema);
