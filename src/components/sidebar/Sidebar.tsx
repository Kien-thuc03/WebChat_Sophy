import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  FaComments,
  FaUserFriends,
  FaTasks,
  FaCloud,
  FaBriefcase,
  FaCog,
} from "react-icons/fa";
import { useAuth } from "../../features/auth/hooks/useAuth";
import SettingsPopover from "../content/SettingsPopoverProps";
import { useLanguage } from "../../features/auth/context/LanguageContext";
import { Avatar } from "../common/Avatar"; // Import Avatar component

interface SidebarProps {
  onSettingsClick?: () => void;
  onOpenModal?: () => void;
  openSettingsModal: () => void;
  onSectionChange?: (section: string) => void;
  activeSection: string; // Add prop to receive active section from Dashboard
}

const Sidebar: React.FC<SidebarProps> = ({
  onSettingsClick,
  onOpenModal,
  openSettingsModal,
  onSectionChange,
  activeSection, // Receive activeSection from Dashboard
}) => {
  const { user } = useAuth();
  const [activeBottomSection, setActiveBottomSection] = useState<string | null>(
    null
  );
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const settingsMenuRef = useRef<HTMLDivElement | null>(null);
  const settingsButtonRef = useRef<HTMLDivElement | null>(null);
  const { t } = useLanguage();

  const handleClickOutside = useCallback(
    (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        !document
          .querySelector(".settings-modal")
          ?.contains(event.target as Node) &&
        isPopoverOpen
      ) {
        setIsPopoverOpen(false);
      }
      if (
        settingsMenuRef.current &&
        !settingsMenuRef.current.contains(event.target as Node) &&
        settingsButtonRef.current &&
        !settingsButtonRef.current.contains(event.target as Node) &&
        !document
          .querySelector(".settings-modal")
          ?.contains(event.target as Node) &&
        isSettingsMenuOpen
      ) {
        setIsSettingsMenuOpen(false);
      }

      const isBottomSectionIcon = (event.target as HTMLElement).closest(
        ".bottom-section-icon"
      );
      if (!isBottomSectionIcon) {
        setActiveBottomSection(null);
      }
    },
    [isPopoverOpen, isSettingsMenuOpen]
  );

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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

  const handleSetActive = (section: string) => {
    const topSections = ["chat", "friends", "tasks"];

    if (topSections.includes(section)) {
      // Call onSectionChange to update Dashboard's activeSection
      if (onSectionChange) {
        onSectionChange(section);
      }
    } else {
      setActiveBottomSection(section);
    }
  };

  return (
    <div className="h-screen w-16 bg-blue-600 flex flex-col justify-between items-center py-4 relative">
      <div className="flex flex-col items-center">
        <div onClick={togglePopover} className="cursor-pointer">
          <Avatar
            name={user?.fullname || "User"}
            avatarUrl={user?.urlavatar}
            size={48} // 12 * 4px = 48px to match the w-12 h-12
            className="border-2 border-white"
          />
        </div>
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
              openSettingsModal={openSettingsModal}
              onClosePopover={() => setIsPopoverOpen(false)}
            />
          </div>
        )}
        <div className="flex flex-col space-y-6 p-2">
          <div
            className={`p-2 rounded-lg cursor-pointer ${
              activeSection === "chat" ? "bg-white text-blue-600" : "text-white"
            }`}
            onClick={() => handleSetActive("chat")}
            title={t.messages}
            data-section="chat">
            <FaComments className="text-2xl" />
          </div>
          <div
            className={`p-2 rounded-lg cursor-pointer ${
              activeSection === "friends"
                ? "bg-white text-blue-600"
                : "text-white"
            }`}
            onClick={() => handleSetActive("friends")}
            title={t.contacts}
            data-section="friends">
            <FaUserFriends className="text-2xl" />
          </div>
          <div
            className={`p-2 rounded-lg cursor-pointer ${
              activeSection === "tasks"
                ? "bg-white text-blue-600"
                : "text-white"
            }`}
            onClick={() => handleSetActive("tasks")}
            title={t.utilities}
            data-section="tasks">
            <FaTasks className="text-2xl" />
          </div>
        </div>
      </div>
      <div>
        <div className="flex flex-col space-y-6 items-center">
          <div className="w-8 border-b border-white my-4"></div>
          <div
            className={`p-2 rounded-lg cursor-pointer bottom-section-icon ${
              activeBottomSection === "cloud"
                ? "bg-white text-blue-600"
                : "text-white"
            }`}
            onClick={() => handleSetActive("cloud")}
            title={t.data}>
            <FaCloud className="text-2xl" />
          </div>
          <div
            className={`p-2 rounded-lg cursor-pointer bottom-section-icon ${
              activeBottomSection === "briefcase"
                ? "bg-white text-blue-600"
                : "text-white"
            }`}
            onClick={() => handleSetActive("briefcase")}
            title={t.utilities}>
            <FaBriefcase className="text-2xl" />
          </div>
          <div
            ref={settingsButtonRef}
            className={`p-2 rounded-lg cursor-pointer bottom-section-icon ${
              activeBottomSection === "settings"
                ? "bg-white text-blue-600"
                : "text-white"
            }`}
            onClick={() => {
              handleSetActive("settings");
              toggleSettingsMenu();
              if (onSettingsClick) onSettingsClick();
            }}
            title={t.settings}>
            <FaCog className="text-2xl" />
          </div>
        </div>
        {isSettingsMenuOpen && (
          <div
            ref={settingsMenuRef}
            className="absolute bottom-16 left-16 z-50"
            onClick={(event) => event.stopPropagation()}></div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
