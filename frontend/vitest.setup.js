// frontend/vitest.setup.js
import "@testing-library/jest-dom";
import { vi } from "vitest"; // Import vi directly

// Test before mocking import.meta.env
Object.defineProperty(import.meta, "env", {
  value: {
    VITE_SOCKET_URL: "http://localhost:3001",
    VITE_API_URL: "http://localhost:5000",
    VITE_GIPHY_API_KEY: "test-giphy-api-key",
  },
});

// Mock scrollIntoView, etc.
// Put the mocking code within a block where vi is defined
window.HTMLElement.prototype.scrollIntoView = vi.fn();
