// src/components/GroupChat.jsx
import { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../hooks/useAuth";
import io from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL;

function GroupChat({ groupId }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);

  // メッセージ取得関数
  const fetchMessages = async () => {
    try {
      const API_URL = import.meta.env.VITE_API_URL;
      const res = await axios.get(`${API_URL}/messages/group/${groupId}`);
      setMessages(res.data);
    } catch (err) {
      console.error("Failed to fetch group messages:", err);
    }
  };

  useEffect(() => {
    if (!user) return;

    const newSocket = io(SOCKET_URL, {
      query: { userId: user.uid },
    });
    setSocket(newSocket);
    console.log("New socket instance created.");

    return () => {
      newSocket.disconnect();
    };
  }, [user]);

  useEffect(() => {
    if (!socket || !groupId) return;

    // サーバーからのメッセージ受信
    socket.on("receiveGroupMessage", (message) => {
      console.log("Message received:", message);
      setMessages((prevMessages) => [...prevMessages, message]);
    });

    // グループに参加
    socket.emit("joinGroup", { groupId, userId: user.uid });

    // 既存メッセージをロード
    fetchMessages();

    return () => {
      socket.off("receiveGroupMessage");
    };
  }, [socket, groupId, user]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    socket.emit("groupMessage", {
      groupId,
      sender: user.uid,
      text: newMessage,
    });

    setNewMessage("");
  };

  if (!user) {
    return <div>ユーザーを認証しています...</div>;
  }

  return (
    <div className="flex flex-col h-full bg-gray-100 p-4 rounded-lg shadow-md">
      <div className="flex-1 overflow-y-auto mb-4 p-2 bg-white rounded-md">
        <h2 className="text-xl font-bold mb-4">Chat with Group: {groupId}</h2>
        <div className="space-y-2">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`p-2 rounded-lg ${
                msg.sender === user.uid
                  ? "bg-blue-200 text-right self-end"
                  : "bg-gray-200 text-left self-start"
              }`}
            >
              <p className="text-sm">{msg.text}</p>
              <p className="text-xs text-gray-500">
                {msg.createdAt
                  ? new Date(msg.createdAt).toLocaleTimeString()
                  : ""}
              </p>
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
