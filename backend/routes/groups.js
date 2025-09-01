// backend/routes/group.js
const express = require("express");
const router = express.Router();
const Group = require("../models/Group");
const Message = require("../models/Message"); // メッセージモデルを追加

// -----------------------------
// POST /api/groups
// グループ作成
// -----------------------------
router.post("/", async (req, res) => {
  try {
    const { name, members, createdBy } = req.body;

    if (!name || !createdBy) {
      return res.status(400).json({ message: "グループ名と作成者は必須です" });
    }

    const group = new Group({
      name,
      members: members || [],
      createdBy,
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
// 自分が作成またはメンバーのグループを取得
// -----------------------------
router.get("/", async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ message: "userId が必要です" });

    const groups = await Group.find({
      $or: [{ createdBy: userId }, { members: userId }],
    });

    res.json(groups);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "グループ取得に失敗しました" });
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

    // Note: 認証済みのユーザー情報を使用するのがより安全な方法です
    if (group.createdBy.toString() !== req.body.userId) {
      return res.status(403).json({ message: "作成者のみ削除可能です" });
    }

    // グループに関連するメッセージも削除
    await Message.deleteMany({ group: req.params.id });

    // 非推奨の .remove() の代わりに、findByIdAndDelete を使用
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
    if (!members) {
      return res.status(400).json({ message: "メンバー情報が必要です" });
    }

    const group = await Group.findByIdAndUpdate(
      req.params.id,
      { members },
      { new: true }
    );

    if (!group) {
      return res.status(404).json({ message: "グループが見つかりません" });
    }

    res.json(group);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "メンバー更新に失敗しました" });
  }
});

module.exports = router;
