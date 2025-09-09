// frontend/src/components/MessageList.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

export default function MessageList({
  messages,
  currentUserId,
  messagesEndRef,
}) {
  const [userProfiles, setUserProfiles] = useState({}); // { uid: { name, iconUrl } }

  useEffect(() => {
    const uniqueUserIds = [...new Set(messages.map((m) => m.sender))];
    console.log("🔍 Unique user IDs in messages:", uniqueUserIds);

    uniqueUserIds.forEach(async (uid) => {
      if (!userProfiles[uid]) {
        try {
          const res = await axios.get(`${API_URL}/users/${uid}`);
          console.log("✅ Fetched user profile:", uid, res.data);
          setUserProfiles((prev) => ({ ...prev, [uid]: res.data }));
        } catch (err) {
          console.error("⚠️ ユーザー情報取得失敗:", uid, err);
        }
      }
    });
  }, [messages]);

  return (
    <div
      className="flex-1 overflow-y-auto mb-2 p-2 bg-white rounded-md"
      style={{ maxHeight: "calc(100vh - 240px)" }}
    >
      {messages.length > 0 ? (
        messages.map((msg) => {
          const profile = userProfiles[msg.sender] || {};
          const isCurrentUser = msg.sender === currentUserId;

          return (
            <div
              key={msg._id}
              className={`flex mb-2 ${
                isCurrentUser ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`flex ${
                  isCurrentUser ? "flex-row-reverse" : "flex-row"
                } max-w-[70%]`}
              >
                {profile.iconUrl && (
                  <img
                    src={profile.iconUrl}
                    alt="icon"
                    className={`w-10 h-10 rounded-full object-cover flex-shrink-0 ${
                      isCurrentUser ? "ml-2" : "mr-2"
                    }`}
                  />
                )}

                <div
                  className={`p-2 rounded-lg ${
                    isCurrentUser
                      ? "bg-blue-200 text-right"
                      : "bg-gray-200 text-left"
                  }`}
                >
                  <p className="font-bold text-sm">
                    {profile.name || msg.sender.slice(0, 8)}
                  </p>
                  {msg.text && <p>{msg.text}</p>}
                  {msg.fileUrl && (
                    <img
                      src={msg.fileUrl}
                      alt="添付"
                      className="mt-1 rounded max-w-full"
                    />
                  )}
                  <div className="text-xs text-gray-500 mt-1">
                    {msg.createdAt
                      ? new Date(msg.createdAt).toLocaleTimeString()
                      : ""}
                  </div>
                  {isCurrentUser && (
                    <p className="text-xs text-gray-500">
                      {`既読: ${
                        msg.readBy?.filter((id) => id !== currentUserId)
                          .length || 0
                      }人`}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })
      ) : (
        <p className="text-center text-gray-500">
          まだメッセージがありません。
        </p>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}
