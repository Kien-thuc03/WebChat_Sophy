import React, { useState } from "react";
import Sidebar from "../components/sidebar/Sidebar";
import ChatList from "../components/chat/ChatList";
import MainContent from "../components/content/MainContent";
import SettingsMenu from "../components/content/SettingsMenu"; // Import SettingsMenu
import UserModal from "../components/content/UserModal"; // Import UserModal

const Dashboard: React.FC = () => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false); // State for SettingsMenu visibility
  const [isModalOpen, setIsModalOpen] = useState(false); // State for UserModal visibility

  // Function to open the modal (passed to SettingsMenu as onOpenModal)
  const handleOpenModal = () => {
    setIsModalOpen(true);
    setIsSettingsOpen(false); // Close settings menu when modal opens
  };

  // Function to close the modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  // Function to toggle SettingsMenu visibility
  const handleToggleSettings = () => {
    setIsSettingsOpen((prev) => !prev);
  };

  // Function to close SettingsMenu
  const handleCloseSettings = () => {
    setIsSettingsOpen(false);
  };

  return (
    <div className="flex h-screen relative">
      <Sidebar onSettingsClick={handleToggleSettings} />
      <ChatList />
      <MainContent />
      {isSettingsOpen && (
        <SettingsMenu
          onClose={handleCloseSettings}
          onOpenModal={handleOpenModal}
        />
      )}
      <UserModal isOpen={isModalOpen} onClose={handleCloseModal} />
    </div>
  );
};

export default Dashboard;
