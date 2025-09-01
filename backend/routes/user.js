// backend/routes/user.js
const express = require("express");
const router = express.Router();
const User = require("../models/User");

// 新規ユーザー登録
router.post("/", async (req, res) => {
  try {
    const { _id, name, email } = req.body;

    if (!_id || !name || !email) {
      return res.status(400).json({ message: "ID, 名前, メールは必須です" });
    }

    const user = new User({ _id, name, email });
    await user.save();

    res.status(201).json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "ユーザー登録に失敗しました" });
  }
});

module.exports = router;
