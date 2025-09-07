// backend/routes/groups.js
const express = require("express");
const router = express.Router();
const Group = require("../models/Group");
const Message = require("../models/Message");
const User = require("../models/User"); // ユーザーモデル追加
const mongoose = require("mongoose");

// -----------------------------
// POST /api/groups
// グループ作成 (通常 or 個人チャット)
// -----------------------------
router.post("/", async (req, res) => {
  try {
    const { name, members, createdBy, type } = req.body;

    if (!members || members.length === 0) {
      return res.status(400).json({ message: "メンバーが必要です" });
    } // 個人チャットの場合

    if (type === "private") {
      if (members.length !== 2) {
        return res
          .status(400)
          .json({ message: "個人チャットは2人である必要があります" });
      }

      const existing = await Group.findOne({
        type: "private",
        members: { $all: members, $size: 2 },
      });

      if (existing) return res.status(200).json(existing);

      const privateGroup = new Group({
        name: "Private Chat",
        members,
        createdBy,
        type: "private",
      });

      await privateGroup.save();
      return res.status(201).json(privateGroup);
    } // 通常グループ

    if (!name || !createdBy) {
      return res.status(400).json({ message: "グループ名と作成者は必須です" });
    }

    const group = new Group({
      name,
      members,
      createdBy,
      type: "group",
    });

    await group.save();
    res.status(201).json(group);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "グループ作成に失敗しました" });
  }
});

// -----------------------------
// GET /api/groups?userId=xxx
// 自分が所属するグループ (未読件数付き)
// -----------------------------
router.get("/", async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ message: "userId が必要です" });

    const groups = await Group.find({
      $or: [{ createdBy: userId }, { members: userId }],
    }).lean();

    const groupsWithUnread = await Promise.all(
      groups.map(async (group) => {
        // 修正: senderIdが自分自身ではないメッセージをカウントする
        const unreadCount = await Message.countDocuments({
          group: group._id,
          readBy: { $ne: userId },
          senderId: { $ne: userId }, // ← この行を追加
        });
        return { ...group, unreadCount };
      })
    );

    res.json(groupsWithUnread);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "グループ取得に失敗しました" });
  }
});

// -----------------------------
// GET /api/groups/search-users?q=文字列
// ユーザー検索（サジェスト用）
// -----------------------------
router.get("/search-users", async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json([]);

    const users = await User.find({
      $or: [
        { name: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
      ],
    }).limit(10);

    // 修正: _id, name, および uid をすべて含める
    res.json(users.map((u) => ({ _id: u._id, name: u.name, uid: u._id })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "ユーザー検索に失敗しました" });
  }
});

// -----------------------------
// DELETE /api/groups/:id
// 作成者のみ削除可能
// -----------------------------
router.delete("/:id", async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({ message: "グループが見つかりません" });
    }

    if (group.createdBy.toString() !== req.body.userId) {
      return res.status(403).json({ message: "作成者のみ削除可能です" });
    }

    await Message.deleteMany({ group: req.params.id });
    await Group.findByIdAndDelete(req.params.id);

    res.json({ message: "グループと関連メッセージを削除しました" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "削除に失敗しました" });
  }
});

// -----------------------------
// PATCH /api/groups/:id/members
// メンバー追加/削除
// -----------------------------
router.patch("/:id/members", async (req, res) => {
  try {
    const { members } = req.body;
    if (!members)
      return res.status(400).json({ message: "メンバー情報が必要です" });

    const group = await Group.findByIdAndUpdate(
      req.params.id,
      { members },
      { new: true }
    );

    if (!group)
      return res.status(404).json({ message: "グループが見つかりません" });

    res.json(group);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "メンバー更新に失敗しました" });
  }
});

module.exports = router;
