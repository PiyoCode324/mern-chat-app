import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../../hooks/useAuth";
import { io } from "socket.io-client";
import axios from "axios";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import Modal from "../ui/Modal";
import { v4 as uuidv4 } from "uuid";

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
  const [members, setMembers] = useState([]);
  const [isBanned, setIsBanned] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // ページネーション用
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const fileInputRef = useRef(null);

  const showModal = (msg) => {
    setModalMessage(msg);
    setIsModalOpen(true);
  };

  // Socket.io 初期化
  useEffect(() => {
    if (!user) return;
    const newSocket = io(SOCKET_URL, { query: { userId: user.uid } });
    setSocket(newSocket);
    return () => newSocket.disconnect();
  }, [user]);

  // メンバー取得 & Socket登録 & メッセージ取得
  useEffect(() => {
    if (!user || !groupId || !socket) return;

    const fetchMembersAndSetup = async () => {
      try {
        const { data } = await axios.get(`${API_URL}/groupmembers/${groupId}`);
        setMembers(data);

        const me = data.find((m) => m.userId._id === user.uid);
        if (me?.isBanned) {
          showModal("あなたはBANされています。チャットに参加できません。");
          setIsBanned(true);
        } else {
          setIsBanned(false);
          setIsMuted(me?.isMuted || false);
          socket.emit("joinGroup", { groupId, userId: user.uid });
        }

        // BANイベント
        socket.on("member_banned", ({ userId, action }) => {
          if (userId === user.uid) {
            const isCurrentlyBanned = action === "ban";
            setIsBanned(isCurrentlyBanned);
            showModal(
              isCurrentlyBanned
                ? "あなたはグループからBANされました。"
                : "あなたはグループのBANを解除されました。"
            );
          }
        });

        // ミュートイベント
        socket.on("member_muted", ({ userId, action }) => {
          if (userId === user.uid) {
            const isCurrentlyMuted = action === "mute";
            setIsMuted(isCurrentlyMuted);
            showModal(
              isCurrentlyMuted
                ? "あなたはミュートされました。メッセージを送信できません。"
                : "あなたはミュートを解除されました。"
            );
          }
        });

        // メッセージ受信
        socket.on("message_received", ({ groupId: gId, message }) => {
          if (gId !== groupId) return;
          const normalizedMsg = {
            ...message,
            sender:
              typeof message.sender === "string"
                ? message.sender
                : message.sender?._id || "unknown",
          };
          setMessages((prev) => [...prev, normalizedMsg]);
        });

        // 既読更新
        socket.on("readStatusUpdated", (updatedMsg) => {
          const normalizedMsg = {
            ...updatedMsg,
            sender:
              typeof updatedMsg.sender === "string"
                ? updatedMsg.sender
                : updatedMsg.sender?._id || "unknown",
          };
          setMessages((prev) =>
            prev.map((msg) =>
              msg._id === normalizedMsg._id ? normalizedMsg : msg
            )
          );
        });

        fetchMessages();
      } catch (err) {
        console.error("メンバー取得に失敗:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchMembersAndSetup();

    return () => {
      socket.off("message_received");
      socket.off("readStatusUpdated");
      socket.off("member_banned");
      socket.off("member_muted");
    };
  }, [user, groupId, socket]);

  // 初期メッセージ取得
  const fetchMessages = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { data } = await axios.get(`${API_URL}/messages/group/${groupId}`, {
        params: { userId: user.uid, page: 1, limit: 20 },
      });
      const normalized = data.map((msg) => ({
        ...msg,
        sender:
          typeof msg.sender === "string"
            ? msg.sender
            : msg.sender?._id || "unknown",
      }));
      setMessages(normalized); // ← reverseは不要
      setHasMore(normalized.length === 20);
      setPage(2);
    } catch (err) {
      console.error("メッセージ取得に失敗:", err);
      showModal("メッセージの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [groupId, user]);

  // 古いメッセージを読み込む
  const loadMoreMessages = useCallback(async () => {
    if (!user || !hasMore || loadingMore) return;
    try {
      setLoadingMore(true);
      const { data } = await axios.get(`${API_URL}/messages/group/${groupId}`, {
        params: { userId: user.uid, page, limit: 20 },
      });
      const normalized = data.map((msg) => ({
        ...msg,
        sender:
          typeof msg.sender === "string"
            ? msg.sender
            : msg.sender?._id || "unknown",
      }));
      if (normalized.length > 0) {
        setMessages((prev) => [...normalized, ...prev]); // ← reverseは不要
        setPage((prev) => prev + 1);
        setHasMore(normalized.length === 20);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error("古いメッセージの読み込みに失敗:", err);
    } finally {
      setLoadingMore(false);
    }
  }, [user, groupId, page, hasMore, loadingMore]);

  // 既読処理
  const handleMarkAsRead = useCallback(
    async (messageId) => {
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
    },
    [user]
  );

  useEffect(() => {
    if (!user || isBanned) return;
    messages.forEach((msg) => {
      if (msg.sender !== user.uid && !msg.readBy?.includes(user.uid)) {
        handleMarkAsRead(msg._id);
      }
    });
  }, [messages, user, handleMarkAsRead, isBanned]);

  // 新規メッセージが来たときにスクロール制御
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const isAtBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight <
      50;

    if (isAtBottom && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // メッセージ送信
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

      const { data } = await axios.post(
        `${API_URL}/messages/group/${groupId}`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      const normalizedRes = {
        ...data,
        sender:
          typeof data.sender === "string"
            ? data.sender
            : data.sender?._id || "unknown",
      };

      setMessages((prev) =>
        prev.map((msg) => (msg._tempId === tempId ? normalizedRes : msg))
      );

      socket?.emit("send_message", { groupId, message: normalizedRes });
    } catch (err) {
      console.error("メッセージ送信失敗:", err);
      showModal("メッセージの送信に失敗しました");
      setMessages((prev) => prev.filter((msg) => msg._tempId !== tempId));
    }
  };

  if (!user) return <div>ユーザーを認証しています...</div>;
  if (loading)
    return <div className="text-center p-4">メッセージを取得中...</div>;

  if (isBanned) {
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
        <div className="flex-1 flex items-center justify-center text-gray-500 text-lg text-center">
          あなたはBANされているため、
          <br />
          チャットに参加できません。
        </div>
      </div>
    );
  }

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
        onLoadMore={loadMoreMessages}
        hasMore={hasMore}
        loadingMore={loadingMore}
        messagesEndRef={messagesEndRef}
        scrollContainerRef={scrollContainerRef}
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
        isMuted={isMuted}
      />
    </div>
  );
}
