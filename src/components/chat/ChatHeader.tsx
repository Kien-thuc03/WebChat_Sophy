import React, { useState, useEffect, useRef } from "react";
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
import { getUserById } from "../../api/API";
import { User } from "../../features/auth/types/authTypes";
import { Button, Tooltip, Modal, message } from "antd";
import { zegoService } from "../../services/zegoService";
import socketService from "../../services/socketService";
import { ZegoUIKitPrebuilt } from "@zegocloud/zego-uikit-prebuilt";
import AddMemberModal from "./modals/AddMemberModal";

interface ZegoTokenResponse {
  token: string;
  appID: string | number;
  userId: string;
  effectiveTimeInSeconds: number;
  error?: string;
}

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
  const [isCallModalVisible, setIsCallModalVisible] = useState(false);
  const [incomingCall, setIncomingCall] = useState<{
    conversationId: string;
    roomID: string;
    callerId: string;
    isVideo: boolean;
  } | null>(null);
  const callContainerRef = useRef<HTMLDivElement>(null);
  const isRequestingToken = useRef(false);
  const lastCallRequest = useRef(0);
  const currentUserId = localStorage.getItem("userId") || "";
  const [isAddMemberModalVisible, setIsAddMemberModalVisible] = useState(false);

  const getOtherUserId = (conversation: Conversation): string => {
    if (conversation.isGroup) return "";
    return currentUserId === conversation.creatorId
      ? conversation.receiverId || ""
      : conversation.creatorId;
  };

  const otherUserId = getOtherUserId(conversation);
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
      if (
        !isGroup &&
        otherUserId &&
        !userCache[otherUserId] &&
        !localUserCache[otherUserId]
      ) {
        try {
          const userData = await getUserById(otherUserId);
          if (userData) {
            setLocalUserCache((prev) => ({ ...prev, [otherUserId]: userData }));
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

  // Xử lý sự kiện gọi (bên gọi)
  const handleCall = async (isVideo: boolean) => {
    if (isGroup) {
      message.warning("Gọi nhóm hiện chưa được hỗ trợ.");
      return;
    }
    if (!currentUserId) {
      message.error("Không tìm thấy user ID. Vui lòng đăng nhập lại.");
      return;
    }
    const now = Date.now();
    if (now - lastCallRequest.current < 2000) {
      message.warning("Vui lòng đợi một chút trước khi gọi lại.");
      return;
    }
    lastCallRequest.current = now;
    if (isRequestingToken.current) {
      return;
    }
    if (!socketService.isConnected) {
      socketService.connect();
      await new Promise((resolve) => setTimeout(resolve, 2000));
      if (!socketService.isConnected) {
        message.error("Không thể kết nối với server. Vui lòng thử lại sau.");
        return;
      }
      if (currentUserId) {
        socketService.authenticate(currentUserId);
      }
    }
    isRequestingToken.current = true;
    socketService.emit("refreshZegoToken", (response: ZegoTokenResponse) => {
      isRequestingToken.current = false;
      try {
        if (response?.error || !response?.token || !response?.appID) {
          message.error(response?.error || "Không nhận được token hợp lệ.");
          return;
        }
        const appID =
          typeof response.appID === "string"
            ? parseInt(response.appID, 10)
            : response.appID;
        if (isNaN(appID)) {
          message.error("appID không hợp lệ. Vui lòng thử lại.");
          return;
        }
        setIsCallModalVisible(true);
        const roomID = `call_${conversation.conversationId}`;
        const config = {
          appID,
          userID: currentUserId,
          userName: otherUserInfo?.fullname || "User",
          token: response.token,
          roomID,
          scenario: {
            mode: ZegoUIKitPrebuilt.OneONoneCall,
          },
        };
        setTimeout(() => {
          if (!callContainerRef.current) {
            message.error("Lỗi giao diện, không thể khởi tạo cuộc gọi.");
            setIsCallModalVisible(false);
            return;
          }
          zegoService.initialize(callContainerRef.current, config, () => {
            setIsCallModalVisible(false);
          });
          
          socketService.emit("startCall", {
            conversationId: conversation.conversationId,
            roomID,
            callerId: currentUserId,
            receiverId: otherUserId,
            isVideo,
          });
        }, 500);
      } catch (error) {
        console.error("ChatHeader: Error processing ZEGOCLOUD token:", error);
        message.error("Lỗi không xác định khi xử lý cuộc gọi.");
        setIsCallModalVisible(false);
      }
    });
  };

  // Đóng modal cuộc gọi
  const handleCloseCallModal = () => {
    zegoService.destroy();
    setIsCallModalVisible(false);
    socketService.emit("endCall", {
      conversationId: conversation.conversationId,
      receiverId: otherUserId,
    });
  };

  // Xử lý chấp nhận cuộc gọi (bên nhận)
  const handleAcceptCall = () => {
    if (!incomingCall) return;
    setIsCallModalVisible(true);
    setIncomingCall(null);
    setTimeout(() => {
      if (!callContainerRef.current) {
        message.error("Lỗi giao diện, không thể tham gia cuộc gọi.");
        setIsCallModalVisible(false);
        return;
      }
      socketService.emit("refreshZegoToken", (response: ZegoTokenResponse) => {
        
        try {
          if (response?.error || !response.token || !response.appID) {
            message.error("Không thể tham gia cuộc gọi do lỗi token.");
            setIsCallModalVisible(false);
            return;
          }
          const appID =
            typeof response.appID === "string"
              ? parseInt(response.appID, 10)
              : response.appID;
          if (isNaN(appID)) {
            message.error("appID không hợp lệ.");
            setIsCallModalVisible(false);
            return;
          }
          const config = {
            appID,
            userID: currentUserId,
            userName: otherUserInfo?.fullname || "User",
            token: response.token,
            roomID: incomingCall.roomID,
            scenario: {
              mode: ZegoUIKitPrebuilt.OneONoneCall,
            },
          };
          zegoService.initialize(callContainerRef.current!, config, () => {
            setIsCallModalVisible(false);
          });
        } catch (error) {
          console.error("ChatHeader: Error joining call:", error);
          message.error("Không thể tham gia cuộc gọi.");
          setIsCallModalVisible(false);
        }
      });
    }, 500);
  };

  // Xử lý từ chối cuộc gọi (bên nhận)
  const handleRejectCall = () => {
    if (!incomingCall) return;
    socketService.emit("endCall", {
      conversationId: incomingCall.conversationId,
      receiverId: incomingCall.callerId,
    });
    setIncomingCall(null);
  };

  // Lắng nghe sự kiện cuộc gọi (startCall, endCall, callError)
  useEffect(() => {
    if (!currentUserId) {
      console.warn("ChatHeader: No userId found, skipping call listeners");
      return;
    }

    const handleStartCall = (data: {
      conversationId: string;
      roomID: string;
      callerId: string;
      receiverId?: string;
      isVideo: boolean;
    }) => {

      const isCaller = data.callerId === currentUserId;
      const isReceiver = data.receiverId === currentUserId;

      if (!isCaller && !isReceiver) {
        return;
      }

      if (isReceiver) {
        setIncomingCall({
          conversationId: data.conversationId,
          roomID: data.roomID,
          callerId: data.callerId,
          isVideo: data.isVideo,
        });
      } else {
        
        setIsCallModalVisible(true);
        setTimeout(() => {
          if (!callContainerRef.current) {
            message.error("Lỗi giao diện, không thể khởi tạo cuộc gọi.");
            setIsCallModalVisible(false);
            return;
          }
          socketService.emit(
            "refreshZegoToken",
            (response: ZegoTokenResponse) => {
              
              try {
                if (response?.error || !response.token || !response.appID) {
                  message.error("Không thể tham gia cuộc gọi do lỗi token.");
                  setIsCallModalVisible(false);
                  return;
                }
                const appID =
                  typeof response.appID === "string"
                    ? parseInt(response.appID, 10)
                    : response.appID;
                if (isNaN(appID)) {
                  message.error("appID không hợp lệ.");
                  setIsCallModalVisible(false);
                  return;
                }
                const config = {
                  appID,
                  userID: currentUserId,
                  userName: otherUserInfo?.fullname || "User",
                  token: response.token,
                  roomID: data.roomID,
                  scenario: {
                    mode: ZegoUIKitPrebuilt.OneONoneCall,
                  },
                };
                zegoService.initialize(
                  callContainerRef.current!,
                  config,
                  () => {
                    setIsCallModalVisible(false);
                  }
                );
              } catch (error) {
                console.error("ChatHeader: Error joining call:", error);
                message.error("Không thể tham gia cuộc gọi.");
                setIsCallModalVisible(false);
              }
            }
          );
        }, 500);
      }
    };

    
    socketService.onStartCall(handleStartCall);
    socketService.onEndCall((data: { conversationId: string }) => {
      message.info("Cuộc gọi đã kết thúc.");
      setIsCallModalVisible(false);
      setIncomingCall(null);
      zegoService.destroy();
    });
    socketService.onCallError((data: { message: string }) => {
      message.error(data.message);
      setIsCallModalVisible(false);
      setIncomingCall(null);
      zegoService.destroy();
    });

    return () => {
      socketService.off("startCall", handleStartCall);
      socketService.off("endCall");
      socketService.off("callError");
    };
  }, [otherUserInfo, currentUserId]);

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

    socketService.on("userRemovedFromGroup", handleMemberRemoved);

    return () => {
      socketService.off("userRemovedFromGroup", handleMemberRemoved);
    };
  }, [
    conversation.conversationId,
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

  // Function to refresh the conversation data
  const refreshConversationData = async () => {
    // We don't need to do anything here since we're
    // using the conversation context which will update
    // automatically when the groupMembers field is updated
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
            onClick={() => handleCall(false)}
          />
        </Tooltip>
        <Tooltip title={t.video_call || "Gọi video"}>
          <Button
            type="text"
            icon={<VideoCameraOutlined />}
            className="flex items-center justify-center w-10 h-10"
            onClick={() => handleCall(true)}
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
      <Modal
        title={isGroup ? t.group_call : t.video_call || "Gọi video"}
        open={isCallModalVisible}
        onCancel={handleCloseCallModal}
        footer={null}
        width={800}
        destroyOnClose>
        <div
          ref={callContainerRef}
          style={{ width: "100%", height: "500px", backgroundColor: "#f0f0f0" }}
        />
      </Modal>
      <Modal
        title={`Cuộc gọi ${incomingCall?.isVideo ? "video" : "thoại"} đến`}
        open={!!incomingCall}
        onCancel={handleRejectCall}
        footer={[
          <Button key="reject" onClick={handleRejectCall}>
            Từ chối
          </Button>,
          <Button key="accept" type="primary" onClick={handleAcceptCall}>
            Chấp nhận
          </Button>,
        ]}>
        <p>
          Bạn nhận được cuộc gọi {incomingCall?.isVideo ? "video" : "thoại"} từ{" "}
          {otherUserInfo?.fullname || "Người dùng"}.
        </p>
      </Modal>

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
