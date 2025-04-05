import React, { useEffect, useState } from "react";
import { useAuth } from "../../../features/auth/hooks/useAuth";
import { User } from "../../../features/auth/types/authTypes";
import { FaMarker } from "react-icons/fa";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {  faEdit } from "@fortawesome/free-solid-svg-icons";
import EditUserModal from "./EditUserModal";
import { Modal } from "antd";

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const UserModal: React.FC<UserModalProps> = ({ isOpen, onClose }) => {
  const { user, setUser } = useAuth();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      console.log("Modal is opened.");
    }
  }, [isOpen]);

  const formatPhoneNumber = (phone: string | undefined): string => {
    if (!phone) return "Không xác định";

    const formattedPhone = phone.startsWith("0")
      ? "+84" + phone.slice(1)
      : phone;

    const digitsOnly = formattedPhone.replace(/(?!^\+)\D/g, "");
    if (digitsOnly.length <= 3) return formattedPhone;

    const countryCode = digitsOnly.startsWith("84") ? "+84" : "";
    const numberPart = digitsOnly.slice(countryCode.length);

    const formattedNumber = numberPart.match(/.{1,3}/g)?.join(" ");

    return `${countryCode} ${formattedNumber}`.trim();
  };

  const handleSave = (updatedData: {
    displayName: string;
    isMale: boolean;
    birthday: string;
  }) => {
    setUser((prevUser: User | null) => {
      if (!prevUser) return null;
      return {
        ...prevUser,
        fullname: updatedData.displayName,
        isMale: updatedData.isMale,
        birthday: updatedData.birthday,
      };
    });
    setIsEditModalOpen(false);
  };

  return (
    <>
      {/* Main User Modal */}
      <Modal
        title="Thông tin tài khoản"
        open={isOpen}
        onCancel={onClose}
        footer={null}
        centered
        bodyStyle={{ padding: "24px" }}
      >
        <div className="text-center mt-4">
          {/* Add background banner */}
          <div 
            className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-r from-blue-400 to-blue-600 rounded-t-lg"
            style={{
              backgroundImage: `url(${ 'https://picsum.photos/id/1/800/200'})`,
              // user?.urlbanner ||
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
          
          <div className="flex justify-baseline mt-5 relative">
            <img
              src={user?.urlavatar || "https://picsum.photos/id/1/200/200"}
              alt="Avatar"
              className="w-20 h-20 rounded-full border-4 border-white object-cover"
            />
            <h3 className="mt-10 text-lg font-bold text-gray-800 flex items-center justify-center">
              {user?.fullname || "Tên người dùng"}
              <span className="ml-2 text-gray-500 hover:text-gray-700 cursor-pointer">
                <FaMarker
                  onClick={() => {
                    setIsEditModalOpen(true);
                  }}
                />
              </span>
            </h3>
          </div>
          <div className="my-4 border-t-6 border-gray-200"></div>
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
              <span>{formatPhoneNumber(user?.phone)}</span>
            </div>
            <p className="text-xs text-gray-500">
              Chỉ bạn bè có lưu số của bạn trong danh bạ mới xem được số này
            </p>
          </div>
        </div>

        {/* Update Button */}
        <div className="mt-4 text-center">
          <button
            type="button"
            className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 flex items-center justify-center"
            onClick={() => setIsEditModalOpen(true)} // Open EditUserModal on click
          >
            <FontAwesomeIcon icon={faEdit} className="mr-2" />
            <span>Cập nhật</span>
          </button>
        </div>
      </Modal>

      {/* Edit User Modal */}
      {isEditModalOpen && (
        <EditUserModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onBack={() => setIsEditModalOpen(false)}
          initialData={{
            displayName: user?.fullname || "",
            isMale: user?.isMale ?? true,
            birthday: user?.birthday || "",
          }}
          onSave={handleSave} // Save the updated data
        />
      )}
    </>
  );
};

export default UserModal;
