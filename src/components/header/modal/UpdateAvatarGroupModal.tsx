// UpdateAvatarGroupModal.tsx
import React, { useState, useRef, useEffect } from "react";
import { Modal, Button, Spin, App } from "antd";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCamera } from "@fortawesome/free-solid-svg-icons";
import { useLanguage } from "../../../features/auth/context/LanguageContext";

interface UpdateAvatarGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAvatar: string;
  conversationId: string;
  onUpdate: (data: { url: string; file: File | null }) => void;
}

const UpdateAvatarGroupModal: React.FC<UpdateAvatarGroupModalProps> = ({
  isOpen,
  onClose,
  currentAvatar,
  conversationId,
  onUpdate,
}) => {
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [placeholderImage, setPlaceholderImage] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useLanguage();
  const { message } = App.useApp();

  useEffect(() => {
    const randomImageId = Math.floor(Math.random() * 1000);
    setPlaceholderImage(`https://picsum.photos/id/${randomImageId}/800/800`);
  }, []);

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

    setIsLoading(true);

    try {
      // Không gọi updateGroupAvatar ở đây, chỉ trả về dữ liệu ảnh
      onUpdate({
        url: previewImage || currentAvatar,
        file: selectedFile,
      });
      message.success(
        t.update_group_avatar_success ||
          "Cập nhật ảnh đại diện nhóm thành công!"
      );
      onClose();
    } catch (error) {
      message.error(
        t.update_group_avatar_error || "Cập nhật ảnh đại diện nhóm thất bại!"
      );
      console.error("Error updating group avatar:", error);
    } finally {
      setIsLoading(false);
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

  const displayImage = previewImage || currentAvatar || placeholderImage;

  return (
    <Modal
      title={t.update_group_avatar || "Cập nhật ảnh đại diện nhóm"}
      open={isOpen}
      onCancel={handleCancel}
      footer={[
        <Button key="cancel" onClick={handleCancel} disabled={isLoading}>
          {t.cancel || "Hủy"}
        </Button>,
        <Button
          key="update"
          type="primary"
          onClick={handleUpdate}
          disabled={isLoading}>
          {isLoading ? <Spin /> : t.update || "Cập nhật"}
        </Button>,
      ]}
      zIndex={1002}
      wrapClassName="custom-modal">
      <div className="flex flex-col items-center">
        <div className="mb-4">
          <img
            src={displayImage}
            alt="Group Avatar Preview"
            className="w-32 h-32 rounded-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = "https://picsum.photos/800/800";
            }}
          />
        </div>
        <Button
          type="default"
          icon={<FontAwesomeIcon icon={faCamera} />}
          onClick={handleUploadClick}
          className="mb-4"
          disabled={isLoading}>
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

export default UpdateAvatarGroupModal;
