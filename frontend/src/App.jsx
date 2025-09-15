// frontend/src/App.jsx
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { useState, useEffect } from "react";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";

import Layout from "./components/layout/Layout";
import AuthPage from "./pages/AuthPage";
import GroupsPage from "./pages/GroupsPage";
import ChatPage from "./pages/ChatPage";
import Profile from "./components/ui/Profile";
import AdminPage from "./pages/AdminPage";
import SocketTest from "./pages/SocketTest";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsLoggedIn(!!user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-500">
        Loading...
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            isLoggedIn ? <Navigate to="/groups" replace /> : <AuthPage />
          }
        />
        {/* Layoutに何も渡さず、シンプルに */}
        <Route element={isLoggedIn ? <Layout /> : <Navigate to="/" replace />}>
          <Route path="/groups" element={<GroupsPage />} />
          <Route path="/groups/:id" element={<ChatPage />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/socket" element={<SocketTest />} />
        </Route>
        <Route
          path="*"
          element={<Navigate to={isLoggedIn ? "/groups" : "/"} replace />}
        />
      </Routes>
    </Router>
  );
}

export default App;
