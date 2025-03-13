import React from "react";
import Header from "../header/Header";

const ChatList: React.FC = () => {
  return (
    <div className="chat-list w-80 bg-gray-50 p-4">
      <Header />
      {/* Thanh điều hướng danh sách tin nhắn */}
      <div className="flex justify-between mb-4">
        <button className="text-blue-500 font-semibold">Tất cả</button>
        <button className="text-gray-500">Chưa đọc</button>
        <button className="text-gray-500">Phân loại</button>
        <button className="text-gray-500">•••</button>
      </div>

      {/* Danh sách các hội thoại */}
      <div className="space-y-2">
        <div className="p-2 bg-white rounded-lg shadow-sm">
          <p className="font-semibold">Cloud của tôi</p>
          <p className="text-sm text-gray-500">Tin nhắn cá nhân lưu trữ</p>
        </div>
        <div className="p-2 bg-white rounded-lg shadow-sm">
          <p className="font-semibold">John Doe</p>
          <p className="text-sm text-gray-500 ">Tin nhắn mới từ John</p>
        </div>
        <div className="p-2 bg-white rounded-lg shadow-sm">
          <p className="font-semibold">Jane Smith</p>
          <p className="text-sm text-gray-500">Tin nhắn mới từ Jane</p>
        </div>
      </div>
    </div>
  );
};

export default ChatList;