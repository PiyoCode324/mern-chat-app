// backend/routes/groupmembers.js
const express = require("express");
const router = express.Router();
const GroupMember = require("../models/GroupMember");
const mongoose = require("mongoose");

// ルーターを関数でラップし、ioインスタンスを引数として受け取る
module.exports = (io) => {
  // -----------------------------
  // GET /api/groupmembers/:groupId
  // 指定グループのメンバー一覧取得
  // -----------------------------
  router.get("/:groupId", async (req, res) => {
    try {
      const { groupId } = req.params;
      if (!mongoose.Types.ObjectId.isValid(groupId)) {
        return res.status(400).json({ message: "無効なグループIDです" });
      }

      const members = await GroupMember.find({ groupId }).populate(
        "userId",
        "name email"
      );
      console.log(
        "🔄 Fetched members for group:",
        groupId,
        members.map((m) => m.userId._id)
      );
      res.json(members);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "メンバー取得に失敗しました" });
    }
  });

  // -----------------------------
  // GET /api/groupmembers/user/:userId
  // 特定ユーザーが所属するグループのメンバーシップ一覧を取得
  // -----------------------------
  router.get("/user/:userId", async (req, res) => {
    try {
      const userId = req.params.userId;
      const userGroups = await GroupMember.find({ userId }).populate("groupId");
      console.log(
        "🔄 Fetched groups for user:",
        userId,
        userGroups.map((g) => g.groupId._id)
      );
      res.json(userGroups);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "ユーザーのグループ取得に失敗しました" });
    }
  });

  // -----------------------------
  // POST /api/groupmembers
  // メンバー追加
  // -----------------------------
  router.post("/", async (req, res) => {
    try {
      const { groupId, userId, isAdmin } = req.body;
      if (!groupId || !userId) {
        return res
          .status(400)
          .json({ message: "groupId と userId は必須です" });
      }

      const existing = await GroupMember.findOne({ groupId, userId });
      if (existing) {
        return res
          .status(400)
          .json({ message: "メンバーは既に追加されています" });
      }

      const member = new GroupMember({ groupId, userId, isAdmin: !!isAdmin });
      await member.save();
      console.log("✅ Member added:", member);
      res.status(201).json(member);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "メンバー追加に失敗しました" });
    }
  });

  // -----------------------------
  // PATCH /api/groupmembers/:id
  // メンバー更新 (isAdmin, isBanned, isMuted)
  // -----------------------------
  router.patch("/:id", async (req, res) => {
    try {
      const { isAdmin, isBanned, isMuted } = req.body;
      const updateFields = {};
      if (isAdmin !== undefined) updateFields.isAdmin = isAdmin;
      if (isBanned !== undefined) updateFields.isBanned = isBanned;
      if (isMuted !== undefined) updateFields.isMuted = isMuted;

      if (Object.keys(updateFields).length === 0) {
        return res
          .status(400)
          .json({ message: "更新するフィールドがありません" });
      }

      const member = await GroupMember.findByIdAndUpdate(
        req.params.id,
        { $set: updateFields },
        { new: true, runValidators: true }
      );

      if (!member)
        return res.status(404).json({ message: "メンバーが見つかりません" });

      console.log("✅ Member updated:", member);
      res.json(member);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "メンバー更新に失敗しました" });
    }
  });

  // -----------------------------
  // DELETE /api/groupmembers/:id
  // メンバー削除（削除通知を追加）
  // -----------------------------
  router.delete("/:id", async (req, res) => {
    try {
      const member = await GroupMember.findById(req.params.id);
      if (!member) {
        return res.status(404).json({ message: "メンバーが見つかりません" });
      }

      await GroupMember.findByIdAndDelete(req.params.id);
      console.log("🗑️ Member deleted:", member._id);

      // 💡 修正: userSockets マップからソケットIDを取得して通知
      if (io) {
        console.log("⚠️ Emitting removed_from_group:", {
          userId: member.userId.toString(),
          groupId: member.groupId.toString(),
        });
        const targetSocketId = io.userSockets.get(member.userId.toString());
        if (targetSocketId) {
          io.to(targetSocketId).emit(
            "removed_from_group",
            member.groupId.toString()
          );
        }
      }

      res.json({ message: "メンバーを削除しました" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "メンバー削除に失敗しました" });
    }
  });

  return router;
};
