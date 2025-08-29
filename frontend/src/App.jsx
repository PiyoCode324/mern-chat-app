// frontend/src/App.jsx
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import SocketTest from "./pages/SocketTest";
import AuthPage from "./pages/AuthPage";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AuthPage />} />
        <Route path="/socket" element={<SocketTest />} />
      </Routes>
    </Router>
  );
}

export default App;
