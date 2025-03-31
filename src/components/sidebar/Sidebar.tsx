import React, { useState, useEffect, useRef } from "react";
import {
  FaComments,
  FaUserFriends,
  FaTasks,
  FaCloud,
  FaBriefcase,
  FaCog,
} from "react-icons/fa";
import { useAuth } from "../../features/auth/hooks/useAuth"; // Import hook auth
import SettingsPopover from "../content/SettingsPopoverProps"; // Import SettingsPopover
import SettingsMenu from "../content/SettingsMenu"; // Import SettingsMenu

interface SidebarProps {
  onSettingsClick?: () => void;
}

const Sidebar: React.FC<SidebarProps> = () => {
  const { user } = useAuth(); // Lấy thông tin user từ context
  const [active, setActive] = useState("chat"); // Lưu trạng thái mục được chọn
  const [isPopoverOpen, setIsPopoverOpen] = useState(false); // Trạng thái hiển thị SettingsPopover
  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false); // Trạng thái hiển thị SettingsMenu
  const popoverRef = useRef<HTMLDivElement | null>(null); // Ref cho SettingsPopover
  const settingsMenuRef = useRef<HTMLDivElement | null>(null); // Ref cho SettingsMenu
  const settingsButtonRef = useRef<HTMLDivElement | null>(null); // Ref cho nút Settings (FaCog)

  // Toggle popover visibility
  const togglePopover = () => {
    setIsPopoverOpen((prev) => !prev);
  };

  // Toggle settings menu visibility
  const toggleSettingsMenu = () => {
    setIsSettingsMenuOpen((prev) => !prev);
    setActive("settings"); // Đặt trạng thái active cho settings
  };

  // Đóng popover và menu cài đặt khi nhấp ra ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Kiểm tra popover
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node)
      ) {
        setIsPopoverOpen(false);
      }

      // Kiểm tra menu cài đặt
      if (
        settingsMenuRef.current &&
        !settingsMenuRef.current.contains(event.target as Node) &&
        settingsButtonRef.current &&
        !settingsButtonRef.current.contains(event.target as Node)
      ) {
        setIsSettingsMenuOpen(false);
      }
    };

    // Chỉ thêm sự kiện khi một trong hai menu đang mở
    if (isPopoverOpen || isSettingsMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside); // Dọn dẹp sự kiện
    };
  }, [isPopoverOpen, isSettingsMenuOpen]);

  return (
    <div className="h-screen w-16 bg-blue-600 flex flex-col justify-between items-center py-4 relative">
      <div className="flex flex-col items-center">
        {/* Avatar */}
        <img
          src={user?.profile?.avatar || "https://picsum.photos/id/1/200"}
          alt="Avatar"
          className="w-12 h-12 rounded-full border-2 border-white object-cover cursor-pointer"
          onClick={togglePopover}
        />

        {/* Hiển thị SettingsPopover */}
        {isPopoverOpen && (
          <div ref={popoverRef} className="absolute top-10 left-16 z-50">
            <SettingsPopover
              onLogout={() => {
                console.log("Đăng xuất");
                setIsPopoverOpen(false);
              }}
              onProfileClick={() => {
                console.log("Hồ sơ của bạn");
                setIsPopoverOpen(false);
              }}
              onUpgradeClick={() => {
                console.log("Nâng cấp tài khoản");
                setIsPopoverOpen(false);
              }}
            />
          </div>
        )}

        {/* Icons List */}
        <div className="flex flex-col space-y-6 p-2">
          <div
            className={`p-2 rounded-lg cursor-pointer ${
              active === "chat" ? "bg-white text-blue-600" : "text-white"
            }`}
            onClick={() => setActive("chat")}>
            <FaComments className="text-2xl" />
          </div>
          <div
            className={`p-2 rounded-lg cursor-pointer ${
              active === "friends" ? "bg-white text-blue-600" : "text-white"
            }`}
            onClick={() => setActive("friends")}>
            <FaUserFriends className="text-2xl" />
          </div>
          <div
            className={`p-2 rounded-lg cursor-pointer ${
              active === "tasks" ? "bg-white text-blue-600" : "text-white"
            }`}
            onClick={() => setActive("tasks")}>
            <FaTasks className="text-2xl" />
          </div>
        </div>
      </div>
      <div>
        {/* Bottom Icons */}
        <div className="flex flex-col space-y-6 items-center">
          {/* Divider */}
          <div className="w-8 border-b border-white my-4"></div>
          <div
            className={`p-2 rounded-lg cursor-pointer ${
              active === "cloud" ? "bg-white text-blue-600" : "text-white"
            }`}
            onClick={() => setActive("cloud")}>
            <FaCloud className="text-2xl" />
          </div>
          <div
            className={`p-2 rounded-lg cursor-pointer ${
              active === "briefcase" ? "bg-white text-blue-600" : "text-white"
            }`}
            onClick={() => setActive("briefcase")}>
            <FaBriefcase className="text-2xl" />
          </div>
          {/* Nút Settings */}
          <div
            ref={settingsButtonRef}
            className={`p-2 rounded-lg cursor-pointer ${
              active === "settings" ? "bg-white text-blue-600" : "text-white"
            }`}
            onClick={toggleSettingsMenu}>
            <FaCog className="text-2xl" />
          </div>
        </div>

        {/* Hiển thị SettingsMenu */}
        {isSettingsMenuOpen && (
          <div
            ref={settingsMenuRef}
            className="absolute bottom-16 left-16 z-50">
            <SettingsMenu
              onClose={() => setIsSettingsMenuOpen(false)}
              onOpenModal={() => console.log("Open modal")} // Thay bằng logic mở modal nếu cần
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
