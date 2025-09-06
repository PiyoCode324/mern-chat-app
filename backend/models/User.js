// backend/models/User.js
const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  _id: String, // Firebase UID をそのまま _id として使用
  name: { type: String, required: true },
  email: { type: String, required: true },
  iconUrl: { type: String }, // プロフィール画像のURL
  // 他に必要であれば追加項目をここに
  bio: { type: String }, // 例: 自己紹介
  updatedAt: { type: Date, default: Date.now },
});

// 更新時に updatedAt を自動更新
UserSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("User", UserSchema);
