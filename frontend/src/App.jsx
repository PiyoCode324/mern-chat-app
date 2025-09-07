// frontend/src/App.jsx
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import SocketTest from "./pages/SocketTest";
import AuthPage from "./pages/AuthPage";
import GroupsPage from "./pages/GroupsPage";
import ChatPage from "./pages/ChatPage";
import Profile from "./components/ui/Profile";

function App() {
  return (
    <Router>
      <Routes>
        {/* 認証ページ */}
        <Route path="/" element={<AuthPage />} />

        {/* Socket.ioテスト */}
        <Route path="/socket" element={<SocketTest />} />

        {/* グループ一覧ページ */}
        <Route path="/groups" element={<GroupsPage />} />

        {/* グループチャットページ */}
        <Route path="/groups/:id" element={<ChatPage />} />

        {/* プロフィール編集ページ */}
        <Route path="/profile" element={<Profile />} />
      </Routes>
    </Router>
  );
}

export default App;
