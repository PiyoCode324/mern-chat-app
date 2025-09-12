// frontend/src/pages/AdminPage.jsx

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";
import { io } from "socket.io-client";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

export default function AdminPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);

  const navigate = useNavigate();

  // 🔹 Firebase認証 & 管理者確認
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
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

  // 🔹 Socket.IO 初期化
  useEffect(() => {
    if (!currentUser) return;
    const newSocket = io(SOCKET_URL, { query: { userId: currentUser.id } });
    setSocket(newSocket);
    return () => newSocket.disconnect();
  }, [currentUser]);

  // 🔹 Socket.IO イベント監視
  useEffect(() => {
    if (!socket || !selectedGroup) return;

    // BAN/UNBAN 即時更新
    socket.on("member_banned", ({ userId: bannedUserId, groupId, action }) => {
      if (selectedGroup._id !== groupId) return;
      setMembers((prev) =>
        prev.map((m) =>
          m.userId._id === bannedUserId
            ? { ...m, isBanned: action === "ban" }
            : m
        )
      );
    });

    // 削除された場合の即時反映
    socket.on("removed_from_group", ({ userId, groupId }) => {
      if (selectedGroup._id !== groupId) return;
      setMembers((prev) => prev.filter((m) => m.userId._id !== userId));
    });

    return () => {
      socket.off("member_banned");
      socket.off("removed_from_group");
    };
  }, [socket, selectedGroup]);

  // 🔹 メンバー取得
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

  // 🔹 メンバー操作
  const handleMemberAction = async (targetUserId, action) => {
    try {
      if (action === "mute" || action === "unmute") {
        await axios.patch(
          `${API_URL}/groupmembers/${selectedGroup._id}/mute-member`,
          { adminUserId: currentUser.id, targetUserId, action }
        );
        setMembers((prev) =>
          prev.map((m) =>
            m.userId._id === targetUserId
              ? { ...m, isMuted: action === "mute" }
              : m
          )
        );
      } else if (action === "ban" || action === "unban") {
        const { data } = await axios.patch(
          `${API_URL}/groupmembers/${selectedGroup._id}/ban-member`,
          { adminUserId: currentUser.id, targetUserId, action }
        );
        // 即時反映: members 状態を更新
        setMembers((prev) =>
          prev.map((m) =>
            m.userId._id === targetUserId
              ? { ...m, isBanned: data.member.isBanned }
              : m
          )
        );
      } else if (action === "remove") {
        await axios.delete(`${API_URL}/groupmembers/${targetUserId}`);
        setMembers((prev) => prev.filter((m) => m.userId._id !== targetUserId));
      } else {
        console.error("無効なメンバーアクションです。");
        return;
      }
    } catch (err) {
      console.error("メンバーアクションに失敗:", err);
    }
  };

  // 🔹 グループ削除
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-xl font-bold">管理者権限を確認中...</div>
      </div>
    );
  }

  if (!currentUser) return null;

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
