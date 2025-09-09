// backend/models/GroupMember.js
const mongoose = require("mongoose");

const GroupMemberSchema = new mongoose.Schema({
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Group",
    required: true,
  },
  userId: { type: String, ref: "User", required: true },
  isAdmin: { type: Boolean, default: false },
  isBanned: { type: Boolean, default: false },
  isMuted: { type: Boolean, default: false },
  joinedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("GroupMember", GroupMemberSchema);
