// frontend/src/pages/ChatPage.jsx
import { useParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import GroupChat from "../components/chat/GroupChat";

export default function ChatPage() {
  const { id } = useParams();
  const { isAuthReady } = useAuth();

  // 認証状態が確認できるまでローディング画面を表示
  if (!isAuthReady) {
    return (
      <div className="flex justify-center items-center h-screen">
        ログイン情報を取得中...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full">
      {id ? (
        <GroupChat groupId={id} />
      ) : (
        <div className="flex justify-center items-center h-full text-gray-600">
          グループIDが見つかりません。
        </div>
      )}
    </div>
  );
}
