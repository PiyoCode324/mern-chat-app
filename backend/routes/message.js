// backend/routes/message.js
const express = require("express");
const multer = require("multer");
const { initializeApp, cert } = require("firebase-admin/app");
const { getStorage } = require("firebase-admin/storage");
const Message = require("../models/Message.js");
const mongoose = require("mongoose");
const { getIo } = require("../socket/index.js");

const router = express.Router();

// ローカルと本番環境でサービスアカウントキーを動的に読み込む
let serviceAccount;
try {
  // ローカル環境
  serviceAccount = require("../serviceAccountKey.json");
} catch (e) {
  // 本番環境（Render）
  // 新しい環境変数名を確認し、存在すればBase64をデコードする
  if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    const base64String = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
    const jsonString = Buffer.from(base64String, "base64").toString("utf-8");
    serviceAccount = JSON.parse(jsonString);
  } else {
    throw new Error("Firebase service account credentials not found.");
  }
}

initializeApp({
  credential: cert(serviceAccount),
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
});

const bucket = getStorage().bucket();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

// JSONリクエストをパースするためのミドルウェアを追加
router.use(express.json());

// POST /api/messages (通常ファイルアップロード用)
router.post("/", upload.single("file"), async (req, res) => {
  try {
    const { group, sender, text } = req.body;
    let fileUrl = null;

    if (req.file) {
      const fileName = `${Date.now()}-${req.file.originalname}`;
      const file = bucket.file(fileName);
      await file.save(req.file.buffer, {
        metadata: { contentType: req.file.mimetype },
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
      text: text || "",
      fileUrl,
      fileType: req.file ? req.file.mimetype : null,
      fileName: req.file ? req.file.originalname : null,
    });

    await message.save();
    res.status(201).json(message);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "メッセージ投稿に失敗しました" });
  }
});

// POST /api/messages/gif (GIF送信専用)
router.post("/gif", async (req, res) => {
  try {
    const { group, sender, fileUrl, gifQuery } = req.body;

    if (!group || !sender || !fileUrl) {
      return res.status(400).json({ message: "必須項目が不足しています" });
    }

    if (!mongoose.Types.ObjectId.isValid(group)) {
      return res.status(400).json({ message: "無効なグループIDです" });
    }

    const message = new Message({
      group,
      sender,
      text: "", // UIにテキストを表示しない
      fileUrl,
      gifQuery, // 管理用に検索ワードを保存
    });

    await message.save();
    res.status(201).json(message);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "GIFの投稿に失敗しました" });
  }
});

// GET /api/messages/group/:groupId
router.get("/group/:groupId", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.groupId)) {
      return res.status(400).json({ message: "無効なグループIDです" });
    }
    const messages = await Message.find({ group: req.params.groupId }).sort({
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
    if (!message)
      return res.status(404).json({ error: "メッセージが見つかりません" });

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
