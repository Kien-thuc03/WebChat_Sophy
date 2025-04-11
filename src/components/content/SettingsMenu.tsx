import { logout } from "../../api/API";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faDatabase,
  faFileAlt,
  faGear,
  faHeadset,
  faLanguage,
  faUser,
} from "@fortawesome/free-solid-svg-icons";
import { Menu, Modal } from "antd";
import type { MenuProps } from "antd";
import SettingsModal from "./modal/SettingsModal";
import { useState, useEffect } from "react";
import { useLanguage } from "../../features/auth/context/LanguageContext";
import type { MenuInfo } from "rc-menu/lib/interface";

interface SettingsMenuProps {
  onClose: () => void;
  onOpenModal: () => void;
  openSettingsModal: () => void;
}

const SettingsMenu: React.FC<SettingsMenuProps> = ({
  onClose,
  onOpenModal,
  openSettingsModal,
}) => {
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const { t, language, setLanguage } = useLanguage();

  // Log khi language thay đổi
  useEffect(() => {
    console.log("Current language in SettingsMenu:", language);
  }, [language]);

  const handleCloseSettingsModal = () => {
    setIsSettingsModalOpen(false);
  };

  const handleLogout = async () => {
    Modal.confirm({
      title: t.logout_confirm_title || "Confirm Logout",
      content: t.logout_confirm_content || "Are you sure you want to log out?",
      okText: t.agree || "Agree",
      cancelText: t.cancel || "Cancel",
      onOk: async () => {
        try {
          await logout();
          window.location.href = "/";
        } catch (error: unknown) {
          Modal.error({
            title: t.logout_error_title || "Logout Failed",
            content:
              error instanceof Error
                ? error.message
                : t.logout_error_content || "Logout failed, please try again.",
          });
        }
      },
    });
  };

  const handleLanguageChange = (lang: "vi" | "en", e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      console.log("Event stopped in handleLanguageChange for:", lang);
    }
    console.log("handleLanguageChange called with:", lang);
    try {
      setLanguage(lang);
      console.log("setLanguage called successfully with:", lang);
    } catch (error) {
      console.error("Error in setLanguage:", error);
    }
    onClose();
  };

  const items: MenuProps["items"] = [
    {
      key: "1",
      icon: <FontAwesomeIcon icon={faUser} />,
      label: t.account_info || "Account Information",
      onClick: () => {
        console.log("Account info clicked");
        onOpenModal();
        onClose();
      },
    },
    {
      key: "2",
      icon: <FontAwesomeIcon icon={faGear} />,
      label: t.settings || "Settings",
      onClick: () => {
        console.log("Settings clicked");
        openSettingsModal();
        onClose();
      },
    },
    { type: "divider" },
    {
      key: "3",
      icon: <FontAwesomeIcon icon={faDatabase} />,
      label: t.data || "Data",
      children: [
        {
          key: "3-1",
          icon: <FontAwesomeIcon icon={faFileAlt} />,
          label: t.file_management || "File Management",
          onClick: () => {
            console.log("File management clicked");
            onClose();
          },
        },
      ],
    },
    {
      key: "4",
      icon: <FontAwesomeIcon icon={faLanguage} />,
      label: t.language || "Language",
      children: [
        {
          key: "4-1",
          label: (
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center">
                <img
                  src="https://flagcdn.com/w40/vn.png"
                  alt="Vietnam Flag"
                  className="w-6 h-4 mr-2 object-cover"
                />
                {t.vietnamese || "Vietnamese"}
              </div>
              {language === "vi" && <span className="text-blue-500">✓</span>}
            </div>
          ),
          onClick: (info: MenuInfo) => {
            console.log("Tiếng Việt clicked", info);
            if (info.domEvent instanceof MouseEvent) {
              handleLanguageChange("vi", info.domEvent as React.MouseEvent);
            } else {
              handleLanguageChange("vi");
            }
          },
          style: language === "vi" ? { backgroundColor: "#e6f7ff" } : {},
        },
        {
          key: "4-2",
          label: (
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center">
                <img
                  src="https://flagcdn.com/w40/gb.png"
                  alt="English Flag"
                  className="w-6 h-4 mr-2 object-cover"
                />
                {t.english || "English"}
              </div>
              {language === "en" && <span className="text-blue-500">✓</span>}
            </div>
          ),
          onClick: (info: MenuInfo) => {
            console.log("English clicked", info);
            if (info.domEvent instanceof MouseEvent) {
              handleLanguageChange("en", info.domEvent as React.MouseEvent);
            } else {
              handleLanguageChange("en");
            }
          },
          style: language === "en" ? { backgroundColor: "#e6f7ff" } : {},
        },
      ],
    },
    {
      key: "5",
      icon: <FontAwesomeIcon icon={faHeadset} />,
      label: t.support || "Support",
      children: [
        {
          key: "5-1",
          label: t.version_info || "Version Information",
          onClick: () => {
            console.log("Version info clicked");
            onClose();
          },
        },
        {
          key: "5-2",
          label: t.contact || "Contact",
          onClick: () => {
            console.log("Contact clicked");
            onClose();
          },
        },
        {
          key: "5-3",
          label: t.send_log || "Send Log File to Sophy",
          onClick: () => {
            console.log("Send log clicked");
            onClose();
          },
        },
      ],
    },
    { type: "divider" },
    {
      key: "6",
      icon: <i className="fa fa-sign-out-alt text-lg"></i>,
      label: <span className="text-red-500">{t.logout || "Log Out"}</span>,
      onClick: () => {
        console.log("Logout clicked");
        onClose();
        handleLogout();
      },
    },
  ];

  return (
    <>
      <div
        className="absolute left-58 bottom-15 transform translate-x-[-100%] ml-3 w-58 p-2 bg-white"
        onClick={(e) => {
          console.log("Menu container clicked");
          e.stopPropagation();
        }}
      >
        <Menu
          items={items}
          mode="vertical"
          theme="light"
          className="rounded-lg"
          selectable={false}
          onClick={(info) => {
            console.log("Menu item clicked:", info.key);
            info.domEvent.stopPropagation();
          }}
        />
      </div>
      <SettingsModal
        visible={isSettingsModalOpen}
        onClose={handleCloseSettingsModal}
      />
    </>
  );
};

export default SettingsMenu;