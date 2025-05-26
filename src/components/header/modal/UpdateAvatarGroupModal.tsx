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
  onUpdate: (data: { url: string; file: File | null }) => Promise<void>;
}

const UpdateAvatarGroupModal: React.FC<UpdateAvatarGroupModalProps> = ({
  isOpen,
  onClose,
  currentAvatar,
  onUpdate,
}) => {
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t, language } = useLanguage();
  const { message } = App.useApp();

  // Effect for language change
  useEffect(() => {
    // Re-render component when language changes
  }, [language]);

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
    setUploadProgress(0);

    // Start a progress simulation
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        const newProgress = prev + Math.floor(Math.random() * 15);
        return newProgress > 90 ? 90 : newProgress; // Cap at 90% until complete
      });
    }, 300);

    try {
      // Wait for the upload to complete
      await onUpdate({
        url: previewImage || currentAvatar,
        file: selectedFile,
      });

      // Set progress to 100% when complete
      clearInterval(progressInterval);
      setUploadProgress(100);

      // Show success message
      message.success(
        t.update_group_avatar_success ||
          "Cập nhật ảnh đại diện nhóm thành công!"
      );

      // Wait a moment before closing so user can see 100% progress
      setTimeout(() => {
        setIsLoading(false);
        onClose();
      }, 500);
    } catch (error) {
      // Clear the progress interval
      clearInterval(progressInterval);
      setUploadProgress(0);
      setIsLoading(false);

      message.error(
        t.update_group_avatar_error || "Cập nhật ảnh đại diện nhóm thất bại!"
      );
      console.error("Error updating group avatar:", error);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleCancel = () => {
    if (isLoading) {
      return; // Prevent closing while uploading
    }
    setPreviewImage(null);
    setSelectedFile(null);
    onClose();
  };

  // Only use previewImage or currentAvatar, no more placeholder
  const displayImage = previewImage || currentAvatar || "";
  const hasImage = !!displayImage;

  return (
    <Modal
      title={t.update_group_avatar || "Cập nhật ảnh đại diện nhóm"}
      open={isOpen}
      onCancel={handleCancel}
      maskClosable={!isLoading}
      closable={!isLoading}
      footer={[
        <Button key="cancel" onClick={handleCancel} disabled={isLoading}>
          {t.cancel || "Hủy"}
        </Button>,
        <Button
          key="update"
          type="primary"
          onClick={handleUpdate}
          loading={isLoading}
          disabled={isLoading || !selectedFile}>
          {isLoading
            ? `${t.loading || "Đang cập nhật"}... ${uploadProgress}%`
            : t.update || "Cập nhật"}
        </Button>,
      ]}
      zIndex={1002}
      wrapClassName="custom-modal">
      <div className="flex flex-col items-center">
        <div className="mb-4 relative">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 rounded-full z-10">
              <Spin size="large" />
            </div>
          )}
          {hasImage ? (
            <img
              src={displayImage}
              alt="Group Avatar Preview"
              className="w-32 h-32 rounded-full object-cover"
            />
          ) : (
            <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
              {t.no_avatar || "Chưa có ảnh"}
            </div>
          )}
        </div>

        {isLoading && (
          <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        )}

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
          disabled={isLoading}
          className="hidden"
        />
      </div>
    </Modal>
  );
};

export default UpdateAvatarGroupModal;
