// frontend/src/components/GroupChat.jsx
import { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../hooks/useAuth";
import io from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL;
const API_URL = import.meta.env.VITE_API_URL;

function GroupChat({ groupId }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);

  const fetchMessages = async () => {
    try {
      const res = await axios.get(`${API_URL}/messages/group/${groupId}`);
      setMessages(res.data);
    } catch (err) {
      console.error("Failed to fetch group messages:", err);
    }
  };

  const handleMarkAsRead = async (messageId, currentUserId) => {
    try {
      await axios.post(`${API_URL}/messages/${messageId}/read`, {
        userId: currentUserId,
      });
      // メッセージの状態を楽観的に更新
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg._id === messageId
            ? { ...msg, readBy: [...(msg.readBy || []), currentUserId] }
            : msg
        )
      );
    } catch (err) {
      console.error("Failed to update read status:", err);
    }
  };

  useEffect(() => {
    if (!user) return;

    const newSocket = io(SOCKET_URL, {
      query: { userId: user.uid },
    });
    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [user]);

  useEffect(() => {
    if (!socket || !groupId) return;

    socket.on("receiveGroupMessage", (message) => {
      setMessages((prevMessages) => [...prevMessages, message]);
    });

    socket.on("readStatusUpdated", (updatedMessage) => {
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg._id === updatedMessage._id ? updatedMessage : msg
        )
      );
    });

    socket.emit("joinGroup", { groupId, userId: user.uid });
    fetchMessages();

    return () => {
      socket.off("receiveGroupMessage");
      socket.off("readStatusUpdated");
    };
  }, [socket, groupId, user]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !socket) return;

    socket.emit("groupMessage", {
      groupId,
      sender: user.uid,
      text: newMessage,
    });

    setNewMessage("");
  };

  useEffect(() => {
    if (!user) return;
    messages.forEach((msg) => {
      // 💡 修正: メッセージの送信者が自分自身ではないことを確認
      if (msg.sender !== user.uid && !msg.readBy?.includes(user.uid)) {
        handleMarkAsRead(msg._id, user.uid);
      }
    });
  }, [messages, user]);

  if (!user) {
    return <div>ユーザーを認証しています...</div>;
  }

  return (
    <div className="flex flex-col h-full bg-gray-100 p-4 rounded-lg shadow-md">
      <div className="flex-1 overflow-y-auto mb-4 p-2 bg-white rounded-md">
        <h2 className="text-xl font-bold mb-4">Chat with Group: {groupId}</h2>
        <div className="space-y-2">
          {messages.map((msg) => (
            <div
              key={msg._id}
              className={`p-2 rounded-lg ${
                msg.sender === user.uid
                  ? "bg-blue-200 text-right self-end"
                  : "bg-gray-200 text-left self-start"
              }`}
            >
              <p className="text-sm">
                <strong>{msg.sender}:</strong> {msg.text}
              </p>
              <p className="text-xs text-gray-500">
                {msg.createdAt
                  ? new Date(msg.createdAt).toLocaleTimeString()
                  : ""}
              </p>
              {msg.sender === user.uid && (
                // 💡 修正: 送信者自身を除いた既読数
                <p className="text-xs text-gray-500">
                  {`既読: ${msg.readBy?.length - 1}人`}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
      <form onSubmit={handleSendMessage} className="flex space-x-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 p-2 rounded-md border border-gray-300"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
        >
          Send
        </button>
      </form>
    </div>
  );
}

export default GroupChat;
