import React, { useState, useEffect, useRef, useCallback } from "react";
import { FaComments, FaUserFriends, FaTasks, FaCloud, FaBriefcase, FaCog } from "react-icons/fa";
import { useAuth } from "../../features/auth/hooks/useAuth";
import SettingsPopover from "../content/SettingsPopoverProps";

interface SidebarProps {
  onSettingsClick?: () => void;
  onOpenModal?: () => void;
  openSettingsModal?: () => void; // Thêm prop từ Dashboard
}

const Sidebar: React.FC<SidebarProps> = ({ onSettingsClick, onOpenModal, openSettingsModal }) => {
  const { user } = useAuth();
  const [active, setActive] = useState("chat");
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const settingsMenuRef = useRef<HTMLDivElement | null>(null);
  const settingsButtonRef = useRef<HTMLDivElement | null>(null);

  const handleClickOutside = useCallback(
    (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        !document.querySelector(".settings-modal")?.contains(event.target as Node) &&
        isPopoverOpen
      ) {
        setIsPopoverOpen(false);
      }

      if (
        settingsMenuRef.current &&
        !settingsMenuRef.current.contains(event.target as Node) &&
        settingsButtonRef.current &&
        !settingsButtonRef.current.contains(event.target as Node) &&
        !document.querySelector(".settings-modal")?.contains(event.target as Node) &&
        isSettingsMenuOpen
      ) {
        setIsSettingsMenuOpen(false);
      }
    },
    [isPopoverOpen, isSettingsMenuOpen]
  );

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [handleClickOutside]);

  const togglePopover = () => {
    setIsPopoverOpen((prev) => {
      if (!prev) setIsSettingsMenuOpen(false);
      return !prev;
    });
  };

  const toggleSettingsMenu = () => {
    setIsSettingsMenuOpen((prev) => {
      if (!prev) setIsPopoverOpen(false);
      return !prev;
    });
  };

  return (
    <div className="h-screen w-16 bg-blue-600 flex flex-col justify-between items-center py-4 relative">
      <div className="flex flex-col items-center">
        <img
          src={user?.urlavatar || "https://picsum.photos/id/1/200"}
          alt="Avatar"
          className="w-12 h-12 rounded-full border-2 border-white object-cover cursor-pointer"
          onClick={togglePopover}
        />

        {isPopoverOpen && (
          <div ref={popoverRef} className="absolute top-10 left-16 z-50">
            <SettingsPopover
              onLogout={() => {
                console.log("Đăng xuất");
                setIsPopoverOpen(false);
              }}
              onOpenModal={() => {
                console.log("Hồ sơ của bạn");
                onOpenModal?.();
                setIsPopoverOpen(false);
              }}
              onUpgradeClick={() => {
                console.log("Nâng cấp tài khoản");
                setIsPopoverOpen(false);
              }}
              openSettingsModal={() => {
                console.log("Opening SettingsModal from SettingsPopover");
                openSettingsModal?.(); // Truyền từ Dashboard
                setIsPopoverOpen(false); // Đóng popover khi mở SettingsModal
              }}
            />
          </div>
        )}

        <div className="flex flex-col space-y-6 p-2">
          <div
            className={`p-2 rounded-lg cursor-pointer ${active === "chat" ? "bg-white text-blue-600" : "text-white"}`}
            onClick={() => setActive("chat")}
          >
            <FaComments className="text-2xl" />
          </div>
          <div
            className={`p-2 rounded-lg cursor-pointer ${active === "friends" ? "bg-white text-blue-600" : "text-white"}`}
            onClick={() => setActive("friends")}
          >
            <FaUserFriends className="text-2xl" />
          </div>
          <div
            className={`p-2 rounded-lg cursor-pointer ${active === "tasks" ? "bg-white text-blue-600" : "text-white"}`}
            onClick={() => setActive("tasks")}
          >
            <FaTasks className="text-2xl" />
          </div>
        </div>
      </div>
      <div>
        <div className="flex flex-col space-y-6 items-center">
          <div className="w-8 border-b border-white my-4"></div>
          <div
            className={`p-2 rounded-lg cursor-pointer ${active === "cloud" ? "bg-white text-blue-600" : "text-white"}`}
            onClick={() => setActive("cloud")}
          >
            <FaCloud className="text-2xl" />
          </div>
          <div
            className={`p-2 rounded-lg cursor-pointer ${active === "briefcase" ? "bg-white text-blue-600" : "text-white"}`}
            onClick={() => setActive("briefcase")}
          >
            <FaBriefcase className="text-2xl" />
          </div>
          <div
            ref={settingsButtonRef}
            className={`p-2 rounded-lg cursor-pointer ${active === "settings" ? "bg-white text-blue-600" : "text-white"}`}
            onClick={() => {
              setActive("settings");
              toggleSettingsMenu();
              if (onSettingsClick) {
                onSettingsClick();
              }
            }}
          >
            <FaCog className="text-2xl" />
          </div>
        </div>

        {isSettingsMenuOpen && (
          <div ref={settingsMenuRef} className="absolute bottom-16 left-16 z-50" onClick={(event) => event.stopPropagation()}></div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;