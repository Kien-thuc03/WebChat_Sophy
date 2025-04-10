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
import { useState } from "react";
import { useLanguage } from "../../features/auth/context/LanguageContext"; // Điều chỉnh đường dẫn nếu cần

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
  const { t, setLanguage } = useLanguage(); // Sử dụng context

  const handleCloseSettingsModal = () => {
    setIsSettingsModalOpen(false);
  };

  const handleLogout = async () => {
    Modal.confirm({
      title: t.logout_confirm_title || "Xác nhận đăng xuất",
      content:
        t.logout_confirm_content || "Bạn có chắc chắn muốn đăng xuất không?",
      okText: t.agree || "Đồng ý",
      cancelText: t.cancel || "Hủy",
      onOk: async () => {
        try {
          await logout();
          Modal.success({
            title: t.logout_success_title || "Đăng xuất thành công",
            content: t.logout_success_content || "Bạn đã đăng xuất thành công!",
            onOk: () => {
              window.location.href = "/";
            },
          });
        } catch (error: unknown) {
          Modal.error({
            title: t.logout_error_title || "Đăng xuất thất bại",
            content:
              error instanceof Error
                ? error.message
                : t.logout_error_content ||
                  "Đăng xuất thất bại, vui lòng thử lại.",
          });
        }
      },
    });
  };

  const handleLanguageChange = (lang: "vi" | "en") => {
    console.log("Language changed to:", lang); // Debug
    setLanguage(lang);
  };

  const items: MenuProps["items"] = [
    {
      key: "1",
      icon: <FontAwesomeIcon icon={faUser} />,
      label: t.account_info || "Thông tin tài khoản",
      onClick: () => {
        onOpenModal();
        onClose(); // Đóng menu sau khi click
      },
    },
    {
      key: "2",
      icon: <FontAwesomeIcon icon={faGear} />,
      label: t.settings || "Cài đặt",
      onClick: () => {
        openSettingsModal();
        onClose(); // Đóng menu sau khi click
      },
    },
    { type: "divider" },
    {
      key: "3",
      icon: <FontAwesomeIcon icon={faDatabase} />,
      label: t.data || "Dữ liệu",
      children: [
        {
          key: "3-1",
          icon: <FontAwesomeIcon icon={faFileAlt} />,
          label: t.file_management || "Quản lý file",
          onClick: () => {
            console.log("Quản lý file clicked");
            onClose(); // Đóng menu sau khi click
          },
        },
      ],
    },
    {
      key: "4",
      icon: <FontAwesomeIcon icon={faLanguage} />,
      label: t.language || "Ngôn ngữ",
      children: [
        {
          key: "4-1",
          label: (
            <div className="flex items-center">
              <img
                src="https://flagcdn.com/w40/vn.png"
                alt="Vietnam Flag"
                className="w-6 h-4 mr-2 object-cover"
              />
              {t.vietnamese || "Tiếng Việt"}
            </div>
          ),
          onClick: () => {
            handleLanguageChange("vi");
            onClose(); // Đóng menu sau khi chọn
          },
        },
        {
          key: "4-2",
          label: (
            <div className="flex items-center">
              <img
                src="https://flagcdn.com/w40/gb.png"
                alt="English Flag"
                className="w-6 h-4 mr-2 object-cover"
              />
              {t.english || "English"}
            </div>
          ),
          onClick: () => {
            handleLanguageChange("en");
            onClose(); // Đóng menu sau khi chọn
          },
        },
      ],
    },
    {
      key: "5",
      icon: <FontAwesomeIcon icon={faHeadset} />,
      label: t.support || "Hỗ trợ",
      children: [
        {
          key: "5-1",
          label: t.version_info || "Thông tin phiên bản",
          onClick: () => {
            console.log("Thông tin phiên bản clicked");
            onClose(); // Đóng menu sau khi click
          },
        },
        {
          key: "5-2",
          label: t.contact || "Liên hệ",
          onClick: () => {
            console.log("Liên hệ clicked");
            onClose(); // Đóng menu sau khi click
          },
        },
        {
          key: "5-3",
          label: t.send_log || "Gửi file log tới Sophy",
          onClick: () => {
            console.log("Gửi file log tới Sophy clicked");
            onClose(); // Đóng menu sau khi click
          },
        },
      ],
    },
    { type: "divider" },
    {
      key: "6",
      icon: <i className="fa fa-sign-out-alt text-lg"></i>,
      label: <span className="text-red-500">{t.logout || "Đăng xuất"}</span>,
      onClick: () => {
        onClose();
        handleLogout();
      },
    },
  ];

  return (
    <>
      <div className="absolute left-58 bottom-15 transform translate-x-[-100%] ml-3 w-58 p-2 bg-white">
        <Menu
          items={items}
          mode="vertical"
          theme="light"
          className="rounded-lg"
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
