// frontend/src/pages/GroupsPage.jsx
import { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import GroupForm from "../components/GroupForm";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function GroupsPage() {
  const [groups, setGroups] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null); // 初期値 null

  useEffect(() => {
    // Firebase のログイン状態を監視
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUserId(user.uid); // UID をセット
      } else {
        setCurrentUserId(null);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!currentUserId) return; // UID が取れるまで待つ

    const fetchGroups = async () => {
      try {
        const res = await axios.get(`${API_URL}/groups`, {
          params: { userId: currentUserId },
        });
        setGroups(res.data);
      } catch (err) {
        console.error("グループ取得失敗:", err);
      }
    };
    fetchGroups();
  }, [currentUserId]); // UID が決まったら fetch

  const handleGroupCreated = (group) => {
    setGroups((prev) => [...prev, group]);
  };

  if (!currentUserId) return <div>ログイン情報を取得中...</div>;

  return (
    <div className="max-w-xl mx-auto p-4 space-y-4">
      <h1 className="text-xl font-bold">グループ一覧</h1>

      {/* currentUserId を渡す */}
      <GroupForm
        onGroupCreated={handleGroupCreated}
        currentUserId={currentUserId}
      />

      {/* グループ一覧 */}
      <ul className="space-y-2">
        {groups.map((group) => (
          <li key={group._id}>
            <Link
              to={`/groups/${group._id}`}
              className="block p-2 border rounded hover:bg-gray-100"
            >
              {group.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
