// frontend/src/pages/SocketTest.jsx
import { useEffect } from "react";
import { io } from "socket.io-client";

export default function SocketTest() {
  useEffect(() => {
    const SOCKET_URL = import.meta.env.VITE_SOCKET_URL;
    const socket = io(SOCKET_URL);
    socket.on("connect", () => {
      console.log("Connected to Socket.IO server:", socket.id);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return <div>Socket.IO 接続テスト中…コンソールを確認してください</div>;
}
