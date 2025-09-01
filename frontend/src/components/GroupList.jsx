// src/components/GroupList.jsx
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function GroupList({ groups, onDelete, currentUserId }) {
  const handleDelete = async (id, createdBy) => {
    if (createdBy !== currentUserId) {
      alert("作成者のみ削除可能です");
      return;
    }
    if (!window.confirm("本当に削除しますか？")) return;

    try {
      await axios.delete(`${API_URL}/api/groups/${id}`, {
        data: { userId: currentUserId },
      });
      onDelete(id);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <ul className="p-4 space-y-2">
      {groups.map((g) => (
        <li key={g._id} className="flex justify-between items-center bg-gray-100 p-2 rounded">
          <span>{g.name}</span>
          {g.createdBy === currentUserId && (
            <button
              onClick={() => handleDelete(g._id, g.createdBy)}
              className="text-red-500"
            >
              削除
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
