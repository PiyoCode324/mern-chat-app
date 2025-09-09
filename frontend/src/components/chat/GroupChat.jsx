// frontend/src/components/GroupChat.jsx
import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../../hooks/useAuth";
import { io } from "socket.io-client";
import axios from "axios";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import Modal from "../ui/Modal";
import { v4 as uuidv4 } from "uuid"; // 仮ID生成用

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL;
const API_URL = import.meta.env.VITE_API_URL;

export default function GroupChat({ groupId }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [socket, setSocket] = useState(null);
  const [loading, setLoading] = useState(true);

  const [modalMessage, setModalMessage] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const showModal = (msg) => {
    setModalMessage(msg);
    setIsModalOpen(true);
  };

  // メッセージ取得（sender を文字列に統一）
  const fetchMessages = async () => {
    try {
      // 💡 修正: user.uidをクエリパラメータとして追加
      const res = await axios.get(`${API_URL}/messages/group/${groupId}`, {
        params: { userId: user.uid },
      });
      const normalized = res.data.map((msg) => ({
        ...msg,
        sender:
          typeof msg.sender === "string"
            ? msg.sender
            : msg.sender?._id || "unknown",
      }));
      setMessages(normalized);
    } catch (err) {
      console.error("メッセージ取得に失敗:", err);
      showModal("メッセージの取得に失敗しました");
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

  // Socket.io イベント & メッセージ取得
  useEffect(() => {
    if (!socket || !user || !groupId) return;

    socket.emit("joinGroup", { groupId, userId: user.uid });

    // 🔹 メッセージ受信
    socket.on("message_received", ({ groupId: gId, message, selfOnly }) => {
      const normalizedMsg = {
        ...message,
        sender:
          typeof message.sender === "string"
            ? message.sender
            : message.sender?._id || "unknown",
      };

      if (gId !== groupId) return;

      setMessages((prev) => {
        const isMessageExists = prev.some((m) => m._id === normalizedMsg._id);
        if (isMessageExists) return prev;

        // ✅ 送信者本人は常に表示
        if (normalizedMsg.sender === user.uid) {
          return [...prev, normalizedMsg];
        }

        // 🔇 ミュート中の他人のメッセージは追加しない
        if (!selfOnly && normalizedMsg.sender !== user.uid) {
          return [...prev, normalizedMsg];
        }
        prev;
      });
    });

    // 🔹 既読ステータス更新
    socket.on("readStatusUpdated", (updatedMsg) => {
      const normalizedMsg = {
        ...updatedMsg,
        sender:
          typeof updatedMsg.sender === "string"
            ? updatedMsg.sender
            : updatedMsg.sender?._id || "unknown",
      };
      setMessages((prev) =>
        prev.map((msg) => (msg._id === normalizedMsg._id ? normalizedMsg : msg))
      );
    });

    fetchMessages();

    return () => {
      socket.off("message_received");
      socket.off("readStatusUpdated");
    };
  }, [socket, user, groupId]);

  // メッセージ既読チェック
  useEffect(() => {
    if (!user) return;
    messages.forEach((msg) => {
      if (msg.sender !== user.uid && !msg.readBy?.includes(user.uid)) {
        handleMarkAsRead(msg._id);
      }
    });
  }, [messages, user]);

  // メッセージ送信（仮メッセージ対応）
  const handleSendMessage = async (text, fileData) => {
    if (!user || (!text && !fileData)) return;

    const tempId = uuidv4();
    const tempMessage = {
      _tempId: tempId,
      sender: user.uid,
      text,
      fileUrl: fileData ? URL.createObjectURL(fileData) : null,
      createdAt: new Date().toISOString(),
      readBy: [],
    };

    setMessages((prev) => [...prev, tempMessage]);

    try {
      const formData = new FormData();
      formData.append("text", text);
      if (fileData) formData.append("file", fileData);
      const res = await axios.post(
        `${API_URL}/messages/group/${groupId}`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      const normalizedRes = {
        ...res.data,
        sender:
          typeof res.data.sender === "string"
            ? res.data.sender
            : res.data.sender?._id || "unknown",
      };

      setMessages((prev) =>
        prev.map((msg) => (msg._tempId === tempId ? normalizedRes : msg))
      );

      socket.emit("send_message", { groupId, message: normalizedRes });
    } catch (err) {
      console.error("メッセージ送信失敗:", err);
      showModal("メッセージの送信に失敗しました");
      setMessages((prev) => prev.filter((msg) => msg._tempId !== tempId));
    }
  };

  if (!user) return <div>ユーザーを認証しています...</div>;
  if (loading)
    return <div className="text-center p-4">メッセージを取得中...</div>;

  return (
    <div className="flex flex-col h-screen p-2 sm:p-4 bg-gray-100 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-2 sm:mb-4 text-center">
        グループチャット
      </h2>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        message={modalMessage}
      />

      <MessageList
        messages={messages}
        currentUserId={user.uid}
        messagesEndRef={messagesEndRef}
      />

      <MessageInput
        groupId={groupId}
        socket={socket}
        user={user}
        newMessage={newMessage}
        setNewMessage={setNewMessage}
        file={file}
        setFile={setFile}
        previewUrl={previewUrl}
        setPreviewUrl={setPreviewUrl}
        fileInputRef={fileInputRef}
        showModal={showModal}
        setMessages={setMessages}
        onSendMessage={handleSendMessage}
      />
    </div>
  );
}
