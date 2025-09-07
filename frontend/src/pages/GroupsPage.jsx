// // frontend/src/pages/GroupsPage.jsx
// import { useEffect, useState } from "react";
// import axios from "axios";
// import GroupForm from "../components/chat/GroupForm";
// import GroupList from "../components/chat/GroupList";
// import { onAuthStateChanged } from "firebase/auth";
// import { auth } from "../firebase";

// const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// export default function GroupsPage() {
//   const [groups, setGroups] = useState([]);
//   const [currentUserId, setCurrentUserId] = useState(null);

//   // Firebase のログイン状態を監視
//   useEffect(() => {
//     const unsubscribe = onAuthStateChanged(auth, (user) => {
//       if (user) {
//         console.log("ログインユーザー UID:", user.uid);
//         setCurrentUserId(user.uid);
//       } else {
//         console.log("未ログイン状態");
//         setCurrentUserId(null);
//       }
//     });
//     return () => unsubscribe();
//   }, []);

//   // チャット一覧（グループ＋個人）を取得
//   useEffect(() => {
//     if (!currentUserId) return;

//     const fetchGroups = async () => {
//       try {
//         const res = await axios.get(`${API_URL}/groups`, {
//           params: { userId: currentUserId },
//         });
//         console.log("APIから取得したチャット一覧:", res.data);
//         setGroups(res.data);
//       } catch (err) {
//         console.error("チャット一覧取得失敗:", err);
//       }
//     };
//     fetchGroups();
//   }, [currentUserId]);

//   // 新しいグループ作成後に追加
//   const handleGroupCreated = (group) => {
//     setGroups((prev) => [...prev, group]);
//   };

//   // グループ削除後に一覧から除外
//   const handleDelete = (id) => {
//     setGroups((prev) => prev.filter((g) => g._id !== id));
//   };

//   if (!currentUserId) return <div>ログイン情報を取得中...</div>;

//   // デバッグログ
//   console.log("現在のログインユーザー:", currentUserId);
//   groups.forEach((g) => {
//     console.log(
//       "チャット:",
//       g.type,
//       g.name,
//       "createdBy:",
//       g.createdBy,
//       "未読:",
//       g.unreadCount || 0
//     );
//   });

//   return (
//     <div className="max-w-xl mx-auto p-4 space-y-4">
//       <h1 className="text-xl font-bold">チャット一覧</h1>

//       {/* グループ作成フォーム */}
//       <GroupForm
//         onGroupCreated={handleGroupCreated}
//         currentUserId={currentUserId}
//       />

//       {/* チャット一覧（グループ＋個人） */}
//       <GroupList
//         groups={groups}
//         onDelete={handleDelete}
//         currentUserId={currentUserId}
//       />
//     </div>
//   );
// }

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

  // Firebaseログイン監視
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
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

    s.emit("join", currentUserId);

    // 他ユーザーのメッセージ受信時
    s.on("message_received", ({ groupId, message }) => {
      if (message.senderId !== currentUserId) {
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

    return () => s.disconnect();
  }, [currentUserId]);

  // チャット一覧取得 (初回 or 定期補正用)
  const fetchGroups = async () => {
    if (!currentUserId) return;
    try {
      const res = await axios.get(`${API_URL}/groups`, {
        params: { userId: currentUserId },
      });
      setGroups(res.data);
    } catch (err) {
      console.error("チャット一覧取得失敗:", err);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, [currentUserId]);

  // 定期的にAPIで正確な未読件数に補正
  useEffect(() => {
    const interval = setInterval(() => {
      fetchGroups();
    }, 30000);
    return () => clearInterval(interval);
  }, [currentUserId]);

  // グループ作成後に追加
  const handleGroupCreated = (group) => {
    setGroups((prev) => [...prev, group]);
  };

  // 🔹 自分が送ったメッセージを即時に反映
  const handleMessageSent = (groupId, message) => {
    setGroups((prevGroups) =>
      prevGroups.map((group) =>
        group._id === groupId
          ? {
              ...group,
              // 最新メッセージをローカルに反映 (必要なら追加プロパティも更新)
              lastMessage: message,
            }
          : group
      )
    );

    // 送信した内容をサーバーに送信
    if (socket) {
      socket.emit("groupMessage", message);
    }
  };

  // グループ削除後に除外
  const handleDelete = (id) => {
    setGroups((prev) => prev.filter((g) => g._id !== id));
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
        onMessageSent={handleMessageSent} // 🔹 ここで渡す
      />
    </div>
  );
}
