// frontend/src/pages/GroupsPage.jsx
import { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import GroupForm from "../components/GroupForm";
import GroupList from "../components/GroupList";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function GroupsPage() {
  const [groups, setGroups] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null); // 初期値 null

  // Firebase のログイン状態を監視
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log("ログインユーザー UID:", user.uid);
        setCurrentUserId(user.uid); // UID をセット
      } else {
        console.log("未ログイン状態");
        setCurrentUserId(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // グループ一覧を取得
  useEffect(() => {
    if (!currentUserId) return; // UID が取れるまで待つ

    const fetchGroups = async () => {
      try {
        const res = await axios.get(`${API_URL}/groups`, {
          params: { userId: currentUserId },
        });
        console.log("APIから取得したグループ一覧:", res.data);
        setGroups(res.data);
      } catch (err) {
        console.error("グループ取得失敗:", err);
      }
    };
    fetchGroups();
  }, [currentUserId]);

  // グループ作成後に追加
  const handleGroupCreated = (group) => {
    setGroups((prev) => [...prev, group]);
  };

  // グループ削除
  const handleDelete = (id) => {
    setGroups((prev) => prev.filter((g) => g._id !== id));
  };

  if (!currentUserId) return <div>ログイン情報を取得中...</div>;

  // レンダー時に毎回出力
  console.log("現在のログインユーザー:", currentUserId);
  groups.forEach((g) => {
    console.log("グループ:", g.name, "createdBy:", g.createdBy);
  });

  return (
    <div className="max-w-xl mx-auto p-4 space-y-4">
      <h1 className="text-xl font-bold">グループ一覧</h1>

      {/* グループ作成フォーム */}
      <GroupForm
        onGroupCreated={handleGroupCreated}
        currentUserId={currentUserId}
      />

      {/* グループ一覧（削除機能付き） */}
      <GroupList
        groups={groups}
        onDelete={handleDelete}
        currentUserId={currentUserId}
      />
    </div>
  );
}
