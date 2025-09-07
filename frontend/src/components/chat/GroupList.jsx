// src/components/GroupList.jsx
import axios from "axios";
import { Link } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function GroupList({ groups, onDelete, currentUserId }) {
  const handleDelete = async (id, createdBy) => {
    if (createdBy !== currentUserId) {
      alert("作成者のみ削除可能です");
      return;
    }
    if (!window.confirm("本当に削除しますか？")) return;

    try {
      await axios.delete(`${API_URL}/groups/${id}`, {
        data: { userId: currentUserId },
      });
      onDelete(id);
    } catch (err) {
      console.error(err);
      alert("削除に失敗しました");
    }
  };

  // 個人チャット用の名前取得関数
  const getPrivateChatName = (group) => {
    if (group.type !== "private" || !group.members) return group.name;
    const otherUser = group.members.find((id) => id !== currentUserId);
    return otherUser || "Private Chat";
  };

  return (
    <ul className="p-4 space-y-2">
      {groups.map((g) => (
        <li
          key={g._id}
          className="flex justify-between items-center bg-gray-100 p-2 rounded"
        >
          {/* チャットリンク */}
          <Link
            to={`/groups/${g._id}`}
            className="flex-1 flex items-center justify-between"
          >
            <span>
              {g.type === "private" ? "👤 " : "👥 "}
              {g.type === "private" ? getPrivateChatName(g) : g.name}
            </span>

            {/* 未読数バッジ */}
            {g.unreadCount > 0 && (
              <span className="ml-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                {g.unreadCount}
              </span>
            )}
          </Link>

          {/* 削除ボタン（作成者のみ） */}
          {g.createdBy === currentUserId && (
            <button
              onClick={() => handleDelete(g._id, g.createdBy)}
              className="text-red-500 ml-2"
            >
              削除
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
