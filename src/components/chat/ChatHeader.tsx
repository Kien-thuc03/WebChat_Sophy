import React, { useState, useEffect, useMemo } from "react";
import {
  UserAddOutlined,
  InfoCircleOutlined,
  UserOutlined,
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
  const currentUserId = localStorage.getItem("userId") || "";
  const [isAddMemberModalVisible, setIsAddMemberModalVisible] = useState(false);

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

  // Lấy tên người dùng hiện tại
  const currentUserName = localStorage.getItem("username") || "User";

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

  // Xử lý sự kiện thêm và xóa thành viên từ group
  useEffect(() => {
    const handleMemberRemoved = (data: {
      conversationId: string;
      userId: string;
    }) => {
      if (
        data.conversationId === conversation.conversationId &&
        data.userId === currentUserId
      ) {
        // Người dùng hiện tại đã bị xóa khỏi nhóm
        message.info("Bạn đã bị xóa khỏi cuộc trò chuyện này");
        // Cập nhật danh sách cuộc trò chuyện
        updateConversationMembers({
          conversationId: data.conversationId,
          members: (conversation.groupMembers || []).filter(
            (member) => member.userId !== data.userId
          ),
          action: "remove",
          userId: data.userId,
        });
      } else if (data.conversationId === conversation.conversationId) {
        // Một thành viên khác đã bị xóa khỏi nhóm
        updateConversationMembers({
          conversationId: data.conversationId,
          members: (conversation.groupMembers || []).filter(
            (member) => member.userId !== data.userId
          ),
          action: "remove",
          userId: data.userId,
        });
      }
    };

    const handleUserRemovedFromGroup = (data: {
      conversationId: string;
      kickedUser: { userId: string; fullname: string };
      kickedByUser: { userId: string; fullname: string };
    }) => {
      if (data.conversationId === conversation.conversationId) {
        const notification = `${data.kickedByUser.fullname} đã xóa ${data.kickedUser.fullname} khỏi cuộc trò chuyện`;
        message.info(notification);
        setMemberCount((prev) => Math.max(0, prev - 1));
      }
    };

    const handleUserAddedToGroup = (data: {
      conversationId: string;
      addedUser: { userId: string; fullname: string };
      addedByUser: { userId: string; fullname: string };
    }) => {
      if (data.conversationId === conversation.conversationId) {
        const notification = `${data.addedByUser.fullname} đã thêm ${data.addedUser.fullname} vào cuộc trò chuyện`;
        message.info(notification);
        setMemberCount((prev) => prev + 1);
      }
    };

    socketService.on("memberRemoved", handleMemberRemoved);
    socketService.on("userRemovedFromGroup", handleUserRemovedFromGroup);
    socketService.on("userAddedToGroup", handleUserAddedToGroup);

    return () => {
      socketService.off("memberRemoved", handleMemberRemoved);
      socketService.off("userRemovedFromGroup", handleUserRemovedFromGroup);
      socketService.off("userAddedToGroup", handleUserAddedToGroup);
    };
  }, [conversation, currentUserId, updateConversationMembers]);

  const showAddMemberModal = () => {
    setIsAddMemberModalVisible(true);
  };

  // Hàm để làm mới dữ liệu của cuộc trò chuyện từ server
  const refreshConversationData = async () => {
    if (!conversation.conversationId) return;

    try {
      const conversationData = await getConversationDetail(
        conversation.conversationId
      );
      if (conversationData) {
        setConversation(conversationData);
        // Cập nhật trong context
        updateConversationMembers({
          conversationId: conversationData.conversationId,
          members: conversationData.groupMembers || [],
          action: "update",
        });
      }
    } catch (error) {
      console.error("ChatHeader: Failed to refresh conversation data:", error);
    }
  };

  useEffect(() => {
    // Đăng ký lắng nghe các sự kiện liên quan đến thay đổi thành viên trong nhóm
    socketService.on("conversationUpdated", refreshConversationData);
    socketService.on("memberAdded", refreshConversationData);
    socketService.on("memberRemoved", refreshConversationData);

    return () => {
      socketService.off("conversationUpdated", refreshConversationData);
      socketService.off("memberAdded", refreshConversationData);
      socketService.off("memberRemoved", refreshConversationData);
    };
  }, [conversation.conversationId]);

  const title = isGroup
    ? groupName || `Group (${memberCount})`
    : otherUserInfo?.fullname || "Unknown User";

  return (
    <div className="border-b border-gray-200 bg-white px-4 py-3 flex items-center justify-between w-full">
      <div className="flex items-center space-x-3">
        {isGroup ? (
          <GroupAvatar
            groupMembers={groupMembers || []}
            size={40}
            avatarUrl={groupAvatarUrl}
            groupName={groupName}
            userCache={userCache}
            userAvatars={userAvatars}
          />
        ) : (
          <Avatar
            size={40}
            username={otherUserInfo?.fullname || ""}
            src={otherUserInfo?.avatarUrl || ""}
            icon={<UserOutlined />}
            status={isOnline ? "online" : "offline"}
          />
        )}
        <div>
          <h2 className="text-lg font-medium">{title}</h2>
          {!isGroup && (
            <p className="text-xs text-gray-500 break-all max-w-[200px] md:max-w-[300px]">
              {activityStatus}
            </p>
          )}
          {isGroup && (
            <p className="text-xs text-gray-500">
              {t.members}: {memberCount}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <button
          className="p-2 rounded-lg hover:bg-gray-100"
          title={t.add_to_community || "Thêm bạn vào cộng đồng"}
          onClick={showAddMemberModal}>
          <UserAddOutlined className="text-xl text-gray-600" />
        </button>
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

      {isAddMemberModalVisible && (
        <AddMemberModal
          visible={isAddMemberModalVisible}
          onCancel={() => setIsAddMemberModalVisible(false)}
          conversation={conversation}
          currentMembers={conversation.groupMembers || []}
          onAddSuccess={() => {
            refreshConversationData();
            setIsAddMemberModalVisible(false);
          }}
        />
      )}
    </div>
  );
};

export default ChatHeader;
