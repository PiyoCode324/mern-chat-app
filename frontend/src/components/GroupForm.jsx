// frontend/src/components/GroupForm.jsx
import { useState } from "react";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function GroupForm({ onGroupCreated, currentUserId }) {
  const [name, setName] = useState("");
  const [members, setMembers] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    // カンマ区切りで配列に変換し、空白をトリム
    const membersArray = members
      .split(",")
      .map((m) => m.trim())
      .filter((m) => m.length > 0);

    try {
      const res = await axios.post(`${API_URL}/groups`, {
        name,
        members: membersArray,
        createdBy: currentUserId, // ←ここでログイン中ユーザー UID を送る
      });

      // 作成後に親コンポーネントに通知
      onGroupCreated(res.data);

      // フォームをリセット
      setName("");
      setMembers("");
    } catch (err) {
      console.error("グループ作成失敗:", err);
      alert("グループ作成に失敗しました");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <input
        type="text"
        placeholder="グループ名"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="border p-2 w-full"
        required
      />
      <input
        type="text"
        placeholder="メンバーIDをカンマ区切りで入力"
        value={members}
        onChange={(e) => setMembers(e.target.value)}
        className="border p-2 w-full"
      />
      <button type="submit" className="bg-blue-500 text-white p-2">
        グループ作成
      </button>
    </form>
  );
}
