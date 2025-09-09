// frontend/src/pages/GroupsPage.jsx
import { useEffect, useState } from "react";
import axios from "axios";
import GroupForm from "../components/chat/GroupForm";
import GroupList from "../components/chat/GroupList";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";
import io from "socket.io-client";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function GroupsPage() {
  const [groups, setGroups] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [socket, setSocket] = useState(null);
  const [activeGroupId, setActiveGroupId] = useState(null);

  // Firebase認証リスナー
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log("🔑 Firebase user:", user);
      if (user) setCurrentUserId(user.uid);
      else setCurrentUserId(null);
    });
    return () => unsubscribe();
  }, []);

  // Socket.IO接続
  useEffect(() => {
    if (!currentUserId) return;

    const s = io(API_URL);
    setSocket(s);
    console.log("🔌 Socket.IO connecting...");

    s.emit("joinGroup", { userId: currentUserId });

    // メッセージ受信
    s.on("message_received", ({ groupId, message, selfOnly }) => {
      console.log("📩 message_received:", { groupId, message, selfOnly });
      if (!selfOnly && message.senderId !== currentUserId) {
        setGroups((prevGroups) =>
          prevGroups.map((group) =>
            group._id === groupId
              ? { ...group, unreadCount: (group.unreadCount || 0) + 1 }
              : group
          )
        );
      }
    });

    // 既読更新
    s.on("readStatusUpdated", (updatedMessage) => {
      console.log("✅ readStatusUpdated:", updatedMessage);
      setGroups((prevGroups) =>
        prevGroups.map((group) => {
          if (group._id === updatedMessage.group) {
            const newCount = (group.unreadCount || 0) - 1;
            return { ...group, unreadCount: newCount > 0 ? newCount : 0 };
          }
          return group;
        })
      );
    });

    // 削除通知
    s.on("removed_from_group", (groupId) => {
      console.log("⚠️ removed_from_group received:", groupId);
      setGroups((prevGroups) => {
        console.log(
          "🟢 before filter:",
          prevGroups.map((g) => g._id)
        );
        const filtered = prevGroups.filter((g) => g._id !== groupId);
        console.log(
          "🟢 after filter:",
          filtered.map((g) => g._id)
        );
        return filtered;
      });
      if (activeGroupId === groupId) {
        console.log("❌ Closing active chat:", groupId);
        setActiveGroupId(null);
      }
    });

    return () => {
      console.log("🔌 Socket.IO disconnecting...");
      s.disconnect();
    };
  }, [currentUserId, activeGroupId]);

  // グループ一覧取得
  const fetchGroups = async () => {
    if (!currentUserId) return;
    try {
      const res = await axios.get(
        `${API_URL}/groupmembers/user/${currentUserId}`
      );
      console.log(
        "🔄 fetchGroups result:",
        res.data.map((m) => m.groupId)
      );
      const userGroups = res.data.map((member) => member.groupId);
      setGroups(userGroups);
    } catch (err) {
      console.error("チャット一覧取得失敗:", err);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, [currentUserId]);

  useEffect(() => {
    if (!currentUserId) return;
    const interval = setInterval(fetchGroups, 30000);
    return () => clearInterval(interval);
  }, [currentUserId]);

  const handleGroupCreated = (group) => {
    setGroups((prev) => [...prev, group]);
  };

  const handleMessageSent = (groupId, message) => {
    setGroups((prevGroups) =>
      prevGroups.map((group) =>
        group._id === groupId ? { ...group, lastMessage: message } : group
      )
    );
    if (socket) socket.emit("groupMessage", message);
  };

  const handleDelete = (id) => {
    console.log("🗑 handleDelete called:", id);
    setGroups((prev) => prev.filter((g) => g._id !== id));
    if (activeGroupId === id) setActiveGroupId(null);
  };

  const handleOpenChat = (groupId) => {
    setActiveGroupId(groupId);
  };

  if (!currentUserId) return <div>ログイン情報を取得中...</div>;

  return (
    <div className="max-w-xl mx-auto p-4 space-y-4">
      <h1 className="text-xl font-bold">チャット一覧</h1>
      <GroupForm
        onGroupCreated={handleGroupCreated}
        currentUserId={currentUserId}
      />
      <GroupList
        groups={groups}
        onDelete={handleDelete}
        currentUserId={currentUserId}
        onMessageSent={handleMessageSent}
        activeGroupId={activeGroupId}
        onOpenChat={handleOpenChat}
      />
    </div>
  );
}
