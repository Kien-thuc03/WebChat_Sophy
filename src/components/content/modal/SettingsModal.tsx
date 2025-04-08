import { Button, Modal, Radio, Select, Switch } from "antd";
import { useState } from "react";
import ChangePasswordModal from "./ChangePasswordModal";
import {
  SettingOutlined,
  LockOutlined,
  BellOutlined,
  MessageOutlined,
  AppstoreOutlined,
} from "@ant-design/icons";

const SettingsModal: React.FC<{ visible: boolean; onClose: () => void }> = ({
  visible,
  onClose,
}) => {
  const [contactDisplay, setContactDisplay] = useState("active");
  const [language, setLanguage] = useState("vi");
  const [selectedMenu, setSelectedMenu] = useState("general");
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] =
    useState(false);

  console.log("SettingsModal render - visible:", visible); // Debug trạng thái visible

  const menuItems = [
    { key: "general", icon: <SettingOutlined />, label: "Cài đặt chung" },
    { key: "security", icon: <LockOutlined />, label: "Tài khoản và bảo mật" },
    { key: "privacy", icon: <LockOutlined />, label: "Quyền riêng tư" },
    { key: "sync", icon: <MessageOutlined />, label: "Đồng bộ tin nhắn" },
    { key: "data", icon: <AppstoreOutlined />, label: "Quản lý dữ liệu" },
    {
      key: "interface",
      icon: <AppstoreOutlined />,
      label: "Giao diện",
      extra: <span className="text-xs text-blue-500 ml-2">Beta</span>,
    },
    { key: "notifications", icon: <BellOutlined />, label: "Thông báo" },
    { key: "messages", icon: <MessageOutlined />, label: "Tin nhắn" },
    { key: "calls", icon: <AppstoreOutlined />, label: "Cài đặt cuộc gọi" },
    { key: "utilities", icon: <AppstoreOutlined />, label: "Tiện ích" },
  ];

  const renderContent = () => {
    switch (selectedMenu) {
      case "general":
        return (
          <div className="p-4">
            {/* Phần "Danh bạ" */}
            <div className="mb-6">
              <h3 className="text-base font-medium mb-2 text-gray-800">
                Danh bạ
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Danh sách bạn bè được hiển thị hiện thông trong danh bạ
              </p>
              <Radio.Group
                value={contactDisplay}
                onChange={(e) => setContactDisplay(e.target.value)}
                className="flex flex-col space-y-3">
                <Radio value="all" className="text-sm text-gray-700">
                  Hiển thị tất cả bạn bè
                </Radio>
                <Radio value="active" className="text-sm text-gray-700">
                  Chỉ hiển thị bạn bè đang sử dụng Zalo
                </Radio>
              </Radio.Group>
            </div>

            {/* Phần "Ngôn ngữ" */}
            <div>
              <h3 className="text-base font-medium mb-2 text-gray-800">
                Ngôn ngữ
              </h3>
              <div className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
                <span className="text-sm text-gray-700">Thay đổi ngôn ngữ</span>
                <Select
                  value={language}
                  onChange={(value) => setLanguage(value)}
                  style={{ width: 120 }}
                  options={[
                    { value: "vi", label: "Tiếng Việt" },
                    { value: "en", label: "English" },
                  ]}
                  suffixIcon={<span className="text-gray-400">▼</span>}
                />
              </div>
            </div>
          </div>
        );
      case "privacy":
        return (
          <div>
            <h3 className="text-base font-medium mb-2">Quyền riêng tư</h3>
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="text-sm font-medium">Đổi mật khẩu</h4>
                  <p className="text-xs text-gray-500">
                    Thay đổi mật khẩu đăng nhập của bạn
                  </p>
                </div>
                <Button
                  type="link"
                  size="small"
                  onClick={() => setIsChangePasswordModalOpen(true)}>
                  Đổi mật khẩu
                </Button>
              </div>

              <div className="flex justify-between items-center">
                <div>
                  <h4 className="text-sm font-medium">Khóa màn hình Zalo</h4>
                  <p className="text-xs text-gray-500">
                    Khóa màn hình khi không sử dụng
                  </p>
                </div>
                <Switch size="small" />
              </div>

              <div className="flex justify-between items-center">
                <div>
                  <h4 className="text-sm font-medium">Bảo mật 2 lớp</h4>
                  <p className="text-xs text-gray-500">
                    Sau khi bật, bạn sẽ được yêu cầu nhập mã OTP hoặc xác thực
                    từ thiết bị di động sau khi đăng nhập
                  </p>
                </div>
                <Switch size="small" />
              </div>
            </div>
          </div>
        );
      case "interface":
        return (
          <div>
            <h3 className="text-base font-medium mb-2">Giao diện</h3>
            <p className="text-sm text-gray-500">
              Tùy chỉnh giao diện ứng dụng
            </p>
          </div>
        );
      case "notifications":
        return (
          <div>
            <h3 className="text-base font-medium mb-2">Thông báo</h3>
            <p className="text-sm text-gray-500">Cài đặt thông báo</p>
          </div>
        );
      case "messages":
        return (
          <div>
            <h3 className="text-base font-medium mb-2">Tin nhắn</h3>
            <p className="text-sm text-gray-500">Cài đặt tin nhắn</p>
          </div>
        );
      case "utilities":
        return (
          <div>
            <h3 className="text-base font-medium mb-2">Tiện ích</h3>
            <p className="text-sm text-gray-500">Các tiện ích bổ sung</p>
          </div>
        );
      case "contacts":
        return (
          <div>
            <h3 className="text-base font-medium mb-2">Danh bạ</h3>
            <p className="text-sm text-gray-500 mb-4">
              Danh sách bạn bè được hiển thị trong danh bạ
            </p>
            <Radio.Group
              value={contactDisplay}
              onChange={(e) => setContactDisplay(e.target.value)}
              className="flex flex-col space-y-2">
              <Radio value="all">Hiển thị tất cả bạn bè</Radio>
              <Radio value="active">
                Chỉ hiển thị bạn bè đang sử dụng Sophy
              </Radio>
            </Radio.Group>
          </div>
        );
      case "language":
        return (
          <div>
            <h3 className="text-base font-medium mb-2">Ngôn ngữ</h3>
            <div className="flex items-center space-x-4">
              <span className="text-sm">Thay đổi ngôn ngữ</span>
              <Select
                value={language}
                onChange={(value) => setLanguage(value)}
                style={{ width: 120 }}
                options={[
                  { value: "vi", label: "Tiếng Việt" },
                  { value: "en", label: "English" },
                ]}
              />
            </div>
          </div>
        );
      default:
        return (
          <div>
            <h3 className="text-base font-medium mb-2">Cài đặt chung</h3>
            <p className="text-sm text-gray-500">
              Các cài đặt chung của ứng dụng
            </p>
          </div>
        );
    }
  };

  const handleMenuClick = (key: string, e: React.MouseEvent) => {
    e.preventDefault(); // Ngăn hành vi mặc định
    e.stopPropagation(); // Ngăn sự kiện lan ra ngoài
    setSelectedMenu(key);
  };

  const handleCancel = () => {
    console.log("onCancel triggered");
    onClose();
  };

  return (
    <>
      <Modal
        title={
          <div className="flex items-center">
            <span className="text-lg font-semibold">Cài đặt</span>
          </div>
        }
        open={visible}
        onCancel={handleCancel}
        maskClosable={false}
        destroyOnClose={true}
        footer={null}
        width={800}
        className="settings-modal">
        <div className="flex" onClick={(e) => e.stopPropagation()}>
          {" "}
          {/* Ngăn click trong Modal lan ra ngoài */}
          <div className="w-[200px] border-r border-[#f0f0f0]">
            {menuItems.map((item) => (
              <button
                key={item.key}
                onClick={(e) => handleMenuClick(item.key, e)}
                className={`w-full flex items-center px-4 py-2 text-left transition-colors duration-200 ${
                  selectedMenu === item.key
                    ? "bg-blue-50 text-blue-600 font-medium"
                    : "text-gray-700 hover:bg-gray-100"
                }`}>
                <span className="mr-2">{item.icon}</span>
                <span>{item.label}</span>
                {item.extra && <span className="ml-2">{item.extra}</span>}
              </button>
            ))}
          </div>
          <div className="flex-1 p-6">{renderContent()}</div>
        </div>
      </Modal>

      <ChangePasswordModal
        visible={isChangePasswordModalOpen}
        onClose={() => setIsChangePasswordModalOpen(false)}
      />
    </>
  );
};

export default SettingsModal;
