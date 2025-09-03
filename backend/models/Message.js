// backend/models/Message.js
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const MessageSchema = new Schema({
  group: { type: Schema.Types.ObjectId, ref: "Group", required: true },
  sender: { type: String, ref: "User", required: true },
  text: { type: String },
  fileUrl: { type: String },
  fileType: { type: String },
  fileName: { type: String },
  // 新しくgifQueryフィールドを追加
  gifQuery: { type: String },
  readBy: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
});

// text, fileUrl, または gifQuery のどれか必須
MessageSchema.path("text").validate(function (v) {
  return v || this.fileUrl || this.gifQuery;
}, "Message must have either text, fileUrl, or gifQuery");

module.exports = mongoose.model("Message", MessageSchema);
