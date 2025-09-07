// frontend/src/components/GroupForm.jsx
import { useState, useEffect } from "react";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function GroupForm({ onGroupCreated, currentUserId }) {
  const [name, setName] = useState("");
  const [input, setInput] = useState(""); // 入力中の文字列
  const [members, setMembers] = useState([]); // UIDの配列
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    if (!input) return setSuggestions([]);

    const fetchUsers = async () => {
      try {
        const res = await axios.get(
          `${API_URL}/groups/search-users?q=${input}`
        );
        const filtered = res.data.filter((u) => u.uid !== currentUserId);
        setSuggestions(filtered);
      } catch (err) {
        console.error("ユーザー検索失敗:", err);
      }
    };

    fetchUsers();
  }, [input]);

  const handleAddMember = (user) => {
    if (!members.includes(user.uid)) {
      setMembers([...members, user.uid]);
    }
    setInput("");
    setSuggestions([]);
  };

  const handleRemoveMember = (uid) => {
    setMembers(members.filter((m) => m !== uid));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name && members.length === 2) {
      try {
        const res = await axios.post(`${API_URL}/groups`, {
          members,
          createdBy: currentUserId,
          type: "private",
        });
        onGroupCreated(res.data);
      } catch (err) {
        console.error("個人チャット作成失敗:", err);
        alert("チャット作成に失敗しました");
      }
      setMembers([]);
      return;
    }

    if (!name) {
      alert("グループ名を入力してください");
      return;
    }

    try {
      const res = await axios.post(`${API_URL}/groups`, {
        name,
        members,
        createdBy: currentUserId,
        type: "group",
      });
      onGroupCreated(res.data);
      setName("");
      setMembers([]);
      setInput("");
    } catch (err) {
      console.error("グループ作成失敗:", err);
      alert("グループ作成に失敗しました");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2 relative">
      <input
        type="text"
        placeholder="グループ名（任意: 個人チャットは空欄）"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="border p-2 w-full"
      />

      <div className="relative">
        <input
          type="text"
          placeholder="メンバーを検索して追加"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="border p-2 w-full"
        />

        {suggestions.length > 0 && (
          <ul className="absolute z-10 bg-white border w-full max-h-40 overflow-y-auto">
            {suggestions.map((user) => {
              console.log("Suggestion user:", user);
              console.log("key for suggestion:", user._id);
              return (
                <li
                  key={user._id}
                  className="p-2 hover:bg-gray-100 cursor-pointer"
                  onClick={() => handleAddMember(user)}
                >
                  {user.name}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {members.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {members.map((uid) => {
            console.log("Member UID:", uid);
            return (
              <div
                key={uid}
                className="bg-blue-200 px-2 py-1 rounded flex items-center gap-1"
              >
                {uid}
                <button
                  type="button"
                  onClick={() => handleRemoveMember(uid)}
                  className="text-red-500"
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      )}

      <button type="submit" className="bg-blue-500 text-white p-2">
        作成
      </button>
    </form>
  );
}
