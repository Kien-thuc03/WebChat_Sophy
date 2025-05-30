import React, { useState, useRef } from "react";
import { Modal, Button, message, Spin } from "antd"; // Import Spin for loading indicator
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCamera } from "@fortawesome/free-solid-svg-icons";
import { updateUserAvatar } from "../../../api/API";
import { useLanguage } from "../../../features/auth/context/LanguageContext";

interface UpdateAvatarModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAvatar: string;
  onUpdate: (newAvatar: string) => void;
}

const UpdateAvatarModal: React.FC<UpdateAvatarModalProps> = ({
  isOpen,
  onClose,
  currentAvatar,
  onUpdate,
}) => {
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false); // State for loading status
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useLanguage(); // Sử dụng context

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setPreviewImage(imageUrl);
      setSelectedFile(file);
    }
  };

  const handleUpdate = async () => {
    if (!selectedFile) {
      message.error(
        t.select_image_error || "Vui lòng chọn ảnh mới trước khi cập nhật!"
      );
      return;
    }

    setIsLoading(true); // Set loading to true when update starts

    try {
      await updateUserAvatar(selectedFile);
      message.success(
        t.update_avatar_success || "Cập nhật ảnh đại diện thành công!"
      );
      onUpdate(previewImage || currentAvatar);
      onClose();
    } catch (error) {
      message.error(t.update_avatar_error || "Cập nhật ảnh đại diện thất bại!");
      console.error("Error updating avatar:", error);
    } finally {
      setIsLoading(false); // Set loading to false when update ends
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleCancel = () => {
    setPreviewImage(null);
    setSelectedFile(null);
    onClose();
  };

  return (
    <Modal
      title={t.update_avatar || "Cập nhật ảnh đại diện"}
      open={isOpen}
      onCancel={handleCancel}
      footer={[
        <Button key="cancel" onClick={handleCancel} disabled={isLoading}>
          {t.cancel || "Hủy"}
        </Button>,
        <Button key="update" type="primary" onClick={handleUpdate} disabled={isLoading}>
          {isLoading ? <Spin /> : t.update || "Cập nhật"}
        </Button>,
      ]}>
      <div className="flex flex-col items-center">
        <div className="mb-4">
          <img
            src={previewImage || currentAvatar}
            alt="Avatar Preview"
            className="w-32 h-32 rounded-full object-cover"
          />
        </div>
        <Button
          type="default"
          icon={<FontAwesomeIcon icon={faCamera} />}
          onClick={handleUploadClick}
          className="mb-4"
          disabled={isLoading}
        >
          {t.upload_from_computer || "Tải lên từ máy tính"}
        </Button>
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          onChange={handleImageChange}
          className="hidden"
        />
      </div>
    </Modal>
  );
};

export default UpdateAvatarModal;
