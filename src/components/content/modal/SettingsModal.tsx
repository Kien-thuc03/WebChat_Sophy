import React from "react";
import { Modal } from "antd";

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ visible, onClose }) => {
  return (
    <Modal
      title="Cài đặt chung"
      visible={visible}
      onCancel={onClose} // Đóng modal khi nhấn nút "X" hoặc bên ngoài
      footer={null} // Không hiển thị footer
    >
      <p>Đây là nội dung của modal cài đặt chung.</p>
      {/* Thêm nội dung cài đặt tại đây */}
    </Modal>
  );
};

export default SettingsModal;
