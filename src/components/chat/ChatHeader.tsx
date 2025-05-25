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
import { Button, Tooltip, message, Modal } from "antd";
import socketService from "../../services/socketService";
import AddMemberModal from "./modals/AddMemberModal";
// Import ZEGO Cloud libraries - chỉ import ZegoUIKitPrebuilt
import { ZegoUIKitPrebuilt } from "@zegocloud/zego-uikit-prebuilt";
import { ZIM } from "zego-zim-web";

// Thiết lập thông tin ZEGO với test account
// Không sử dụng dữ liệu thật cho tài khoản sản phẩm
const appID = 1502332796;
const serverSecret = "909c6e1e38843287267a33f633539f93";

// Dùng một roomID cố định cho ứng dụng
const ROOM_ID = "SophyWebChatRoom";

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

      try {
        // Tạo token với roomID cố định
        const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
          appID,
          serverSecret,
          ROOM_ID, // Sử dụng roomID cố định
          currentUserId,
          userName
        );

        // Khởi tạo instance ZegoUIKit với các tùy chọn đầy đủ và quyền truy cập media
        const zp = ZegoUIKitPrebuilt.create(kitToken);

        // Yêu cầu quyền truy cập camera và microphone sớm
        navigator.mediaDevices
          .getUserMedia({ audio: true, video: true })
          .then(() => {
            console.log("Đã cấp quyền truy cập camera và microphone");
          })
          .catch((err) => {
            console.warn(
              "Chưa cấp quyền truy cập camera hoặc microphone:",
              err
            );
          });

        // Khởi tạo ZIM và đồng bộ người dùng với hệ thống
        zp.addPlugins({ ZIM });

        // Lưu các xử lý sự kiện vào biến toàn cục để xử lý cuộc gọi
        window.zegoCallbacks = {
          onCallAccepted: () => {
            console.log("Cuộc gọi được chấp nhận");
            setIsCallModalVisible(false);
            setIsCallingInProgress(false);
          },
          onCallEnd: () => {
            console.log("Cuộc gọi kết thúc");
            setIsCallModalVisible(false);
            setIsCallingInProgress(false);
          },
          onCallRejected: () => {
            console.log("Cuộc gọi bị từ chối");
            setIsCallModalVisible(false);
            setIsCallingInProgress(false);
          },
          onUserJoin: () => {
            console.log("Có người tham gia phòng");
            // Đóng modal ngay lập tức
            setIsCallModalVisible(false);
          },
          onUserLeave: () => {
            console.log("Có người rời khỏi phòng");
            setIsCallingInProgress(false);
          },
        };

        // Đặt thời gian đợi để ZIM khởi tạo hoàn tất
        setTimeout(() => {
          console.log("ZIM đã được khởi tạo thành công");
          setIsZIMInitialized(true);
        }, 2000);

        // Lưu instance để sử dụng sau này
        setZegoInstance(zp);

        console.log("Khởi tạo ZEGO thành công cho user:", currentUserId);

        // Tạo MutationObserver để theo dõi khi giao diện ZEGO được tạo ra
        const observer = new MutationObserver((mutations) => {
          for (const mutation of mutations) {
            if (mutation.addedNodes.length) {
              // Kiểm tra xem có phần tử ZEGO được thêm vào không
              const zegoElements = document.querySelectorAll('[class*="zego"]');
              if (zegoElements.length > 0) {
                console.log(
                  "Phát hiện giao diện ZEGO, đóng modal ngay lập tức"
                );
                setIsCallModalVisible(false);
                setIsCallingInProgress(false);
              }
            }
          }
        });

        // Bắt đầu quan sát DOM để phát hiện khi giao diện ZEGO được tạo
        observer.observe(document.body, { childList: true, subtree: true });

        return () => {
          observer.disconnect(); // Hủy observer khi component unmount
        };
      } catch (error) {
        console.error("Error initializing Zego:", error);
        message.error(
          "Không thể khởi tạo dịch vụ gọi điện: " +
            (error instanceof Error ? error.message : String(error))
        );
      }
    }

    return () => {
      // Dọn dẹp khi component unmount
      // Xóa các callbacks khỏi window nếu đã đăng ký
      if (window.zegoCallbacks) {
        window.zegoCallbacks = undefined;
      }
      setZegoInstance(null);
      setIsCallingInProgress(false);
      setIsZIMInitialized(false);
    };
  }, [currentUserId]);

  // Thêm useEffect để đóng modal khi phát hiện giao diện ZEGO được tạo ra
  useEffect(() => {
    if (isCallModalVisible) {
      // Kiểm tra định kỳ xem giao diện ZEGO đã xuất hiện chưa
      const checkInterval = setInterval(() => {
        const zegoElements = document.querySelectorAll('[class*="zego"]');
        if (zegoElements.length > 0) {
          console.log("Kiểm tra định kỳ: Phát hiện giao diện ZEGO, đóng modal");
          setIsCallModalVisible(false);
          setIsCallingInProgress(false);
          clearInterval(checkInterval);
        }
      }, 500); // Kiểm tra mỗi 500ms

      return () => {
        clearInterval(checkInterval);
      };
    }
  }, [isCallModalVisible]);

  // Xử lý khi người dùng nhấn nút gọi điện thoại
  const handleVoiceCall = async () => {
    if (!zegoInstance) {
      message.error(
        "Không thể kết nối dịch vụ gọi điện. Vui lòng thử lại sau."
      );
      return;
    }

    // Kiểm tra nếu đang có cuộc gọi
    if (isCallingInProgress) {
      message.info("Đang có cuộc gọi. Vui lòng thử lại sau.");
      return;
    }

    if (isGroup) {
      message.warning("Hiện tại chỉ hỗ trợ gọi điện 1:1");
      return;
    }

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

      // Đảm bảo ID người dùng là chuỗi và không có ký tự đặc biệt
      const calleeId = String(otherUserId).replace(/[^a-zA-Z0-9]/g, "");
      const calleeName = otherUserInfo.fullname || "User";

      const targetUser = {
        userID: calleeId,
        userName: calleeName,
      };

      message.loading("Đang gọi cho " + calleeName + "...");

      // Cấu hình cuộc gọi với các tùy chọn phù hợp
      zegoInstance
        .sendCallInvitation({
          callees: [targetUser],
          callType: ZegoUIKitPrebuilt.InvitationTypeVoiceCall,
          timeout: 60,
          data: JSON.stringify({
            roomID: ROOM_ID,
            action: "voice-call",
            config: {
              turnOnCameraWhenJoining: true, // Mặc định bật camera để xin quyền
              turnOnMicrophoneWhenJoining: true, // Mặc định bật mic để xin quyền
              showPreJoinView: true, // Hiển thị màn hình xác nhận trước khi tham gia
              showLeavingView: true, // Hiển thị xác nhận khi rời khỏi
              showMicrophoneToggleButton: true, // Hiển thị nút bật/tắt mic
              showCameraToggleButton: true, // Hiển thị nút bật/tắt camera
              showUserList: true, // Hiển thị danh sách người dùng trong cuộc gọi
              showLayoutToggleButton: true, // Hiển thị nút thay đổi bố cục
              showScreenSharingButton: false, // Ẩn nút chia sẻ màn hình
              showTextChat: false, // Ẩn chat trong cuộc gọi
              showAudioVideoSettingsButton: true, // Hiển thị cài đặt âm thanh/video
              onOnlySelfInRoom: () => {
                // Khi chỉ có mình trong phòng (đối phương đã rời đi)
                console.log("Chỉ còn mình trong phòng, hủy cuộc gọi");
                setIsCallingInProgress(false);
                setIsCallModalVisible(false);
              },
              onUserJoin: () => {
                if (window.zegoCallbacks?.onUserJoin) {
                  window.zegoCallbacks.onUserJoin();
                }
                // Đóng modal ngay lập tức khi người dùng tham gia cuộc gọi
                console.log("Người dùng tham gia, đóng modal ngay");
                setIsCallModalVisible(false);
              },
              onCallEnd: () => {
                if (window.zegoCallbacks?.onCallEnd) {
                  window.zegoCallbacks.onCallEnd();
                }
                // Reset trạng thái cuộc gọi
                setIsCallingInProgress(false);
              },
              onJoinRoom: () => {
                // Khi tham gia phòng
                console.log("Đã tham gia phòng, đóng modal");
                setIsCallModalVisible(false);
              },
            },
          }),
        })
        .then((result) => {
          console.log("Call invitation sent:", result);
          if (!result.errorInvitees || result.errorInvitees.length === 0) {
            setIsCallModalVisible(true);
            message.success("Đang kết nối cuộc gọi...");

            // Giảm thời gian timeout
            setTimeout(() => {
              // Chỉ đóng modal nếu vẫn còn mở
              setIsCallModalVisible(false);
              setIsCallingInProgress(false);
            }, 5000); // Giảm xuống 5 giây
          } else {
            message.error(
              "Người nhận hiện không khả dụng. Vui lòng thử lại sau."
            );
            console.error("Error invitees:", result.errorInvitees);
            setIsCallingInProgress(false);
          }
        })
        .catch((err) => {
          console.error("Failed to send call invitation:", err);
          message.error(
            "Lỗi khi thực hiện cuộc gọi: " + (err.message || "Không xác định")
          );
          setIsCallingInProgress(false);
        });
    } catch (error) {
      console.error("Error making call:", error);
      message.error("Đã xảy ra lỗi khi gọi điện");
      setIsCallingInProgress(false);
    }
  };

  // Xử lý khi người dùng nhấn nút gọi video
  const handleVideoCall = async () => {
    if (!zegoInstance) {
      message.error(
        "Không thể kết nối dịch vụ gọi điện. Vui lòng thử lại sau."
      );
      return;
    }

    // Kiểm tra nếu đang có cuộc gọi
    if (isCallingInProgress) {
      message.info("Đang có cuộc gọi. Vui lòng thử lại sau.");
      return;
    }

    if (isGroup) {
      message.warning("Hiện tại chỉ hỗ trợ gọi video 1:1");
      return;
    }

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

      // Đảm bảo ID người dùng là chuỗi và không có ký tự đặc biệt
      const calleeId = String(otherUserId).replace(/[^a-zA-Z0-9]/g, "");
      const calleeName = otherUserInfo.fullname || "User";

      const targetUser = {
        userID: calleeId,
        userName: calleeName,
      };

      message.loading("Đang gọi video cho " + calleeName + "...");

      // Cấu hình cuộc gọi video với các tùy chọn phù hợp
      zegoInstance
        .sendCallInvitation({
          callees: [targetUser],
          callType: ZegoUIKitPrebuilt.InvitationTypeVideoCall,
          timeout: 60,
          data: JSON.stringify({
            roomID: ROOM_ID,
            action: "video-call",
            config: {
              turnOnCameraWhenJoining: true, // Mặc định bật camera để xin quyền
              turnOnMicrophoneWhenJoining: true, // Mặc định bật mic để xin quyền
              showPreJoinView: true, // Hiển thị màn hình xác nhận trước khi tham gia
              showLeavingView: true, // Hiển thị xác nhận khi rời khỏi
              showMicrophoneToggleButton: true, // Hiển thị nút bật/tắt mic
              showCameraToggleButton: true, // Hiển thị nút bật/tắt camera
              showUserList: true, // Hiển thị danh sách người dùng trong cuộc gọi
              showLayoutToggleButton: true, // Hiển thị nút thay đổi bố cục
              showScreenSharingButton: true, // Hiển thị nút chia sẻ màn hình
              showTextChat: false, // Ẩn chat trong cuộc gọi
              showAudioVideoSettingsButton: true, // Hiển thị cài đặt âm thanh/video
              onOnlySelfInRoom: () => {
                // Khi chỉ có mình trong phòng (đối phương đã rời đi)
                console.log("Chỉ còn mình trong phòng, hủy cuộc gọi");
                setIsCallingInProgress(false);
                setIsCallModalVisible(false);
              },
              onUserJoin: () => {
                if (window.zegoCallbacks?.onUserJoin) {
                  window.zegoCallbacks.onUserJoin();
                }
                // Đóng modal ngay lập tức khi người dùng tham gia cuộc gọi
                console.log("Người dùng tham gia, đóng modal ngay");
                setIsCallModalVisible(false);
              },
              onCallEnd: () => {
                if (window.zegoCallbacks?.onCallEnd) {
                  window.zegoCallbacks.onCallEnd();
                }
                // Reset trạng thái cuộc gọi
                setIsCallingInProgress(false);
              },
              onJoinRoom: () => {
                // Khi tham gia phòng
                console.log("Đã tham gia phòng, đóng modal");
                setIsCallModalVisible(false);
              },
            },
          }),
        })
        .then((result) => {
          console.log("Video call invitation sent:", result);
          if (!result.errorInvitees || result.errorInvitees.length === 0) {
            setIsCallModalVisible(true);
            message.success("Đang kết nối cuộc gọi video...");

            // Giảm thời gian timeout
            setTimeout(() => {
              // Chỉ đóng modal nếu vẫn còn mở
              setIsCallModalVisible(false);
              setIsCallingInProgress(false);
            }, 5000); // Giảm xuống 5 giây
          } else {
            message.error(
              "Người nhận hiện không khả dụng. Vui lòng thử lại sau."
            );
            console.error("Error invitees:", result.errorInvitees);
            setIsCallingInProgress(false);
          }
        })
        .catch((err) => {
          console.error("Failed to send video call invitation:", err);
          message.error(
            "Lỗi khi thực hiện cuộc gọi video: " +
              (err.message || "Không xác định")
          );
          setIsCallingInProgress(false);
        });
    } catch (error) {
      console.error("Error making video call:", error);
      message.error("Đã xảy ra lỗi khi gọi video");
      setIsCallingInProgress(false);
    }
  };

  // Thay đổi hàm kết thúc cuộc gọi trong Modal
  const endCall = () => {
    setIsCallModalVisible(false);
    setIsCallingInProgress(false);
    if (zegoInstance) {
      zegoInstance.hangUp();
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
        <Tooltip title={t.calls || "Gọi thoại"}>
          <Button
            type="text"
            icon={<PhoneOutlined />}
            className="flex items-center justify-center w-10 h-10"
            onClick={handleVoiceCall}
            disabled={isGroup || !zegoInstance || isCallingInProgress}
          />
        </Tooltip>
        <Tooltip title={t.video_call || "Gọi video"}>
          <Button
            type="text"
            icon={<VideoCameraOutlined />}
            className="flex items-center justify-center w-10 h-10"
            onClick={handleVideoCall}
            disabled={isGroup || !zegoInstance || isCallingInProgress}
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

      {/* Modal cho cuộc gọi đang diễn ra */}
      {isCallModalVisible && (
        <Modal
          title="Cuộc gọi đang diễn ra"
          open={isCallModalVisible}
          onCancel={() => {
            endCall();
          }}
          footer={null}
          width={400}
          centered>
          <div className="incoming-call-container">
            <div className="incoming-call-avatar">
              <Avatar
                name={otherUserInfo?.fullname || "User"}
                avatarUrl={otherUserInfo?.urlavatar}
                size={80}
                className="rounded-full"
              />
            </div>
            <div className="incoming-call-info">
              <h2>{otherUserInfo?.fullname || "Người dùng"}</h2>
              <p>Đang gọi...</p>
            </div>
            <div className="flex justify-center mt-6 space-x-4">
              <Button
                type="primary"
                danger
                shape="circle"
                icon={<PhoneOutlined className="rotate-135" />}
                onClick={endCall}
                size="large"
              />
            </div>
          </div>
        </Modal>
      )}
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
