// backend/models/Group.js
const mongoose = require("mongoose");

const GroupSchema = new mongoose.Schema({
  name: String,
  createdBy: { type: String, ref: "User" },
  createdAt: { type: Date, default: Date.now },
  type: { type: String, enum: ["group", "private"], default: "group" }, // 追加
});

module.exports = mongoose.model("Group", GroupSchema);
