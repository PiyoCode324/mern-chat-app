// frontend/src/components/Modal.jsx
import React from "react";

export default function Modal({ isOpen, onClose, message }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
      <div className="bg-white p-4 rounded-lg max-w-sm w-full shadow-lg">
        <p className="mb-4">{message}</p>
        <button
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          onClick={onClose}
        >
          閉じる
        </button>
      </div>
    </div>
  );
}
