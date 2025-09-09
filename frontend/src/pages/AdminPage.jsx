// frontend/src/pages/AdminPage.jsx

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function AdminPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // ログイン状態と管理者権限の確認を一つのuseEffectに統合
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      // onAuthStateChangedのコールバックは同期的に保つ
      const handleAuth = async () => {
        if (!user) {
          navigate("/profile");
          return;
        }
        setCurrentUser({ id: user.uid, name: user.displayName });
        setLoading(true);

        try {
          const res = await axios.get(
            `${API_URL}/groupmembers/check-admin/${user.uid}`
          );
          if (!res.data.isAdmin) {
            navigate("/profile");
          } else {
            const groupRes = await axios.get(
              `${API_URL}/users/${user.uid}/admin-groups`
            );
            setGroups(groupRes.data);
          }
        } catch (err) {
          console.error("管理者権限の確認に失敗:", err);
          navigate("/profile");
        } finally {
          setLoading(false);
        }
      };
      handleAuth();
    });
    return () => unsubscribe();
  }, [navigate]);

  // メンバー情報取得
  const fetchMembers = async (groupId) => {
    try {
      const res = await axios.get(`${API_URL}/groupmembers/${groupId}`);
      setMembers(res.data);
    } catch (err) {
      console.error("メンバー取得に失敗:", err);
    }
  };

  const handleSelectGroup = (group) => {
    setSelectedGroup(group);
    fetchMembers(group._id);
  };

  const handleMemberAction = async (targetUserId, action) => {
    try {
      if (action === "mute" || action === "unmute") {
        await axios.patch(
          `${API_URL}/groupmembers/${selectedGroup._id}/mute-member`,
          {
            adminUserId: currentUser.id,
            targetUserId,
            action,
          }
        );
      } else if (action === "remove") {
        // 💡 DELETE リクエストを使用してメンバーを削除
        await axios.delete(
          `${API_URL}/groupmembers/${targetUserId}` // メンバーの _id を使用
        );
      } else {
        // 💡 今後BAN機能などを追加する場合の拡張性
        console.error("無効なメンバーアクションです。");
        return;
      }

      // 成功したらメンバーリストを再取得してUIを更新
      fetchMembers(selectedGroup._id);
    } catch (err) {
      console.error("メンバーアクションに失敗:", err);
    }
  };

  const handleDeleteGroup = async (groupId) => {
    try {
      await axios.delete(`${API_URL}/groups/${groupId}`, {
        data: { userId: currentUser.id },
      });
      setGroups((prev) => prev.filter((g) => g._id !== groupId));
      setSelectedGroup(null);
      setMembers([]);
    } catch (err) {
      console.error("グループ削除に失敗:", err);
    }
  };

  // ローディング中の表示
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-xl font-bold">管理者権限を確認中...</div>
      </div>
    );
  }

  // 権限がない場合にcurrentUserがnullのままになるため、追加のチェック
  if (!currentUser) {
    return null;
  }

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <h1 className="text-xl font-bold">アドミンページ</h1>

      <div className="space-y-2">
        <h2 className="font-semibold">グループ一覧</h2>
        {groups.map((group) => (
          <div
            key={group._id}
            className="border p-2 flex justify-between items-center"
          >
            <span>{group.name}</span>
            <div className="flex gap-2">
              {currentUser.id === group.createdBy && (
                <button
                  className="px-2 py-1 bg-blue-500 text-white rounded"
                  onClick={() => handleSelectGroup(group)}
                >
                  メンバー管理
                </button>
              )}
              {group.admins?.includes(currentUser.id) && (
                <button
                  className="px-2 py-1 bg-red-500 text-white rounded"
                  onClick={() => handleDeleteGroup(group._id)}
                >
                  グループ削除
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {selectedGroup && (
        <div className="mt-4 border p-2">
          <h3 className="font-semibold">グループ: {selectedGroup.name}</h3>
          <ul className="space-y-1 mt-2">
            {members.map((m) => (
              <li key={m._id} className="flex justify-between items-center">
                <span>{m.userId.name}</span>
                <div className="flex gap-2">
                  <button
                    className="px-2 py-1 bg-red-500 text-white rounded"
                    // 💡 修正: ここで m._id ではなく m.userId._id を使用
                    onClick={() => handleMemberAction(m._id, "remove")}
                  >
                    削除
                  </button>
                  <button
                    className="px-2 py-1 bg-yellow-500 text-white rounded"
                    onClick={() =>
                      handleMemberAction(
                        m.userId._id,
                        m.isBanned ? "unban" : "ban"
                      )
                    }
                  >
                    {m.isBanned ? "BAN解除" : "BAN"}
                  </button>
                  <button
                    className="px-2 py-1 bg-gray-500 text-white rounded"
                    onClick={() =>
                      handleMemberAction(
                        m.userId._id,
                        m.isMuted ? "unmute" : "mute"
                      )
                    }
                  >
                    {m.isMuted ? "ミュート解除" : "ミュート"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
