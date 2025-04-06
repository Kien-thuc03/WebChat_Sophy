import { Modal, Radio, Select } from "antd";
import { useState } from "react";

const SettingsModal: React.FC<{ visible: boolean; onClose: () => void }> = ({
  visible,
  onClose,
}) => {
  const [contactDisplay, setContactDisplay] = useState("active");
  const [language, setLanguage] = useState("vi");

  return (
    <Modal
      title={
        <div className="flex items-center">
          <span className="text-lg font-semibold">Cài đặt</span>
        </div>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={600}
      className="settings-modal"
    >
      <div className="space-y-6 p-4">
        {/* Danh bạ section */}
        <div>
          <h3 className="text-base font-medium mb-2">Danh bạ</h3>
          <p className="text-sm text-gray-500 mb-4">
            Danh sách bạn bè được hiển thị trong danh bạ
          </p>
          <Radio.Group 
            value={contactDisplay} 
            onChange={(e) => setContactDisplay(e.target.value)}
            className="flex flex-col space-y-2"
          >
            <Radio value="all">Hiển thị tất cả bạn bè</Radio>
            <Radio value="active">Chỉ hiển thị bạn bè đang sử dụng Sophy</Radio>
          </Radio.Group>
        </div>

        {/* Ngôn ngữ section */}
        <div>
          <h3 className="text-base font-medium mb-2">Ngôn ngữ</h3>
          <div className="flex items-center space-x-4">
            <span className="text-sm">Thay đổi ngôn ngữ</span>
            <Select
              value={language}
              onChange={(value) => setLanguage(value)}
              style={{ width: 120 }}
              options={[
                { value: 'vi', label: 'Tiếng Việt' },
                { value: 'en', label: 'English' },
              ]}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default SettingsModal;
