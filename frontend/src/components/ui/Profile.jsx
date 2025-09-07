// frontend/src/components/Profile.jsx
import React, { useState, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import axios from "axios";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../../firebase"; // Firebase 初期化ファイル

const API_URL = import.meta.env.VITE_API_URL;

export default function Profile() {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [bio, setBio] = useState(""); // ← bio 追加
  const [iconFile, setIconFile] = useState(null);
  const [iconUrl, setIconUrl] = useState("");

  useEffect(() => {
    // 初期データ取得（MongoDBから）
    const fetchProfile = async () => {
      try {
        const res = await axios.get(`${API_URL}/users/${user.uid}`);
        setName(res.data.name || "");
        setBio(res.data.bio || ""); // ← bio 取得
        setIconUrl(res.data.iconUrl || "");
      } catch (err) {
        console.error("プロフィール取得失敗", err);
      }
    };
    if (user) fetchProfile();
  }, [user]);

  const handleUpload = async () => {
    if (!iconFile) return;
    const storageRef = ref(storage, `icons/${user.uid}/${iconFile.name}`);
    await uploadBytes(storageRef, iconFile);
    const url = await getDownloadURL(storageRef);
    setIconUrl(url);
    return url;
  };

  const handleSave = async () => {
    try {
      let uploadedUrl = iconUrl;
      if (iconFile) uploadedUrl = await handleUpload();
      await axios.patch(`${API_URL}/users/${user.uid}`, {
        name,
        bio, // ← bio 送信
        iconUrl: uploadedUrl,
      });
      alert("プロフィールを更新しました！");
    } catch (err) {
      console.error("保存に失敗", err);
      alert("保存に失敗しました");
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto bg-white rounded shadow">
      <h2 className="text-xl font-bold mb-4">プロフィール編集</h2>

      {/* 名前 */}
      <div className="mb-2">
        <label className="block mb-1">名前</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="p-2 border rounded w-full"
        />
      </div>

      {/* bio */}
      <div className="mb-2">
        <label className="block mb-1">自己紹介（bio）</label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          className="p-2 border rounded w-full"
          rows={3}
        />
      </div>

      {/* アイコン画像 */}
      <div className="mb-2">
        <label className="block mb-1">アイコン画像</label>
        <input type="file" onChange={(e) => setIconFile(e.target.files[0])} />
        {iconUrl && (
          <img
            src={iconUrl}
            alt="icon"
            className="mt-2 w-24 h-24 rounded-full"
          />
        )}
      </div>

      <button
        onClick={handleSave}
        className="px-4 py-2 bg-blue-500 text-white rounded"
      >
        保存
      </button>
    </div>
  );
}
