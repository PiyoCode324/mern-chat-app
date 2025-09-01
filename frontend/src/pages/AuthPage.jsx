// frontend/src/pages/AuthPage.jsx
import { useState } from "react";
import { auth } from "../firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // -----------------------------
  // サインアップ
  // -----------------------------
  const handleSignup = async () => {
    try {
      // 1. Firebase でユーザー作成
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const firebaseUser = userCredential.user;

      // 2. MongoDB にユーザー登録
      await axios.post(`${API_URL}/users`, {
        _id: firebaseUser.uid, // Firebase UID をそのまま使用
        name: email.split("@")[0], // 名前はメールの前半を仮に使用
        email: firebaseUser.email,
      });

      alert("Signup successful! 🎉");
      setEmail("");
      setPassword("");
    } catch (error) {
      console.error(error);
      alert(error.message);
    }
  };

  // -----------------------------
  // ログイン
  // -----------------------------
  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      alert("Login successful! ✅");
      setEmail("");
      setPassword("");
    } catch (error) {
      console.error(error);
      alert(error.message);
    }
  };

  return (
    <div className="p-4 max-w-sm mx-auto">
      <h1 className="text-2xl mb-4">Auth</h1>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="border p-2 mb-2 w-full"
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="border p-2 mb-2 w-full"
      />
      <button
        onClick={handleSignup}
        className="bg-blue-500 text-white p-2 mr-2 rounded"
      >
        Sign Up
      </button>
      <button
        onClick={handleLogin}
        className="bg-green-500 text-white p-2 rounded"
      >
        Login
      </button>
    </div>
  );
}
