// backend/models/User.js
const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  _id: String, // Firebase UID をそのまま _id として使用
  name: String,
  email: String,
});

module.exports = mongoose.model("User", UserSchema);
