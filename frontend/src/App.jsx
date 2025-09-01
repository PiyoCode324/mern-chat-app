// frontend/src/App.jsx
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import SocketTest from "./pages/SocketTest";
import AuthPage from "./pages/AuthPage";
import Chat from "./components/Chat";
import GroupsPage from "./pages/GroupsPage";
import ChatPage from "./pages/ChatPage";

function App() {
  const currentUserId = "user1"; // 仮ログインユーザー
  const targetUserId = "user2"; // 個人チャット相手

  return (
    <Router>
      <Routes>
        <Route path="/" element={<AuthPage />} />
        <Route path="/socket" element={<SocketTest />} />

        {/* 個人チャット（既存） */}
        <Route
          path="/chat/user1"
          element={
            <Chat currentUserId={currentUserId} targetUserId={targetUserId} />
          }
        />
        <Route
          path="/chat/user2"
          element={
            <Chat currentUserId={targetUserId} targetUserId={currentUserId} />
          }
        />

        {/* グループ一覧ページ */}
        <Route path="/groups" element={<GroupsPage />} />

        {/* グループチャットページ */}
        <Route path="/groups/:id" element={<ChatPage />} />
      </Routes>
    </Router>
  );
}

export default App;
