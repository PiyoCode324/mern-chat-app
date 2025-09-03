// backend/routes/message.js
const express = require("express");
const multer = require("multer");
const { initializeApp, cert } = require("firebase-admin/app");
const { getStorage } = require("firebase-admin/storage");
const Message = require("../models/Message.js");
const mongoose = require("mongoose");
const { getIo } = require("../socket/index.js");

const router = express.Router();

// Firebase Admin SDKのサービスアカウントキーをインポート
// 実際のファイルパスに置き換える必要があります
const serviceAccount = require("../serviceAccountKey.json");

// Firebase Admin SDKの初期化
initializeApp({
  credential: cert(serviceAccount),
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
});

const bucket = getStorage().bucket();

// multerの設定をmemoryStorageに変更
// ファイルをメモリに一時的に保持する
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MBに制限
  },
});

// POST /api/messages
// 新しいメッセージを作成 (テキストまたはファイル)
router.post("/", upload.single("file"), async (req, res) => {
  try {
    const { group, sender, text } = req.body;
    let fileUrl = null;

    if (req.file) {
      const fileName = `${Date.now()}-${req.file.originalname}`;
      const file = bucket.file(fileName);

      await file.save(req.file.buffer, {
        metadata: {
          contentType: req.file.mimetype,
        },
      });

      fileUrl = `https://firebasestorage.googleapis.com/v0/b/${
        bucket.name
      }/o/${encodeURIComponent(fileName)}?alt=media`;
    }

    if (!group || !sender || (!text && !fileUrl)) {
      return res.status(400).json({
        message: "グループ、送信者、およびテキストまたはファイルは必須です",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(group)) {
      return res.status(400).json({ message: "無効なグループIDです" });
    }

    const message = new Message({
      group,
      sender,
      text,
      fileUrl,
    });

    await message.save();
    res.status(201).json(message);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "メッセージ投稿に失敗しました" });
  }
});

// GET /api/messages/group/:groupId
// グループのメッセージを取得
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
      return res.status(404).json({ error: "メッセージが見つかりません" });
    }

    if (!message.readBy.includes(userId)) {
      message.readBy.push(userId);
      await message.save();

      io.to(message.group.toString()).emit("readStatusUpdated", message);
    }

    res.json({ success: true, message });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "既読ステータスの更新に失敗しました" });
  }
});

module.exports = router;
