// frontend/src/App.jsx
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import SocketTest from "./pages/SocketTest";
import AuthPage from "./pages/AuthPage";
import Chat from "./components/Chat";

function App() {
  const currentUserId = "user1"; // ログインユーザーID
  const targetUserId = "user2"; // チャット相手ID

  return (
    <Router>
      <Routes>
        <Route path="/" element={<AuthPage />} />
        <Route path="/socket" element={<SocketTest />} />
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
      </Routes>
    </Router>
  );
}

export default App;
