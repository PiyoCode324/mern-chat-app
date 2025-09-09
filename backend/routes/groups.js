// backend/routes/groups.js
const express = require("express");
const router = express.Router();
const Group = require("../models/Group");
const GroupMember = require("../models/GroupMember");
const Message = require("../models/Message");
const User = require("../models/User");

// -----------------------------
// POST /api/groups
// グループ作成 (通常 or 個人チャット)
// -----------------------------
router.post("/", async (req, res) => {
  try {
    const { name, members, createdBy, type } = req.body;

    if (!members || members.length === 0) {
      return res.status(400).json({ message: "メンバーが必要です" });
    }

    if (!createdBy) {
      return res.status(400).json({ message: "作成者は必須です" });
    }

    // -----------------------------
    // 重複グループチェック
    // -----------------------------
    // 全ての候補グループを取得（メンバーが含まれるグループ）
    const candidateGroupIds = await GroupMember.find({
      userId: { $in: members },
    }).distinct("groupId");

    // 完全一致するグループを検索
    const existingGroup = await Group.findOne({
      _id: { $in: candidateGroupIds },
      type: type || "group",
    }).lean();

    if (existingGroup) {
      // メンバー数も一致しているかチェック
      const existingMembers = await GroupMember.find({
        groupId: existingGroup._id,
      }).distinct("userId");

      if (
        existingMembers.length === members.length &&
        members.every((m) => existingMembers.includes(m))
      ) {
        return res.status(200).json(existingGroup);
      }
    }

    // -----------------------------
    // 新規グループ作成
    // -----------------------------
    const group = new Group({
      name: type === "private" ? "Private Chat" : name,
      createdBy,
      type: type || "group",
    });
    await group.save();

    // GroupMemberに登録
    // 元々members配列に入っているメンバーに加えて、createdBy（グループ作成者）を必ず追加する
    // Setを使って重複を排除
    const allMembers = [...new Set([...members, createdBy])];

    const memberDocs = allMembers.map((uid) => ({
      groupId: group._id,
      userId: uid,
      isAdmin: uid === createdBy, // 作成者を管理者に設定
    }));
    await GroupMember.insertMany(memberDocs);

    res.status(201).json({ group, members: memberDocs });
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

    const memberships = await GroupMember.find({
      userId,
      isBanned: false,
    }).lean();
    const groupIds = memberships.map((m) => m.groupId);

    const groups = await Group.find({ _id: { $in: groupIds } }).lean();

    const groupsWithUnread = await Promise.all(
      groups.map(async (group) => {
        const unreadCount = await Message.countDocuments({
          group: group._id,
          readBy: { $ne: userId },
          sender: { $ne: userId },
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
    const { userId } = req.body;
    const group = await Group.findById(req.params.id);
    if (!group)
      return res.status(404).json({ message: "グループが見つかりません" });

    if (group.createdBy !== userId) {
      return res.status(403).json({ message: "作成者のみ削除可能です" });
    }

    await Message.deleteMany({ group: group._id });
    await GroupMember.deleteMany({ groupId: group._id });
    await Group.findByIdAndDelete(group._id);

    res.json({ message: "グループと関連データを削除しました" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "削除に失敗しました" });
  }
});

// -----------------------------
// PATCH /api/groups/:id/members
// メンバー追加/削除 / BAN / MUTE / 管理者権限変更
// -----------------------------
router.patch("/:id/members", async (req, res) => {
  try {
    const { userId, targetUserId, action } = req.body;
    const groupId = req.params.id;

    const operator = await GroupMember.findOne({ groupId, userId });
    if (!operator?.isAdmin) {
      return res.status(403).json({ message: "管理者権限が必要です" });
    }

    let target = await GroupMember.findOne({ groupId, userId: targetUserId });

    if (action === "add") {
      if (target) return res.status(400).json({ message: "既にメンバーです" });
      target = new GroupMember({ groupId, userId: targetUserId });
      await target.save();
    } else if (action === "remove") {
      if (!target)
        return res.status(404).json({ message: "メンバーが見つかりません" });
      await target.deleteOne();
    } else if (action === "ban") {
      if (!target)
        return res.status(404).json({ message: "メンバーが見つかりません" });
      target.isBanned = true;
      await target.save();
    } else if (action === "unban") {
      if (!target)
        return res.status(404).json({ message: "メンバーが見つかりません" });
      target.isBanned = false;
      await target.save();
    } else if (action === "mute") {
      if (!target)
        return res.status(404).json({ message: "メンバーが見つかりません" });
      target.isMuted = true;
      await target.save();
    } else if (action === "unmute") {
      if (!target)
        return res.status(404).json({ message: "メンバーが見つかりません" });
      target.isMuted = false;
      await target.save();
    } else if (action === "setAdmin") {
      if (!target)
        return res.status(404).json({ message: "メンバーが見つかりません" });
      target.isAdmin = true;
      await target.save();
    } else if (action === "removeAdmin") {
      if (!target)
        return res.status(404).json({ message: "メンバーが見つかりません" });
      target.isAdmin = false;
      await target.save();
    } else {
      return res.status(400).json({ message: "無効なアクションです" });
    }

    res.json({ message: "メンバー情報を更新しました", target });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "メンバー更新に失敗しました" });
  }
});

module.exports = router;
