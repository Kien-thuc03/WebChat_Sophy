import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  VideoCameraOutlined,
  UserAddOutlined,
  InfoCircleOutlined,
  PhoneOutlined,
  AudioOutlined,
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
import { Button, Tooltip, Modal, message } from "antd";
import socketService from "../../services/socketService";
import AddMemberModal from "./modals/AddMemberModal";
import ZegoVideoCallWithService from "../zego/ZegoVideoCallWithService";
import { zegoService } from "../../services/zegoService";

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
  const [isCallModalVisible, setIsCallModalVisible] = useState(false);
  const [incomingCall, setIncomingCall] = useState<{
    conversationId: string;
    roomID: string;
    callerId: string;
    isVideo: boolean;
  } | null>(null);
  const lastCallRequest = useRef(0);
  const currentUserId = localStorage.getItem("userId") || "";
  const [isAddMemberModalVisible, setIsAddMemberModalVisible] = useState(false);
  const [isVideo, setIsVideo] = useState<boolean>(false);
  const [zegoToken, setZegoToken] = useState<{
    token: string;
    appID: number;
    userId: string;
    effectiveTimeInSeconds: number;
  } | null>(null);

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

  // Tạo roomID nhất quán giữa người gọi và người nhận
  const roomID = useMemo(() => {
    if (!currentUserId || !otherUserId) return "";
    // Sắp xếp ID để đảm bảo cùng một roomID cho cả hai người dùng
    const userIds = [currentUserId, otherUserId].sort();
    return `call_${userIds[0]}_${userIds[1]}`;
  }, [currentUserId, otherUserId]);

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

  // Xử lý bằng Zego Service trực tiếp (phương pháp mới)
  const handleCallWithZegoService = async (isVideo: boolean) => {
    if (isGroup) {
      message.warning("Gọi nhóm hiện chưa được hỗ trợ.");
      return;
    }

    if (!currentUserId || !otherUserId) {
      message.error(
        "Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại."
      );
      return;
    }

    const now = Date.now();
    if (now - lastCallRequest.current < 2000) {
      message.warning("Vui lòng đợi một chút trước khi gọi lại.");
      return;
    }
    lastCallRequest.current = now;

    // Lưu loại cuộc gọi
    setIsVideo(isVideo);

    // Tạo roomID nhất quán giữa người gọi và người nhận
    const userIds = [currentUserId, otherUserId].sort();
    const consistentRoomID = `call_${userIds[0]}_${userIds[1]}`;

    console.log("ChatHeader: Bắt đầu cuộc gọi với roomID:", consistentRoomID);

    try {
      // Reset kết nối trước khi bắt đầu cuộc gọi mới
      zegoService.resetAllConnections();

      // Hiển thị thông báo cho người dùng
      message.loading({
        content: "Đang khởi tạo cuộc gọi...",
        key: "call-init",
      });

      // Kiểm tra SDK đã được tải chưa
      if (!window.ZegoExpressEngine) {
        console.log("ChatHeader: ZegoExpressEngine chưa được tải, đang tải...");
        window.loadZegoSDK?.();

        let attempts = 0;
        while (!window.ZegoExpressEngine && attempts < 10) {
          await new Promise((resolve) => setTimeout(resolve, 500));
          attempts++;
        }

        if (!window.ZegoExpressEngine) {
          message.error({
            content:
              "Không thể tải SDK cho cuộc gọi. Vui lòng làm mới trang và thử lại.",
            key: "call-init",
            duration: 3,
          });
          return;
        }
      }

      // Sử dụng zegoService để bắt đầu cuộc gọi và lấy token
      const tokenData = await zegoService.startCall({
        roomID: consistentRoomID,
        receiverId: otherUserId,
        callerId: currentUserId,
        callerName: currentUserName || "User",
        isVideo: isVideo,
      });

      // Nếu lấy token thành công, hiển thị thông báo và mở modal cuộc gọi
      if (tokenData && tokenData.token && tokenData.appID) {
        message.success({
          content: "Kết nối thành công!",
          key: "call-init",
          duration: 1,
        });

        // Lưu token và mở modal cuộc gọi
        setZegoToken({
          token: tokenData.token,
          appID:
            typeof tokenData.appID === "string"
              ? parseInt(tokenData.appID, 10)
              : tokenData.appID,
          userId: tokenData.userId,
          effectiveTimeInSeconds: tokenData.effectiveTimeInSeconds,
        });
        setIsCallModalVisible(true);
      } else {
        message.error({
          content: "Không thể kết nối tới dịch vụ gọi điện",
          key: "call-init",
        });
        throw new Error("Token không hợp lệ");
      }
    } catch (error) {
      console.error("Lỗi khi khởi tạo cuộc gọi:", error);
      let errorMsg = "Không thể khởi tạo cuộc gọi.";

      // Xử lý các loại lỗi cụ thể
      if (error instanceof Error) {
        if (error.message.includes("1102016")) {
          errorMsg = "Lỗi xác thực - Vui lòng thử lại sau.";
        } else if (error.message.includes("1002001")) {
          errorMsg = "Vượt quá giới hạn số phòng. Vui lòng đợi và thử lại sau.";
        } else if (error.message.includes("token")) {
          errorMsg = "Lỗi xác thực token. Vui lòng thử lại sau.";
        }
      }

      message.error({
        content: errorMsg,
        key: "call-init",
        duration: 3,
      });

      // Trong trường hợp lỗi 1002001 (quá giới hạn phòng), thử dọn dẹp
      try {
        if (error instanceof Error && error.message.includes("1002001")) {
          console.log("ChatHeader: Đang thử làm sạch các phòng cũ...");
          zegoService.resetAllConnections();
        }
      } catch (cleanupError) {
        console.error("Lỗi khi dọn dẹp:", cleanupError);
      }
    }
  };

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

  // Sửa lại useEffect cho roomID để bao gồm roomID trong dependency
  useEffect(() => {
    if (!currentUserId || !otherUserId) {
      console.log("ChatHeader: Không đủ thông tin để tạo roomID", {
        currentUserId,
        otherUserId,
      });
      return;
    }

    // Không cần thực hiện bất kỳ hành động nào ở đây vì roomID được tính toán trong useMemo
  }, [currentUserId, otherUserId]);

  // Listen for incoming calls
  useEffect(() => {
    console.log("ChatHeader: Thiết lập lắng nghe cuộc gọi đến");

    const incomingCallHandler = (data: {
      roomID: string;
      callerId: string;
      callerName: string;
      isVideo: boolean;
    }) => {
      console.log("ChatHeader: Nhận được cuộc gọi đến:", data);

      // Bỏ qua cuộc gọi từ chính mình
      if (data.callerId === currentUserId) {
        console.log("ChatHeader: Bỏ qua cuộc gọi từ chính mình");
        return;
      }

      // Phát nhạc chuông
      const audio = new Audio("/sounds/incoming-call.mp3");
      audio.loop = true;
      audio.play().catch((err) => {
        console.warn("ChatHeader: Không thể phát nhạc chuông:", err);
      });

      // Lưu audio để dừng sau
      if (window.callAudioElements) {
        window.callAudioElements.push(audio);
      }

      // Hiển thị thông báo cuộc gọi đến
      setIncomingCall({
        conversationId: conversation.conversationId,
        roomID: data.roomID,
        callerId: data.callerId,
        isVideo: data.isVideo,
      });

      // Dừng nhạc chuông sau 30 giây nếu không trả lời
      setTimeout(() => {
        if (audio) {
          audio.pause();
          audio.currentTime = 0;
        }

        // Tự động từ chối sau 30 giây
        setIncomingCall((prev) => {
          if (prev && prev.roomID === data.roomID) {
            // Gửi từ chối đến server
            zegoService
              .rejectCall(data.roomID, data.callerId, currentUserId)
              .catch((err) => console.error("Lỗi khi từ chối cuộc gọi:", err));
            return null;
          }
          return prev;
        });
      }, 30000);
    };

    // Xử lý sự kiện khi cuộc gọi kết thúc từ phía bên kia
    const callEndedHandler = (endedRoomID: string) => {
      console.log("ChatHeader: Cuộc gọi đã kết thúc:", endedRoomID);

      // Dừng tất cả âm thanh
      if (window.callAudioElements) {
        window.callAudioElements.forEach((audio) => {
          audio.pause();
          audio.currentTime = 0;
        });
        window.callAudioElements = [];
      }

      // Kiểm tra xem roomID của cuộc gọi kết thúc có trùng với cuộc gọi hiện tại không
      if (incomingCall && incomingCall.roomID === endedRoomID) {
        setIncomingCall(null);
      }

      // Đóng modal cuộc gọi nếu đang mở
      if (
        isCallModalVisible &&
        (roomID === endedRoomID ||
          (incomingCall && incomingCall.roomID === endedRoomID))
      ) {
        setIsCallModalVisible(false);
        setZegoToken(null);
        message.info("Cuộc gọi đã kết thúc");
      }
    };

    // Thiết lập lắng nghe
    zegoService.setupIncomingCallListener(incomingCallHandler);

    // Đăng ký lắng nghe sự kiện kết thúc cuộc gọi
    socketService.on("callEnded", callEndedHandler);

    return () => {
      console.log("ChatHeader: Hủy lắng nghe cuộc gọi đến");
      zegoService.removeIncomingCallListener(incomingCallHandler);

      // Hủy lắng nghe sự kiện kết thúc cuộc gọi
      socketService.off("callEnded", callEndedHandler);
    };
  }, [
    currentUserId,
    conversation.conversationId,
    incomingCall,
    isCallModalVisible,
    roomID,
  ]);

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
            onClick={() => handleCallWithZegoService(false)}
          />
        </Tooltip>
        <Tooltip title={t.video_call || "Gọi video"}>
          <Button
            type="text"
            icon={<VideoCameraOutlined />}
            className="flex items-center justify-center w-10 h-10"
            onClick={() => handleCallWithZegoService(true)}
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
        title={
          incomingCall && !isCallModalVisible
            ? `Cuộc gọi ${incomingCall.isVideo ? "video" : "thoại"} đến`
            : `Cuộc gọi ${isVideo ? "Video" : "Thoại"}`
        }
        open={isCallModalVisible || !!incomingCall}
        footer={
          incomingCall && !isCallModalVisible
            ? [
                <Button
                  key="reject"
                  danger
                  onClick={() => {
                    // Dùng zegoService để từ chối cuộc gọi
                    if (incomingCall) {
                      zegoService
                        .rejectCall(
                          incomingCall.roomID,
                          incomingCall.callerId,
                          currentUserId
                        )
                        .catch((err) =>
                          console.error("Lỗi khi từ chối cuộc gọi:", err)
                        );
                    }
                    setIncomingCall(null);
                  }}>
                  Từ chối
                </Button>,
                <Button
                  key="accept"
                  type="primary"
                  icon={
                    incomingCall.isVideo ? (
                      <VideoCameraOutlined />
                    ) : (
                      <AudioOutlined />
                    )
                  }
                  onClick={async () => {
                    try {
                      // Dùng zegoService để chấp nhận cuộc gọi và lấy token
                      if (incomingCall) {
                        const tokenData = await zegoService.acceptCall({
                          roomID: incomingCall.roomID,
                          callerId: incomingCall.callerId,
                          receiverId: currentUserId,
                        });

                        // Lưu token và mở modal cuộc gọi
                        setZegoToken({
                          token: tokenData.token,
                          appID:
                            typeof tokenData.appID === "string"
                              ? parseInt(tokenData.appID, 10)
                              : tokenData.appID,
                          userId: tokenData.userId,
                          effectiveTimeInSeconds:
                            tokenData.effectiveTimeInSeconds,
                        });
                        setIsVideo(incomingCall.isVideo);
                        setIsCallModalVisible(true);

                        // Dừng nhạc chuông
                        if (
                          window.callAudioElements &&
                          window.callAudioElements.length > 0
                        ) {
                          window.callAudioElements.forEach((audio) => {
                            audio.pause();
                            audio.currentTime = 0;
                          });
                          window.callAudioElements = [];
                        }

                        // QUAN TRỌNG: KHÔNG đặt incomingCall = null ở đây
                        // Để tránh đóng modal cuộc gọi
                      }
                    } catch (error) {
                      console.error("Lỗi khi chấp nhận cuộc gọi:", error);
                      message.error("Không thể kết nối cuộc gọi");
                      setIncomingCall(null);
                    }
                  }}>
                  Chấp nhận
                </Button>,
              ]
            : null
        }
        maskClosable={false}
        closable={true}
        onCancel={() => {
          setIsCallModalVisible(false);
          setZegoToken(null);
          // Kết thúc cuộc gọi nếu có roomID
          if (incomingCall?.roomID) {
            zegoService
              .endCall(incomingCall.roomID)
              .catch((err) => console.error("Lỗi khi kết thúc cuộc gọi:", err));
            setIncomingCall(null);
          } else if (roomID) {
            zegoService
              .endCall(roomID)
              .catch((err) => console.error("Lỗi khi kết thúc cuộc gọi:", err));
          }
        }}
        width={800}>
        {isCallModalVisible ? (
          <ZegoVideoCallWithService
            roomID={incomingCall ? incomingCall.roomID : roomID}
            userID={currentUserId || ""}
            userName={currentUserName || "User"}
            isIncomingCall={!!(incomingCall && !isCallModalVisible)}
            zegoToken={zegoToken || undefined}
            onEndCall={() => {
              setIsCallModalVisible(false);
              setZegoToken(null);
              if (incomingCall) {
                // Kết thúc cuộc gọi
                zegoService
                  .endCall(incomingCall.roomID)
                  .catch((err) =>
                    console.error("Lỗi khi kết thúc cuộc gọi:", err)
                  );
                setIncomingCall(null);
              } else if (roomID) {
                // Kết thúc cuộc gọi
                zegoService
                  .endCall(roomID)
                  .catch((err) =>
                    console.error("Lỗi khi kết thúc cuộc gọi:", err)
                  );
              }
            }}
          />
        ) : incomingCall ? (
          <div className="incoming-call-container">
            <div className="incoming-call-avatar">
              <div
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: "50%",
                  background: "#f0f2f5",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "60px",
                  color: "#1890ff",
                }}>
                <UserOutlined />
              </div>
            </div>
            <div className="incoming-call-info">
              <h2>Cuộc gọi đến từ</h2>
              <h3>
                {userCache[incomingCall.callerId]?.fullname ||
                  localUserCache[incomingCall.callerId]?.fullname ||
                  incomingCall.callerId}
              </h3>
              <p>
                {incomingCall.isVideo ? "Cuộc gọi video" : "Cuộc gọi thoại"}
              </p>
            </div>
          </div>
        ) : null}
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
