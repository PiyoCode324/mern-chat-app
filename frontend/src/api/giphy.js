// frontend/src/api/giphy.js
import axios from "axios";

const API_KEY = import.meta.env.VITE_GIPHY_API_KEY; // .env に保存したキー
const BASE_URL = "https://api.giphy.com/v1/gifs/search";

export const searchGifs = async (query) => {
  try {
    const response = await axios.get(BASE_URL, {
      params: {
        api_key: API_KEY,
        q: query,
        limit: 12, // 一度に取得する件数
        rating: "pg",
      },
    });
    // URLだけ配列で返す
    return response.data.data.map((gif) => gif.images.fixed_height.url);
  } catch (err) {
    console.error("GIF検索エラー:", err);
    return [];
  }
};
