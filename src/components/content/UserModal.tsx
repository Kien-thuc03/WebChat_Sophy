import React, { useEffect } from "react";
import { useAuth } from "../../features/auth/hooks/useAuth"; // Import useAuth hook
import { FaMarker } from "react-icons/fa";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons"; // Import biểu tượng xmark
import {User } from "../../features/auth/types/authTypes"
interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const UserModal: React.FC<UserModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth() as { user: User | null };

  console.log("Modal isOpen:", isOpen); // Kiểm tra trạng thái của isOpen
  console.log("User data:", user); // Kiểm tra thông tin user

  useEffect(() => {
    if (isOpen) {
      console.log("Modal is opened.");
    }
  }, [isOpen]); // Theo dõi sự thay đổi của isOpen

  if (!isOpen) return null; // Nếu isOpen là false, không render modal

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.4)" }} // Lớp nền mờ với rgba
    >
      <div className="bg-white rounded-lg p-6 max-w-md w-[400px] relative shadow-lg">
        {/* Tiêu đề modal */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800">
            Thông tin tài khoản
          </h2>
          <button
            type="button"
            title="Đóng"
            onClick={onClose}
            className="text-gray-500 text-xl hover:text-gray-700">
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        {/* Nội dung của modal */}
        <div
          className="w-full h-32 bg-cover bg-center rounded-t-lg"
          style={{
            backgroundImage: `url(${"https://picsum.photos/id/1/800/200"})`,
          }}></div>
        <div className="text-center mt-4">
          <div className="flex justify-baseline -mt-12">
            <img
              src={"https://picsum.photos/id/1/200"}
              alt="Avatar"
              className=" w-20 h-20 rounded-full border-4 border-white object-cover"
            />
            <h3 className="mt-10 text-lg font-bold text-gray-800 flex items-center justify-center">
              {user?.fullname || "Tên người dùng"}
              <span className="ml-2 text-gray-500 hover:text-gray-700 cursor-pointer">
                <FaMarker />
              </span>
            </h3>
          </div>
          {/* Divider */}
          <div className="my-4 border-t-6 border-gray-200"></div>{" "}
          {/* Đường phân cách */}
          <h2 className="font-bold text-left">Thông tin cá nhân</h2>
          <div className="mt-2 text-sm text-gray-600 space-y-4">
            <div className="flex justify-start space-x-4">
              <span className="font-medium w-24">Giới tính:</span>
              <span>{user?.isMale ? "Nam" : "Nữ"}</span>
            </div>
            <div className="flex justify-start space-x-4">
              <span className="font-medium w-24">Ngày sinh:</span>
              <span>{user?.birthday || "Không xác định"}</span>
            </div>
            <div className="flex justify-start space-x-4">
              <span className="font-medium w-24">Điện thoại:</span>
              <span>{user?.phone || "Không xác định"}</span>
            </div>
            <p className="text-xs text-gray-500">
              Chỉ bạn bè có lưu số của bạn trong danh bạ mới xem được số này
            </p>
          </div>
        </div>
        <div className="mt-4 text-center">
          <button
            type="button"
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            onClick={onClose}>
            Cập nhật
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserModal;
