// frontend/src/pages/ChatPage.jsx
import { useParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import GroupChat from "../components/chat/GroupChat";

export default function ChatPage() {
  const { id } = useParams();
  const { isAuthReady } = useAuth();

  // 認証状態が確認できるまでローディング画面を表示
  if (!isAuthReady) {
    return <div>ログイン情報を取得中...</div>;
  }

  // URLから取得したidをGroupChatに渡す
  return (
    <div className="flex justify-center items-center h-screen">
      <div className="w-full max-w-xl h-4/5 bg-white shadow-xl rounded-lg p-6">
        {/* idが取得できた場合のみGroupChatを表示 */}
        {id ? (
          <GroupChat groupId={id} />
        ) : (
          <div>グループIDが見つかりません。</div>
        )}
      </div>
    </div>
  );
}
