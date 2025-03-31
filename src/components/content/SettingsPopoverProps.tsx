import React from "react";
import { useAuth } from "../../features/auth/hooks/useAuth";
import { User } from "../../features/auth/types/authTypes";
import { logout } from "../../api/API";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPenToSquare } from "@fortawesome/free-solid-svg-icons";
import { Menu } from "antd";
import type { MenuProps } from "antd";

interface SettingsPopoverProps {
  onLogout: () => void; // Function to handle logout
  onProfileClick: () => void; // Function to handle profile click
  onUpgradeClick: () => void; // Function to handle upgrade account click
}

const SettingsPopover: React.FC<SettingsPopoverProps> = ({
  onLogout,
  onProfileClick,
  onUpgradeClick,
}) => {
  const { user } = useAuth() as { user: User | null }; // Move useAuth inside the component

  const handleLogout = async () => {
    try {
      await logout();
      alert("Đăng xuất thành công!");
      window.location.href = "/"; // Redirect to login page after logout
    } catch (error: unknown) {
      if (error instanceof Error) {
        alert(error.message || "Đăng xuất thất bại, vui lòng thử lại.");
      } else {
        alert("Đăng xuất thất bại, vui lòng thử lại.");
      }
    }
  };

  // Define menu items
  const items: MenuProps["items"] = [
    {
      key: "1",

      label: (
        <span className="text-gray-700 font-large font-semibold text-lg">
          {user?.fullname || "Tên người dùng"}
        </span>
      ),
    },
    {
      type: "divider",
    },
    {
      key: "2",
      icon: <FontAwesomeIcon icon={faPenToSquare} />,
      label: "Nâng cấp tài khoản",
      onClick: onUpgradeClick,
    },
    {
      key: "3",

      label: "Hồ sơ của bạn",
      onClick: onProfileClick,
    },
    {
      key: "4",

      label: "Cài đặt",
    },
    {
      type: "divider",
    },
    {
      key: "5",

      label: <span className="text-red-600">Đăng xuất</span>,
      onClick: () => {
        onLogout();
        handleLogout();
      },
    },
  ];

  return (
    <div className="bg-white shadow-lg rounded-lg w-64 p-4">
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
