// frontend/src/components/GifSearch.jsx
import React from "react";
import { searchGifs } from "../../api/giphy";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

export default function GifSearch({
  gifQuery,
  setGifQuery,
  gifResults,
  setGifResults,
  socket,
  user,
  groupId,
  showModal,
}) {
  const handleSearchGif = async () => {
    if (!gifQuery.trim()) return;
    try {
      const results = await searchGifs(gifQuery);
      setGifResults(results);
    } catch (err) {
      console.error("GIF検索に失敗:", err);
      showModal("GIF検索に失敗しました");
    }
  };

  const handleSendGif = async (url) => {
    if (!socket || !user) return;
    try {
      const res = await axios.post(`${API_URL}/messages/gif`, {
        group: groupId,
        sender: user.uid,
        fileUrl: url,
        gifQuery: gifQuery,
      });
      socket.emit("groupMessage", res.data);
      setGifResults([]);
    } catch (err) {
      console.error("GIF送信に失敗:", err);
      showModal("GIF送信に失敗しました");
    }
  };

  return (
    <div className="my-2">
      <input
        type="text"
        value={gifQuery}
        onChange={(e) => setGifQuery(e.target.value)}
        placeholder="Search GIFs..."
        className="p-2 border rounded-md w-2/3"
      />
      <button
        type="button"
        onClick={handleSearchGif}
        className="px-3 py-2 bg-blue-500 text-white rounded-md ml-2"
      >
        Search
      </button>
      <div className="flex flex-wrap gap-2 mt-2">
        {gifResults.map((url, index) => (
          <img
            key={index}
            src={url}
            alt="GIF"
            className="w-24 h-24 object-cover cursor-pointer"
            onClick={() => handleSendGif(url)}
          />
        ))}
      </div>
    </div>
  );
}
