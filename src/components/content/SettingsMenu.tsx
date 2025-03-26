import React, { useEffect } from "react";
import { logout } from "../../api/API";

interface SettingsMenuProps {
  onClose: () => void;
  onOpenModal: () => void; // Thêm prop để mở modal
}

const SettingsMenu: React.FC<SettingsMenuProps> = ({
  onClose,
  onOpenModal,
}) => {
  useEffect(() => {
    console.log("SettingsMenu mounted");
    return () => console.log("SettingsMenu unmounted");
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      alert("Đăng xuất thành công!");
      window.location.href = "/";
    } catch (error: unknown) {
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
            onClick={(e) => {
              e.preventDefault();
              console.log("Clicked on Thông tin tài khoản");
              onOpenModal(); // Gọi hàm từ props để mở modal
            }}>
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
            className="block px-4 py-2 text-red-500 hover:bg-gray-100"
            onClick={() => {
              onClose();
              handleLogout();
            }}>
            Đăng xuất
          </a>
        </li>
      </ul>
    </div>
  );
};

export default SettingsMenu;
