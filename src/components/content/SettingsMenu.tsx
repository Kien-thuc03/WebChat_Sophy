import React from "react";
import { logout } from "../../api/API"; // Import hàm logout

interface SettingsMenuProps {
  onClose: () => void; // Hàm đóng menu
}

const SettingsMenu: React.FC<SettingsMenuProps> = ({ onClose }) => {
  const handleLogout = async () => {
    try {
      await logout(); // Gọi hàm logout
      alert("Đăng xuất thành công!");
      // Chuyển hướng về trang đăng nhập
      window.location.href = "/";
    } catch (error: unknown) {
      // Narrow the error type
      if (error instanceof Error) {
        alert(error.message || "Đăng xuất thất bại, vui lòng thử lại.");
      } else {
        alert("Đăng xuất thất bại, vui lòng thử lại.");
      }
    }
  };

  return (
    <div className="absolute left-50 bottom-16 transform translate-x-[-100%] w-48 p-2 bg-white shadow-lg rounded-lg z-10">
      <ul>
        <li>
          <a
            href="#"
            className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
            onClick={onClose}>
            Thông tin tài khoản
          </a>
        </li>
        <li>
          <a
            href="#"
            className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
            onClick={onClose}>
            Cài đặt
          </a>
        </li>
        <li>
          <a
            href="#"
            className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
            onClick={onClose}>
            Dữ liệu
          </a>
        </li>
        <li>
          <a
            href="#"
            className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
            onClick={onClose}>
            Ngôn ngữ
          </a>
        </li>
        <li>
          <a
            href="#"
            className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
            onClick={onClose}>
            Hỗ trợ
          </a>
        </li>
        <li>
          <a
            href="#"
            className="block px-4 py-2 text-red-500 hover:bg-gray-100"
            onClick={() => {
              onClose(); // Đóng menu
              handleLogout(); // Gọi hàm logout
            }}>
            Đăng xuất
          </a>
        </li>
      </ul>
    </div>
  );
};

export default SettingsMenu;
