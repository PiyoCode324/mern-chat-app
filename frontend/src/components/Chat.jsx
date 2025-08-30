// src/components/Chat.jsx
import React, { useEffect, useState, useRef } from "react";
import socket from "../utils/socket";

const Chat = ({ currentUserId, targetUserId }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef(null);

  const handleReceive = (msg) => {
    setMessages((prev) => [...prev, msg]);
  };

  // Socket 接続・受信設定
  useEffect(() => {
    // 💡 ソケット接続を明示的に開始
    // autoConnect: false に設定されているため、この行が必要
    socket.connect();

    console.log("Joining room:", currentUserId);
    socket.emit("join", currentUserId);

    socket.on("receiveMessage", handleReceive);

    // クリーンアップ関数
    return () => {
      // コンポーネントがアンマウントされたら接続を切断
      socket.disconnect();
      socket.off("receiveMessage", handleReceive);
    };
  }, [currentUserId]);

  // メッセージ送信
  const sendMessage = () => {
    if (input.trim() === "") return;
    console.log("Sending message to:", targetUserId);
    const msg = { from: currentUserId, to: targetUserId, message: input };

    setMessages((prev) => [...prev, msg]);

    socket.emit("sendMessage", msg);
    setInput("");
  };

  // スクロール自動追従
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.map((msg, idx) => {
          return (
            <div
              key={idx}
              className={`p-2 rounded-md max-w-xs whitespace-pre-wrap ${
                msg.from === currentUserId
                  ? "bg-blue-500 text-white ml-auto"
                  : "bg-gray-200 text-black"
              }`}
            >
              {msg.message}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="flex p-2 border-t">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 border rounded px-2 py-1"
          placeholder="メッセージを入力"
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <button
          onClick={sendMessage}
          className="ml-2 bg-blue-500 text-white px-4 py-1 rounded"
        >
          送信
        </button>
      </div>
    </div>
  );
};

export default Chat;
