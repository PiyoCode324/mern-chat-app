// backend/routes/message.js
const express = require("express");
const multer = require("multer");
const { initializeApp, cert } = require("firebase-admin/app");
const { getStorage } = require("firebase-admin/storage");
const Message = require("../models/Message.js");
const Group = require("../models/Group.js");
const GroupMember = require("../models/GroupMember.js");
const mongoose = require("mongoose");
const { getIo } = require("../socket/index.js");

const router = express.Router();

// Firebase初期化
let serviceAccount;
try {
  serviceAccount = require("../serviceAccountKey.json");
} catch (e) {
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

// 許可MIMEタイプ
const ALLOWED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "application/pdf",
];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      console.log("❌ 許可されていないファイル形式:", file.mimetype);
      return cb(new Error("許可されていないファイル形式です"));
    }
    cb(null, true);
  },
});

// JSONパース
router.use(express.json());

/**
 * POST /api/messages
 */
router.post("/", upload.single("file"), async (req, res) => {
  try {
    const { group, sender, text } = req.body;
    console.log("✉️ New message POST request:", {
      group,
      sender,
      text,
      file: req.file?.originalname,
    });

    let fileUrl = null; // グループ所属チェック

    const membership = await GroupMember.findOne({
      userId: sender,
      groupId: group,
    });
    console.log("👤 Membership check:", membership);

    if (!membership) {
      console.log("⛔ User not in group");
      return res.status(403).json({ message: "グループに所属していません" });
    }
    if (membership.isBanned) {
      console.log("⛔ User is banned");
      return res.status(403).json({
        message: "あなたはBANされているためメッセージを送信できません",
      });
    } // ファイルアップロード処理

    if (req.file) {
      const fileName = `${Date.now()}-${req.file.originalname}`;
      const fileRef = bucket.file(fileName);
      await fileRef.save(req.file.buffer, {
        metadata: { contentType: req.file.mimetype },
      });
      fileUrl = `https://firebasestorage.googleapis.com/v0/b/${
        bucket.name
      }/o/${encodeURIComponent(fileName)}?alt=media`;
      console.log("📤 File uploaded to Firebase:", fileUrl);
    }

    if (!group || !sender || (!text && !fileUrl)) {
      console.log("❌ 必須項目が不足");
      return res.status(400).json({ message: "必須項目が不足しています" });
    }

    const message = new Message({
      group,
      sender,
      text: text || "",
      fileUrl,
      fileType: req.file?.mimetype,
      fileName: req.file?.originalname,
    });
    await message.save();
    console.log("✅ Message saved:", message);

    const io = getIo();

    if (membership.isMuted) {
      console.log("🔇 User is muted, sending only to self");
      io.to(sender.toString()).emit("message_received", {
        groupId: group,
        message,
        selfOnly: true,
      });
    } else {
      const groupMembers = await GroupMember.find({ groupId: group }).lean();
      console.log(
        "🧑‍🤝‍🧑 Broadcasting message to group members:",
        groupMembers.map((m) => m.userId.toString())
      );
      groupMembers.forEach((member) => {
        if (member.userId.toString() !== sender) {
          io.to(member.userId.toString()).emit("message_received", {
            groupId: group,
            message,
          });
        }
      });
    }

    res.status(201).json(message);
  } catch (err) {
    console.error("⚠️ メッセージ投稿の最終処理でエラー:", err);
    res.status(500).json({ message: "メッセージ投稿に失敗しました" });
  }
});

// Multerエラー専用ハンドラー
router.use((err, req, res, next) => {
  console.error("⚠️ Multer error handler triggered:", err);
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res
        .status(413)
        .json({ message: "ファイルが大きすぎます (5MBまで)" });
    }
    return res.status(400).json({ message: `Multer エラー: ${err.code}` });
  } else if (err.message === "許可されていないファイル形式です") {
    return res.status(400).json({ message: err.message });
  }
  next(err);
});

/**
 * POST /api/messages/gif
 */
router.post("/gif", async (req, res) => {
  try {
    const { group, sender, fileUrl, gifQuery } = req.body;
    console.log("🎞️ GIF POST request:", { group, sender, fileUrl, gifQuery });

    const membership = await GroupMember.findOne({
      userId: sender,
      groupId: group,
    });
    console.log("👤 Membership check:", membership);

    if (!membership)
      return res.status(403).json({ message: "グループに所属していません" });
    if (membership.isBanned)
      return res
        .status(403)
        .json({ message: "あなたはBANされているためGIFを送信できません" });

    if (!group || !sender || !fileUrl)
      return res.status(400).json({ message: "必須項目が不足しています" });
    if (!mongoose.Types.ObjectId.isValid(group))
      return res.status(400).json({ message: "無効なグループIDです" });

    const message = new Message({ group, sender, text: "", fileUrl, gifQuery });
    await message.save();
    console.log("✅ GIF saved:", message);

    const io = getIo();
    if (membership.isMuted) {
      console.log("🔇 User is muted, sending GIF only to self");
      io.to(sender.toString()).emit("message_received", {
        groupId: group,
        message,
        selfOnly: true,
      });
    } else {
      const groupMembers = await GroupMember.find({ groupId: group }).lean();
      console.log(
        "🧑‍🤝‍🧑 Broadcasting GIF to group members:",
        groupMembers.map((m) => m.userId.toString())
      );
      groupMembers.forEach((member) => {
        if (member.userId.toString() !== sender) {
          io.to(member.userId.toString()).emit("message_received", {
            groupId: group,
            message,
          });
        }
      });
    }

    res.status(201).json(message);
  } catch (err) {
    console.error("⚠️ GIF投稿の最終処理でエラー:", err);
    res.status(500).json({ message: "GIFの投稿に失敗しました" });
  }
});

// GET /api/messages/group/:groupId
router.get("/group/:groupId", async (req, res) => {
  try {
    const { groupId } = req.params;
    const currentUserId = req.query.userId;
    console.log(
      "📥 Fetching messages for group:",
      groupId,
      "user:",
      currentUserId
    );

    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({ message: "無効なグループIDです" });
    }

    // 💡 メンバーシップチェック
    const membership = await GroupMember.findOne({
      groupId: groupId,
      userId: currentUserId,
    });

    if (!membership) {
      console.log(
        `❌ User ${currentUserId} is not a member of group ${groupId}. Access denied.`
      );
      return res
        .status(403)
        .json({ message: "グループへのアクセス権がありません。" });
    }

    // 💡 BAN チェックを追加
    if (membership.isBanned) {
      console.log(`⛔ User ${currentUserId} is banned from group ${groupId}.`);
      return res
        .status(403)
        .json({
          message: "あなたはBANされているためメッセージを閲覧できません",
        });
    }

    const mutedMembers = await GroupMember.find({
      groupId,
      isMuted: true,
    }).lean();
    let mutedIds = mutedMembers.map((m) => m.userId.toString());

    if (currentUserId) mutedIds = mutedIds.filter((id) => id !== currentUserId);
    console.log("🔇 Muted user IDs:", mutedIds);

    const messages = await Message.find({
      group: groupId,
      sender: { $nin: mutedIds },
    })
      .sort({ createdAt: 1 })
      .lean();
    console.log("📄 Messages fetched:", messages.length);

    res.json(messages);
  } catch (err) {
    console.error("⚠️ メッセージ取得エラー:", err);
    res.status(500).json({ message: "メッセージ取得に失敗しました" });
  }
});

/**
 * POST /:id/read
 */
router.post("/:id/read", async (req, res) => {
  const { userId } = req.body;
  try {
    console.log("👁️ Mark read request:", { messageId: req.params.id, userId });

    const io = getIo();
    const message = await Message.findById(req.params.id);
    if (!message)
      return res.status(404).json({ error: "メッセージが見つかりません" });

    if (!message.readBy.includes(userId)) {
      message.readBy.push(userId);
      await message.save();
      io.to(message.group.toString()).emit("readStatusUpdated", message);
      console.log("✅ Read status updated:", message._id);
    }

    res.json({ success: true, message });
  } catch (err) {
    console.error("⚠️ 既読ステータス更新エラー:", err);
    res.status(500).json({ error: "既読ステータスの更新に失敗しました" });
  }
});

/**
 * GET /api/messages/search
 */
router.get("/search", async (req, res) => {
  try {
    const { groupId, query } = req.query;
    console.log("🔍 Message search request:", { groupId, query });

    if (!mongoose.Types.ObjectId.isValid(groupId))
      return res.status(400).json({ message: "無効なグループIDです" });
    if (!query || query.trim() === "")
      return res.status(400).json({ message: "検索ワードが必要です" });

    const messages = await Message.find({
      group: groupId,
      $or: [
        { text: { $regex: query, $options: "i" } },
        { fileName: { $regex: query, $options: "i" } },
        { gifQuery: { $regex: query, $options: "i" } },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(50);

    console.log("📄 Search results:", messages.length);
    res.json(messages);
  } catch (err) {
    console.error("⚠️ メッセージ検索エラー:", err);
    res.status(500).json({ message: "検索に失敗しました" });
  }
});

module.exports = router;
