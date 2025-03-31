import React, { useState } from "react";
import Sidebar from "../components/sidebar/Sidebar";
import ChatList from "../components/chat/ChatList";
import ChatHeader from "../components/chat/ChatHeader";
import SettingsMenu from "../components/content/SettingsMenu";
import UserModal from "../components/content/UserModal";
import MainContent from "../components/content/MainContent";

const Dashboard: React.FC = () => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<any>(null);

  // Function to open the modal (passed to SettingsMenu and Sidebar)
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
      <ChatList onSelectConversation={setSelectedConversation} />
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            <ChatHeader
            conversation={selectedConversation}
              isGroup={selectedConversation.type === 'group'}
              groupName={selectedConversation.type === 'group' ? selectedConversation.groupName : selectedConversation.receiverId}
              groupAvatarUrl={selectedConversation.type === 'group' ? '/images/group-avatar.png' : '/images/default-avatar.png'}
              groupMembers={selectedConversation.members || []}
            />
            <div className="flex-1 bg-gray-50">
              {/* Chat messages will be added here */}
            </div>
          </>
        ) : (
          <MainContent />
        )}
      </div>

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
