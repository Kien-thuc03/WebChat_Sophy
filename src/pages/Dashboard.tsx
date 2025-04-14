import React, { useState, useRef, useEffect } from "react";
import Sidebar from "../components/sidebar/Sidebar";
import ChatList from "../components/chat/ChatList";
import ChatHeader from "../components/chat/ChatHeader";
import ChatArea from "../components/chat/ChatArea";
import SettingsMenu from "../components/content/SettingsMenu";
import UserModal from "../components/content/modal/UserModal";
import SettingsModal from "../components/content/modal/SettingsModal";
import MainContent from "../components/content/MainContent";
import ContactList from "../components/contact/ContactList";
import FriendList from "../components/contact/FriendList";
import RequestList from "../components/contact/RequestList";
import { Conversation } from "../features/chat/types/conversationTypes";
import { useLanguage } from "../features/auth/context/LanguageContext";
import ChatInfo from "../components/chat/ChatInfo";
import { Layout } from 'antd';

const { Content, Sider } = Layout;

const Dashboard: React.FC = () => {
  const { t } = useLanguage();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [activeSection, setActiveSection] = useState<string>("chat");
  const [contactOption, setContactOption] = useState<string>("friends");
  const [showChatInfo, setShowChatInfo] = useState(true); // Default to true
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

  const handleSectionChange = (section: string) => {
    // Only update activeSection for the top section icons
    if (["chat", "friends", "tasks"].includes(section)) {
      setActiveSection(section);
      
      // Reset selected conversation when switching to a non-chat section
      if (section !== "chat") {
        setSelectedConversation(null);
      }
    }
    // For bottom section icons, we don't change the activeSection
  };

  const handleContactOptionSelect = (option: string) => {
    setContactOption(option);
    console.log("Selected contact option:", option);
  };

  const handleFriendSelect = (friendId: string) => {
    console.log("Selected friend:", friendId);
    // Here you would typically fetch the conversation with this friend
    // and then set it as the selected conversation
  };

  const handleToggleChatInfo = () => {
    setShowChatInfo(prev => !prev);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        onSettingsClick={handleToggleSettings}
        onOpenModal={handleOpenModal}
        openSettingsModal={handleOpenSettingsModal}
        onSectionChange={handleSectionChange}
      />
      
      {/* Left panel - changes based on active section */}
      {activeSection === "chat" && (
        <ChatList onSelectConversation={handleSelectConversation} />
      )}
      
      {activeSection === "friends" && (
        <ContactList onSelectOption={handleContactOptionSelect} />
      )}
      
      {activeSection === "tasks" && (
        <div className="w-80 bg-white dark:bg-gray-900 border-r dark:border-gray-700 h-full flex flex-col overflow-hidden">
          <div className="p-4 border-b dark:border-gray-700">
            <h2 className="text-lg font-semibold">{t.utilities || "Tiện ích"}</h2>
          </div>
          <div className="p-4">
            <p className="text-gray-500">{t.utilities || "Danh sách tiện ích"}</p>
          </div>
        </div>
      )}
      
      {/* Main content area */}
      <Layout className="flex-1 h-full">
        {activeSection === "chat" && selectedConversation ? (
          <Layout>
            <Layout className="flex flex-col">
              <ChatHeader
                conversation={selectedConversation}
                isGroup={selectedConversation.isGroup}
                groupName={selectedConversation.groupName}
                groupAvatarUrl={selectedConversation.groupAvatarUrl}
                groupMembers={selectedConversation.groupMembers}
                onInfoClick={handleToggleChatInfo}
                showInfo={showChatInfo}
              />
              <Content className="flex-1 overflow-hidden">
                <ChatArea conversation={selectedConversation} />
              </Content>
            </Layout>
            {showChatInfo && (
              <Sider width={300} theme="light" className="border-l border-gray-200">
                <ChatInfo conversation={selectedConversation} />
              </Sider>
            )}
          </Layout>
        ) : activeSection === "friends" && contactOption === "friends" ? (
          <FriendList onSelectFriend={handleFriendSelect} />
        ) : activeSection === "friends" && contactOption === "friendRequests" ? (
          <RequestList onSelectFriend={handleFriendSelect} />
        ) : activeSection === "friends" && contactOption !== "friends" && contactOption !== "friendRequests" ? (
          <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-800">
            <p className="text-gray-500 dark:text-gray-400">
              {contactOption === "groups" && (t.group_community_list || "Danh sách nhóm và cộng đồng")}
              {contactOption === "groupInvites" && (t.group_invites || "Lời mời vào nhóm và cộng đồng")}
            </p>
          </div>
        ) : activeSection === "tasks" ? (
          <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-800">
            <p className="text-gray-500 dark:text-gray-400">{t.utilities || "Tiện ích"}</p>
          </div>
        ) : (
          <MainContent />
        )}
      </Layout>

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