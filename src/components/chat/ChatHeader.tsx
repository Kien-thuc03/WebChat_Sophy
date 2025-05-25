import React, { useState, useEffect, useMemo } from "react";
import {
  VideoCameraOutlined,
  UserAddOutlined,
  InfoCircleOutlined,
  PhoneOutlined,
} from "@ant-design/icons";
import { ChatHeaderProps } from "../../features/chat/types/chatTypes";
import { Conversation } from "../../features/chat/types/conversationTypes";
import GroupAvatar from "./GroupAvatar";
import { useConversations } from "../../features/chat/hooks/useConversations";
import { useConversationContext } from "../../features/chat/context/ConversationContext";
import { Avatar } from "../common/Avatar";
import { useLanguage } from "../../features/auth/context/LanguageContext";
import { getUserById, getConversationDetail } from "../../api/API";
import { User } from "../../features/auth/types/authTypes";
import { Button, Tooltip, message } from "antd";
import socketService from "../../services/socketService";
import AddMemberModal from "./modals/AddMemberModal";

interface ExtendedChatHeaderProps extends ChatHeaderProps {
  conversation: Conversation;
  onInfoClick?: () => void;
  showInfo?: boolean;
}

// Mở rộng interface Window ở đầu file
declare global {
  interface Window {
    incomingCallAudio?: HTMLAudioElement;
    callAudioElements: HTMLAudioElement[]; // Không còn undefined
  }
}

// Khởi tạo callAudioElements nếu chưa tồn tại
if (typeof window !== "undefined") {
  window.callAudioElements = window.callAudioElements || [];
}

const ChatHeader: React.FC<ExtendedChatHeaderProps> = ({
  conversation: initialConversation,
  onInfoClick,
  showInfo,
}) => {
  const { userCache, userAvatars } = useConversations();
  const {
    conversations,
    updateConversationWithNewMessage,
    updateConversationMembers,
  } = useConversationContext();
  const { t } = useLanguage();
  const [conversation, setConversation] =
    useState<Conversation>(initialConversation);
  const [memberCount, setMemberCount] = useState<number>(
    conversation.groupMembers?.length || 0
  );

  // Get the most up-to-date conversation data from context
  useEffect(() => {
    const updatedConversation =
      conversations.find(
        (conv: Conversation) =>
          conv.conversationId === initialConversation.conversationId
      ) || initialConversation;
    setConversation(updatedConversation);
    setMemberCount(updatedConversation.groupMembers?.length || 0);
  }, [conversations, initialConversation]);

  const isGroup = conversation.isGroup;
  const groupName = conversation.groupName;
  const groupAvatarUrl = conversation.groupAvatarUrl;
  const groupMembers = conversation.groupMembers;
  const [localUserCache, setLocalUserCache] = useState<Record<string, User>>(
    {}
  );
  const [activityStatus, setActivityStatus] = useState<string>("Offline");
  const [isOnline, setIsOnline] = useState<boolean>(false);
  const [isAddMemberModalVisible, setIsAddMemberModalVisible] = useState(false);
  const currentUserId = localStorage.getItem("userId") || "";

  // Khai báo hàm getOtherUserId trước
  const getOtherUserId = (conversation: Conversation): string => {
    // Nếu là nhóm, trả về rỗng
    if (conversation.isGroup) return "";

    // Chọn id của người dùng khác trong cuộc trò chuyện 1:1
    // Nếu người dùng hiện tại là người tạo cuộc hội thoại, trả về receiverId
    // Ngược lại, trả về creatorId
    return currentUserId === conversation.creatorId
      ? conversation.receiverId || ""
      : conversation.creatorId || "";
  };

  // Sau đó mới dùng nó
  const otherUserId = useMemo(() => {
    return getOtherUserId(conversation);
  }, [conversation, currentUserId]);

  const otherUserInfo = userCache[otherUserId] || localUserCache[otherUserId];

  const checkActivityStatus = () => {
    if (!otherUserInfo || isGroup) return;
    const lastActive = otherUserInfo.lastActive;
    if (!lastActive) {
      setActivityStatus("Offline");
      setIsOnline(false);
      return;
    }
    const lastActiveTime = new Date(lastActive).getTime();
    const currentTime = new Date().getTime();
    const minutesDiff = Math.floor(
      (currentTime - lastActiveTime) / (1000 * 60)
    );
    if (minutesDiff < 5) {
      setActivityStatus("Vừa mới truy cập");
      setIsOnline(true);
    } else if (minutesDiff < 60) {
      setActivityStatus(`Hoạt động ${minutesDiff} phút trước`);
      setIsOnline(false);
    } else if (minutesDiff < 24 * 60) {
      const hours = Math.floor(minutesDiff / 60);
      setActivityStatus(`Hoạt động ${hours} giờ trước`);
      setIsOnline(false);
    } else {
      setActivityStatus("Đang ngoại tuyến");
      setIsOnline(false);
    }
  };

  useEffect(() => {
    const loadUserData = async () => {
      if (!isGroup && otherUserId) {
        try {
          // Kiểm tra nếu thông tin đã có trong cache
          if (!userCache[otherUserId] && !localUserCache[otherUserId]) {
            console.log("ChatHeader: Loading user data for", otherUserId);
            const userData = await getUserById(otherUserId);
            if (userData) {
              setLocalUserCache((prev) => ({
                ...prev,
                [otherUserId]: userData,
              }));
            }
          }
        } catch (error) {
          console.error("ChatHeader: Failed to load user data:", error);
        }
      }
    };

    loadUserData();
  }, [isGroup, otherUserId, userCache, localUserCache]);

  useEffect(() => {
    checkActivityStatus();
    const intervalId = setInterval(checkActivityStatus, 60000);
    return () => clearInterval(intervalId);
  }, [otherUserInfo]);

  // Xử lý kết nối socket và xác thực user
  useEffect(() => {
    if (!socketService.isConnected) {
      socketService.connect();
      if (currentUserId) {
        socketService.authenticate(currentUserId);
      } else {
        console.warn("ChatHeader: No userId found for authentication");
      }
    } else {
      if (currentUserId) {
        socketService.authenticate(currentUserId);
      }
    }

    if (conversation.conversationId) {
      socketService.joinConversations([conversation.conversationId]);
    }

    return () => {
      if (conversation.conversationId) {
        socketService.leaveConversation(conversation.conversationId);
      }
    };
  }, [conversation.conversationId, currentUserId]);

  // Lắng nghe sự kiện thay đổi thành viên nhóm
  useEffect(() => {
    const handleMemberRemoved = (data: {
      conversationId: string;
      userId: string;
    }) => {
      if (data.conversationId === conversation.conversationId) {
        // Cập nhật lại conversation từ context
        const updatedConversation = conversations.find(
          (conv) => conv.conversationId === conversation.conversationId
        );
        if (updatedConversation) {
          // Cập nhật lại conversation trong component
          setConversation({
            ...updatedConversation,
            groupMembers: updatedConversation.groupMembers.filter(
              (id) => id !== data.userId
            ),
          });
          // Cập nhật lại conversation trong context
          updateConversationMembers(data.conversationId, data.userId);
          // Cập nhật số lượng thành viên
          setMemberCount((prev) => Math.max(0, prev - 1));
          // Thêm tin nhắn hệ thống
          updateConversationWithNewMessage(data.conversationId, {
            type: "system",
            content: `Thành viên đã bị xóa khỏi nhóm`,
            senderId: data.userId,
            createdAt: new Date().toISOString(),
          });
        }
      }
    };

    // Xử lý khi có thành viên bị xóa khỏi nhóm bởi admin
    const handleUserRemovedFromGroup = (data: {
      conversationId: string;
      kickedUser: { userId: string; fullname: string };
      kickedByUser: { userId: string; fullname: string };
    }) => {
      if (data.conversationId === conversation.conversationId) {
        // Cập nhật số lượng thành viên
        setMemberCount((prev) => Math.max(0, prev - 1));

        // Cập nhật danh sách thành viên trong conversation
        setConversation((prev) => ({
          ...prev,
          groupMembers: prev.groupMembers.filter(
            (id) => id !== data.kickedUser.userId
          ),
        }));
      }
    };

    // Xử lý khi có thành viên mới được thêm vào nhóm
    const handleUserAddedToGroup = (data: {
      conversationId: string;
      addedUser: { userId: string; fullname: string };
      addedByUser: { userId: string; fullname: string };
    }) => {
      if (data.conversationId === conversation.conversationId) {
        // Cập nhật số lượng thành viên và state local trước cho UI phản hồi nhanh
        setMemberCount((prev) => prev + 1);

        // Cập nhật danh sách thành viên trong conversation
        setConversation((prev) => ({
          ...prev,
          groupMembers: [...prev.groupMembers, data.addedUser.userId],
        }));

        // Gọi API để lấy thông tin nhóm mới nhất (bao gồm thông tin user mới)
        refreshConversationData();
      }
    };

    socketService.on("userRemovedFromGroup", handleUserRemovedFromGroup);
    socketService.on("userLeftGroup", handleMemberRemoved);
    socketService.on("userAddedToGroup", handleUserAddedToGroup);

    return () => {
      socketService.off("userRemovedFromGroup", handleUserRemovedFromGroup);
      socketService.off("userLeftGroup", handleMemberRemoved);
      socketService.off("userAddedToGroup", handleUserAddedToGroup);
    };
  }, [
    conversation.conversationId,
    conversation.groupMembers,
    conversations,
    updateConversationWithNewMessage,
    updateConversationMembers,
  ]);

  // Show add member modal
  const showAddMemberModal = () => {
    if (!conversation.isGroup) {
      message.warning("Tính năng chỉ áp dụng cho nhóm chat");
      return;
    }
    setIsAddMemberModalVisible(true);
  };

  // Hàm refreshConversationData để gọi API lấy thông tin conversation mới nhất
  const refreshConversationData = async () => {
    try {
      const updatedConversation = await getConversationDetail(
        conversation.conversationId
      );
      if (updatedConversation) {
        setConversation(updatedConversation);
        setMemberCount(updatedConversation.groupMembers?.length || 0);
      }
    } catch (error) {
      console.error("Error refreshing conversation data:", error);
    }
  };

  // Xử lý khi người dùng nhấn nút gọi
  const handleCallClick = () => {
    message.info("Chức năng gọi điện đang được bảo trì.");
  };

  return (
    <header className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200">
      <div className="flex items-center flex-1 group">
        <div className="relative cursor-pointer mr-3">
          {isGroup ? (
            <GroupAvatar
              members={groupMembers}
              userAvatars={userAvatars}
              size={40}
              className="border-2 border-white"
              groupAvatarUrl={groupAvatarUrl || undefined}
            />
          ) : (
            <div className="relative">
              <Avatar
                name={otherUserInfo?.fullname || "User"}
                avatarUrl={otherUserInfo?.urlavatar}
                size={40}
                className="rounded-lg"
              />
              {isOnline && (
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
              )}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center">
            <h2 className="text-lg font-semibold truncate">
              {isGroup
                ? groupName
                : otherUserInfo?.fullname || t.loading || "Đang tải..."}
            </h2>
            <button
              className="ml-2 p-1 rounded-full hover:bg-gray-100"
              title={t.edit || "Chỉnh sửa"}>
              <i className="fas fa-edit text-gray-500 text-sm" />
            </button>
          </div>
          <div className="flex items-center text-sm text-gray-500">
            {isGroup ? (
              <div className="flex items-center cursor-pointer hover:text-blue-500">
                <i className="far fa-user mr-1" />
                <span>
                  {memberCount} {t.members || "thành viên"}
                </span>
              </div>
            ) : (
              <div className="flex items-center">
                {isOnline && (
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                )}
                <span className="text-gray-500">{activityStatus}</span>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <button
          className="p-2 rounded-lg hover:bg-gray-100"
          title={t.add_to_community || "Thêm bạn vào cộng đồng"}
          onClick={showAddMemberModal}>
          <UserAddOutlined className="text-xl text-gray-600" />
        </button>
        <Tooltip title={t.calls || "Gọi thoại"}>
          <Button
            type="text"
            icon={<PhoneOutlined />}
            className="flex items-center justify-center w-10 h-10"
            onClick={handleCallClick}
            disabled={true}
          />
        </Tooltip>
        <Tooltip title={t.video_call || "Gọi video"}>
          <Button
            type="text"
            icon={<VideoCameraOutlined />}
            className="flex items-center justify-center w-10 h-10"
            onClick={handleCallClick}
            disabled={true}
          />
        </Tooltip>
        <Tooltip title={t.conversation_info || "Thông tin hội thoại"}>
          <Button
            type="text"
            icon={<InfoCircleOutlined />}
            className={`flex items-center justify-center w-10 h-10 ${
              showInfo ? "text-blue-500" : ""
            }`}
            onClick={onInfoClick}
          />
        </Tooltip>
      </div>
      {/* Use the AddMemberModal component with refreshConversationData callback */}
      <AddMemberModal
        visible={isAddMemberModalVisible}
        onClose={() => setIsAddMemberModalVisible(false)}
        conversationId={conversation.conversationId}
        groupMembers={conversation.groupMembers || []}
        refreshConversationData={refreshConversationData}
      />
    </header>
  );
};

export default ChatHeader;

<style
  dangerouslySetInnerHTML={{
    __html: `
  .incoming-call-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 350px;
    text-align: center;
  }
  .incoming-call-avatar {
    margin-bottom: 20px;
    animation: pulse 1.5s infinite;
  }
  .incoming-call-info {
    margin-top: 20px;
  }
  .incoming-call-info h2 {
    margin-bottom: 10px;
    font-size: 1.5rem;
  }
  .incoming-call-info h3 {
    font-size: 1.2rem;
    margin-bottom: 10px;
  }
  .incoming-call-info p {
    color: #666;
    margin-top: 10px;
  }
  @keyframes pulse {
    0% {
      transform: scale(0.95);
      box-shadow: 0 0 0 0 rgba(0, 144, 237, 0.7);
    }
    
    70% {
      transform: scale(1);
      box-shadow: 0 0 0 10px rgba(0, 144, 237, 0);
    }
    
    100% {
      transform: scale(0.95);
      box-shadow: 0 0 0 0 rgba(0, 144, 237, 0);
    }
  }
`,
  }}
/>;
