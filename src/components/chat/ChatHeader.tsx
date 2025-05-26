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
// Import ZegoUIKitPrebuilt để sử dụng các hằng số và kiểu dữ liệu
import { ZegoUIKitPrebuilt } from "@zegocloud/zego-uikit-prebuilt";
// Import zegoService để sử dụng các phương thức liên quan đến cuộc gọi
import zegoService from "../../services/zegoService";

// Mở rộng interface Window ở đầu file
declare global {
  interface Window {
    incomingCallAudio?: HTMLAudioElement;
    callAudioElements: HTMLAudioElement[]; // Không còn undefined
    zegoCallbacks?: {
      onCallAccepted: () => void;
      onCallEnd: () => void;
      onCallRejected: () => void;
      onUserJoin: () => void;
      onUserLeave: () => void;
    };
  }
}

// Khởi tạo callAudioElements nếu chưa tồn tại
if (typeof window !== "undefined") {
  window.callAudioElements = window.callAudioElements || [];
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
  const [zegoInstance, setZegoInstance] = useState<ZegoUIKitPrebuilt | null>(
    null
  );
  const [isCallModalVisible, setIsCallModalVisible] = useState<boolean>(false);
  const [isCallingInProgress, setIsCallingInProgress] =
    useState<boolean>(false);
  const [isZIMInitialized, setIsZIMInitialized] = useState<boolean>(false);
  const [observer, setObserver] = useState<MutationObserver | null>(null);

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

  // Khởi tạo Zego khi component mount
  useEffect(() => {
    if (currentUserId) {
      const userName = localStorage.getItem("fullname") || "Người dùng";

      // Sử dụng zegoService để khởi tạo
      const initializeZego = async () => {
        try {
          // Khởi tạo zegoInstance với các callbacks
          const zp = await zegoService.initializeZego(currentUserId, userName, {
            onZIMInitialized: () => setIsZIMInitialized(true),
            onCallModalVisibilityChange: (visible) =>
              setIsCallModalVisible(visible),
            onCallingProgressChange: (inProgress) =>
              setIsCallingInProgress(inProgress),
          });

          setZegoInstance(zp);

          // Thiết lập observer để theo dõi giao diện ZEGO
          const zegoObserver = zegoService.setupZegoInterfaceObserver({
            onCallModalVisibilityChange: (visible) =>
              setIsCallModalVisible(visible),
            onCallingProgressChange: (inProgress) =>
              setIsCallingInProgress(inProgress),
          });

          setObserver(zegoObserver);
        } catch (error) {
          console.error("Failed to initialize Zego:", error);
        }
      };

      initializeZego();
    }

    return () => {
      // Dọn dẹp khi component unmount
      zegoService.cleanup();
      if (observer) observer.disconnect();
      setZegoInstance(null);
      setIsCallingInProgress(false);
      setIsZIMInitialized(false);
    };
  }, [currentUserId]);

  // Thêm useEffect để theo dõi khi isCallModalVisible thay đổi
  useEffect(() => {
    if (isCallModalVisible) {
      // Kiểm tra định kỳ xem giao diện ZEGO đã xuất hiện chưa
      const checkInterval = setInterval(() => {
        const zegoElements = document.querySelectorAll('[class*="zego"]');
        if (zegoElements.length > 0) {
          console.log("Kiểm tra định kỳ: Phát hiện giao diện ZEGO, đóng modal");
          setIsCallModalVisible(false);
          clearInterval(checkInterval);
        }
      }, 500); // Kiểm tra mỗi 500ms

      return () => {
        clearInterval(checkInterval);
      };
    }
  }, [isCallModalVisible]);

  // Thêm useEffect mới để kiểm tra khi giao diện ZEGO biến mất (cuộc gọi kết thúc)
  useEffect(() => {
    // Chỉ thiết lập observer khi đang có cuộc gọi
    if (isCallingInProgress) {
      const callEndObserver = new MutationObserver(() => {
        // Kiểm tra xem giao diện ZEGO có còn tồn tại không
        const zegoElements = document.querySelectorAll('[class*="zego"]');

        // Nếu không còn giao diện ZEGO và trước đó có cuộc gọi đang diễn ra
        if (zegoElements.length === 0 && isCallingInProgress) {
          console.log("Phát hiện cuộc gọi đã kết thúc, reset trạng thái");
          setIsCallingInProgress(false);
        }
      });

      // Bắt đầu quan sát thay đổi trên body
      callEndObserver.observe(document.body, {
        childList: true,
        subtree: true,
      });

      // Thêm timeout để đảm bảo reset trạng thái nếu không có callback nào được gọi
      const safetyTimeout = setTimeout(() => {
        // Kiểm tra lại xem cuộc gọi có đang diễn ra không và thiết lập lại trạng thái
        const zegoElements = document.querySelectorAll('[class*="zego"]');
        if (zegoElements.length === 0 && isCallingInProgress) {
          console.log("Safety timeout: Reset trạng thái cuộc gọi");
          setIsCallingInProgress(false);
        }
      }, 60000); // Sau 60 giây, kiểm tra và reset nếu cần

      return () => {
        callEndObserver.disconnect();
        clearTimeout(safetyTimeout);
      };
    }
  }, [isCallingInProgress]);

  // Xử lý khi người dùng nhấn nút gọi điện thoại
  const handleVoiceCall = async () => {
    if (!zegoInstance) {
      // Thử lấy instance từ zegoService
      const userId = localStorage.getItem("userId") || "";
      const userName = localStorage.getItem("fullname") || "User";

      try {
        // Thử khởi tạo một zegoInstance mới nếu cần
        message.loading("Đang kết nối dịch vụ gọi điện...");
        const zp = await zegoService.initializeZego(userId, userName, {
          onZIMInitialized: () => setIsZIMInitialized(true),
          onCallModalVisibilityChange: (visible) =>
            setIsCallModalVisible(visible),
          onCallingProgressChange: (inProgress) =>
            setIsCallingInProgress(inProgress),
        });

        if (zp) {
          setZegoInstance(zp);
          message.success("Kết nối dịch vụ gọi điện thành công");
        } else {
          message.error("Không thể kết nối dịch vụ gọi điện.");
          return;
        }
      } catch {
        message.error(
          "Không thể kết nối dịch vụ gọi điện. Vui lòng thử lại sau."
        );
        return;
      }
    }

    // Kiểm tra nếu đang có cuộc gọi
    if (isCallingInProgress) {
      message.info("Đang có cuộc gọi. Vui lòng thử lại sau.");
      return;
    }

    // Trước khi gọi, thử giải phóng các thiết bị audio và video
    try {
      // Giải phóng các thiết bị media trước khi bắt đầu cuộc gọi mới
      await zegoService.releaseMediaDevices();

      // Yêu cầu quyền truy cập vào microphone và camera
      await zegoService.requestMediaPermissions();
    } catch (error) {
      console.warn("Cảnh báo kiểm tra thiết bị:", error);
      // Tiếp tục mặc dù có lỗi, vì Zego sẽ tự xử lý yêu cầu quyền
    }

    // Xử lý khác nhau cho cuộc gọi nhóm và cuộc gọi 1:1
    if (isGroup) {
      // Xử lý cuộc gọi nhóm
      const memberIds = conversation.groupMembers || [];
      if (memberIds.length <= 1) {
        message.warning("Không có đủ thành viên trong nhóm để gọi.");
        return;
      }

      // Lọc ra không bao gồm người dùng hiện tại
      const otherMemberIds = memberIds.filter((id) => id !== currentUserId);
      if (otherMemberIds.length === 0) {
        message.warning("Không có thành viên khác trong nhóm để gọi.");
        return;
      }

      // Chỉ gọi tối đa 20 thành viên (giới hạn của Zego Cloud)
      const limitedMemberIds = otherMemberIds.slice(0, 20);

      // Tạo mảng tên hiển thị cho các thành viên
      const memberNames = limitedMemberIds.map((id) => {
        const member = userCache[id] || localUserCache[id];
        return member?.fullname || "Thành viên";
      });

      try {
        setIsCallingInProgress(true);

        // Đảm bảo ZIM đã khởi tạo thành công
        if (!isZIMInitialized) {
          message.loading("Đang khởi tạo dịch vụ gọi điện...");
          // Đợi thêm một chút để ZIM khởi tạo xong
          await new Promise((resolve) => setTimeout(resolve, 3000));
        }

        // Ensure zegoInstance is not null
        if (!zegoInstance) {
          message.error(
            "Không thể kết nối dịch vụ gọi điện. Vui lòng thử lại sau."
          );
          setIsCallingInProgress(false);
          return;
        }

        // Sử dụng zegoService để gửi lời mời gọi điện nhóm
        const roomID = `group_${conversation.conversationId}_${Date.now()}`;
        await zegoService.sendGroupCallInvitation(
          zegoInstance,
          limitedMemberIds,
          memberNames,
          roomID,
          false, // voice call, not video
          {
            onCallModalVisibilityChange: (visible) =>
              setIsCallModalVisible(visible),
            onCallingProgressChange: (inProgress) =>
              setIsCallingInProgress(inProgress),
          }
        );

        message.info(
          `Đang gọi điện cho ${limitedMemberIds.length} thành viên...`
        );
      } catch (err) {
        console.error("Error making group voice call:", err);
        setIsCallingInProgress(false);
        message.error(
          "Không thể thực hiện cuộc gọi nhóm. Vui lòng thử lại sau."
        );
      }
    } else {
      // Xử lý cuộc gọi 1:1 (mã hiện tại)
      if (!otherUserId || !otherUserInfo) {
        message.error("Không thể xác định người nhận cuộc gọi");
        return;
      }

      // Đảm bảo ZIM đã khởi tạo thành công
      if (!isZIMInitialized) {
        message.loading("Đang khởi tạo dịch vụ gọi điện...");
        // Đợi thêm một chút để ZIM khởi tạo xong
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }

      try {
        setIsCallingInProgress(true);

        // Ensure zegoInstance is not null
        if (!zegoInstance) {
          message.error(
            "Không thể kết nối dịch vụ gọi điện. Vui lòng thử lại sau."
          );
          setIsCallingInProgress(false);
          return;
        }

        // Sử dụng zegoService để gửi lời mời gọi điện
        await zegoService.sendCallInvitation(
          zegoInstance,
          otherUserId,
          otherUserInfo.fullname || "User",
          false, // voice call, not video
          {
            onCallModalVisibilityChange: (visible) =>
              setIsCallModalVisible(visible),
            onCallingProgressChange: (inProgress) =>
              setIsCallingInProgress(inProgress),
          }
        );
      } catch (err) {
        console.error("Error making voice call:", err);
        setIsCallingInProgress(false);
      }
    }
  };

  // Xử lý khi người dùng nhấn nút gọi video
  const handleVideoCall = async () => {
    if (!zegoInstance) {
      // Thử lấy instance từ zegoService
      const userId = localStorage.getItem("userId") || "";
      const userName = localStorage.getItem("fullname") || "User";

      try {
        // Thử khởi tạo một zegoInstance mới nếu cần
        message.loading("Đang kết nối dịch vụ gọi điện...");
        const zp = await zegoService.initializeZego(userId, userName, {
          onZIMInitialized: () => setIsZIMInitialized(true),
          onCallModalVisibilityChange: (visible) =>
            setIsCallModalVisible(visible),
          onCallingProgressChange: (inProgress) =>
            setIsCallingInProgress(inProgress),
        });

        if (zp) {
          setZegoInstance(zp);
          message.success("Kết nối dịch vụ gọi điện thành công");
        } else {
          message.error("Không thể kết nối dịch vụ gọi điện.");
          return;
        }
      } catch {
        message.error(
          "Không thể kết nối dịch vụ gọi điện. Vui lòng thử lại sau."
        );
        return;
      }
    }

    // Kiểm tra nếu đang có cuộc gọi
    if (isCallingInProgress) {
      message.info("Đang có cuộc gọi. Vui lòng thử lại sau.");
      return;
    }

    // Trước khi gọi, thử giải phóng các thiết bị audio và video
    try {
      // Giải phóng các thiết bị media trước khi bắt đầu cuộc gọi mới
      await zegoService.releaseMediaDevices();

      // Yêu cầu quyền truy cập vào microphone và camera
      await zegoService.requestMediaPermissions();
    } catch (error) {
      console.warn("Cảnh báo kiểm tra thiết bị:", error);
      // Tiếp tục mặc dù có lỗi, vì Zego sẽ tự xử lý yêu cầu quyền
    }

    // Xử lý khác nhau cho cuộc gọi nhóm và cuộc gọi 1:1
    if (isGroup) {
      // Xử lý cuộc gọi nhóm video
      const memberIds = conversation.groupMembers || [];
      if (memberIds.length <= 1) {
        message.warning("Không có đủ thành viên trong nhóm để gọi.");
        return;
      }

      // Lọc ra không bao gồm người dùng hiện tại
      const otherMemberIds = memberIds.filter((id) => id !== currentUserId);
      if (otherMemberIds.length === 0) {
        message.warning("Không có thành viên khác trong nhóm để gọi.");
        return;
      }

      // Giới hạn số người tham gia (Zego Cloud hỗ trợ tối đa 20 người)
      const limitedMemberIds = otherMemberIds.slice(0, 20);

      // Tạo mảng tên hiển thị cho các thành viên
      const memberNames = limitedMemberIds.map((id) => {
        const member = userCache[id] || localUserCache[id];
        return member?.fullname || "Thành viên";
      });

      try {
        setIsCallingInProgress(true);

        // Đảm bảo ZIM đã khởi tạo thành công
        if (!isZIMInitialized) {
          message.loading("Đang khởi tạo dịch vụ gọi điện...");
          // Đợi thêm một chút để ZIM khởi tạo xong
          await new Promise((resolve) => setTimeout(resolve, 3000));
        }

        // Ensure zegoInstance is not null
        if (!zegoInstance) {
          message.error(
            "Không thể kết nối dịch vụ gọi điện. Vui lòng thử lại sau."
          );
          setIsCallingInProgress(false);
          return;
        }

        // Sử dụng phương thức gọi nhóm với roomID độc quyền
        const roomID = `video_group_${conversation.conversationId}_${Date.now()}`;
        await zegoService.sendGroupCallInvitation(
          zegoInstance,
          limitedMemberIds,
          memberNames,
          roomID,
          true, // video call
          {
            onCallModalVisibilityChange: (visible) =>
              setIsCallModalVisible(visible),
            onCallingProgressChange: (inProgress) =>
              setIsCallingInProgress(inProgress),
          }
        );

        message.info(
          `Đang gọi video cho ${limitedMemberIds.length} thành viên...`
        );
      } catch (err) {
        console.error("Error making group video call:", err);
        setIsCallingInProgress(false);
        message.error(
          "Không thể thực hiện cuộc gọi video nhóm. Vui lòng thử lại sau."
        );
      }
    } else {
      // Xử lý cuộc gọi video 1:1 (mã hiện tại)
      if (!otherUserId || !otherUserInfo) {
        message.error("Không thể xác định người nhận cuộc gọi");
        return;
      }

      // Đảm bảo ZIM đã khởi tạo thành công
      if (!isZIMInitialized) {
        message.loading("Đang khởi tạo dịch vụ gọi điện...");
        // Đợi thêm một chút để ZIM khởi tạo xong
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }

      try {
        setIsCallingInProgress(true);

        // Ensure zegoInstance is not null
        if (!zegoInstance) {
          message.error(
            "Không thể kết nối dịch vụ gọi điện. Vui lòng thử lại sau."
          );
          setIsCallingInProgress(false);
          return;
        }

        // Sử dụng zegoService để gửi lời mời gọi video
        await zegoService.sendCallInvitation(
          zegoInstance,
          otherUserId,
          otherUserInfo.fullname || "User",
          true, // video call
          {
            onCallModalVisibilityChange: (visible) =>
              setIsCallModalVisible(visible),
            onCallingProgressChange: (inProgress) =>
              setIsCallingInProgress(inProgress),
          }
        );
      } catch (err) {
        console.error("Error making video call:", err);
        setIsCallingInProgress(false);
      }
    }
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
        <Tooltip title={isGroup ? "Gọi nhóm" : t.calls || "Gọi thoại"}>
          <Button
            type="text"
            icon={<PhoneOutlined />}
            className="flex items-center justify-center w-10 h-10"
            onClick={handleVoiceCall}
            disabled={isCallingInProgress}
          />
        </Tooltip>
        <Tooltip
          title={isGroup ? "Gọi video nhóm" : t.video_call || "Gọi video"}>
          <Button
            type="text"
            icon={<VideoCameraOutlined />}
            className="flex items-center justify-center w-10 h-10"
            onClick={handleVideoCall}
            disabled={isCallingInProgress}
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
