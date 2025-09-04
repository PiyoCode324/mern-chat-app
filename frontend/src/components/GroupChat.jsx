// frontend/src/components/GroupChat.jsx
import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useAuth } from "../hooks/useAuth";
import { io } from "socket.io-client";
import { searchGifs } from "../api/giphy";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL;
const API_URL = import.meta.env.VITE_API_URL;

export default function GroupChat({ groupId }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [file, setFile] = useState(null);
  const [socket, setSocket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [gifQuery, setGifQuery] = useState("");
  const [gifResults, setGifResults] = useState([]);
  const [searchText, setSearchText] = useState("");

  const messagesEndRef = useRef(null);

  // メッセージ取得
  const fetchMessages = async () => {
    try {
      const res = await axios.get(`${API_URL}/messages/group/${groupId}`);
      setMessages(res.data);
    } catch (err) {
      console.error("メッセージ取得に失敗:", err);
    } finally {
      setLoading(false);
    }
  };

  // 既読処理
  const handleMarkAsRead = async (messageId) => {
    if (!user) return;
    try {
      await axios.post(`${API_URL}/messages/${messageId}/read`, {
        userId: user.uid,
      });
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === messageId
            ? { ...msg, readBy: [...(msg.readBy || []), user.uid] }
            : msg
        )
      );
    } catch (err) {
      console.error("既読更新に失敗:", err);
    }
  };

  // Socket.io 初期化
  useEffect(() => {
    if (!user) return;
    const newSocket = io(SOCKET_URL, { query: { userId: user.uid } });
    setSocket(newSocket);
    return () => newSocket.disconnect();
  }, [user]);

  // Socket.io イベント
  useEffect(() => {
    if (!socket || !user || !groupId) return;
    socket.emit("joinGroup", { groupId, userId: user.uid });

    socket.on("receiveGroupMessage", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on("readStatusUpdated", (updatedMsg) => {
      setMessages((prev) =>
        prev.map((msg) => (msg._id === updatedMsg._id ? updatedMsg : msg))
      );
    });

    fetchMessages();

    return () => {
      socket.off("receiveGroupMessage");
      socket.off("readStatusUpdated");
    };
  }, [socket, user, groupId]);

  // 最新メッセージまで自動スクロール
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // メッセージ送信
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() && !file) return;

    try {
      const formData = new FormData();
      formData.append("group", groupId);
      formData.append("sender", user.uid);
      if (file) formData.append("file", file);
      if (newMessage.trim() !== "") formData.append("text", newMessage);

      const res = await axios.post(`${API_URL}/messages`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      socket.emit("groupMessage", res.data);

      setNewMessage("");
      setFile(null);
    } catch (err) {
      console.error("メッセージ送信に失敗:", err);
    }
  };

  // GIF検索
  const handleSearchGif = async () => {
    if (!gifQuery.trim()) return;
    const results = await searchGifs(gifQuery);
    setGifResults(results);
  };

  // GIF送信
  const handleSendGif = async (url) => {
    if (!socket || !user) return;
    try {
      const res = await axios.post(`${API_URL}/messages/gif`, {
        group: groupId,
        sender: user.uid,
        fileUrl: url,
        gifQuery: gifQuery,
      });
      socket.emit("groupMessage", res.data);
      setGifResults([]);
    } catch (err) {
      console.error("GIF送信に失敗:", err);
    }
  };

  const handleSearchMessages = async () => {
    if (!searchText.trim()) return;

    try {
      const res = await axios.get(`${API_URL}/messages/search`, {
        params: { groupId, query: searchText },
      });
      setMessages(res.data);
    } catch (err) {
      console.error("検索に失敗:", err);
    }
  };

  // 受信メッセージの既読更新
  useEffect(() => {
    if (!user) return;
    messages.forEach((msg) => {
      if (msg.sender !== user.uid && !msg.readBy?.includes(user.uid)) {
        handleMarkAsRead(msg._id);
      }
    });
  }, [messages, user]);

  if (!user) return <div>ユーザーを認証しています...</div>;
  if (loading)
    return <div className="text-center p-4">メッセージを取得中...</div>;

  return (
    <div className="flex flex-col h-screen p-2 sm:p-4 bg-gray-100 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-2 sm:mb-4 text-center">
        グループチャット
      </h2>

      {/* メッセージ検索 */}
      <div className="my-2 flex flex-col sm:flex-row sm:items-center gap-2">
        <input
          type="text"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="メッセージを検索..."
          className="p-2 border rounded-md flex-1 w-full"
        />
        <button
          type="button"
          onClick={handleSearchMessages}
          className="px-3 py-2 bg-green-500 text-white rounded-md w-full sm:w-auto"
        >
          検索
        </button>
      </div>

      {/* メッセージ一覧（レスポンシブで高さ調整） */}
      <div
        className="flex-1 overflow-y-auto mb-2 p-2 bg-white rounded-md"
        style={{ maxHeight: "calc(100vh - 240px)" }}
      >
        {messages.length > 0 ? (
          messages.map((msg) => (
            <div
              key={msg._id}
              className={`p-2 rounded-lg max-w-xs mb-2 ${
                msg.sender === user.uid
                  ? "bg-blue-200 ml-auto"
                  : "bg-gray-200 mr-auto"
              }`}
            >
              <p className="font-bold">{msg.sender.slice(0, 8)}...</p>
              {msg.text && <p>{msg.text}</p>}
              {msg.fileUrl && (
                <img
                  src={msg.fileUrl}
                  alt="添付ファイル"
                  className="mt-2 rounded-lg max-w-full"
                />
              )}
              <div className="text-xs text-right text-gray-500 mt-1">
                {msg.createdAt
                  ? new Date(msg.createdAt).toLocaleTimeString()
                  : ""}
              </div>
              {msg.sender === user.uid && (
                <p className="text-xs text-gray-500">
                  {`既読: ${
                    msg.readBy?.filter((id) => id !== user.uid).length || 0
                  }人`}
                </p>
              )}
            </div>
          ))
        ) : (
          <p className="text-center text-gray-500">
            まだメッセージがありません。
          </p>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* メッセージ入力フォーム */}
      <form onSubmit={handleSendMessage} className="flex flex-col space-y-2">
        <div className="flex flex-col sm:flex-row sm:space-x-2">
          <input
            type="file"
            onChange={(e) => setFile(e.target.files[0])}
            className="p-2 border border-gray-300 rounded-md w-full sm:w-1/4 mb-2 sm:mb-0"
          />
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="メッセージを入力..."
            className="flex-1 p-2 border border-gray-300 rounded-md"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white font-bold rounded-md hover:bg-blue-600 transition-colors mt-2 sm:mt-0"
          >
            送信
          </button>
        </div>

        {file && (
          <div className="text-sm text-gray-700">
            選択中のファイル: {file.name} ({(file.size / 1024).toFixed(1)} KB)
            {file.type.startsWith("image/") && (
              <img
                src={URL.createObjectURL(file)}
                alt="preview"
                className="mt-2 max-h-32 rounded"
              />
            )}
          </div>
        )}

        {/* GIF検索 */}
        <div className="my-2">
          <input
            type="text"
            value={gifQuery}
            onChange={(e) => setGifQuery(e.target.value)}
            placeholder="Search GIFs..."
            className="p-2 border rounded-md w-2/3"
          />
          <button
            type="button"
            onClick={handleSearchGif}
            className="px-3 py-2 bg-blue-500 text-white rounded-md ml-2"
          >
            Search
          </button>

          <div className="flex flex-wrap gap-2 mt-2">
            {gifResults.map((url, index) => (
              <img
                key={index}
                src={url}
                alt="GIF"
                className="w-24 h-24 object-cover cursor-pointer"
                onClick={() => handleSendGif(url)}
              />
            ))}
          </div>
        </div>
      </form>
    </div>
  );
}
