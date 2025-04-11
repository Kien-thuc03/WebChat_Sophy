import React from "react";
import { useAuth } from "../../features/auth/hooks/useAuth";
import { logout } from "../../api/API";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPenToSquare } from "@fortawesome/free-solid-svg-icons";
import { Menu, Modal } from "antd";
import type { MenuProps } from "antd";
import { useLanguage } from "../../features/auth/context/LanguageContext";

interface SettingsPopoverProps {
  onLogout: () => void;
  onOpenModal: () => void;
  onUpgradeClick: () => void;
  openSettingsModal: () => void;
  onClosePopover: () => void; // Thêm prop mới
}

const SettingsPopover: React.FC<SettingsPopoverProps> = ({
  onLogout,
  onOpenModal,
  onUpgradeClick,
  openSettingsModal,
  onClosePopover,
}) => {
  const { user } = useAuth();
  const { t } = useLanguage();

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
          window.location.href = "/";
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

  const items: MenuProps["items"] = [
    {
      key: "1",
      label: (
        <span className="text-gray-700 font-large font-semibold text-lg">
          {user?.fullname || "Tên người dùng"}
        </span>
      ),
    },
    { type: "divider" },
    {
      key: "2",
      label: (
        <div className="flex items-center justify-between">
          <span className="text-gray-700 font-large font-medium">
            {t.upgrade_account || "Nâng cấp tài khoản"}
          </span>
          <FontAwesomeIcon icon={faPenToSquare} className="ml-2" />
        </div>
      ),
      onClick: onUpgradeClick,
    },
    {
      key: "3",
      label: (
        <span className="text-gray-700 font-large font-medium">
          {t.your_profile || "Hồ sơ của bạn"}
        </span>
      ),
      onClick: onOpenModal,
    },
    {
      key: "4",
      label: (
        <span className="text-gray-700 font-large font-medium">
          {t.settings || "Cài đặt"}
        </span>
      ),
      onClick: () => {
        openSettingsModal();
        onClosePopover(); // Đóng popover
      },
    },
    { type: "divider" },
    {
      key: "5",
      label: (
        <span className="text-red-600 font-large">
          {t.logout || "Đăng xuất"}
        </span>
      ),
      onClick: () => {
        onLogout();
        handleLogout();
      },
    },
  ];

  return (
    <div className="bg-white w-64 p-4 shadow-[0_0_15px_rgba(0,0,0,0.2)]">
      <Menu items={items} />
    </div>
  );
};

export default SettingsPopover;