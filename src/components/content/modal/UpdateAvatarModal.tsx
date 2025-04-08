import React, { useState, useRef } from "react";
import { Modal, Button, message } from "antd";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCamera } from "@fortawesome/free-solid-svg-icons";
import { updateUserAvatar } from "../../../api/API"; // Import hàm API

interface UpdateAvatarModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAvatar: string; // URL ảnh hiện tại
  onUpdate: (newAvatar: string) => void; // Callback để cập nhật avatar
}

const UpdateAvatarModal: React.FC<UpdateAvatarModalProps> = ({
  isOpen,
  onClose,
  currentAvatar,
  onUpdate,
}) => {
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null); // Lưu file ảnh đã chọn
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Xử lý khi người dùng chọn ảnh mới
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setPreviewImage(imageUrl);
      setSelectedFile(file); // Lưu file ảnh đã chọn
    }
  };

  // Xử lý khi nhấn nút "Cập nhật"
  const handleUpdate = async () => {
    if (!selectedFile) {
      message.error("Vui lòng chọn ảnh mới trước khi cập nhật!");
      return;
    }

    try {
      // Gọi API để cập nhật avatar
      await updateUserAvatar(selectedFile);
      message.success("Cập nhật ảnh đại diện thành công!");

      // Gọi callback để cập nhật avatar trong giao diện
      onUpdate(previewImage || currentAvatar);

      // Đóng modal
      onClose();
    } catch (error) {
      message.error("Cập nhật ảnh đại diện thất bại!");
      console.error("Error updating avatar:", error);
    }
  };

  // Mở file input khi nhấn nút "Tải lên từ máy tính"
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <Modal
      title="Cập nhật ảnh đại diện"
      open={isOpen}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Hủy
        </Button>,
        <Button key="update" type="primary" onClick={handleUpdate}>
          Cập nhật
        </Button>,
      ]}>
      <div className="flex flex-col items-center">
        {/* Hiển thị ảnh hiện tại hoặc ảnh preview */}
        <div className="mb-4">
          <img
            src={previewImage || currentAvatar}
            alt="Avatar Preview"
            className="w-32 h-32 rounded-full object-cover"
          />
        </div>

        {/* Nút "Tải lên từ máy tính" */}
        <Button
          type="default"
          icon={<FontAwesomeIcon icon={faCamera} />}
          onClick={handleUploadClick}
          className="mb-4">
          Tải lên từ máy tính
        </Button>

        {/* Input file ẩn */}
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
