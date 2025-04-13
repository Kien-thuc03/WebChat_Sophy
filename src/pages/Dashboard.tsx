import React, { useState, useRef, useEffect } from "react";
import Sidebar from "../components/sidebar/Sidebar";
import ChatList from "../components/chat/ChatList";
import ChatHeader from "../components/chat/ChatHeader";
import ChatArea from "../components/chat/ChatArea";
import SettingsMenu from "../components/content/SettingsMenu";
import UserModal from "../components/content/modal/UserModal";
import SettingsModal from "../components/content/modal/SettingsModal";
import MainContent from "../components/content/MainContent";
import { Conversation } from "../features/chat/types/conversationTypes";

const Dashboard: React.FC = () => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const settingsRef = useRef<HTMLDivElement>(null);

  // Xử lý khi chọn cuộc trò chuyện
  const handleSelectConversation = (conversation: Conversation) => {
    // Kiểm tra xem conversation có hợp lệ không
    if (!conversation) {
      console.error("Cuộc trò chuyện không hợp lệ:", conversation);
      return;
    }
    
    // Kiểm tra xem conversation có ID và ID có đúng định dạng không
    if (!conversation.conversationId || typeof conversation.conversationId !== 'string') {
      console.error("ID cuộc trò chuyện không hợp lệ:", conversation);
      return;
    }
    
    // Kiểm tra định dạng (bắt đầu bằng 'conv')
    if (!conversation.conversationId.startsWith('conv')) {
      console.error(`Định dạng ID cuộc trò chuyện không hợp lệ: ${conversation.conversationId}`);
      // Sửa ID nếu cần thiết
      if (conversation.conversationId && !conversation.conversationId.startsWith('conv')) {
        conversation = {
          ...conversation,
          conversationId: `conv${conversation.conversationId}`
        };
      }
    }
    
    console.log("Đã chọn cuộc trò chuyện:", conversation.conversationId);
    setSelectedConversation(conversation);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Kiểm tra xem mục tiêu nhấp chuột có nằm trong submenu của Menu không
      const isMenuItem = (event.target as HTMLElement).closest(
        ".ant-menu-item, .ant-menu-submenu, .ant-menu-submenu-title, .ant-menu"
      );
      if (
        settingsRef.current &&
        !settingsRef.current.contains(event.target as Node) &&
        !document.querySelector(".settings-modal")?.contains(event.target as Node) &&
        !isMenuItem // Bỏ qua nếu nhấp vào mục Menu
      ) {
        console.log("Click outside SettingsMenu detected");
        setIsSettingsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleOpenModal = () => {
    setIsModalOpen(true);
    setIsSettingsOpen(false);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleToggleSettings = () => {
    setIsSettingsOpen((prev) => !prev);
  };

  const handleOpenSettingsModal = () => {
    console.log("Opening SettingsModal from Dashboard");
    setIsSettingsModalOpen(true);
    setIsSettingsOpen(false);
  };

  const handleCloseSettingsModal = () => {
    console.log("Closing SettingsModal from Dashboard");
    setIsSettingsModalOpen(false);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        onSettingsClick={handleToggleSettings}
        onOpenModal={handleOpenModal}
        openSettingsModal={handleOpenSettingsModal}
      />
      <ChatList onSelectConversation={handleSelectConversation} />
      <div className="flex-1 flex flex-col h-full overflow-hidden">
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
                  ? selectedConversation.groupAvatarUrl || "/images/group-avatar.png"
                  : "/images/default-avatar.png"
              }
              groupMembers={selectedConversation.groupMembers}
            />
            <div className="flex-1 overflow-hidden">
              <ChatArea conversation={selectedConversation} />
            </div>
          </>
        ) : (
          <MainContent />
        )}
      </div>

      {isSettingsOpen && (
        <div ref={settingsRef}>
          <SettingsMenu
            openSettingsModal={handleOpenSettingsModal}
            onClose={() => setIsSettingsOpen(false)}
            onOpenModal={handleOpenModal}
          />
        </div>
      )}

      <UserModal isOpen={isModalOpen} onClose={handleCloseModal} />
      <SettingsModal visible={isSettingsModalOpen} onClose={handleCloseSettingsModal} />
    </div>
  );
};

export default Dashboard;