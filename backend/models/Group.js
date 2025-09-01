// backend/models/Group.js
const mongoose = require("mongoose");

const GroupSchema = new mongoose.Schema({
  name: String,
  members: [{ type: String, ref: "User" }], // Firebase UID の配列
  createdBy: { type: String, ref: "User" }, // Firebase UID
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Group", GroupSchema);
