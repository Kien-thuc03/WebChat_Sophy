import { Button, Modal, Radio, Select, Switch } from "antd";
import { useEffect, useState } from "react";
import ChangePasswordModal from "./ChangePasswordModal";
import {
  SettingOutlined,
  LockOutlined,
  BellOutlined,
  MessageOutlined,
  AppstoreOutlined,
} from "@ant-design/icons";
import { useLanguage } from "../../../features/auth/context/LanguageContext"; // Import context

const SettingsModal: React.FC<{ visible: boolean; onClose: () => void }> = ({
  visible,
  onClose,
}) => {
  const [contactDisplay, setContactDisplay] = useState("active");
  const [selectedMenu, setSelectedMenu] = useState("general");
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const { language, setLanguage, t } = useLanguage(); // Sử dụng context

  const menuItems = [
    { key: "general", icon: <SettingOutlined />, label: t.general },
    { key: "security", icon: <LockOutlined />, label: t.security },
    { key: "privacy", icon: <LockOutlined />, label: t.privacy },
    { key: "sync", icon: <MessageOutlined />, label: t.sync },
    { key: "data", icon: <AppstoreOutlined />, label: t.data },
    {
      key: "interface",
      icon: <AppstoreOutlined />,
      label: t.interface,
      extra: <span className="text-xs text-blue-500 ml-2">Beta</span>,
    },
    { key: "notifications", icon: <BellOutlined />, label: t.notifications },
    { key: "messages", icon: <MessageOutlined />, label: t.messages },
    { key: "calls", icon: <AppstoreOutlined />, label: t.calls },
    { key: "utilities", icon: <AppstoreOutlined />, label: t.utilities },
  ];

  useEffect(() => {
    if (visible) {
      setSelectedMenu("general");
    }
  }, [visible]);

  const renderContent = () => {
    switch (selectedMenu) {
      case "general":
        return (
          <div className="p-4">
            <div className="mb-6">
              <h3 className="text-base font-medium mb-2 text-gray-800">{t.contacts}</h3>
              <p className="text-sm text-gray-500 mb-4">{t.contacts_description}</p>
              <Radio.Group
                value={contactDisplay}
                onChange={(e) => setContactDisplay(e.target.value)}
                className="flex flex-col space-y-3"
              >
                <Radio value="all" className="text-sm text-gray-700">{t.show_all_friends}</Radio>
                <Radio value="active" className="text-sm text-gray-700">{t.show_active_friends}</Radio>
              </Radio.Group>
            </div>
            <div>
              <h3 className="text-base font-medium mb-2 text-gray-800">{t.language}</h3>
              <div className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
                <span className="text-sm text-gray-700">{t.change_language}</span>
                <Select
                  value={language}
                  onChange={(value) => setLanguage(value as "vi" | "en")} // Cập nhật ngôn ngữ toàn cục
                  style={{ width: 120 }}
                  options={[
                    { value: "vi", label: t.vietnamese },
                    { value: "en", label: t.english },
                  ]}
                  suffixIcon={<span className="text-gray-400">▼</span>}
                />
              </div>
            </div>
          </div>
        );
      case "privacy":
        return (
          <div className="p-4">
            <h3 className="text-base font-medium mb-2">{t.privacy}</h3>
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="text-sm font-medium">{t.change_password}</h4>
                  <p className="text-xs text-gray-500">{t.change_password_desc}</p>
                </div>
                <Button type="link" size="small" onClick={() => setIsChangePasswordModalOpen(true)}>
                  {t.change_password}
                </Button>
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="text-sm font-medium">{t.lock_screen}</h4>
                  <p className="text-xs text-gray-500">{t.lock_screen_desc}</p>
                </div>
                <Switch size="small" />
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="text-sm font-medium">{t.two_factor}</h4>
                  <p className="text-xs text-gray-500">{t.two_factor_desc}</p>
                </div>
                <Switch size="small" />
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const handleMenuClick = (key: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedMenu(key);
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <>
      <Modal
        title={<div className="flex items-center"><span className="text-lg font-semibold">{t.settings}</span></div>}
        open={visible}
        onCancel={handleCancel}
        maskClosable={false}
        destroyOnClose={true}
        footer={null}
        width={800}
        className="settings-modal"
      >
        <div className="flex" onClick={(e) => e.stopPropagation()}>
          <div className="w-[200px] border-r border-[#f0f0f0]">
            {menuItems.map((item) => (
              <button
                key={item.key}
                onClick={(e) => handleMenuClick(item.key, e)}
                className={`w-full flex items-center px-4 py-2 text-left transition-colors duration-200 ${
                  selectedMenu === item.key ? "bg-blue-50 text-blue-600 font-medium" : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <span className="mr-2">{item.icon}</span>
                <span>{item.label}</span>
                {item.extra && <span className="ml-2">{item.extra}</span>}
              </button>
            ))}
          </div>
          <div className="flex-1 p-6">{renderContent()}</div>
        </div>
      </Modal>
      <ChangePasswordModal visible={isChangePasswordModalOpen} onClose={() => setIsChangePasswordModalOpen(false)} />
    </>
  );
};

export default SettingsModal;