import React from "react";

const Sidebar: React.FC = () => {
  return (
    <div className="sidebar w-64 bg-white shadow-lg p-4">
      {/* Thanh tìm kiếm */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Tìm kiếm"
          className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Ảnh đại diện người dùng */}
      <div className="flex items-center mb-6">
        <img
          src="/images/avatar.jpg"
          alt="Avatar"
          className="w-10 h-10 rounded-full mr-3"
        />
        <span className="font-semibold">Người dùng</span>
      </div>

      {/* Danh sách biểu tượng điều hướng */}
      <nav>
        <ul className="space-y-4">
          <li>
            <button className="flex items-center w-full p-2 hover:bg-gray-100 rounded-lg">
              <span className="mr-3">💬</span>
              <span>Tin nhắn</span>
            </button>
          </li>
          <li>
            <button className="flex items-center w-full p-2 hover:bg-gray-100 rounded-lg">
              <span className="mr-3">👥</span>
              <span>Danh bạ</span>
            </button>
          </li>
          <li>
            <button className="flex items-center w-full p-2 hover:bg-gray-100 rounded-lg">
              <span className="mr-3">📰</span>
              <span>Nhật ký & khoảnh khắc</span>
            </button>
          </li>
          <li>
            <button className="flex items-center w-full p-2 hover:bg-gray-100 rounded-lg">
              <span className="mr-3">☁️</span>
              <span>Cloud của tôi</span>
            </button>
          </li>
          <li>
            <button className="flex items-center w-full p-2 hover:bg-gray-100 rounded-lg">
              <span className="mr-3">📂</span>
              <span>Công việc</span>
            </button>
          </li>
          <li>
            <button className="flex items-center w-full p-2 hover:bg-gray-100 rounded-lg">
              <span className="mr-3">⚙️</span>
              <span>Cài đặt</span>
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
};

export default Sidebar;