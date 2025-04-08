import React, { useState } from "react";
import Sidebar from "../components/sidebar/Sidebar";
import ChatList from "../components/chat/ChatList";
import ChatHeader from "../components/chat/ChatHeader";
import SettingsMenu from "../components/content/SettingsMenu";
import UserModal from "../components/content/modal/UserModal";
import MainContent from "../components/content/MainContent";
import { Conversation } from "../features/chat/types/conversationTypes";

const Dashboard: React.FC = () => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleToggleSettings = () => {
    setIsSettingsOpen((prev) => !prev);
  };
  const handleOpenSettings = () => {
    setIsSettingsOpen(false);
  };
  const handleCloseSettings = () => {
    setIsSettingsOpen(false);
  };

  return (
    <div className="flex h-screen relative">
      <Sidebar
        onSettingsClick={handleToggleSettings}
        onOpenModal={handleOpenModal}
      />
      <ChatList onSelectConversation={setSelectedConversation} />
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            <ChatHeader
              conversation={selectedConversation}
              isGroup={selectedConversation.isGroup}
              groupName={
                selectedConversation.isGroup
                  ? selectedConversation.groupName
                  : selectedConversation.receiverId
              }
              groupAvatarUrl={
                selectedConversation.isGroup
                  ? selectedConversation.groupAvatarUrl ||
                    "/images/group-avatar.png"
                  : "/images/default-avatar.png"
              }
              groupMembers={selectedConversation.groupMembers}
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
          openSettingsModal={handleOpenSettings}
          onClose={handleCloseSettings}
          onOpenModal={handleOpenModal}
        />
      )}
      <UserModal isOpen={isModalOpen} onClose={handleCloseModal} />
    </div>
  );
};

export default Dashboard;
