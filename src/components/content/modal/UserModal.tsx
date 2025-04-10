import React, { useEffect, useState } from "react";
import { useAuth } from "../../../features/auth/hooks/useAuth";
import { User } from "../../../features/auth/types/authTypes";
import { FaMarker } from "react-icons/fa";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCamera } from "@fortawesome/free-solid-svg-icons";
import EditUserModal from "./EditUserModal";
import UpdateAvatarModal from "./UpdateAvatarModal";
import { Modal, Button } from "antd";
import { useLanguage } from "../../../features/auth/context/LanguageContext";
import { faPenToSquare } from "@fortawesome/free-solid-svg-icons";

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const UserModal: React.FC<UserModalProps> = ({ isOpen, onClose }) => {
  const { user, setUser } = useAuth();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isUpdateAvatarModalOpen, setIsUpdateAvatarModalOpen] = useState(false);
  const [randomImageId, setRandomImageId] = useState<number>(1); // State for random image ID
  const { t } = useLanguage(); // Sử dụng context

  useEffect(() => {
    if (isOpen) {
      console.log("Modal is opened.");
      setRandomImageId(Math.floor(Math.random() * 100) + 1); // Generate random number between 1 and 100
    }
  }, [isOpen]);

  const formatPhoneNumber = (phone: string | undefined): string => {
    if (!phone) return t.undefined || "Không xác định";
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

  const handleOpenUpdateAvatarModal = () => {
    setIsUpdateAvatarModalOpen(true);
  };

  const handleCloseUpdateAvatarModal = () => {
    setIsUpdateAvatarModalOpen(false);
  };

  const handleUpdateAvatar = (newAvatar: string) => {
    setUser((prevUser: User | null) => {
      if (!prevUser) return null;
      return { ...prevUser, urlavatar: newAvatar };
    });
    setIsUpdateAvatarModalOpen(false);
  };

  return (
    <>
      <Modal
        title={t.account_info || "Thông tin tài khoản"}
        open={isOpen}
        onCancel={onClose}
        footer={null}
        centered
        bodyStyle={{ padding: "24px" }}>
        <div className="text-center mt-4">
          <div
            className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-r from-blue-400 to-blue-600 rounded-t-lg"
            style={{
              backgroundImage: `url(https://picsum.photos/id/${randomImageId}/800/200)`, // Use random image ID
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
          <div className="flex justify-baseline mt-10 relative">
            <div className="relative">
              <img
                src={user?.urlavatar || "https://picsum.photos/id/1/200/200"}
                alt="Avatar"
                className="w-20 h-20 rounded-full border-4 border-white object-cover"
              />
              <div
                className="absolute bottom-0 right-0 bg-gray-200 p-1 rounded-full cursor-pointer hover:bg-gray-300"
                onClick={handleOpenUpdateAvatarModal}>
                <FontAwesomeIcon icon={faCamera} className="text-gray-600" />
              </div>
            </div>
            <h3 className="mt-10 text-lg font-bold text-gray-800 flex items-center justify-center">
              {user?.fullname || "Tên người dùng"}
              <span className="ml-2 text-gray-500 hover:text-gray-700 cursor-pointer">
                <FaMarker onClick={() => setIsEditModalOpen(true)} />
              </span>
            </h3>
          </div>
          <div className="my-4 border-t-6 border-gray-200"></div>
          <h2 className="font-bold text-left">
            {t.personal_info || "Thông tin cá nhân"}
          </h2>
          <div className="mt-2 text-sm text-gray-600 space-y-4">
            <div className="flex justify-start space-x-4">
              <span className="font-medium w-24">
                {t.gender || "Giới tính"}:
              </span>
              <span>{user?.isMale ? t.male || "Nam" : t.female || "Nữ"}</span>
            </div>
            <div className="flex justify-start space-x-4">
              <span className="font-medium w-24">
                {t.birthday || "Ngày sinh"}:
              </span>
              <span>{user?.birthday || t.undefined || "Không xác định"}</span>
            </div>
            <div className="flex justify-start space-x-4">
              <span className="font-medium w-24">
                {t.phone || "Điện thoại"}:
              </span>
              <span>{formatPhoneNumber(user?.phone)}</span>
            </div>
            <p className="text-xs text-gray-500">
              {t.phone_privacy ||
                "Chỉ bạn bè có lưu số của bạn trong danh bạ mới xem được số này"}
            </p>
          </div>

          {/* Add the update button */}
          <div className="flex justify-end mt-4">
            <Button
              icon={<FontAwesomeIcon icon={faPenToSquare} className="ml-2" />}
              onClick={() => setIsEditModalOpen(true)}
              className="w-full h-10 text-base">
              {t.update || "Cập nhật"}
            </Button>
          </div>
        </div>
      </Modal>
      <UpdateAvatarModal
        isOpen={isUpdateAvatarModalOpen}
        onClose={handleCloseUpdateAvatarModal}
        currentAvatar={user?.urlavatar || "https://picsum.photos/id/1/200/200"}
        onUpdate={handleUpdateAvatar}
      />
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
          onSave={handleSave}
        />
      )}
    </>
  );
};

export default UserModal;
