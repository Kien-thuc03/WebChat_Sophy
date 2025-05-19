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

    // Thêm log chi tiết để debug
    console.log("ChatHeader: Thông tin cuộc gọi đi:", {
      conversationId: conversation.conversationId,
      roomID: consistentRoomID,
      callerId: currentUserId,
      receiverId: otherUserId,
      isVideo,
    });

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

    // Dừng tất cả âm thanh
    stopAllCallAudios();

    // Thêm kiểm tra để chắc chắn âm thanh đã dừng hoàn toàn
    setTimeout(() => {
      if (window.incomingCallAudio) {
        console.log(
          "ChatHeader: Dừng incomingCallAudio trong handleCloseCallModal"
        );
        window.incomingCallAudio.pause();
        window.incomingCallAudio.currentTime = 0;
        window.incomingCallAudio.src = "";
        window.incomingCallAudio = undefined;
      }

      // Dừng mọi audio element trên trang
      document.querySelectorAll("audio").forEach((audio) => {
        audio.pause();
        audio.currentTime = 0;
        audio.src = "";
      });

      setIsCallModalVisible(false);

      // Cần đặt incomingCall thành null khi đóng modal
      // để không còn hiển thị cuộc gọi đến nữa
      setIncomingCall(null);

      // Gửi sự kiện endCall
      if (otherUserId) {
        socketService.emit("endCall", {
          conversationId: conversation.conversationId,
          receiverId: otherUserId,
        });
      }
    }, 100);
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

    // Dừng tất cả âm thanh trước khi chấp nhận cuộc gọi
    stopAllCallAudios();

    // Đặt loại cuộc gọi
    setIsVideo(incomingCall.isVideo);

    // Log thông tin quan trọng để debug
    console.log("ChatHeader: Thông tin chấp nhận cuộc gọi:", {
      conversationId: incomingCall.conversationId,
      roomID: incomingCall.roomID,
      callerId: incomingCall.callerId,
      receiverId: currentUserId,
      isVideo: incomingCall.isVideo,
    });

    // Hiển thị thông báo rõ ràng cho người dùng
    message.success("Đang kết nối cuộc gọi...");

    // Xác nhận rằng âm thanh đã bị dừng hoàn toàn trước khi tiếp tục
    setTimeout(() => {
      // Kiểm tra lại và dừng một lần nữa để đảm bảo không có âm thanh nào còn phát
      if (window.incomingCallAudio) {
        console.log(
          "ChatHeader: Dừng incomingCallAudio trong handleAcceptCallUI"
        );
        window.incomingCallAudio.pause();
        window.incomingCallAudio.currentTime = 0;
        window.incomingCallAudio.src = "";
        window.incomingCallAudio = undefined;
      }

      // Dừng mọi audio element đang phát trên trang
      document.querySelectorAll("audio").forEach((audio) => {
        audio.pause();
        audio.currentTime = 0;
        audio.src = "";
      });

      // QUAN TRỌNG: Gửi sự kiện acceptCall TRƯỚC KHI hiển thị modal
      // Đảm bảo người gọi nhận được thông báo trước khi UI thay đổi
      socketService.emit("acceptCall", {
        conversationId: incomingCall.conversationId,
        roomID: incomingCall.roomID,
        callerId: incomingCall.callerId,
        receiverId: currentUserId,
      });

      // Hiển thị modal cuộc gọi sau một khoảng thời gian ngắn
      // Đây là một fix quan trọng: thêm khoảng thời gian chờ để đảm bảo
      // event acceptCall đã được xử lý bởi server trước khi hiển thị giao diện Zego
      setTimeout(() => {
        // Hiển thị modal cuộc gọi sau khi đã gửi sự kiện
        setIsCallModalVisible(true);
      }, 300);
    }, 100);
  };

  // Xử lý từ chối cuộc gọi (bên nhận)
  const handleRejectCall = () => {
    if (!incomingCall) return;

    console.log("ChatHeader: Từ chối cuộc gọi");

    // Dừng tất cả âm thanh
    stopAllCallAudios();

    // Đặt timeout để chắc chắn âm thanh đã dừng hoàn toàn trước khi gửi sự kiện endCall
    setTimeout(() => {
      // Kiểm tra lại và dừng âm thanh còn sót lại nếu có
      const audioElements = document.querySelectorAll("audio");
      console.log(
        `ChatHeader: Kiểm tra ${audioElements.length} audio elements còn lại`
      );

      audioElements.forEach((audio) => {
        try {
          if (!audio.paused) {
            console.log(
              "ChatHeader: Dừng audio element đang phát trong handleRejectCall"
            );
            audio.pause();
            audio.currentTime = 0;
            audio.src = "";
          }
        } catch {
          // Bỏ qua lỗi
        }
      });

      // Xác nhận lại incomingCallAudio đã bị dừng
      if (window.incomingCallAudio) {
        console.log(
          "ChatHeader: Dừng incomingCallAudio trong handleRejectCall"
        );
        window.incomingCallAudio.pause();
        window.incomingCallAudio = undefined;
      }

      // Thông báo rõ ràng
      message.info("Đã từ chối cuộc gọi", 2);

      // Gửi sự kiện từ chối
      console.log("ChatHeader: Gửi sự kiện endCall do từ chối cuộc gọi");
      socketService.emit("endCall", {
        conversationId: incomingCall.conversationId,
        receiverId: incomingCall.callerId,
      });

      // Xóa thông tin cuộc gọi đến
      setIncomingCall(null);
    }, 100);
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

      // Nếu đã có cuộc gọi đến, không xử lý cuộc gọi mới
      if (incomingCall) {
        console.log("ChatHeader: Đã có cuộc gọi đến, bỏ qua cuộc gọi mới");
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

        // Dừng tất cả âm thanh trước khi bắt đầu
        stopAllCallAudios();

        // Phát âm thanh thông báo nếu có thể
        try {
          // Tạo một global array để theo dõi tất cả audio elements được tạo
          if (!window.callAudioElements) {
            window.callAudioElements = [];
          }

          console.log("ChatHeader: Bắt đầu phát nhạc chuông mới");

          // Chỉ chọn một file âm thanh để phát
          const audioFile = "/sounds/phone-calling-sfx-333916.mp3";

          const audio = new Audio(audioFile);
          audio.loop = true;
          audio.volume = 0.7;

          // Thêm audio element vào danh sách theo dõi
          window.callAudioElements.push(audio);

          // Thiết lập timeout để tránh phát âm thanh quá lâu
          const audioTimeout = setTimeout(() => {
            if (audio && !audio.paused) {
              console.log("ChatHeader: Dừng âm thanh sau thời gian timeout");
              try {
                audio.pause();
                audio.currentTime = 0;
                audio.src = "";
              } catch (error) {
                console.warn("Không thể dừng audio sau timeout:", error);
              }
            }
          }, 30000); // 30 giây tối đa

          // Cài đặt xử lý lỗi
          audio.onerror = () => {
            console.error("ChatHeader: Lỗi phát âm thanh");
            clearTimeout(audioTimeout);

            // Thử phát âm thanh dự phòng nếu âm thanh chính thất bại
            try {
              const fallbackAudio = new Audio("/sounds/phone-call-14472.mp3");
              fallbackAudio.loop = true;
              fallbackAudio.volume = 0.7;

              // Tránh AbortError bằng cách thiết lập timeout trước khi play
              setTimeout(() => {
                fallbackAudio.play().catch((playError) => {
                  console.error("Không thể phát âm thanh dự phòng:", playError);
                });
              }, 50);

              // Thêm audio element vào danh sách theo dõi
              window.callAudioElements.push(fallbackAudio);

              // Cập nhật incomingCallAudio để có thể dừng sau này
              window.incomingCallAudio = fallbackAudio;
            } catch (fallbackErr) {
              console.error("Không thể phát âm thanh dự phòng:", fallbackErr);
            }
          };

          // Cố gắng tải trước để tránh lỗi
          audio.load();

          // Đợi một chút trước khi phát âm thanh để tránh các vấn đề với timing
          setTimeout(() => {
            // Play và xử lý lỗi nếu có
            audio.play().catch((playError) => {
              console.log("ChatHeader: Không thể phát nhạc chuông:", playError);
              // Kích hoạt xử lý lỗi thủ công
              const errorHandler = audio.onerror;
              if (errorHandler && typeof errorHandler === "function") {
                errorHandler.call(audio, new Event("error"));
              }
            });
          }, 50);

          // Lưu để có thể dừng sau này
          window.incomingCallAudio = audio;
        } catch (error) {
          console.warn("ChatHeader: Không thể khởi tạo âm thanh:", error);
        }
      }
    };

    const handleEndCall = (data: { conversationId: string }) => {
      console.log("ChatHeader: Nhận được sự kiện kết thúc cuộc gọi:", data);

      // Dừng tất cả âm thanh ngay lập tức
      stopAllCallAudios();

      // Thiết lập timeout thứ hai để đảm bảo toàn bộ âm thanh đã dừng
      setTimeout(() => {
        // Kiểm tra và dừng lại âm thanh một lần nữa
        const finalCheck = document.querySelectorAll("audio");
        finalCheck.forEach((audio) => {
          try {
            if (!audio.paused) {
              audio.pause();
              audio.src = "";
            }
          } catch {
            // Bỏ qua lỗi
          }
        });

        // Thêm thông báo rõ ràng cho người dùng
        message.info("Cuộc gọi đã kết thúc.", 2);

        // Cập nhật UI
        setIsCallModalVisible(false);
        setIncomingCall(null);

        // Log thêm thông tin
        console.log(
          "ChatHeader: Đã dọn dẹp âm thanh và UI sau khi kết thúc cuộc gọi"
        );
      }, 200);
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

        // Thông báo cho người dùng rõ ràng
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
          // Hiển thị UI sau một khoảng thời gian nhỏ
          // để đảm bảo dữ liệu đã được xử lý
          setTimeout(() => {
            setIsCallModalVisible(true);
          }, 200);
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

  // Nâng cấp hàm stopAllCallAudios để đảm bảo tất cả audio dừng hoàn toàn
  const stopAllCallAudios = () => {
    console.log("ChatHeader: TOÀN CỤC - Dừng tất cả âm thanh cuộc gọi");

    try {
      // Dừng và xóa window.incomingCallAudio
      if (window.incomingCallAudio) {
        try {
          window.incomingCallAudio.pause();
          window.incomingCallAudio.currentTime = 0;
          window.incomingCallAudio.src = "";
          window.incomingCallAudio.load();
          window.incomingCallAudio.remove?.(); // Xóa khỏi DOM nếu có phương thức này
          window.incomingCallAudio = undefined;
        } catch (error) {
          console.warn("Lỗi khi dừng incomingCallAudio:", error);
        }
      }

      // Dừng tất cả audio được theo dõi trong callAudioElements
      if (window.callAudioElements && Array.isArray(window.callAudioElements)) {
        console.log(
          `Đang dừng ${window.callAudioElements.length} audio elements đã được theo dõi`
        );

        for (let i = 0; i < window.callAudioElements.length; i++) {
          const audio = window.callAudioElements[i];
          if (audio) {
            try {
              audio.pause();
              audio.currentTime = 0;
              audio.src = "";
              audio.load();
              audio.remove?.(); // Xóa khỏi DOM nếu có phương thức này
            } catch (error) {
              console.warn(`Lỗi khi dừng audio ${i}:`, error);
            }
          }
        }

        // Xóa mảng
        window.callAudioElements = [];
      }

      // Vòng lặp cho tất cả audio elements trên trang
      const allAudios = document.querySelectorAll("audio");
      console.log(`Đang dừng ${allAudios.length} audio elements trên trang`);

      allAudios.forEach((audio, index) => {
        try {
          audio.pause();
          audio.currentTime = 0;
          audio.src = "";
          audio.load();
          // Không xóa khỏi DOM vì có thể là audio khác không liên quan
        } catch (error) {
          console.warn(
            `Lỗi khi dừng audio element ${index} trên trang:`,
            error
          );
        }
      });

      // Thực hiện cleanup bổ sung sau một khoảng thời gian ngắn
      setTimeout(() => {
        const remainingAudios = document.querySelectorAll("audio");
        if (remainingAudios.length > 0) {
          console.log(
            `Vẫn còn ${remainingAudios.length} audio elements, thực hiện dọn dẹp lại`
          );
          remainingAudios.forEach((audio) => {
            try {
              audio.pause();
              audio.src = "";
              // Không xóa khỏi DOM
            } catch {
              // Bỏ qua lỗi
            }
          });
        }
      }, 200);

      // Thêm vòng lặp cleanup thứ ba sau 500ms để đảm bảo không có ringtone nào bị sót
      setTimeout(() => {
        const finalCheck = document.querySelectorAll("audio");
        if (finalCheck.length > 0) {
          console.log(`Cleanup cuối cùng: ${finalCheck.length} audio elements`);
          finalCheck.forEach((audio) => {
            try {
              if (!audio.paused) {
                console.log("Dừng audio element đang phát");
                audio.pause();
                audio.src = "";
              }
            } catch {
              // Bỏ qua lỗi
            }
          });
        }
      }, 500);
    } catch (error) {
      console.error("Lỗi nghiêm trọng khi dừng âm thanh:", error);
    }

    // Đảm bảo incomingCallAudio được xóa hoàn toàn
    window.incomingCallAudio = undefined;
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
