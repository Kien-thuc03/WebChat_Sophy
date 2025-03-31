import React, { useState } from "react";
import { useAuth } from "../../features/auth/hooks/useAuth";
import { User } from "../../features/auth/types/authTypes";
import { logout } from "../../api/API";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPenToSquare } from "@fortawesome/free-solid-svg-icons";
import { Menu } from "antd";
import type { MenuProps } from "antd";
import SettingsModal from "./modal/SettingsModal";

interface SettingsPopoverProps {
  onLogout: () => void; // Function to handle logout
  onOpenModal: () => void; // Function to handle profile click
  onUpgradeClick: () => void; // Function to handle upgrade account click
}

const SettingsPopover: React.FC<SettingsPopoverProps> = ({
  onLogout,
  onOpenModal,
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

  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  const openSettingsModal = () => {
    setIsSettingsModalOpen(true); // Show the modal
  };

  const closeSettingsModal = () => {
    setIsSettingsModalOpen(false); // Hide the modal
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
        <span className="text-gray-700 font-large font-medium ">
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

      onClick: openSettingsModal, // Open the modal when clicked
    },
    {
      type: "divider",
    },
    {
      key: "5",

      label: <span className="text-red-600 font-large ">Đăng xuất</span>,
      onClick: () => {
        onLogout();
        handleLogout();
      },
    },
  ];

  return (
    <div className="bg-white  w-64 p-4">
      <Menu
        items={items}
        mode="vertical"
        theme="light"
        className="rounded-lg"
      />
      {/* SettingsModal */}
      <SettingsModal
        visible={isSettingsModalOpen}
        onClose={closeSettingsModal}
      />
    </div>
  );
};

export default SettingsPopover;
