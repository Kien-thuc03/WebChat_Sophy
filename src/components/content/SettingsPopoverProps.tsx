import React from "react";
import { useAuth } from "../../features/auth/hooks/useAuth";
import { User } from "../../features/auth/types/authTypes";
import { logout } from "../../api/API";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPenToSquare } from "@fortawesome/free-solid-svg-icons";
import { Menu, Modal } from "antd";
import type { MenuProps } from "antd";

interface SettingsPopoverProps {
  onLogout: () => void;
  onOpenModal: () => void;
  onUpgradeClick: () => void;
  openSettingsModal: () => void;
}

const SettingsPopover: React.FC<SettingsPopoverProps> = ({
  onLogout,
  onOpenModal,
  onUpgradeClick,
  openSettingsModal,
}) => {
  const { user } = useAuth() as { user: User | null };

  const handleLogout = async () => {
    Modal.confirm({
      title: "Xác nhận đăng xuất",
      content: "Bạn có chắc chắn muốn đăng xuất không?",
      okText: "Đồng ý",
      cancelText: "Hủy",
      onOk: async () => {
        try {
          await logout();
          Modal.success({
            title: "Đăng xuất thành công",
            content: "Bạn đã đăng xuất thành công!",
            onOk: () => {
              window.location.href = "/";
            },
          });
        } catch (error: unknown) {
          Modal.error({
            title: "Đăng xuất thất bại",
            content:
              error instanceof Error
                ? error.message
                : "Đăng xuất thất bại, vui lòng thử lại.",
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
            Nâng cấp tài khoản
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
          Hồ sơ của bạn
        </span>
      ),
      onClick: onOpenModal,
    },
    {
      key: "4",
      label: (
        <span className="text-gray-700 font-large font-medium">Cài đặt</span>
      ),
      onClick: openSettingsModal,
    },
    { type: "divider" },
    {
      key: "5",
      label: <span className="text-red-600 font-large">Đăng xuất</span>,
      onClick: () => {
        onLogout();
        handleLogout();
      },
    },
  ];

  return (
    <div className="bg-white w-64 p-4 shadow-[0_0_15px_rgba(0,0,0,0.2)] rounded-lg">
      <Menu
        items={items}
        mode="vertical"
        theme="light"
        className="rounded-lg"
      />
    </div>
  );
};

export default SettingsPopover;
