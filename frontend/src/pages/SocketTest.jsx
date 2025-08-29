// frontend/src/pages/SocketTest.jsx
import { useEffect } from "react";
import { io } from "socket.io-client";

export default function SocketTest() {
  useEffect(() => {
    const socket = io("http://localhost:5000"); // バックエンドURL
    socket.on("connect", () => {
      console.log("Connected to Socket.IO server:", socket.id);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return <div>Socket.IO 接続テスト中…コンソールを確認してください</div>;
}
