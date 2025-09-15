// frontend/src/components/MessageInput.jsx
import React, { useState } from "react";
import axios from "axios";
import GifSearch from "./GifSearch";

const API_URL = import.meta.env.VITE_API_URL;
const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "application/pdf",
];

// isMutedを受け取り、送信や入力を制御
export default function MessageInput({
  groupId,
  socket,
  user,
  newMessage,
  setNewMessage,
  file,
  setFile,
  previewUrl,
  setPreviewUrl,
  fileInputRef,
  showModal,
  setMessages,
  isMuted,
}) {
  const [gifQuery, setGifQuery] = useState("");
  const [gifResults, setGifResults] = useState([]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    // ファイル形式チェック
    if (!ALLOWED_TYPES.includes(selectedFile.type)) {
      showModal("⚠️ この種類のファイルは送信できません");
      e.target.value = "";
      setFile(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      return;
    }

    // ファイルサイズチェック
    if (selectedFile.size > MAX_SIZE) {
      showModal("⚠️ ファイルサイズは5MBまでです");
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);

    setFile(selectedFile);
    if (selectedFile.type.startsWith("image/")) {
      setPreviewUrl(URL.createObjectURL(selectedFile));
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();

    // ミュート中は送信不可
    if (isMuted) {
      showModal("あなたはミュートされているため、メッセージを送信できません。");
      return;
    }

    if (!newMessage.trim() && !file) return;

    if (!navigator.onLine) {
      showModal("⚠️ オフラインです。ネットワークを確認してください。");
      return;
    }

    // 楽観的メッセージ表示
    const tempMessage = {
      _id: "temp-" + Date.now(),
      group: groupId,
      sender: user.uid,
      text: newMessage,
      file: previewUrl || null,
      createdAt: new Date().toISOString(),
      pending: true,
    };
    if (typeof setMessages === "function") {
      setMessages((prev) => [...prev, tempMessage]);
    }

    try {
      const formData = new FormData();
      formData.append("group", groupId);
      formData.append("sender", user.uid);
      if (file) formData.append("file", file);
      if (newMessage.trim() !== "") formData.append("text", newMessage);

      const res = await axios.post(`${API_URL}/messages`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 10000,
      });

      socket.emit("groupMessage", res.data);

      // 仮メッセージを本物に置き換え
      if (typeof setMessages === "function") {
        setMessages((prev) =>
          prev.map((msg) => (msg._id === tempMessage._id ? res.data : msg))
        );
      }

      setNewMessage("");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
    } catch (err) {
      console.error("メッセージ送信に失敗:", err);
      showModal("⚠️ メッセージ送信に失敗しました");

      if (typeof setMessages === "function") {
        setMessages((prev) =>
          prev.filter((msg) => msg._id !== tempMessage._id)
        );
      }
    }
  };

  return (
    <form onSubmit={handleSendMessage} className="flex flex-col space-y-2">
      <div className="flex flex-col sm:flex-row sm:space-x-2">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="p-2 border border-gray-300 rounded-md w-full sm:w-1/4 mb-2 sm:mb-0"
          disabled={isMuted}
        />
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder={
            isMuted ? "あなたはミュートされています" : "メッセージを入力..."
          }
          className="flex-1 p-2 border border-gray-300 rounded-md"
          disabled={isMuted}
        />
        <button
          type="submit"
          className={`px-4 py-2 text-white font-bold rounded-md transition-colors mt-2 sm:mt-0 ${
            isMuted
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-500 hover:bg-blue-600"
          }`}
          disabled={isMuted}
        >
          送信
        </button>
      </div>

      {file && (
        <div className="text-sm text-gray-700">
          選択中のファイル: {file.name} ({(file.size / 1024).toFixed(1)} KB)
          {file.type.startsWith("image/") && previewUrl && (
            <img
              src={previewUrl}
              alt="preview"
              className="mt-2 max-h-32 rounded"
            />
          )}
        </div>
      )}

      <GifSearch
        gifQuery={gifQuery}
        setGifQuery={setGifQuery}
        gifResults={gifResults}
        setGifResults={setGifResults}
        socket={socket}
        user={user}
        groupId={groupId}
        showModal={showModal}
      />
    </form>
  );
}
