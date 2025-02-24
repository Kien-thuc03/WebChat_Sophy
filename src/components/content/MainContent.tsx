import React from "react";

const MainContent: React.FC = () => {
  return (
    <div className="main-content flex-1 p-6 bg-gray-100">
      <h1 className="text-2xl font-bold mb-2">Chào mừng đến với Zalo PC!</h1>
      <p className="mb-4">Giới thiệu về các tiện ích hỗ trợ công việc và trò chuyện.</p>
      <img src="/images/illustration.png" alt="Illustration" className="mb-4" />
      <h2 className="text-xl font-semibold">Nhắn tin nhiều hơn, soạn thảo ít hơn</h2>
      <p className="mb-4">Giải thích về tính năng "Tin Nhắn Nhanh" để gửi tin nhắn nhanh hơn.</p>
      <div className="flex justify-between items-center">
        <button className="bg-blue-500 text-white p-2 rounded">Trái</button>
        <button className="bg-blue-500 text-white p-2 rounded">Phải</button>
      </div>
      <div className="mt-2">
        <span className="text-sm">Slide hiện tại: 1</span>
      </div>
    </div>
  );
};

export default MainContent;