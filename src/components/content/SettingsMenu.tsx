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

interface SettingsMenuProps {
  onClose: () => void;
  onOpenModal: () => void;
  openSettingsModal: () => void;
}

const SettingsMenu: React.FC<SettingsMenuProps> = ({
  onClose,
  onOpenModal,
  openSettingsModal, // Add this prop
}) => {
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // Remove handleOpenSettingsModal function

  const handleCloseSettingsModal = () => {
    setIsSettingsModalOpen(false);
  };
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

  // Update the settings menu item to use openSettingsModal prop
  const items: MenuProps["items"] = [
    {
      key: "1",
      icon: <FontAwesomeIcon icon={faUser} />,
      label: "Thông tin tài khoản",
      onClick: onOpenModal,
    },
    {
      key: "2",
      icon: <FontAwesomeIcon icon={faGear} />,
      label: "Cài đặt",
      onClick: openSettingsModal, // Use the prop instead of local handler
    },
    {
      type: "divider",
    },
    {
      key: "3",
      icon: <FontAwesomeIcon icon={faDatabase} />,
      label: "Dữ liệu",
      children: [
        {
          key: "3-1",
          icon: <FontAwesomeIcon icon={faFileAlt} />,
          label: "Quản lý file",
          onClick: () => {
            console.log("Quản lý file clicked");
          },
        },
      ],
    },
    {
      key: "4",
      icon: <FontAwesomeIcon icon={faLanguage} />,
      label: "Ngôn ngữ",
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
              Tiếng Việt
            </div>
          ),
          onClick: () => {
            // Không đóng menu khi chọn ngôn ngữ
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
              English
            </div>
          ),
          onClick: () => {
            // Không đóng menu khi chọn ngôn ngữ
          },
        },
      ],
    },
    {
      key: "5",
      icon: <FontAwesomeIcon icon={faHeadset} />,
      label: "Hỗ trợ",
      children: [
        {
          key: "5-1",
          label: "Thông tin phiên bản",
          onClick: () => {
            console.log("Thông tin phiên bản clicked");
          },
        },
        {
          key: "5-2",
          label: "Liên hệ",
          onClick: () => {
            console.log("Liên hệ clicked");
          },
        },
        {
          key: "5-3",
          label: "Gửi file log tới Sophy",
          onClick: () => {
            console.log("Gửi file log tới Sophy clicked");
          },
        },
      ],
    },
    {
      type: "divider", // Divider before logout
    },
    {
      key: "6",
      icon: <i className="fa fa-sign-out-alt text-lg"></i>,
      label: <span className="text-red-500">Đăng xuất</span>,
      onClick: () => {
        onClose();
        handleLogout();
      },
    },
  ];

  return (
    <>
      <div className="absolute left-58 bottom-15 transform translate-x-[-100%] ml-3 w-58 p-2 bg-white ">
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
