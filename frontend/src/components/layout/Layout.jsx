// frontend/src/components/layout/Layout.jsx
import React, { useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { getAuth, signOut } from "firebase/auth";

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const auth = getAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/");
      console.log("ログアウト成功");
    } catch (error) {
      console.error("ログアウトエラー:", error);
    }
  };

  const getPageTitle = () => {
    switch (location.pathname) {
      case "/groups":
        return "チャット一覧";
      case "/profile":
        return "プロフィール";
      case "/admin":
        return "アドミン";
      case "/socket":
        return "ソケットテスト";
      default:
        if (location.pathname.startsWith("/groups/")) {
          return "チャット";
        }
        return "Chat App";
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 relative">
      {/* サイドバー */}
      <aside
        className={`bg-white p-4 border-r border-gray-300 transition-all duration-300 transform ${
          sidebarOpen ? "w-64 translate-x-0" : "w-0 -translate-x-full"
        } fixed sm:static h-full z-20 overflow-hidden shadow-md`}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold whitespace-nowrap overflow-hidden">
            Chat App
          </h2>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1 rounded hover:bg-gray-200"
          >
            &gt;
          </button>
        </div>
        <nav className="space-y-2">
          <Link
            to="/groups"
            className="block px-2 py-1 rounded hover:bg-gray-200 whitespace-nowrap"
          >
            Groups
          </Link>
          <Link
            to="/profile"
            className="block px-2 py-1 rounded hover:bg-gray-200 whitespace-nowrap"
          >
            Profile
          </Link>
          <Link
            to="/admin"
            className="block px-2 py-1 rounded hover:bg-gray-200 whitespace-nowrap"
          >
            Admin
          </Link>
          <button
            onClick={handleLogout}
            className="w-full text-left px-2 py-1 rounded hover:bg-red-200 text-red-600 whitespace-nowrap"
          >
            Logout
          </button>
        </nav>
      </aside>

      {/* サイドバーが閉じている時の開くボタン（デスクトップ用） */}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="hidden sm:block absolute top-4 left-4 p-2 bg-gray-200 rounded z-10"
        >
          &lt;
        </button>
      )}

      {/* メインコンテンツ */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ${
          sidebarOpen ? "sm:ml-64" : "sm:ml-0"
        }`}
      >
        {/* ヘッダー */}
        <header className="flex items-center bg-white px-4 h-14 border-b border-gray-300 shadow-sm relative">
          {/* ハンバーガーメニュー（モバイル） */}
          <button
            className="sm:hidden p-2 bg-gray-200 rounded mr-4 z-10"
            onClick={() => setSidebarOpen(true)}
          >
            ☰
          </button>

          {/* ページタイトル */}
          <h1
            className={`text-lg font-bold text-gray-800 transition-all duration-300 ${
              sidebarOpen ? "sm:ml-0" : "sm:ml-0"
            }`}
          >
            {getPageTitle()}
          </h1>
        </header>

        {/* メイン */}
        <main className="flex-1 overflow-auto p-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
