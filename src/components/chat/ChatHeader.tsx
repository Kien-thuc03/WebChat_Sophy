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
import { ZegoVideoCall } from "../zego/zego";
import AddMemberModal from "./modals/AddMemberModal";

interface ExtendedChatHeaderProps extends ChatHeaderProps {
  conversation: Conversation;
  onInfoClick?: () => void;
  showInfo?: boolean;
}

// Declare the incomingCallAudio property for the Window interface
declare global {
  interface Window {
    incomingCallAudio?: HTMLAudioElement;
  }
}

// Thêm định nghĩa cho response checkUserStatus
interface UserStatusResponse {
  status: "online" | "offline";
  lastActive?: string;
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

  // Xử lý sự kiện gọi (bên gọi)
  const handleCall = async (isVideo: boolean) => {
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
    // Sắp xếp ID để đảm bảo cùng một roomID cho cả hai người dùng
    const userIds = [currentUserId, otherUserId].sort();
    const consistentRoomID = `call_${userIds[0]}_${userIds[1]}`;

    console.log("ChatHeader: Bắt đầu cuộc gọi với roomID:", consistentRoomID);

    // Hiển thị modal cuộc gọi
    setIsCallModalVisible(true);

    // Gửi sự kiện cuộc gọi qua socket
    socketService.emit("startCall", {
      conversationId: conversation.conversationId,
      roomID: consistentRoomID,
      callerId: currentUserId,
      receiverId: otherUserId,
      isVideo,
    });
  };

  // Đóng modal cuộc gọi
  const handleCloseCallModal = () => {
    console.log("ChatHeader: Đóng modal cuộc gọi");

    setIsCallModalVisible(false);

    // Cần đặt incomingCall thành null khi đóng modal
    // để không còn hiển thị cuộc gọi đến nữa
    setIncomingCall(null);

    // Dừng nhạc chuông nếu đang phát
    if (window.incomingCallAudio) {
      window.incomingCallAudio.pause();
      window.incomingCallAudio.currentTime = 0;
      window.incomingCallAudio = undefined;
    }

    // Gửi sự kiện endCall
    if (otherUserId) {
      socketService.emit("endCall", {
        conversationId: conversation.conversationId,
        receiverId: otherUserId,
      });
    }
  };

  // Xử lý chấp nhận cuộc gọi (bên nhận - UI action)
  const handleAcceptCallUI = () => {
    if (!incomingCall) {
      console.warn("ChatHeader: Không có cuộc gọi đến để chấp nhận");
      return;
    }

    console.log(
      "ChatHeader: Chấp nhận cuộc gọi với roomID:",
      incomingCall.roomID
    );

    // Stop any playing ringtone
    if (window.incomingCallAudio) {
      window.incomingCallAudio.pause();
      window.incomingCallAudio.currentTime = 0;
      window.incomingCallAudio = undefined;
    }

    // Đặt loại cuộc gọi
    setIsVideo(incomingCall.isVideo);

    // QUAN TRỌNG: Gửi sự kiện acceptCall TRƯỚC KHI hiển thị modal
    // Đảm bảo người gọi nhận được thông báo trước khi UI thay đổi
    socketService.emit("acceptCall", {
      conversationId: incomingCall.conversationId,
      roomID: incomingCall.roomID,
      callerId: incomingCall.callerId,
      receiverId: currentUserId,
    });

    // Hiển thị modal cuộc gọi sau khi đã gửi sự kiện
    setIsCallModalVisible(true);
  };

  // Xử lý từ chối cuộc gọi (bên nhận)
  const handleRejectCall = () => {
    if (!incomingCall) return;

    console.log("ChatHeader: Từ chối cuộc gọi");

    // Stop any playing ringtone
    if (window.incomingCallAudio) {
      window.incomingCallAudio.pause();
      window.incomingCallAudio.currentTime = 0;
      window.incomingCallAudio = undefined;
    }

    socketService.emit("endCall", {
      conversationId: incomingCall.conversationId,
      receiverId: incomingCall.callerId,
    });
    setIncomingCall(null);
  };

  // Lắng nghe sự kiện cuộc gọi (startCall, endCall, callError, acceptCall)
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
      console.log("ChatHeader: Nhận được sự kiện cuộc gọi:", data);

      // Kiểm tra roomID
      if (!data.roomID) {
        console.error("ChatHeader: roomID không hợp lệ:", data.roomID);
        return;
      }

      // Xử lý đặc biệt đối với cuộc gọi đến khi chưa ở trong conversation hiện tại
      if (data.conversationId !== conversation.conversationId) {
        // Tạo một sự kiện để Dashboard có thể xử lý
        window.dispatchEvent(
          new CustomEvent("incomingCallToOtherConversation", {
            detail: {
              ...data,
              currentUser: currentUserId,
            },
          })
        );
        console.log(
          "ChatHeader: Cuộc gọi đến cho conversation khác, đang thông báo cho Dashboard"
        );
        return;
      }

      // Compare the callerId with the current user
      const isCaller = data.callerId === currentUserId;

      // Determine if current user is the receiver
      let isReceiver = false;

      // Kiểm tra cả hai trường hợp
      // 1. Trường hợp có receiverId rõ ràng
      if (data.receiverId && data.receiverId === currentUserId) {
        isReceiver = true;
        console.log(
          "ChatHeader: Người dùng được xác định là người nhận qua receiverId rõ ràng"
        );
      }
      // 2. Trường hợp cuộc gọi 1-1, nếu không phải người gọi thì phải là người nhận
      else if (!isGroup) {
        // Trong cuộc hội thoại 1-1, nếu mình không phải là người gọi, thì mình là người nhận
        if (data.callerId !== currentUserId) {
          isReceiver = true;
          console.log(
            "ChatHeader: Người dùng được xác định là người nhận trong cuộc hội thoại 1-1"
          );
        }
      }

      console.log("ChatHeader: Phân tích vai trò cuộc gọi:", {
        isCaller,
        isReceiver,
        currentUserId,
        callerId: data.callerId,
        conversationId: data.conversationId,
        currentConversationId: conversation.conversationId,
        isGroup,
      });

      // Nếu không phải người gọi hoặc người nhận, bỏ qua
      if (!isCaller && !isReceiver) {
        console.log("ChatHeader: Không phải người gọi hoặc người nhận, bỏ qua");
        return;
      }

      // Nếu là người nhận, hiển thị giao diện cuộc gọi đến
      if (isReceiver) {
        console.log(
          "ChatHeader: Thiết lập giao diện cuộc gọi đến cho người nhận"
        );

        // Đặt thông tin cuộc gọi đến
        setIncomingCall({
          conversationId: data.conversationId,
          roomID: data.roomID,
          callerId: data.callerId,
          isVideo: data.isVideo,
        });

        // Phát âm thanh thông báo nếu có thể
        try {
          // Sử dụng đối tượng Audio HTML5 cục bộ để tránh vấn đề CORS
          const audioUrls = [
            "/sounds/phone-calling-sfx-333916.mp3", // Nhạc chuông chính
            "/sounds/phone-call-14472.mp3", // Phương án dự phòng 1
            "/sounds/end-call-120633.mp3", // Phương án dự phòng 2
          ];

          const audio = new Audio();
          let currentUrlIndex = 0;

          // Xử lý khi tải audio thất bại
          audio.onerror = () => {
            currentUrlIndex++;
            if (currentUrlIndex < audioUrls.length) {
              console.log(
                `ChatHeader: Thử tải nhạc chuông từ nguồn ${currentUrlIndex}:`,
                audioUrls[currentUrlIndex]
              );
              audio.src = audioUrls[currentUrlIndex];
              audio.load();
              audio.play().catch((e) => {
                console.error("Không thể phát nhạc chuông:", e);
                // Tạo thêm một thông báo âm thanh nếu không thể phát nhạc chuông
                try {
                  // Thử sử dụng AudioContext API
                  const audioCtx = new (window.AudioContext ||
                    (
                      window as unknown as {
                        webkitAudioContext: typeof AudioContext;
                      }
                    ).webkitAudioContext)();
                  const oscillator = audioCtx.createOscillator();
                  oscillator.type = "sine";
                  oscillator.frequency.setValueAtTime(
                    440,
                    audioCtx.currentTime
                  ); // value in hertz
                  oscillator.connect(audioCtx.destination);
                  oscillator.start();
                  setTimeout(() => oscillator.stop(), 1000);
                } catch (audioErr) {
                  console.warn(
                    "Cả hai phương pháp phát âm thanh đều thất bại:",
                    audioErr
                  );
                }
              });
            } else {
              console.error(
                "ChatHeader: Đã thử tất cả các nguồn nhạc chuông nhưng không thành công"
              );
            }
          };

          audio.src = audioUrls[0];
          audio.loop = true;
          audio.volume = 0.7;

          // Cố gắng tải trước để tránh lỗi
          audio.load();

          // Play và xử lý lỗi nếu có
          const playPromise = audio.play();
          if (playPromise !== undefined) {
            playPromise.catch((e) => {
              console.log(
                "Không thể phát nhạc chuông (đang thử phương án thay thế):",
                e
              );

              // Thử dùng user interaction đã có để kích hoạt âm thanh
              document.addEventListener(
                "click",
                function playAudioOnUserInteraction() {
                  audio
                    .play()
                    .catch((err) =>
                      console.error(
                        "Vẫn không thể phát nhạc chuông sau tương tác:",
                        err
                      )
                    );
                  document.removeEventListener(
                    "click",
                    playAudioOnUserInteraction
                  );
                },
                { once: true }
              );

              // Thử phương án dự phòng
              currentUrlIndex++;
              if (currentUrlIndex < audioUrls.length) {
                audio.src = audioUrls[currentUrlIndex];
                audio.load();
                audio
                  .play()
                  .catch((e) =>
                    console.error("Vẫn không thể phát nhạc chuông:", e)
                  );
              }
            });
          }

          // Lưu để có thể dừng sau này
          window.incomingCallAudio = audio;
        } catch (error) {
          console.warn("Không thể phát nhạc chuông:", error);
        }
      }
    };

    const handleEndCall = (data: { conversationId: string }) => {
      console.log("ChatHeader: Nhận được sự kiện kết thúc cuộc gọi:", data);

      // Stop any playing ringtone
      if (window.incomingCallAudio) {
        window.incomingCallAudio.pause();
        window.incomingCallAudio.currentTime = 0;
        window.incomingCallAudio = undefined;
      }

      message.info("Cuộc gọi đã kết thúc.");
      setIsCallModalVisible(false);
      setIncomingCall(null);
    };

    const handleCallError = (data: { message: string }) => {
      console.log("ChatHeader: Nhận được sự kiện lỗi cuộc gọi:", data);

      // Stop any playing ringtone
      if (window.incomingCallAudio) {
        window.incomingCallAudio.pause();
        window.incomingCallAudio.currentTime = 0;
        window.incomingCallAudio = undefined;
      }

      message.error(data.message);
      setIsCallModalVisible(false);
      setIncomingCall(null);
    };

    // Xử lý khi có người nhận chấp nhận cuộc gọi (socket event)
    const handleAcceptCallEvent = (data: {
      conversationId: string;
      roomID: string;
      callerId: string;
      receiverId: string;
    }) => {
      console.log("ChatHeader: Nhận được sự kiện chấp nhận cuộc gọi:", data);

      // Chỉ xử lý nếu người gọi là người dùng hiện tại
      if (data.callerId === currentUserId) {
        console.log(
          "ChatHeader: Người dùng hiện tại là người gọi, đang xử lý chấp nhận"
        );
        message.success("Cuộc gọi đã được chấp nhận");

        // Đảm bảo roomID được sử dụng đúng
        if (data.roomID !== roomID) {
          console.warn("ChatHeader: roomID không khớp:", {
            expected: roomID,
            actual: data.roomID,
          });
        }

        // Đảm bảo modal hiển thị
        if (!isCallModalVisible) {
          setIsCallModalVisible(true);
        }
      }
    };

    // Đăng ký lắng nghe các sự kiện
    socketService.onStartCall(handleStartCall);
    socketService.onEndCall(handleEndCall);
    socketService.onCallError(handleCallError);
    socketService.onAcceptCall(handleAcceptCallEvent);

    return () => {
      socketService.off("startCall", handleStartCall);
      socketService.off("endCall");
      socketService.off("callError");
      socketService.off("acceptCall", handleAcceptCallEvent);
    };
  }, [
    currentUserId,
    conversation.conversationId,
    isGroup,
    roomID,
    isCallModalVisible,
  ]);

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

  useEffect(() => {
    return () => {
      // Dọn dẹp khi component bị unmount
      if (incomingCall) {
        handleRejectCall();
      }
    };
  }, [incomingCall]);

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

  // Thêm useEffect để lắng nghe sự kiện cập nhật trạng thái người dùng
  useEffect(() => {
    // Hàm xử lý khi có người dùng online/offline
    const handleUserStatus = (data: { userId: string; status: string }) => {
      if (!isGroup && data.userId === otherUserId) {
        console.log(`ChatHeader: User ${data.userId} is now ${data.status}`);

        // Cập nhật trạng thái hiển thị
        if (data.status === "online") {
          setActivityStatus("Đang trực tuyến");
          setIsOnline(true);
        } else {
          checkActivityStatus(); // Kiểm tra lại thời gian hoạt động gần nhất
        }

        // Cập nhật cache người dùng nếu cần
        if (localUserCache[data.userId]) {
          setLocalUserCache((prev) => ({
            ...prev,
            [data.userId]: {
              ...prev[data.userId],
              lastActive: new Date().toISOString(),
              isOnline: data.status === "online",
            },
          }));
        }
      }
    };

    // Đăng ký lắng nghe sự kiện
    socketService.on("userStatusChange", handleUserStatus);

    // Kiểm tra trạng thái ban đầu và định kỳ cập nhật
    const checkUserStatus = () => {
      if (!isGroup && otherUserId) {
        socketService.emit(
          "checkUserStatus",
          { userId: otherUserId },
          (response: UserStatusResponse) => {
            if (response && response.status) {
              handleUserStatus({
                userId: otherUserId,
                status: response.status,
              });
            }
          }
        );
      }
    };

    // Kiểm tra ngay lập tức và mỗi 30 giây
    checkUserStatus();
    const intervalId = setInterval(checkUserStatus, 30000);

    return () => {
      socketService.off("userStatusChange", handleUserStatus);
      clearInterval(intervalId);
    };
  }, [isGroup, otherUserId, localUserCache]);

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
        title={
          incomingCall && !isCallModalVisible
            ? `Cuộc gọi ${incomingCall.isVideo ? "video" : "thoại"} đến`
            : `Cuộc gọi ${isVideo ? "Video" : "Thoại"}`
        }
        open={isCallModalVisible || !!incomingCall}
        onCancel={isCallModalVisible ? handleCloseCallModal : handleRejectCall}
        footer={
          incomingCall && !isCallModalVisible
            ? [
                <Button key="reject" danger onClick={handleRejectCall}>
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
                  onClick={handleAcceptCallUI}>
                  Chấp nhận
                </Button>,
              ]
            : null
        }
        maskClosable={false}
        closable={true}
        width={800}
        destroyOnClose>
        {isCallModalVisible ? (
          <ZegoVideoCall
            roomID={incomingCall ? incomingCall.roomID : roomID}
            userID={currentUserId || ""}
            userName={currentUserName || "User"}
            isIncomingCall={!!incomingCall}
            onEndCall={handleCloseCallModal}
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
