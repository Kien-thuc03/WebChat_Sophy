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
import { Spin, Button } from "antd";
import { useConversationContext } from "../features/chat/context/ConversationContext";

const Dashboard: React.FC = () => {
  const { t } = useLanguage();
  const { isLoading, refreshConversations, conversations } = useConversationContext();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [activeSection, setActiveSection] = useState<string>("chat");
  const [contactOption, setContactOption] = useState<string>("friends");
  const [showChatInfo, setShowChatInfo] = useState(true);
  const settingsRef = useRef<HTMLDivElement>(null);

  const handleSelectConversation = (conversation: Conversation) => {
    if (!conversation) {
      console.error("Cuộc trò chuyện không hợp lệ:", conversation);
      return;
    }

    if (!conversation.conversationId || typeof conversation.conversationId !== "string") {
      console.error("ID cuộc trò chuyện không hợp lệ:", conversation);
      return;
    }

    if (!conversation.conversationId.startsWith("conv")) {
      console.error(`Định dạng ID cuộc trò chuyện không hợp lệ: ${conversation.conversationId}`);
      conversation = {
        ...conversation,
        conversationId: `conv${conversation.conversationId}`,
      };
    }

    console.log("Đã chọn cuộc trò chuyện:", conversation.conversationId);
    setSelectedConversation(conversation);
    setActiveSection("chat"); // This will update Sidebar's activeSection
    setShowChatInfo(true);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const isMenuItem = (event.target as HTMLElement).closest(
        ".ant-menu-item, .ant-menu-submenu, .ant-menu-submenu-title, .ant-menu"
      );
      if (
        settingsRef.current &&
        !settingsRef.current.contains(event.target as Node) &&
        !document.querySelector(".settings-modal")?.contains(event.target as Node) &&
        !isMenuItem
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
    if (["chat", "friends", "tasks"].includes(section)) {
      setActiveSection(section);
      if (section !== "chat") {
        setSelectedConversation(null);
      }
    }
  };

  const handleContactOptionSelect = (option: string) => {
    setContactOption(option);
    console.log("Selected contact option:", option);
  };

  const handleFriendSelect = (friendId: string) => {
    console.log("Selected friend:", friendId);
  };

  const handleToggleChatInfo = () => {
    setShowChatInfo((prev) => !prev);
  };

  useEffect(() => {
    const userId = localStorage.getItem("userId");
    if (userId) {
      const timer = setTimeout(() => {
        if (conversations.length === 0 && !isLoading) {
          console.log("Không có hội thoại nào sau khi tải, thử tải lại...");
          refreshConversations();
        }
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [isLoading, conversations, refreshConversations]);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        onSettingsClick={handleToggleSettings}
        onOpenModal={handleOpenModal}
        openSettingsModal={handleOpenSettingsModal}
        onSectionChange={handleSectionChange}
        activeSection={activeSection} // Pass activeSection to Sidebar
      />

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

      <div className="flex flex-1 h-full">
        {isLoading && activeSection === "chat" ? (
          <div className="flex flex-1 items-center justify-center bg-gray-50 dark:bg-gray-800">
            <div className="text-center">
              <Spin size="large" />
              <p className="mt-4 text-gray-600 dark:text-gray-300">
                Đang tải dữ liệu hội thoại...
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Vui lòng đợi trong giây lát
              </p>
              <Button
                type="primary"
                className="mt-4"
                onClick={() => refreshConversations()}
              >
                Tải lại thủ công
              </Button>
            </div>
          </div>
        ) : activeSection === "chat" && selectedConversation ? (
          <div className="flex flex-1 h-full">
            <div className="flex flex-col flex-1 min-w-0">
              <ChatHeader
                conversation={selectedConversation}
                isGroup={selectedConversation.isGroup}
                groupName={selectedConversation.groupName}
                groupAvatarUrl={selectedConversation.groupAvatarUrl}
                groupMembers={selectedConversation.groupMembers}
                onInfoClick={handleToggleChatInfo}
                showInfo={showChatInfo}
              />
              <div className="flex-1 overflow-hidden">
                <ChatArea conversation={selectedConversation} />
              </div>
            </div>
            {showChatInfo && (
              <div className="w-[350px] border-l border-gray-200 flex-shrink-0 overflow-hidden">
                <ChatInfo conversation={selectedConversation} />
              </div>
            )}
          </div>
        ) : activeSection === "friends" && contactOption === "friends" ? (
          <FriendList
            onSelectFriend={handleFriendSelect}
            onSelectConversation={handleSelectConversation}
          />
        ) : activeSection === "friends" && contactOption === "friendRequests" ? (
          <RequestList onSelectFriend={handleFriendSelect} />
        ) : activeSection === "friends" &&
          contactOption !== "friends" &&
          contactOption !== "friendRequests" ? (
          <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-800">
            <p className="text-gray-500 dark:text-gray-400">
              {contactOption === "groups" &&
                (t.group_community_list || "Danh sách nhóm và cộng đồng")}
              {contactOption === "groupInvites" &&
                (t.group_invites || "Lời mời vào nhóm và cộng đồng")}
            </p>
          </div>
        ) : activeSection === "tasks" ? (
          <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-800">
            <p className="text-gray-500 dark:text-gray-400">{t.utilities || "Tiện ích"}</p>
          </div>
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