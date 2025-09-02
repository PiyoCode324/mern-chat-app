// backend/routes/message.js
const express = require("express");
const router = express.Router();
const Message = require("../models/Message");
const mongoose = require("mongoose");
// io オブジェクトをミドルウェア経由で利用できるようにする
const { getIo } = require("../socket");

// POST /api/messages
// 新しいメッセージを作成
router.post("/", async (req, res) => {
  try {
    const { group, sender, text } = req.body;

    if (!group || !sender || !text) {
      return res
        .status(400)
        .json({ message: "グループ、送信者、テキストは必須です" });
    }

    // groupが有効なObjectIdであるかをここで検証
    if (!mongoose.Types.ObjectId.isValid(group)) {
      return res.status(400).json({ message: "無効なグループIDです" });
    }

    const message = new Message({
      group, // stringとして検証済みなのでそのまま使用
      sender,
      text,
    });

    await message.save();
    res.status(201).json(message);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "メッセージ投稿に失敗しました" });
  }
});

// GET /api/messages/group/:groupId
router.get("/group/:groupId", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.groupId)) {
      return res.status(400).json({ message: "無効なグループIDです" });
    }

    const messages = await Message.find({
      group: new mongoose.Types.ObjectId(req.params.groupId),
    }).sort({
      createdAt: 1,
    });
    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "メッセージ取得に失敗しました" });
  }
});

// 既読処理
router.post("/:id/read", async (req, res) => {
  const { userId } = req.body;
  try {
    const io = getIo();
    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    // 既読リストにuserIdが含まれていない場合のみ追加
    if (!message.readBy.includes(userId)) {
      message.readBy.push(userId);
      await message.save();

      // 同じグループの全クライアントに既読更新を通知
      // 既読更新されたメッセージと、そのグループIDを送信
      io.to(message.group.toString()).emit("readStatusUpdated", message);
    }

    res.json({ success: true, message });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update read status" });
  }
});

module.exports = router;
