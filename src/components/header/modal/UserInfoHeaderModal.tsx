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
} from "../../../api/API";
import socketService from "../../../services/socketService";

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
  handleMessage: (userId: string) => void;
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
  const effectiveSenderName = senderFullname || "Người dùng";
  const defaultMessage = `Xin chào, mình là ${effectiveSenderName}. Kết bạn với mình nhé!`;
  const [messageText, setMessageText] = useState<string>(defaultMessage);
  const [blockDiary, setBlockDiary] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);

  useEffect(() => {
    setMessageText(defaultMessage);
  }, [senderFullname]);

  const handleSend = async () => {
    setIsSending(true);
    try {
      await sendFriendRequest(receiverId, messageText);
      message.success("Đã gửi yêu cầu kết bạn");
      onSendSuccess();
      onCancel();
    } catch (error: unknown) {
      const err = error as { message?: string };
      message.error(err.message || "Không thể gửi yêu cầu kết bạn");
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
          <Button onClick={onCancel}>Thông tin</Button>
          <Button
            type="primary"
            onClick={handleSend}
            loading={isSending}
            disabled={messageText.trim().length === 0}
          >
            Kết bạn
          </Button>
        </div>
      }
      width={400}
      styles={{ body: { padding: 16 } }}
    >
      <div>
        <Input.TextArea
          value={messageText}
          onChange={handleMessageChange}
          rows={3}
          className="mb-2"
        />
        <div className="text-right text-gray-500 mb-4">
          {messageText.length}/150 ký tự
        </div>
        <div className="flex items-center justify-between">
          <span>Chặn người này xem nhật ký của tôi</span>
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
  const [randomImageId, setRandomImageId] = useState<number>(1);
  const [hasSentFriendRequest, setHasSentFriendRequest] = useState<boolean>(false);
  const [friendRequestId, setFriendRequestId] = useState<string | undefined>(undefined);
  const [hasPendingRequest, setHasPendingRequest] = useState<boolean>(false);
  const [pendingRequestId, setPendingRequestId] = useState<string | undefined>(undefined);
  const [isFriendState, setIsFriendState] = useState<boolean>(false);
  const [isSendFriendModalVisible, setIsSendFriendModalVisible] = useState<boolean>(false);
  const [currentUserFullname, setCurrentUserFullname] = useState<string>("Người dùng");

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
        const fullname = userData.fullname || userData.fullName || userData.name || "Người dùng";
        setCurrentUserFullname(fullname);
        localStorage.setItem("user", JSON.stringify(userData));
      } catch (error) {
        console.error("Error fetching current user data:", error);
        const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
        setCurrentUserFullname(storedUser.fullname || storedUser.fullName || storedUser.name || "Người dùng");
      }
    };

    if (visible) {
      fetchCurrentUserFullname();
      setRandomImageId(Math.floor(Math.random() * 100) + 1);
      setIsFriendState(isFriend(searchResult?.userId || ""));
    }
  }, [visible, searchResult, isFriend]);

  // Check friend request status
  useEffect(() => {
    const checkFriendRequest = async () => {
      if (
        searchResult &&
        !isCurrentUser(searchResult.userId) &&
        !isFriend(searchResult.userId)
      ) {
        try {
          const sentResult = await getFriendRequestsSent();
          const sentRequest = sentResult.find(
            (req: FriendRequest) => req.receiverId.userId === searchResult.userId
          );
          setHasSentFriendRequest(!!sentRequest);
          setFriendRequestId(sentRequest?.friendRequestId);

          const pendingRequests = await getFriendRequestsReceived();
          if (Array.isArray(pendingRequests)) {
            const pendingRequest = pendingRequests.find(
              (request: FriendRequest) =>
                request.senderId?.userId === searchResult.userId &&
                request.status === "pending"
            );

            if (pendingRequest) {
              setHasPendingRequest(true);
              setPendingRequestId(pendingRequest.friendRequestId);
            } else {
              setHasPendingRequest(false);
              setPendingRequestId(undefined);
            }
          }
        } catch (err) {
          console.error("Error checking friend requests:", err);
          setHasSentFriendRequest(false);
          setFriendRequestId(undefined);
          setHasPendingRequest(false);
          setPendingRequestId(undefined);
        }
      } else {
        setHasSentFriendRequest(false);
        setFriendRequestId(undefined);
        setHasPendingRequest(false);
        setPendingRequestId(undefined);
      }
    };

    if (visible) {
      checkFriendRequest();
    }
  }, [searchResult, isCurrentUser, isFriend, visible]);

  // Setup socket listeners for friend request events
  useEffect(() => {
    if (!visible || !searchResult) return;

    console.log("Registering socket listeners for friend requests");
    const currentUserId = localStorage.getItem("userId");

    const handleNewFriendRequest = (data: FriendRequestData) => {
      if (!data?.sender?.userId || !data?.friendRequestId) {
        console.warn("Invalid newFriendRequest data:", data);
        return;
      }
      console.log("New friend request received:", data);
      if (data.sender.userId === searchResult.userId) {
        console.log("Matching user, updating state");
        setHasPendingRequest(true);
        setPendingRequestId(data.friendRequestId);
        // No notification for receiver
      }
    };

    const handleRejectedFriendRequest = (data: FriendRequestData) => {
      if (!data?.sender?.userId || !data?.friendRequestId) {
        console.warn("Invalid rejectedFriendRequest data:", data);
        return;
      }
      console.log("Rejected friend request received:", data);
      if (searchResult && data.sender.userId === currentUserId) {
        console.log("Current user is sender, updating state");
        setHasSentFriendRequest(false);
        setFriendRequestId(undefined);
        message.info(`Yêu cầu kết bạn của bạn đã bị từ chối`);
        onRequestsUpdate?.();
      }
    };

    const handleAcceptedFriendRequest = (data: FriendRequestData) => {
      if (!data?.sender?.userId || !data?.friendRequestId) {
        console.warn("Invalid acceptedFriendRequest data:", data);
        return;
      }
      console.log("Accepted friend request received:", data);
      if (searchResult) {
        if (data.sender.userId === currentUserId) {
          console.log("Current user is sender, updating state");
          setHasSentFriendRequest(false);
          setFriendRequestId(undefined);
          setIsFriendState(true);
          message.success(`Yêu cầu kết bạn của bạn đã được chấp nhận`);
          onRequestsUpdate?.();
        } else if (data.sender.userId === searchResult.userId) {
          console.log("Current user is receiver, updating state");
          setHasPendingRequest(false);
          setPendingRequestId(undefined);
          setIsFriendState(true);
          onRequestsUpdate?.();
        }
      }
    };

    const handleRetrievedFriendRequest = (data: FriendRequestData) => {
      if (!data?.sender?.userId || !data?.friendRequestId) {
        console.warn("Invalid retrievedFriendRequest data:", data);
        return;
      }
      console.log("Retrieved friend request received:", data);
      if (searchResult && data.sender.userId === currentUserId) {
        console.log("Current user is sender, updating state");
        setHasSentFriendRequest(false);
        setFriendRequestId(undefined);
        // No notification needed as the current user initiated the retrieval
        onRequestsUpdate?.();
      }
    };

    socketService.onNewFriendRequest(handleNewFriendRequest);
    socketService.onRejectedFriendRequest(handleRejectedFriendRequest);
    socketService.onAcceptedFriendRequest(handleAcceptedFriendRequest);
    socketService.onRetrievedFriendRequest(handleRetrievedFriendRequest);

    return () => {
      console.log("Cleaning up socket listeners");
      socketService.off("newFriendRequest", handleNewFriendRequest);
      socketService.off("rejectedFriendRequest", handleRejectedFriendRequest);
      socketService.off("acceptedFriendRequest", handleAcceptedFriendRequest);
      socketService.off("retrievedFriendRequest", handleRetrievedFriendRequest);
    };
  }, [visible, searchResult, onRequestsUpdate]);

  // Handle cancel friend request
  const handleCancelFriendRequest = async () => {
    if (!friendRequestId) {
      message.error("Không tìm thấy yêu cầu kết bạn để thu hồi");
      return;
    }

    try {
      await cancelFriendRequest(friendRequestId);
      message.success("Đã hủy yêu cầu kết bạn");
      setHasSentFriendRequest(false);
      setFriendRequestId(undefined);
      onRequestsUpdate?.();
    } catch (error: unknown) {
      const err = error as { message?: string };
      message.error(err.message || "Thu hồi yêu cầu kết bạn thất bại");
    }
  };

  // Handle accept friend request
  const handleAcceptFriendRequest = async () => {
    if (!pendingRequestId) {
      message.error("Không tìm thấy yêu cầu kết bạn");
      return;
    }

    try {
      await acceptFriendRequest(pendingRequestId);
      message.success("Đã chấp nhận lời mời kết bạn");
      setHasPendingRequest(false);
      setPendingRequestId(undefined);
      setIsFriendState(true);
      onRequestsUpdate?.();
    } catch (err: unknown) {
      const error = err as Error;
      message.error(error.message || "Không thể chấp nhận lời mời kết bạn");
    }
  };

  // Handle reject friend request
  const handleRejectFriendRequest = async () => {
    if (!pendingRequestId) {
      message.error("Không tìm thấy yêu cầu kết bạn");
      return;
    }

    try {
      await rejectFriendRequest(pendingRequestId);
      message.success("Đã từ chối lời mời kết bạn");
      setHasPendingRequest(false);
      setPendingRequestId(undefined);
      onRequestsUpdate?.();
    } catch (err: unknown) {
      const error = err as Error;
      message.error(error.message || "Không thể từ chối lời mời kết bạn");
    }
  };

  // Handle remove friend
  const handleRemoveFriend = async () => {
    if (!searchResult) {
      message.error("Không tìm thấy thông tin người dùng");
      return;
    }

    try {
      await removeFriend(searchResult.userId);
      message.success("Đã xóa bạn thành công");
      setIsFriendState(false);
      onRequestsUpdate?.();
    } catch (error: unknown) {
      const err = error as Error;
      message.error(err.message || "Không thể xóa bạn");
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
              <span>Thông tin tài khoản</span>
            </div>
            <CloseOutlined className="cursor-pointer" onClick={onCancel} />
          </div>
        }
        footer={null}
        closable={false}
        width={518}
        styles={{ body: { padding: 0 } }}
      >
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
              <h3 className="text-base font-medium">Thông tin cá nhân</h3>
              <div className="mt-2 grid grid-cols-2 gap-y-2">
                <div className="text-gray-500">Giới tính</div>
                <div>{searchResult.isMale ? "Nam" : "Nữ"}</div>
                <div className="text-gray-500">Ngày sinh</div>
                <div>{searchResult.birthday || "**/**/****"}</div>
                <div className="text-gray-500">Điện thoại</div>
                <div>{searchResult.phone}</div>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-200">
            <div className="p-4 grid grid-cols-2 gap-4">
              {isCurrentUserProfile ? (
                <Button type="primary" block onClick={handleUpdate}>
                  Cập nhật
                </Button>
              ) : isFromReceivedTab && requestId ? (
                <>
                  <Button
                    type="primary"
                    block
                    onClick={handleAcceptFromModal}
                  >
                    Chấp nhận
                  </Button>
                  <Button
                    type="default"
                    block
                    onClick={handleRejectFromModal}
                  >
                    Từ chối
                  </Button>
                </>
              ) : isFromSentTab && requestId ? (
                <>
                  <Button
                    type="default"
                    danger
                    block
                    onClick={() => onCancelRequest && requestId && onCancelRequest(requestId)}
                  >
                    Thu hồi yêu cầu kết bạn
                  </Button>
                  <Button
                    type="primary"
                    block
                    onClick={() => handleMessage(searchResult.userId)}
                  >
                    Nhắn tin
                  </Button>
                </>
              ) : isFriendState ? (
                <>
                  <Button type="default" block onClick={handleRemoveFriend}>
                    Hủy kết bạn
                  </Button>
                  <Button
                    type="primary"
                    block
                    onClick={() => handleMessage(searchResult.userId)}
                  >
                    Nhắn tin
                  </Button>
                </>
              ) : hasPendingRequest ? (
                <>
                  <Button
                    type="primary"
                    block
                    onClick={handleAcceptFriendRequest}
                  >
                    Chấp nhận
                  </Button>
                  <Button
                    type="default"
                    block
                    onClick={handleRejectFriendRequest}
                  >
                    Từ chối
                  </Button>
                </>
              ) : hasSentFriendRequest ? (
                <>
                  <Button
                    type="default"
                    danger
                    block
                    onClick={handleCancelFriendRequest}
                  >
                    Thu hồi yêu cầu kết bạn
                  </Button>
                  <Button
                    type="primary"
                    block
                    onClick={() => handleMessage(searchResult.userId)}
                  >
                    Nhắn tin
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    type="default"
                    block
                    onClick={handleOpenSendFriendModal}
                    loading={isSending}
                  >
                    Kết bạn
                  </Button>
                  <Button
                    type="primary"
                    block
                    onClick={() => handleMessage(searchResult.userId)}
                  >
                    Nhắn tin
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