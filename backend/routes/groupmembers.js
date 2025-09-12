// backend/routes/groupmembers.js
const express = require("express");
const router = express.Router();
const GroupMember = require("../models/GroupMember");
const Group = require("../models/Group");
const mongoose = require("mongoose");

// ルーターを関数でラップし、ioインスタンスを引数として受け取る
module.exports = (io) => {
  // -----------------------------
  // GET /api/groupmembers/check-admin/:userId
  // 指定ユーザーが管理者かどうかを判定
  // -----------------------------
  router.get("/check-admin/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const adminMembership = await GroupMember.findOne({
        userId,
        isAdmin: true,
      });
      res.json({ isAdmin: !!adminMembership });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "管理者権限の確認に失敗しました" });
    }
  }); // ----------------------------- // GET /api/groupmembers/:groupId // 指定グループのメンバー一覧取得 // -----------------------------

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
  }); // ----------------------------- // GET /api/groupmembers/user/:userId // 特定ユーザーが所属するグループのメンバーシップ一覧を取得 // -----------------------------

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
  }); // ----------------------------- // POST /api/groupmembers // メンバー追加 // -----------------------------

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
  }); // ----------------------------- // PATCH /api/groupmembers/:id // メンバー更新 (isAdmin, isBanned, isMuted) // -----------------------------

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
  }); // ----------------------------- // PATCH /api/groupmembers/:groupId/ban-member // メンバーBAN / BAN解除（即時通知対応） // -----------------------------

  router.patch("/:groupId/ban-member", async (req, res) => {
    const { groupId } = req.params;
    const { adminUserId, targetUserId, action } = req.body;

    try {
      if (!mongoose.Types.ObjectId.isValid(groupId)) {
        return res.status(400).json({ message: "無効なグループIDです" });
      }

      const group = await Group.findById(groupId);
      if (!group) {
        return res.status(404).json({ message: "グループが見つかりません" });
      } // 管理者チェック

      const adminMember = await GroupMember.findOne({
        groupId: groupId,
        userId: adminUserId,
        isAdmin: true,
      });

      if (!adminMember) {
        return res.status(403).json({ message: "権限がありません" });
      }

      const member = await GroupMember.findOne({
        groupId,
        userId: targetUserId,
      });
      if (!member) {
        return res.status(404).json({ message: "メンバーが見つかりません" });
      }

      if (action === "ban") {
        member.isBanned = true;
      } else if (action === "unban") {
        member.isBanned = false;
      } else {
        return res.status(400).json({ message: "無効なアクションです" });
      }

      await member.save();
      console.log("✅ Member BAN status updated:", member); // ----------------------------- // 🔔 即時通知 // -----------------------------

      if (io) {
        io.to(groupId).emit("member_banned", {
          userId: targetUserId,
          action,
        });
        console.log("🔔 member_banned event emitted:", {
          groupId,
          userId: targetUserId,
          action,
        });
      }

      res.json({
        message: `メンバーを${action === "ban" ? "BAN" : "BAN解除"}しました`,
        member,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "サーバーエラー" });
    }
  }); // ----------------------------- // PATCH /api/groupmembers/:groupId/mute-member // 💡 追加: メンバーミュート / ミュート解除 // -----------------------------

  router.patch("/:groupId/mute-member", async (req, res) => {
    const { groupId } = req.params;
    const { adminUserId, targetUserId, action } = req.body;

    try {
      const adminMember = await GroupMember.findOne({
        groupId,
        userId: adminUserId,
        isAdmin: true,
      });
      if (!adminMember) {
        return res.status(403).json({ message: "管理者権限がありません。" });
      }

      const member = await GroupMember.findOne({
        groupId,
        userId: targetUserId,
      });
      if (!member) {
        return res.status(404).json({ message: "メンバーが見つかりません。" });
      }

      member.isMuted = action === "mute"; // "mute"ならtrue、"unmute"ならfalse
      await member.save();

      if (io) {
        io.to(groupId).emit("member_muted", { userId: targetUserId, action });
        console.log(`🔔 member_muted event emitted:`, {
          groupId,
          userId: targetUserId,
          action,
        });
      }

      res
        .status(200)
        .json({ message: `メンバーを${action}しました。`, member });
    } catch (err) {
      console.error("ミュートアクション失敗:", err);
      res.status(500).json({ message: "サーバーエラーが発生しました。" });
    }
  }); // ----------------------------- // DELETE /api/groupmembers/:id // メンバー削除（削除通知を追加） // -----------------------------

  router.delete("/:id", async (req, res) => {
    try {
      const member = await GroupMember.findById(req.params.id);
      if (!member) {
        return res.status(404).json({ message: "メンバーが見つかりません" });
      }

      await GroupMember.findByIdAndDelete(req.params.id);
      console.log("🗑️ Member deleted:", member._id); // 💡 修正: userSockets マップからソケットIDを取得して通知

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
