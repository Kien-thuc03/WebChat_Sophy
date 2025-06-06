import React, { useState, useRef, useEffect } from "react";
import Sidebar from "../components/sidebar/Sidebar";
import ChatList from "../components/chat/ChatList";
import ChatHeader from "../components/chat/ChatHeader";
import { ChatArea } from "../components/chat/chatArea/ChatArea";
import SettingsMenu from "../components/content/SettingsMenu";
import UserModal from "../components/content/modal/UserModal";
import SettingsModal from "../components/content/modal/SettingsModal";
import MainContent from "../components/content/MainContent";
import ContactList from "../components/contact/ContactList";
import FriendList from "../components/contact/FriendList";
import RequestList from "../components/contact/RequestList";
import GroupList from "../components/contact/GroupList";
import GroupRequestList from "../components/contact/GroupRequestList";
import { Conversation } from "../features/chat/types/conversationTypes";
import { useLanguage } from "../features/auth/context/LanguageContext";
import ChatInfo from "../components/chat/chatinfo/ChatInfo";
import { Spin, Button } from "antd";
import { useConversationContext } from "../features/chat/context/ConversationContext";
import socketService from "../services/socketService";
import zegoService from "../services/zegoService";

const Dashboard: React.FC = () => {
  const { t } = useLanguage();
  const {
    isLoading,
    refreshConversations,
    conversations,
    updateGroupName,
    updateGroupAvatar,
  } = useConversationContext();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [activeSection, setActiveSection] = useState<string>("chat");
  const [contactOption, setContactOption] = useState<string>("friends");
  const [showChatInfo, setShowChatInfo] = useState(true);
  const settingsRef = useRef<HTMLDivElement>(null);
  const [zegoInitialized, setZegoInitialized] = useState<boolean>(false);

  // Thêm khởi tạo ZegoService khi dashboard mount
  useEffect(() => {
    const userId = localStorage.getItem("userId");
    const userName = localStorage.getItem("fullname");

    if (userId && userName && !zegoInitialized) {
      console.log(
        "Dashboard: Khởi tạo lại ZegoService để đảm bảo nhận cuộc gọi"
      );

      // Khởi tạo ZIM riêng trước - quan trọng để nhận cuộc gọi ngay từ đầu
      const initializeZIM = async (retries = 0, maxRetries = 5) => {
        try {
          console.log(
            `Dashboard: Đang thử khởi tạo ZIM lần ${retries + 1}/${maxRetries}`
          );
          const success = await zegoService.initializeZIM(userId, userName);
          if (success) {
            console.log("Dashboard: ZIM đã được khởi tạo riêng thành công");
            setZegoInitialized(true);
            return true;
          } else if (retries < maxRetries) {
            // Tính toán thời gian chờ với backoff theo cấp số nhân
            const delay = Math.min(1000 * Math.pow(1.5, retries), 10000);
            console.log(
              `Dashboard: ZIM khởi tạo không thành công, thử lại sau ${delay}ms`
            );
            // Thử lại với số lần thử tăng dần
            setTimeout(() => initializeZIM(retries + 1, maxRetries), delay);
            return false;
          } else {
            console.log("Dashboard: ZIM không thể khởi tạo sau nhiều lần thử");
            return false;
          }
        } catch (error) {
          console.error("Dashboard: Lỗi khởi tạo ZIM:", error);
          if (retries < maxRetries) {
            // Tính toán thời gian chờ với backoff theo cấp số nhân
            const delay = Math.min(1000 * Math.pow(2, retries), 15000);
            console.log(
              `Dashboard: Có lỗi khi khởi tạo ZIM, thử lại sau ${delay}ms`
            );
            // Thử lại với số lần thử tăng dần
            setTimeout(() => initializeZIM(retries + 1, maxRetries), delay);
          }
          return false;
        }
      };

      // Khởi tạo ZIM riêng ngay lập tức
      initializeZIM(0, 5); // Truyền các tham số cụ thể: retries = 0, maxRetries = 5

      // Khởi tạo Zego UI Kit sau khi ZIM đã được khởi tạo hoặc sau một thời gian
      setTimeout(() => {
        const initializeZego = async () => {
          try {
            const zegoInstance = await zegoService.initializeZego(
              userId,
              userName,
              {
                onZIMInitialized: () => {
                  console.log(
                    "Dashboard: ZIM đã được khởi tạo thành công qua ZegoUIKit"
                  );
                  setZegoInitialized(true);
                },
                onCallModalVisibilityChange: () => {},
                onCallingProgressChange: () => {},
              }
            );

            if (zegoInstance) {
              console.log(
                "Dashboard: ZegoService đã được khởi tạo lại thành công"
              );
            }
          } catch (error) {
            console.error(
              "Dashboard: Lỗi khi khởi tạo lại ZegoService:",
              error
            );
          }
        };

        if (!zegoInitialized) {
          console.log("Dashboard: Thử khởi tạo lại ZegoUIKit");
          initializeZego();
        }
      }, 3000);
    }

    return () => {
      // Không cleanup zegoService ở đây vì chúng ta muốn giữ kết nối
      // khi chuyển giữa các phần của ứng dụng
    };
  }, [zegoInitialized]);

  const handleSelectConversation = (conversation: Conversation) => {
    if (!conversation) {
      console.error("Cuộc trò chuyện không hợp lệ:", conversation);
      return;
    }

    if (
      !conversation.conversationId ||
      typeof conversation.conversationId !== "string"
    ) {
      console.error("ID cuộc trò chuyện không hợp lệ:", conversation);
      return;
    }

    if (!conversation.conversationId.startsWith("conv")) {
      console.error(
        `Định dạng ID cuộc trò chuyện không hợp lệ: ${conversation.conversationId}`
      );
      conversation = {
        ...conversation,
        conversationId: `conv${conversation.conversationId}`,
      };
    }

    console.log(
      "Dashboard: Đã chọn cuộc trò chuyện:",
      conversation.conversationId
    );
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
        !document
          .querySelector(".settings-modal")
          ?.contains(event.target as Node) &&
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
    console.log("Dashboard: Selected friend:", friendId);
    // No need to do anything here since the conversation will be selected by handleSelectConversation
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

  // Add event listener for custom showConversation event
  useEffect(() => {
    const handleShowConversation = (event: CustomEvent) => {
      const { conversationId, forceSelect } = event.detail;
      console.log(
        `Dashboard: Received showConversation event for ${conversationId}, forceSelect: ${forceSelect}`
      );

      // First, set active section to chat
      setActiveSection("chat");

      // Then find the conversation in the context and select it
      if (conversationId && conversations) {
        const conversation = conversations.find(
          (c) => c.conversationId === conversationId
        );
        if (conversation) {
          console.log(
            `Dashboard: Found conversation, selecting it:`,
            conversation
          );
          setSelectedConversation(conversation);
          setShowChatInfo(true);

          // Force a re-render to ensure the UI updates
          setTimeout(() => {
            console.log("Dashboard: Forcing re-render of chat area");
            const chatContainer = document.querySelector(
              ".chat-area-container"
            );
            if (chatContainer) {
              chatContainer.classList.add("active");
              setTimeout(() => chatContainer.classList.remove("active"), 50);
            }
          }, 100);
        } else {
          console.error(
            `Dashboard: Conversation with ID ${conversationId} not found`
          );
          // If conversation not found in context, try refreshing conversations
          console.log(
            "Dashboard: Refreshing conversations to find the missing conversation"
          );
          refreshConversations().then(() => {
            const refreshedConversations = conversations;
            console.log(
              "Dashboard: Conversations after refresh:",
              refreshedConversations
            );

            const refreshedConversation = refreshedConversations.find(
              (c) => c.conversationId === conversationId
            );
            if (refreshedConversation) {
              console.log(
                `Dashboard: Found conversation after refresh, selecting it:`,
                refreshedConversation
              );
              setSelectedConversation(refreshedConversation);
              setShowChatInfo(true);
            } else if (forceSelect && conversationId) {
              console.log(
                `Dashboard: Still couldn't find conversation, creating placeholder:`,
                conversationId
              );
              const placeholderConversation: Conversation = {
                conversationId,
                isGroup: false,
                creatorId: "",
                receiverId: "",
                groupMembers: [],
                createdAt: new Date().toISOString(),
                lastChange: new Date().toISOString(),
                blocked: [],
                isDeleted: false,
                deletedAt: null,
                formerMembers: [],
                listImage: [],
                listFile: [],
                pinnedMessages: [],
                muteNotifications: [],
                hasUnread: false,
                unreadCount: [],
              };
              setSelectedConversation(placeholderConversation);
              setShowChatInfo(true);
            }
          });
        }
      }
    };

    window.addEventListener(
      "showConversation",
      handleShowConversation as EventListener
    );

    return () => {
      window.removeEventListener(
        "showConversation",
        handleShowConversation as EventListener
      );
    };
  }, [conversations, refreshConversations]);

  const handleGroupLeaveOrDisband = async () => {
    setSelectedConversation(null);
    setShowChatInfo(false);
    setActiveSection("chat");
    await new Promise((resolve) => setTimeout(resolve, 100));
    await refreshConversations();
    setTimeout(() => {
      const chatListContainer = document.querySelector(".chat-list");
      if (chatListContainer) {
        chatListContainer.classList.add("refreshed");
        setTimeout(() => chatListContainer.classList.remove("refreshed"), 50);
      }
    }, 300);
  };

  // Lắng nghe sự kiện thay đổi tên nhóm
  useEffect(() => {
    const handleGroupNameChanged = (data: {
      conversationId: string;
      newName: string;
      fromUserId?: string;
      changedBy?: { userId: string; fullname: string };
    }) => {
      // Cập nhật tên nhóm trong context với userId
      const userId = data.fromUserId || data.changedBy?.userId || "";
      updateGroupName(data.conversationId, data.newName, userId);

      // Nếu đang hiển thị conversation này, cập nhật selectedConversation
      if (selectedConversation?.conversationId === data.conversationId) {
        setSelectedConversation((prev) => ({
          ...prev!,
          groupName: data.newName,
          lastChange: new Date().toISOString(),
        }));
      }
    };

    socketService.onGroupNameChanged(handleGroupNameChanged);

    return () => {
      socketService.off("groupNameChanged", handleGroupNameChanged);
    };
  }, [selectedConversation, updateGroupName]);

  // Add socket listener for group avatar changes
  useEffect(() => {
    const handleGroupAvatarChanged = (data: {
      conversationId: string;
      newAvatar: string;
      fromUserId?: string;
      changedBy?: { userId: string; fullname: string };
    }) => {
      // Cập nhật avatar trong context với userId
      const userId = data.fromUserId || data.changedBy?.userId || "";
      updateGroupAvatar(data.conversationId, data.newAvatar, userId);

      // Nếu đang hiển thị conversation này, cập nhật selectedConversation
      if (selectedConversation?.conversationId === data.conversationId) {
        setSelectedConversation((prev) => ({
          ...prev!,
          groupAvatarUrl: data.newAvatar,
          lastChange: new Date().toISOString(),
        }));
      }
    };

    socketService.onGroupAvatarChanged(handleGroupAvatarChanged);

    return () => {
      socketService.off("groupAvatarChanged", handleGroupAvatarChanged);
    };
  }, [selectedConversation, updateGroupAvatar]);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        onSettingsClick={handleToggleSettings}
        onOpenModal={handleOpenModal}
        openSettingsModal={handleOpenSettingsModal}
        onSectionChange={handleSectionChange}
        activeSection={activeSection}
        data-sections={["chat", "friends", "tasks"]}
      />

      {activeSection === "chat" && (
        <ChatList
          onSelectConversation={handleSelectConversation}
          data-section="chat"
        />
      )}

      {activeSection === "friends" && (
        <ContactList
          onSelectOption={handleContactOptionSelect}
          onSelectConversation={handleSelectConversation}
          data-section="friends"
        />
      )}

      {activeSection === "tasks" && (
        <div
          className="w-80 bg-white dark:bg-gray-900 border-r dark:border-gray-700 h-full flex flexRocket Sciencecol overflow-hidden"
          data-section="tasks">
          <div className="p-4 border-b dark:border-gray-700">
            <h2 className="text-lg font-semibold">
              {t.utilities || "Tiện ích"}
            </h2>
          </div>
          <div className="p-4">
            <p className="text-gray-500">
              {t.utilities || "Danh sách tiện ích"}
            </p>
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
                onClick={() => refreshConversations()}>
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
                <ChatInfo
                  conversation={selectedConversation}
                  onLeaveGroup={handleGroupLeaveOrDisband}
                  onClose={() => setShowChatInfo(false)}
                  onSelectConversation={handleSelectConversation}
                />
              </div>
            )}
          </div>
        ) : activeSection === "friends" && contactOption === "friends" ? (
          <FriendList
            onSelectFriend={handleFriendSelect}
            onSelectConversation={handleSelectConversation}
          />
        ) : activeSection === "friends" &&
          contactOption === "friendRequests" ? (
          <RequestList
            onSelectFriend={handleFriendSelect}
            onSelectConversation={handleSelectConversation}
          />
        ) : activeSection === "friends" && contactOption === "groups" ? (
          <GroupList onSelectConversation={handleSelectConversation} />
        ) : activeSection === "friends" && contactOption === "groupInvites" ? (
          <GroupRequestList onSelectConversation={handleSelectConversation} />
        ) : activeSection === "tasks" ? (
          <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-800">
            <p className="text-gray-500 dark:text-gray-400">
              {t.utilities || "Tiện ích"}
            </p>
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
      <SettingsModal
        visible={isSettingsModalOpen}
        onClose={handleCloseSettingsModal}
      />
    </div>
  );
};

export default Dashboard;
