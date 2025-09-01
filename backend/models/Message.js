// backend/models/Message.js
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const MessageSchema = new Schema({
  group: { type: Schema.Types.ObjectId, ref: "Group" }, // Group ID を ObjectId に修正
  sender: { type: String, ref: "User" }, // Firebase UID
  text: String,
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Message", MessageSchema);
