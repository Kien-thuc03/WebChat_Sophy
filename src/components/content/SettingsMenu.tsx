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
import { Menu } from "antd";
import type { MenuProps } from "antd";

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
      icon: <FontAwesomeIcon icon={faUser} />,
      label: "Thông tin tài khoản",
      onClick: onOpenModal, // Open modal on click
    },
    {
      key: "2",
      icon: <FontAwesomeIcon icon={faGear} />,
      label: "Cài đặt",
      onClick: () => {
        console.log("Cài đặt clicked"); // Debugging log
        openSettingsModal(); // Call the function
      },
    },
    {
      type: "divider", // Divider between sections
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
            onClose();
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
            onClose();
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
            onClose();
          },
        },
        {
          key: "5-2",
          label: "Liên hệ",
          onClick: () => {
            console.log("Liên hệ clicked");
            onClose();
          },
        },
        {
          key: "5-3",
          label: "Gửi file log tới Sophy",
          onClick: () => {
            console.log("Gửi file log tới Sophy clicked");
            onClose();
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
        handleLogout(); // Log out and close menu
      },
    },
  ];

  return (
    <div className="absolute left-58 bottom-15 transform translate-x-[-100%] ml-3 w-58 p-2 bg-white ">
      <Menu
        items={items}
        mode="vertical"
        theme="light"
        className="rounded-lg"
      />
    </div>
  );
};

export default SettingsMenu;
