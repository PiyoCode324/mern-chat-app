// frontend/src/components/GroupChat.jsx
import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../hooks/useAuth";
import { io } from "socket.io-client";
import axios from "axios";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import Modal from "./Modal";

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

  // メッセージ取得
  const fetchMessages = async () => {
    try {
      const res = await axios.get(`${API_URL}/messages/group/${groupId}`);
      setMessages(res.data);
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
      />
    </div>
  );
}
