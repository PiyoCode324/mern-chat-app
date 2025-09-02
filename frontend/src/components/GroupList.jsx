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

  return (
    <ul className="p-4 space-y-2">
      {groups.map((g) => (
        <li
          key={g._id}
          className="flex justify-between items-center bg-gray-100 p-2 rounded"
        >
          {/* グループ名にリンクをつける */}
          <Link
            to={`/groups/${g._id}`}
            className="text-blue-600 hover:underline flex-1"
          >
            {g.name}
          </Link>

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
