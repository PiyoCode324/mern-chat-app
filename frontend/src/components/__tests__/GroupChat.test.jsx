// frontend/src/components/__tests__/GroupChat.test.jsx
// 📌 GroupChat コンポーネントのユニットテストファイル

import { render, screen, fireEvent, act } from "@testing-library/react";
// ↳ React Testing Library の主要APIをインポート
//    - render: コンポーネントを仮想DOMに描画
//    - screen: DOM要素を取得するユーティリティ
//    - fireEvent: ユーザー操作（クリックや入力）をシミュレート
//    - act: 非同期処理を伴う描画をテストする際に使用

import GroupChat from "../GroupChat"; // テスト対象のGroupChatコンポーネント
import { useAuth } from "../../hooks/useAuth"; // 認証情報を取得するカスタムフック
import axios from "axios"; // API通信ライブラリ
import { io } from "socket.io-client"; // WebSocket通信ライブラリ
import * as giphy from "../../api/giphy"; // GIF検索APIモジュール（モック対象）

// --- モック定義エリア ---
vi.mock("../../hooks/useAuth"); // useAuthフックをモック化
vi.mock("axios"); // axiosをモック化

// socket.io-clientをモック化（接続処理を差し替え）
vi.mock("socket.io-client", () => ({
  io: vi.fn(() => ({
    on: vi.fn(), // イベント受信ハンドラをモック
    emit: vi.fn(), // イベント送信をモック
    off: vi.fn(), // イベント解除をモック
    disconnect: vi.fn(), // 切断処理をモック
  })),
}));

// giphyモジュール全体をモック化
vi.mock("../../api/giphy", () => ({
  searchGifs: vi.fn(), // searchGifs関数をモック
}));

// --- テストスイート開始 ---
describe("GroupChat Component", () => {
  // テストで使用する共通データを定義
  const mockUser = { uid: "user1", displayName: "Test User" }; // 認証ユーザー
  const mockMessages = [
    { _id: "1", sender: "user1", text: "Hello", readBy: [] },
    { _id: "2", sender: "user2", text: "Hi!", readBy: [] },
  ];
  const mockSocket = {
    emit: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    disconnect: vi.fn(),
  };

  // 🛠 テスト実行前に必要な処理を準備
  beforeAll(() => {
    // DOM操作の副作用を抑えるため、scrollIntoViewをモック
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  // 各テスト実行前に毎回実行
  beforeEach(() => {
    useAuth.mockReturnValue({ user: mockUser }); // 認証済みユーザーを返す
    axios.get.mockResolvedValue({ data: mockMessages }); // メッセージ一覧APIのレスポンスをモック
    axios.post.mockResolvedValue({ data: mockMessages[0] }); // 新規メッセージ送信用APIのレスポンスをモック
    io.mockReturnValue(mockSocket); // モックソケットを返す
  });

  // 各テスト後にモックをリセット
  afterEach(() => {
    vi.clearAllMocks();
  });

  // --- テストケース1: メッセージレンダリング ---
  test("メッセージをレンダリングする", async () => {
    await act(async () => {
      render(<GroupChat groupId="group1" />);
    });

    // モックメッセージが画面に表示されるか確認
    const firstMessage = await screen.findByText("Hello");
    const secondMessage = await screen.findByText("Hi!");
    expect(firstMessage).toBeInTheDocument();
    expect(secondMessage).toBeInTheDocument();
  });

  // --- テストケース2: メッセージ送信 ---
  test("送信ボタンをクリックするとメッセージを送信する", async () => {
    await act(async () => {
      render(<GroupChat groupId="group1" />);
    });

    // 入力欄を取得し、値を変更
    const input = screen.getByPlaceholderText("メッセージを入力...");
    fireEvent.change(input, { target: { value: "New Message" } });

    // 送信ボタンをクリック
    const button = screen.getByText("送信");
    await act(async () => {
      fireEvent.click(button);
    });

    // axios.postが呼ばれたことを確認（API送信）
    expect(axios.post).toHaveBeenCalled();
    // ソケット通信が呼ばれたことを確認（リアルタイム送信）
    expect(mockSocket.emit).toHaveBeenCalledWith(
      "groupMessage",
      expect.any(Object) // 任意のオブジェクト（メッセージデータ）
    );
  });

  // --- テストケース3: GIF検索機能 ---
  test("GIF検索が正しく動作する", async () => {
    // searchGifsモックが返すデータを定義
    const mockGifs = [
      { images: { fixed_height: { url: "gif-url-1" } } },
      { images: { fixed_height: { url: "gif-url-2" } } },
    ];
    // 検索時にモックGIFを返すよう設定
    vi.mocked(giphy.searchGifs).mockResolvedValue(mockGifs);

    await act(async () => {
      render(<GroupChat groupId="group1" />);
    });

    // 検索用の入力欄に文字を入力
    const gifInput = screen.getByPlaceholderText("Search GIFs...");
    fireEvent.change(gifInput, { target: { value: "funny" } });

    // Searchボタンをクリック
    const searchButton = screen.getByText("Search");
    await act(async () => {
      fireEvent.click(searchButton);
    });

    // searchGifsが正しく呼ばれたか検証
    expect(giphy.searchGifs).toHaveBeenCalledWith("funny");

    // GIF画像が画面に表示されるか確認
    const gifImages = await screen.findAllByRole("img", { name: "GIF" });
    expect(gifImages).toHaveLength(2);
  });
});
