import {
  Button,
  Checkbox,
  ConfigProvider,
  Modal,
  Radio,
  Select,
  Switch,
  theme,

} from "antd";
import { useEffect, useState } from "react";
import ChangePasswordModal from "./ChangePasswordModal";
import BlockModal from "./BlockModal"; // Import the new BlockModal
import {
  SettingOutlined,
  LockOutlined,
  BellOutlined,
  MessageOutlined,
  AppstoreOutlined,
} from "@ant-design/icons";
import { useLanguage } from "../../../features/auth/context/LanguageContext";

const SettingsModal: React.FC<{ visible: boolean; onClose: () => void }> = ({
  visible,
  onClose,
}) => {
  const [contactDisplay, setContactDisplay] = useState("active");
  const [selectedMenu, setSelectedMenu] = useState("general");
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] =
    useState(false);
  const [themeMode, setThemeMode] = useState<"light" | "dark" | "system">(
    (localStorage.getItem("themeMode") as "light" | "dark" | "system") ||
      "light"
  );
  const [useAvatarAsBackground, setUseAvatarAsBackground] = useState(
    localStorage.getItem("useAvatarAsBackground") === "true" || false
  );
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false); // State for BlockModal
  const { language, setLanguage, t } = useLanguage();

  const getThemeConfig = () => {
    if (themeMode === "dark") {
      return {
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: "#1890ff",
        },
      };
    }
    // For both "light" and "system", use light theme
    return {
      algorithm: theme.defaultAlgorithm,
      token: {
        colorPrimary: "#1890ff",
      },
    };
  };

  useEffect(() => {
    localStorage.setItem("themeMode", themeMode);

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemThemeChange = () => {
      if (themeMode === "system") {
        setThemeMode("system");
      }
    };
    mediaQuery.addEventListener("change", handleSystemThemeChange);
    return () =>
      mediaQuery.removeEventListener("change", handleSystemThemeChange);
  }, [themeMode]);

  useEffect(() => {
    localStorage.setItem(
      "useAvatarAsBackground",
      useAvatarAsBackground.toString()
    );
    console.log("Use Avatar as Background:", useAvatarAsBackground);
  }, [useAvatarAsBackground]);

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
              <h3 className="text-base font-medium mb-2 text-gray-800">
                {t.contacts}
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                {t.contacts_description}
              </p>
              <Radio.Group
                value={contactDisplay}
                onChange={(e) => setContactDisplay(e.target.value)}
                className="flex flex-col space-y-3">
                <Radio value="all" className="text-sm">
                  {t.show_all_friends}
                </Radio>
                <Radio value="active" className="text-sm">
                  {t.show_active_friends}
                </Radio>
              </Radio.Group>
            </div>
            <div>
              <h3 className="text-base font-medium mb-2 text-gray-800">
                {t.language}
              </h3>
              <div className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
                <span className="text-sm text-gray-700">
                  {t.change_language}
                </span>
                <Select
                  value={language}
                  onChange={(value) => setLanguage(value as "vi" | "en")}
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
                  <h4 className="text-sm font-medium">{t.show_birthdate}</h4>
                  <p className="text-xs text-gray-500">
                    {t.show_birthdate_desc}
                  </p>
                </div>
                <Switch size="small" />
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="text-sm font-medium">
                    {t.show_read_receipts}
                  </h4>
                  <p className="text-xs text-gray-500">
                    {t.show_read_receipts_desc}
                  </p>
                </div>
                <Switch size="small" />
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="text-sm font-medium">
                    {t.allow_strangers_find}
                  </h4>
                  <p className="text-xs text-gray-500">
                    {t.allow_strangers_find_desc}
                  </p>
                </div>
                <Switch size="small" />
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="text-sm font-medium">{t.block_messages}</h4>
                  <p className="text-xs text-gray-500">
                    {t.block_messages_desc}
                  </p>
                </div>
                <Button
                  type="link"
                  size="small"
                  onClick={() => setIsBlockModalOpen(true)} // Open BlockModal
                >
                  {t.block_list}
                </Button>
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="text-sm font-medium">
                    {t.allow_strangers_connect}
                  </h4>
                  <p className="text-xs text-gray-500">
                    {t.allow_strangers_connect_desc}
                  </p>
                </div>
                <Checkbox.Group
                  options={[
                    { label: t.qr_code, value: "qr" },
                    { label: t.common_groups, value: "groups" },
                    { label: t.zalo_card, value: "zalo_card" },
                    { label: t.suggested_friends, value: "suggested" },
                  ]}
                />
              </div>
            </div>
          </div>
        );
      case "security":
        return (
          <div className="p-4">
            <h3 className="text-base font-medium mb-2">{t.privacy}</h3>
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="text-sm font-medium">{t.change_password}</h4>
                  <p className="text-xs text-gray-500">
                    {t.change_password_desc}
                  </p>
                </div>
                <Button
                  type="link"
                  size="small"
                  onClick={() => setIsChangePasswordModalOpen(true)}
                >
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
      case "interface":
        return (
          <div className="p-4">
            <div className="mb-6">
              <h3 className="text-base font-medium mb-2 text-gray-800">
                {t.interface}
              </h3>
              <Radio.Group
                value={themeMode}
                onChange={(e) => setThemeMode(e.target.value)}
                className="flex flex-col space-y-3">
                <Radio value="light" className="text-sm">
                  {t.light || "Light"}
                </Radio>
                <Radio value="dark" className="text-sm">
                  {t.dark || "Dark"}
                </Radio>
                <Radio value="system" className="text-sm">
                  {t.system || "System"}
                </Radio>
              </Radio.Group>
            </div>
            <div>
              <h3 className="text-base font-medium mb-2 text-gray-800">
                {t.chat_background || "Chat Background"}
              </h3>
              <div className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
                <span className="text-sm text-gray-700">
                  {t.use_avatar_as_background ||
                    "Use Avatar as Chat Background"}
                </span>
                <Switch
                  checked={useAvatarAsBackground}
                  onChange={setUseAvatarAsBackground}
                />
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
    <ConfigProvider theme={getThemeConfig()}>
      <Modal
        title={
          <div className="flex items-center">
            <span className="text-lg font-semibold">{t.settings}</span>
          </div>
        }
        open={visible}
        onCancel={handleCancel}
        maskClosable={true}
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
                  selectedMenu === item.key
                    ? "bg-blue-50 text-blue-600 font-medium"
                    : "text-gray-700 hover:bg-gray-100"
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

      {/* Block Modal */}
      <BlockModal
        visible={isBlockModalOpen}
        onClose={() => setIsBlockModalOpen(false)}
        t={t}
      />

      <ChangePasswordModal
        visible={isChangePasswordModalOpen}
        onClose={() => setIsChangePasswordModalOpen(false)}
      />
    </ConfigProvider>
  );
};

export default SettingsModal;