import React, { useEffect, useState } from "react";
import { Modal, Button, message, Input, Switch } from "antd";
import {
  ArrowLeftOutlined,
  EditOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import {
  getFriendRequestsSent,
  cancelFriendRequest,
  getFriendRequestsReceived,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
  sendFriendRequest,
  getUserById,
  createConversation,
} from "../../../api/API";
import socketService from "../../../services/socketService";
import { Conversation } from "../../../features/chat/types/conversationTypes";
import { useLanguage } from "../../../features/auth/context/LanguageContext";

interface UnfriendEventData {
  userId?: string;
  friendId?: string;
  message?: string;
  timestamp?: string;
}

interface FriendRequestData {
  friendRequestId: string;
  message: string;
  sender: {
    userId: string;
    fullname: string;
    avatar?: string;
  };
  timestamp: string;
}

export interface UserResult {
  userId: string;
  fullname: string;
  phone: string;
  avatar?: string;
  isMale?: boolean;
  birthday?: string;
}

interface FriendRequest {
  friendRequestId: string;
  senderId: {
    userId: string;
    fullname?: string;
    urlavatar?: string;
  };
  receiverId: {
    userId: string;
    fullname?: string;
    urlavatar?: string;
    _id?: string;
    isMale?: boolean;
    phone?: string;
    birthday?: string;
  };
  status: string;
  message?: string;
  createdAt: string;
  updatedAt: string;
  _id: string;
  __v?: number;
  deletionDate?: string;
}

interface UserInfoHeaderModalProps {
  visible: boolean;
  onCancel: () => void;
  searchResult: UserResult | null;
  isCurrentUser: (userId: string) => boolean;
  isFriend: (userId: string) => boolean;
  handleUpdate: () => void;
  handleMessage: (userId: string, conversation: Conversation) => void;
  handleSendFriendRequest: (userId: string) => void;
  isSending: boolean;
  onRequestsUpdate?: () => void;
  isFromReceivedTab?: boolean;
  isFromSentTab?: boolean;
  requestId?: string | null;
  onAccept?: (requestId: string, senderId: string) => Promise<void>;
  onReject?: (requestId: string) => Promise<void>;
  onCancelRequest?: (requestId: string) => Promise<void>;
}

interface SendFriendRequestModalProps {
  visible: boolean;
  onCancel: () => void;
  receiverId: string;
  senderFullname: string;
  onSendSuccess: () => void;
}

const SendFriendRequestModal: React.FC<SendFriendRequestModalProps> = ({
  visible,
  onCancel,
  receiverId,
  senderFullname,
  onSendSuccess,
}) => {
  const { t, language } = useLanguage();
  const effectiveSenderName = senderFullname || "Người dùng";
  const defaultMessage = t.friend_request_template
    ? t.friend_request_template.replace("{0}", effectiveSenderName)
    : `Xin chào, mình là ${effectiveSenderName}. Kết bạn với mình nhé!`;
  const [messageText, setMessageText] = useState<string>(defaultMessage);
  const [blockDiary, setBlockDiary] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);

  useEffect(() => {
    setMessageText(
      t.friend_request_template
        ? t.friend_request_template.replace(
            "{0}",
            senderFullname || "Người dùng"
          )
        : `Xin chào, mình là ${senderFullname || "Người dùng"}. Kết bạn với mình nhé!`
    );
  }, [senderFullname, t, language]);

  const handleSend = async () => {
    setIsSending(true);
    try {
      await sendFriendRequest(receiverId, messageText);
      message.success(
        t.friend_request_sent_success || "Đã gửi yêu cầu kết bạn"
      );
      onSendSuccess();
      onCancel();
    } catch (error: unknown) {
      const err = error as { message?: string };
      message.error(
        err.message ||
          t.cannot_send_friend_request ||
          "Không thể gửi yêu cầu kết bạn"
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    if (text.length <= 150) {
      setMessageText(text);
    }
  };

  return (
    <Modal
      open={visible}
      onCancel={onCancel}
      title={null}
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={onCancel}>
            {t.back_to_info_button || "Thông tin"}
          </Button>
          <Button
            type="primary"
            onClick={handleSend}
            loading={isSending}
            disabled={messageText.trim().length === 0}>
            {t.add_friend_button || "Kết bạn"}
          </Button>
        </div>
      }
      width={400}
      styles={{ body: { padding: 16 } }}>
      <div>
        <Input.TextArea
          value={messageText}
          onChange={handleMessageChange}
          rows={3}
          className="mb-2"
        />
        <div className="text-right text-gray-500 mb-4">
          {messageText.length}/150 {t.character_count || "ký tự"}
        </div>
        <div className="flex items-center justify-between">
          <span>
            {t.block_diary_option || "Chặn người này xem nhật ký của tôi"}
          </span>
          <Switch checked={blockDiary} onChange={setBlockDiary} />
        </div>
      </div>
    </Modal>
  );
};

const UserInfoHeaderModal: React.FC<UserInfoHeaderModalProps> = ({
  visible,
  onCancel,
  searchResult,
  isCurrentUser,
  isFriend,
  handleUpdate,
  handleMessage,
  isSending,
  onRequestsUpdate,
  isFromReceivedTab = false,
  isFromSentTab = false,
  requestId = null,
  onAccept,
  onReject,
  onCancelRequest,
}) => {
  const { t, language } = useLanguage();
  const [randomImageId, setRandomImageId] = useState<number>(1);
  const [hasSentFriendRequest, setHasSentFriendRequest] =
    useState<boolean>(false);
  const [friendRequestId, setFriendRequestId] = useState<string | undefined>(
    undefined
  );
  const [hasPendingRequest, setHasPendingRequest] = useState<boolean>(false);
  const [pendingRequestId, setPendingRequestId] = useState<string | undefined>(
    undefined
  );
  const [isFriendState, setIsFriendState] = useState<boolean>(false);
  const [hasAcceptedRequest, setHasAcceptedRequest] = useState<boolean>(false);
  const [isSendFriendModalVisible, setIsSendFriendModalVisible] =
    useState<boolean>(false);
  const [currentUserFullname, setCurrentUserFullname] =
    useState<string>("Người dùng");
  const [isMessageLoading, setIsMessageLoading] = useState<boolean>(false);

  // Effect for language changes
  useEffect(() => {
    // Re-render component when language changes
  }, [language]);

  // Helper function để check trạng thái yêu cầu kết bạn - định nghĩa ngoài useEffect
  const refreshStatus = async () => {
    console.log("Socket event detected, refreshing friend request status");
    try {
      if (!visible || !searchResult || isCurrentUser(searchResult.userId))
        return;

      // QUAN TRỌNG: Nếu đã chấp nhận yêu cầu, luôn giữ trạng thái là bạn bè
      if (hasAcceptedRequest) {
        console.log("Request already accepted, keeping friend state as TRUE");
        setIsFriendState(true);
        setHasPendingRequest(false);
        setPendingRequestId(undefined);
        setHasSentFriendRequest(false);
        setFriendRequestId(undefined);
        return;
      }

      // Cải thiện: Kiểm tra trạng thái bạn bè từ API thay vì dựa vào hàm isFriend() trong props
      let isFriendWithUser = false;
      try {
        // Check if users are friends (bạn có thể cần thêm API này)
        const currentUserId = localStorage.getItem("userId");
        // Sử dụng hàm isFriend từ props - cải thiện theo logic của bạn
        isFriendWithUser = isFriend(searchResult.userId);
        console.log(
          "Friend check - Are users friends?",
          currentUserId,
          "and",
          searchResult.userId,
          "=",
          isFriendWithUser
        );
      } catch (error) {
        console.error("Error checking friendship status:", error);
        // Fallback to local check
        isFriendWithUser = isFriend(searchResult.userId);
      }

      console.log("Is friend check result:", isFriendWithUser);

      // Nếu đã là bạn, đặt cả hai biến state
      if (isFriendWithUser) {
        setIsFriendState(true);
        setHasAcceptedRequest(true); // Ghi nhớ trạng thái đã là bạn
      } else if (!hasAcceptedRequest) {
        // Chỉ cập nhật nếu chưa chấp nhận yêu cầu
        setIsFriendState(isFriendWithUser);
      }

      if (isFriendWithUser || hasAcceptedRequest) {
        // Nếu đã là bạn bè, không cần kiểm tra các yêu cầu
        console.log("Users are friends - showing Unfriend & Message buttons");
        setHasPendingRequest(false);
        setPendingRequestId(undefined);
        setHasSentFriendRequest(false);
        setFriendRequestId(undefined);
        return;
      }

      // Check for received requests
      const receivedRequests = await getFriendRequestsReceived();
      console.log("Socket refresh - Received requests:", receivedRequests);

      // Find if this user has sent us a request
      const pendingFromUser = Array.isArray(receivedRequests)
        ? receivedRequests.find(
            (req: FriendRequest) =>
              req.senderId?.userId === searchResult.userId &&
              req.status === "pending"
          )
        : null;

      if (pendingFromUser) {
        console.log("Found pending request from this user:", pendingFromUser);
        setHasPendingRequest(true);
        setPendingRequestId(pendingFromUser.friendRequestId);
      } else {
        console.log("No pending requests from this user");
        setHasPendingRequest(false);
        setPendingRequestId(undefined);
      }

      // Check for sent requests
      const sentRequests = await getFriendRequestsSent();
      console.log("Socket refresh - Sent requests:", sentRequests);

      // Find if we have sent a request to this user
      const sentToUser = Array.isArray(sentRequests)
        ? sentRequests.find(
            (req: FriendRequest) =>
              req.receiverId.userId === searchResult.userId
          )
        : null;

      if (sentToUser) {
        console.log("Found sent request to this user:", sentToUser);
        setHasSentFriendRequest(true);
        setFriendRequestId(sentToUser.friendRequestId);
      } else {
        console.log("No sent requests to this user");
        setHasSentFriendRequest(false);
        setFriendRequestId(undefined);
      }

      // Notify parent component if needed
      onRequestsUpdate?.();
    } catch (error) {
      console.error("Error refreshing friend request status:", error);
    }
  };

  // Fetch current user's full name
  useEffect(() => {
    const fetchCurrentUserFullname = async () => {
      try {
        const userId = localStorage.getItem("userId");
        if (!userId) {
          console.warn("No userId found in localStorage");
          setCurrentUserFullname("Người dùng");
          return;
        }

        const userData = await getUserById(userId);
        const fullname =
          userData.fullname ||
          userData.fullName ||
          userData.name ||
          "Người dùng";
        setCurrentUserFullname(fullname);
        localStorage.setItem("user", JSON.stringify(userData));
      } catch (error) {
        console.error("Error fetching current user data:", error);
        const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
        setCurrentUserFullname(
          storedUser.fullname ||
            storedUser.fullName ||
            storedUser.name ||
            "Người dùng"
        );
      }
    };

    if (visible) {
      fetchCurrentUserFullname();
      setRandomImageId(Math.floor(Math.random() * 100) + 1);
      setIsFriendState(isFriend(searchResult?.userId || ""));
    }
  }, [visible, searchResult, isFriend]);

  // Setup socket listeners for friend request events
  useEffect(() => {
    if (!visible || !searchResult) return;

    console.log("Registering socket listeners for friend requests");

    // Debug socket connection status
    console.log("Socket connected:", socketService.isConnected);
    if (!socketService.isConnected) {
      console.log("Reconnecting socket...");
      socketService.connect();
    }

    // Initial check
    refreshStatus();

    // Create simple callback functions for each event
    const handleNewFriendRequest = (data: FriendRequestData) => {
      console.log("New friend request received:", data);
      refreshStatus();
    };

    const handleRejectedFriendRequest = (data: FriendRequestData) => {
      console.log("Rejected friend request received:", data);
      refreshStatus();
    };

    const handleAcceptedFriendRequest = (data: FriendRequestData) => {
      console.log("Accepted friend request received:", data);
      const currentUserId = localStorage.getItem("userId");

      // ĐỌC KỸ: Cập nhật nút NGAY LẬP TỨC khi có yêu cầu kết bạn được chấp nhận
      // Không cần kiểm tra trạng thái từ server, chỉ cần hiển thị nút "Hủy kết bạn" và "Nhắn tin"

      // CÁCH 1: Đặt trạng thái trực tiếp thành bạn bè (BẤT KỂ data có liên quan hay không)
      setIsFriendState(true);
      setHasAcceptedRequest(true);
      console.log("UserInfoModal: FORCE set isFriendState to TRUE");

      // Xóa tất cả trạng thái yêu cầu
      setHasPendingRequest(false);
      setPendingRequestId(undefined);
      setHasSentFriendRequest(false);
      setFriendRequestId(undefined);

      // Hiển thị thông báo nếu người dùng hiện tại là người gửi yêu cầu
      if (data.sender?.userId === currentUserId) {
        message.success(`Yêu cầu kết bạn của bạn đã được chấp nhận`);
      }

      // Bỏ gọi refreshStatus để tránh bị ghi đè
    };

    const handleRetrievedFriendRequest = (data: FriendRequestData) => {
      console.log("Retrieved friend request received:", data);
      refreshStatus();
    };

    // THÊM MỚI: Xử lý sự kiện hủy kết bạn
    const handleUnfriend = (data: UnfriendEventData) => {
      console.log("Unfriend event received:", data);

      // FORCE cập nhật UI ngay lập tức thành "Kết bạn"
      setIsFriendState(false);
      setHasAcceptedRequest(false);

      // Đặt lại tất cả trạng thái yêu cầu
      setHasPendingRequest(false);
      setPendingRequestId(undefined);
      setHasSentFriendRequest(false);
      setFriendRequestId(undefined);

      console.log(
        "UserInfoModal: FORCE set isFriendState to FALSE from unfriend event"
      );

      // Hiển thị thông báo phù hợp
      const currentUserId = localStorage.getItem("userId");
      if (data.userId && data.userId !== currentUserId) {
        // Nếu người hủy kết bạn không phải là người dùng hiện tại
        message.info(`Bạn và người dùng này không còn là bạn bè`);
      }
    };

    // Register event handlers with simplified approach (like RequestList)
    console.log("Registering socket event handlers");
    socketService.onNewFriendRequest(handleNewFriendRequest);
    socketService.onRejectedFriendRequest(handleRejectedFriendRequest);
    socketService.onAcceptedFriendRequest(handleAcceptedFriendRequest);
    socketService.onRetrievedFriendRequest(handleRetrievedFriendRequest);

    // Đăng ký sự kiện hủy kết bạn nếu có
    if (socketService.socketInstance) {
      socketService.socketInstance.on("unfriend", handleUnfriend);
      socketService.socketInstance.on("removeFriend", handleUnfriend);
    }

    return () => {
      console.log("Cleaning up socket listeners");
      // Use proper cleanup for each event
      socketService.off("newFriendRequest", handleNewFriendRequest);
      socketService.off("rejectedFriendRequest", handleRejectedFriendRequest);
      socketService.off("acceptedFriendRequest", handleAcceptedFriendRequest);
      socketService.off("retrievedFriendRequest", handleRetrievedFriendRequest);

      // Hủy đăng ký sự kiện hủy kết bạn
      if (socketService.socketInstance) {
        socketService.socketInstance.off("unfriend", handleUnfriend);
        socketService.socketInstance.off("removeFriend", handleUnfriend);
      }
    };
  }, [
    visible,
    searchResult,
    onRequestsUpdate,
    isCurrentUser,
    isFriend,
    hasAcceptedRequest,
  ]);

  // Handle accept friend request
  const handleAcceptFriendRequest = async () => {
    if (!pendingRequestId) {
      message.error(
        t.friend_request_id_not_found || "Không tìm thấy yêu cầu kết bạn"
      );
      return;
    }

    try {
      console.log("Accepting friend request ID:", pendingRequestId);
      await acceptFriendRequest(pendingRequestId);
      console.log("Friend request accepted successfully");
      message.success(
        t.accepted_friend_request || "Đã chấp nhận lời mời kết bạn"
      );

      // ĐỌC KỸ: FORCE cập nhật trạng thái trực tiếp, không dựa vào refreshStatus
      // Đặt trạng thái direct UI, giống như cách RequestList làm
      setIsFriendState(true);
      setHasAcceptedRequest(true);
      console.log(
        "UserInfoModal: FORCE set isFriendState to TRUE in handleAcceptFriendRequest"
      );

      // Xóa trạng thái yêu cầu
      setHasPendingRequest(false);
      setPendingRequestId(undefined);

      // Thông báo cho component cha cập nhật danh sách
      onRequestsUpdate?.();

      // KHÔNG gọi refreshStatus để tránh bị ghi đè trạng thái bởi server
    } catch (err: unknown) {
      const error = err as Error;
      console.error("Error accepting friend request:", error);
      message.error(
        error.message ||
          t.accept_friend_request_error ||
          "Không thể chấp nhận lời mời kết bạn"
      );
    }
  };

  // Handle reject friend request
  const handleRejectFriendRequest = async () => {
    if (!pendingRequestId) {
      message.error(
        t.friend_request_id_not_found || "Không tìm thấy yêu cầu kết bạn"
      );
      return;
    }

    try {
      console.log("Rejecting friend request ID:", pendingRequestId);
      await rejectFriendRequest(pendingRequestId);
      console.log("Friend request rejected successfully");
      message.success(
        t.rejected_friend_request || "Đã từ chối lời mời kết bạn"
      );

      // Update state directly
      setHasPendingRequest(false);
      setPendingRequestId(undefined);

      // Notify parent component
      onRequestsUpdate?.();

      // Sử dụng timeout để đợi server cập nhật
      setTimeout(async () => {
        try {
          // Cập nhật trạng thái
          console.log("Refreshing status after reject");

          // Check for received requests
          const receivedRequests = await getFriendRequestsReceived();
          console.log(
            "Updated received requests after reject:",
            receivedRequests
          );

          // Cập nhật UI dựa trên trạng thái mới từ server
          const pendingFromUser = Array.isArray(receivedRequests)
            ? receivedRequests.find(
                (req: FriendRequest) =>
                  req.senderId?.userId === searchResult?.userId &&
                  req.status === "pending"
              )
            : null;

          if (pendingFromUser) {
            setHasPendingRequest(true);
            setPendingRequestId(pendingFromUser.friendRequestId);
          } else {
            setHasPendingRequest(false);
            setPendingRequestId(undefined);
          }
        } catch (error) {
          console.error("Error updating state after reject:", error);
        }
      }, 500);
    } catch (err: unknown) {
      const error = err as Error;
      console.error("Error rejecting friend request:", error);
      message.error(
        error.message ||
          t.decline_friend_request_error ||
          "Không thể từ chối lời mời kết bạn"
      );
    }
  };

  // Handle remove friend
  const handleRemoveFriend = async () => {
    if (!searchResult) {
      message.error(t.user_not_found || "Không tìm thấy thông tin người dùng");
      return;
    }

    try {
      console.log("Removing friend with user ID:", searchResult.userId);
      await removeFriend(searchResult.userId);
      console.log("Friend removed successfully");
      message.success(t.friend_removed || "Đã xóa bạn thành công");

      // FORCE cập nhật UI ngay lập tức, không đợi server
      setIsFriendState(false);
      setHasAcceptedRequest(false);

      // QUAN TRỌNG: Đặt lại UI về trạng thái không phải bạn bè và không có yêu cầu
      setHasPendingRequest(false);
      setPendingRequestId(undefined);
      setHasSentFriendRequest(false);
      setFriendRequestId(undefined);

      console.log(
        "UserInfoModal: FORCE set isFriendState to FALSE in handleRemoveFriend"
      );

      // Thông báo cho component cha cập nhật danh sách
      onRequestsUpdate?.();

      // KHÔNG sử dụng timeout và refreshStatus để tránh bị ghi đè trạng thái
    } catch (error: unknown) {
      const err = error as Error;
      console.error("Error removing friend:", err);
      message.error(
        err.message || t.remove_friend_error || "Không thể xóa bạn"
      );
    }
  };

  // Handle cancel friend request
  const handleCancelFriendRequest = async () => {
    if (!friendRequestId) {
      message.error(
        t.friend_request_id_not_found ||
          "Không tìm thấy yêu cầu kết bạn để thu hồi"
      );
      return;
    }

    try {
      console.log("Cancelling friend request ID:", friendRequestId);
      await cancelFriendRequest(friendRequestId);
      console.log("Friend request cancelled successfully");
      message.success(t.cancelled_friend_request || "Đã hủy yêu cầu kết bạn");

      // Update state directly
      setHasSentFriendRequest(false);
      setFriendRequestId(undefined);

      // Notify parent component
      onRequestsUpdate?.();

      // Sử dụng timeout để đợi server cập nhật
      setTimeout(async () => {
        try {
          console.log("Refreshing status after cancel request");

          // Check for sent requests
          const sentRequests = await getFriendRequestsSent();
          console.log("Updated sent requests after cancel:", sentRequests);

          // Cập nhật UI dựa trên trạng thái mới từ server
          const sentToUser = Array.isArray(sentRequests)
            ? sentRequests.find(
                (req: FriendRequest) =>
                  req.receiverId.userId === searchResult?.userId
              )
            : null;

          if (sentToUser) {
            setHasSentFriendRequest(true);
            setFriendRequestId(sentToUser.friendRequestId);
          } else {
            setHasSentFriendRequest(false);
            setFriendRequestId(undefined);
          }
        } catch (error) {
          console.error("Error updating state after cancel:", error);
        }
      }, 500);
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error("Error cancelling friend request:", err);
      message.error(
        err.message ||
          t.cancel_friend_request_error ||
          "Thu hồi yêu cầu kết bạn thất bại"
      );
    }
  };

  // Open send friend request modal
  const handleOpenSendFriendModal = () => {
    setIsSendFriendModalVisible(true);
  };

  // Handle send friend request success
  const handleSendFriendRequestSuccess = async () => {
    setHasSentFriendRequest(true);
    try {
      const sentResult = await getFriendRequestsSent();
      const sentRequest = sentResult.find(
        (req: FriendRequest) => req.receiverId.userId === searchResult?.userId
      );
      if (sentRequest) {
        setFriendRequestId(sentRequest.friendRequestId);
      }
    } catch (err) {
      console.error("Error fetching friend request:", err);
    }
    onRequestsUpdate?.();
  };

  // Handle accept from modal
  const handleAcceptFromModal = () => {
    if (requestId && searchResult && onAccept) {
      onAccept(requestId, searchResult.userId);
      onCancel();
    }
  };

  // Handle reject from modal
  const handleRejectFromModal = () => {
    if (requestId && onReject) {
      onReject(requestId);
      onCancel();
    }
  };

  // Enhanced message handling to work consistently across all components
  const handleMessageClick = async (userId: string) => {
    try {
      setIsMessageLoading(true);
      console.log(
        "UserInfoHeaderModal: Creating conversation with user:",
        userId
      );

      // Create or get the conversation
      const conversation = await createConversation(userId);

      if (!conversation) {
        throw new Error("Không thể tạo cuộc trò chuyện");
      }

      console.log(
        "UserInfoHeaderModal: Conversation created successfully:",
        conversation
      );

      // This is the critical part - PASS THE CONVERSATION OBJECT to handleMessage
      // just like FriendList passes it to onSelectConversation
      if (handleMessage) {
        // Close the modal only after we have the conversation
        onCancel();
        console.log(
          "UserInfoHeaderModal: Calling handleMessage with conversation:",
          conversation
        );
        // Pass the entire conversation object instead of just userId
        // This is the key change to match FriendList behavior
        handleMessage(userId, conversation);
      } else {
        onCancel();
        message.info(`Đang mở cuộc trò chuyện với người dùng ID: ${userId}`);
        console.error(
          "UserInfoHeaderModal: No handleMessage callback provided"
        );
      }
    } catch (error) {
      console.error("UserInfoHeaderModal: Error creating conversation:", error);
      message.error("Không thể bắt đầu cuộc trò chuyện");
    } finally {
      setIsMessageLoading(false);
    }
  };

  if (!searchResult) return null;

  const isCurrentUserProfile = isCurrentUser(searchResult.userId);

  return (
    <>
      <Modal
        open={visible}
        onCancel={onCancel}
        title={
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center">
              <ArrowLeftOutlined
                className="mr-2 cursor-pointer"
                onClick={onCancel}
              />
              <span>{t.account_info_title || "Thông tin tài khoản"}</span>
            </div>
            <CloseOutlined className="cursor-pointer" onClick={onCancel} />
          </div>
        }
        footer={null}
        closable={false}
        width={518}
        styles={{ body: { padding: 0 } }}>
        <div className="relative">
          <div
            className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-r from-blue-400 to-blue-600"
            style={{
              backgroundImage: `url(https://picsum.photos/id/${randomImageId}/800/200)`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
          <div className="absolute left-4" style={{ top: "120px" }}>
            <div className="w-20 h-20 rounded-full bg-gray-200 overflow-hidden border-4 border-white">
              {searchResult.avatar ? (
                <img
                  src={searchResult.avatar}
                  alt={searchResult.fullname}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      "/images/default-avatar.png";
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-blue-500 text-white">
                  {searchResult.fullname.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </div>
          <div className="pt-40 px-4 pb-4">
            <div className="flex items-center">
              <h2 className="text-xl font-semibold ml-20">
                {searchResult.fullname}
              </h2>
              {isCurrentUserProfile && (
                <EditOutlined
                  className="ml-2 text-blue-500 cursor-pointer"
                  onClick={handleUpdate}
                />
              )}
            </div>
            <div className="mt-6">
              <h3 className="text-base font-medium">
                {t.personal_info || "Thông tin cá nhân"}
              </h3>
              <div className="mt-2 grid grid-cols-2 gap-y-2">
                <div className="text-gray-500">{t.gender || "Giới tính"}</div>
                <div>
                  {searchResult.isMale ? t.male || "Nam" : t.female || "Nữ"}
                </div>
                <div className="text-gray-500">{t.birthday || "Ngày sinh"}</div>
                <div>{searchResult.birthday || "**/**/****"}</div>
                <div className="text-gray-500">{t.phone || "Điện thoại"}</div>
                <div>{searchResult.phone}</div>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-200">
            <div className="p-4 grid grid-cols-2 gap-4">
              {isCurrentUserProfile ? (
                <Button type="primary" block onClick={handleUpdate}>
                  {t.update || "Cập nhật"}
                </Button>
              ) : isFromReceivedTab && requestId ? (
                <>
                  <Button type="primary" block onClick={handleAcceptFromModal}>
                    {t.accept || "Chấp nhận"}
                  </Button>
                  <Button type="default" block onClick={handleRejectFromModal}>
                    {t.decline || "Từ chối"}
                  </Button>
                </>
              ) : isFromSentTab && requestId ? (
                <>
                  <Button
                    type="default"
                    danger
                    block
                    onClick={() =>
                      onCancelRequest && requestId && onCancelRequest(requestId)
                    }>
                    {t.cancel_friend_request_button ||
                      "Thu hồi yêu cầu kết bạn"}
                  </Button>
                  <Button
                    type="primary"
                    block
                    loading={isMessageLoading}
                    onClick={() => handleMessageClick(searchResult.userId)}>
                    {t.message_button || "Nhắn tin"}
                  </Button>
                </>
              ) : isFriendState ? (
                <>
                  <Button type="default" block onClick={handleRemoveFriend}>
                    {t.unfriend_button || "Hủy kết bạn"}
                  </Button>
                  <Button
                    type="primary"
                    block
                    loading={isMessageLoading}
                    onClick={() => handleMessageClick(searchResult.userId)}>
                    {t.message_button || "Nhắn tin"}
                  </Button>
                </>
              ) : hasPendingRequest ? (
                <>
                  <Button
                    type="primary"
                    block
                    onClick={handleAcceptFriendRequest}>
                    {t.accept || "Chấp nhận"}
                  </Button>
                  <Button
                    type="default"
                    block
                    onClick={handleRejectFriendRequest}>
                    {t.decline || "Từ chối"}
                  </Button>
                </>
              ) : hasSentFriendRequest ? (
                <>
                  <Button
                    type="default"
                    danger
                    block
                    onClick={handleCancelFriendRequest}>
                    {t.cancel_friend_request_button ||
                      "Thu hồi yêu cầu kết bạn"}
                  </Button>
                  <Button
                    type="primary"
                    block
                    loading={isMessageLoading}
                    onClick={() => handleMessageClick(searchResult.userId)}>
                    {t.message_button || "Nhắn tin"}
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    type="default"
                    block
                    onClick={handleOpenSendFriendModal}
                    loading={isSending}>
                    {t.add_friend_button || "Kết bạn"}
                  </Button>
                  <Button
                    type="primary"
                    block
                    loading={isMessageLoading}
                    onClick={() => handleMessageClick(searchResult.userId)}>
                    {t.message_button || "Nhắn tin"}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </Modal>

      {searchResult && (
        <SendFriendRequestModal
          visible={isSendFriendModalVisible}
          onCancel={() => setIsSendFriendModalVisible(false)}
          receiverId={searchResult.userId}
          senderFullname={currentUserFullname}
          onSendSuccess={handleSendFriendRequestSuccess}
        />
      )}
    </>
  );
};

export default UserInfoHeaderModal;
