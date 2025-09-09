// backend/routes/user.js
const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Group = require("../models/Group"); // Groupモデルを追加
const GroupMember = require("../models/GroupMember"); // 💡 GroupMemberモデルを追加

// 🔹 新規ユーザー登録
router.post("/", async (req, res) => {
  try {
    const { _id, name, email } = req.body;

    if (!_id || !name || !email) {
      return res.status(400).json({ message: "ID, 名前, メールは必須です" });
    }

    const existingUser = await User.findById(_id);
    if (existingUser) {
      return res.status(400).json({ message: "ユーザーは既に存在します" });
    }

    const user = new User({ _id, name, email });
    await user.save();

    res.status(201).json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "ユーザー登録に失敗しました" });
  }
});

// 🔹 ユーザー情報取得
router.get("/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id).lean();
    if (!user)
      return res.status(404).json({ message: "ユーザーが見つかりません" });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "ユーザー取得に失敗しました" });
  }
});

// 🔹 ユーザー情報更新（プロフィール編集） PATCH 推奨
router.patch("/:id", async (req, res) => {
  try {
    const { name, iconUrl, bio } = req.body;

    const user = await User.findById(req.params.id);
    if (!user)
      return res.status(404).json({ message: "ユーザーが見つかりません" });

    if (name !== undefined) user.name = name;
    if (iconUrl !== undefined) user.iconUrl = iconUrl;
    if (bio !== undefined) user.bio = bio;

    await user.save();

    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "ユーザー更新に失敗しました" });
  }
});

// 🔹 管理者権限のあるグループ一覧取得
router.get("/:id/admin-groups", async (req, res) => {
  try {
    const userId = req.params.id;

    // 💡 修正: GroupMemberコレクションからisAdminがtrueのものを検索
    const adminMemberships = await GroupMember.find({
      userId: userId,
      isAdmin: true,
    }).lean();

    if (adminMemberships.length === 0) {
      // 管理者メンバーシップがない場合は空の配列を返す
      return res.json([]);
    }

    // 見つかったグループIDのリストを作成
    const groupIds = adminMemberships.map((member) => member.groupId);

    // グループIDに基づいてGroupコレクションからグループ情報を取得
    const adminGroups = await Group.find({ _id: { $in: groupIds } }).lean();

    res.json(adminGroups);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "管理者グループの取得に失敗しました" });
  }
});

module.exports = router;
