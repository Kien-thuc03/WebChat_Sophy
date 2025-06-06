import React, { useState, useEffect } from "react";
import { Tabs, Button, message } from "antd";
import { Avatar } from "../common/Avatar";
import { useLanguage } from "../../features/auth/context/LanguageContext";
import ErrorBoundary from "../common/ErrorBoundary";
import UserInfoHeaderModal, {
  UserResult,
} from "../header/modal/UserInfoHeaderModal";
import {
  getFriendRequestsReceived,
  getFriendRequestsSent,
  acceptFriendRequest,
  rejectFriendRequest,
  cancelFriendRequest,
  createConversation,
} from "../../api/API";
import { Conversation } from "../../features/chat/types/conversationTypes";
import socketService from "../../services/socketService";

interface FriendRequest {
  friendRequestId: string;
  senderId: {
    userId: string;
    fullname: string;
    urlavatar?: string;
    isMale?: boolean;
    phone?: string;
    birthday?: string;
    _id?: string;
  };
  receiverId: {
    userId: string;
    fullname: string;
    urlavatar?: string;
    isMale?: boolean;
    phone?: string;
    birthday?: string;
    _id?: string;
  };
  status: string;
  message: string;
  createdAt: string;
  updatedAt: string;
  _id?: string;
  __v?: number;
  deletionDate?: string | null;
}

interface RequestListProps {
  onSelectFriend?: (friendId: string) => void;
  onRequestsUpdate?: () => void;
  onSelectConversation?: (conversation: Conversation) => void;
}

const { TabPane } = Tabs;

const RequestList: React.FC<RequestListProps> = ({
  onSelectFriend,
  onRequestsUpdate,
  onSelectConversation,
}) => {
  const { t, language } = useLanguage();
  const [receivedRequests, setReceivedRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserResult | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("received");
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(
    null
  );

  const getRequests = async () => {
    try {
      const receivedData: FriendRequest[] = await getFriendRequestsReceived();
      const sentData: FriendRequest[] = await getFriendRequestsSent();
      console.log("RequestList: Fetched received requests:", receivedData);
      console.log("RequestList: Fetched sent requests:", sentData);
      // Deduplicate received and sent requests
      setReceivedRequests(
        Array.from(
          new Map<string, FriendRequest>(
            receivedData.map((req) => [req.friendRequestId, req])
          ).values()
        )
      );
      setSentRequests(
        Array.from(
          new Map<string, FriendRequest>(
            sentData.map((req) => [req.friendRequestId, req])
          ).values()
        )
      );
      setError(null);
      onRequestsUpdate?.();
    } catch (err) {
      console.error("RequestList: Error fetching friend requests:", err);
      setError(
        err instanceof Error
          ? err.message
          : t.retrieve_friend_requests_error || "Không thể tải lời mời kết bạn"
      );
    }
  };

  // Effect for language change
  useEffect(() => {
    // No specific updates needed here, the component will re-render with new translations
  }, [language]);

  // Polling and socket setup
  useEffect(() => {
    // Lấy dữ liệu ban đầu
    getRequests();

    // Thiết lập polling với interval ngắn hơn (10 giây)
    const intervalId = setInterval(() => {
      console.log(
        "RequestList: Đang tự động làm mới danh sách lời mời kết bạn"
      );
      getRequests();
    }, 10000); // 10 giây

    // Đăng ký sự kiện socket để cập nhật ngay lập tức khi có thay đổi
    const handleSocketUpdate = () => {
      console.log(
        "RequestList: Nhận được sự kiện cập nhật từ socket, làm mới danh sách"
      );
      getRequests();
    };

    // Đăng ký lắng nghe các sự kiện socket liên quan đến lời mời kết bạn
    socketService.onNewFriendRequest(() => {
      handleSocketUpdate();
    });

    socketService.onRejectedFriendRequest(() => handleSocketUpdate());
    socketService.onAcceptedFriendRequest(() => handleSocketUpdate());
    socketService.onRetrievedFriendRequest(() => handleSocketUpdate());

    // Làm mới khi kết nối lại
    socketService.onReconnect(() => {
      console.log(
        "RequestList: Đã kết nối lại, làm mới danh sách lời mời kết bạn"
      );
      getRequests();
    });

    // Dọn dẹp khi component unmount
    return () => {
      clearInterval(intervalId);
    };
  }, []); // Mảng dependencies rỗng để chỉ chạy một lần khi mount

  // Keep the existing useEffect that runs when onRequestsUpdate changes
  useEffect(() => {
    getRequests();
  }, [onRequestsUpdate]);

  useEffect(() => {
    const currentUserId = localStorage.getItem("userId") || "";

    // Handle new friend request (no notification for receiver)
    const handleNewFriendRequest = (data: {
      friendRequestId: string;
      message: string;
      sender: {
        userId: string;
        fullname: string;
        avatar?: string;
      };
      timestamp: string;
    }) => {
      console.log("RequestList: Processing newFriendRequest event:", data);
      try {
        if (!data.friendRequestId || !data.sender.userId) {
          console.error("RequestList: Invalid newFriendRequest data:", data);
          return;
        }

        const newRequest: FriendRequest = {
          friendRequestId: data.friendRequestId,
          senderId: {
            userId: data.sender.userId,
            fullname: data.sender.fullname,
            urlavatar: data.sender.avatar,
          },
          receiverId: {
            userId: currentUserId,
            fullname: "", // Not needed for display
          },
          status: "pending",
          message: data.message || "",
          createdAt: data.timestamp,
          updatedAt: data.timestamp,
        };

        setReceivedRequests((prev) => {
          // Check for duplicates
          if (
            prev.some((req) => req.friendRequestId === data.friendRequestId)
          ) {
            console.log(
              "RequestList: Duplicate newFriendRequest ignored:",
              data.friendRequestId
            );
            return prev;
          }
          console.log("RequestList: Adding new friend request:", newRequest);
          const updatedRequests = [newRequest, ...prev];
          console.log(
            "RequestList: Updated receivedRequests:",
            updatedRequests
          );
          return updatedRequests;
        });

        // No notification for receiver, only update the list
        console.log(
          "RequestList: Notifying parent via onRequestsUpdate (newFriendRequest)"
        );
        onRequestsUpdate?.();
      } catch (error) {
        console.error("RequestList: Error handling newFriendRequest:", error);
      }
    };

    // Handle rejected friend request (notification only for sender)
    const handleRejectedFriendRequest = (data: {
      friendRequestId: string;
      message: string;
      sender: {
        userId: string;
        fullname: string;
        avatar?: string;
      };
      timestamp: string;
    }) => {
      console.log("RequestList: Processing rejectedFriendRequest event:", data);
      try {
        if (!data.friendRequestId) {
          console.error(
            "RequestList: Invalid rejectedFriendRequest data:",
            data
          );
          return;
        }

        setSentRequests((prev) => {
          const updatedRequests = prev.filter(
            (req) => req.friendRequestId !== data.friendRequestId
          );
          console.log(
            "RequestList: Updated sentRequests after reject:",
            updatedRequests
          );
          return updatedRequests;
        });

        // Show notification only if the current user is the sender
        if (data.sender.userId === currentUserId) {
          message.info(`${data.sender.fullname} đã bị từ chối lời mời kết bạn`);
        }

        console.log(
          "RequestList: Notifying parent via onRequestsUpdate (rejectedFriendRequest)"
        );
        onRequestsUpdate?.();
      } catch (error) {
        console.error(
          "RequestList: Error handling rejectedFriendRequest:",
          error
        );
      }
    };

    // Handle accepted friend request (notification only for sender)
    const handleAcceptedFriendRequest = async (data: {
      friendRequestId: string;
      message: string;
      sender: {
        userId: string;
        fullname: string;
        avatar?: string;
      };
      timestamp: string;
    }) => {
      console.log("RequestList: Processing acceptedFriendRequest event:", data);
      try {
        if (!data.friendRequestId) {
          console.error(
            "RequestList: Invalid acceptedFriendRequest data:",
            data
          );
          return;
        }

        setSentRequests((prev) => {
          const updatedRequests = prev.filter(
            (req) => req.friendRequestId !== data.friendRequestId
          );
          console.log(
            "RequestList: Updated sentRequests after accept:",
            updatedRequests
          );
          return updatedRequests;
        });

        // Show notification only if the current user is the sender
        if (data.sender.userId === currentUserId) {
          message.success(
            `${data.sender.fullname} đã chấp nhận lời mời kết bạn`
          );
        }

        console.log(
          "RequestList: Notifying parent via onRequestsUpdate (acceptedFriendRequest)"
        );
        onRequestsUpdate?.();

        if (onSelectConversation) {
          try {
            const conversation = await createConversation(data.sender.userId);
            onSelectConversation(conversation);
          } catch (error) {
            console.error(
              "RequestList: Error creating conversation after acceptedFriendRequest:",
              error
            );
          }
        }
      } catch (error) {
        console.error(
          "RequestList: Error handling acceptedFriendRequest:",
          error
        );
      }
    };

    // Handle retrieved (canceled) friend request (notification only for sender)
    const handleRetrievedFriendRequest = (data: {
      friendRequestData?: string;
      friendRequestId?: string;
      message?: string;
      sender?: {
        userId?: string;
        fullname?: string;
        avatar?: string;
      };
      timestamp: string;
    }) => {
      console.log(
        "RequestList: Processing retrievedFriendRequest event:",
        data
      );
      try {
        const friendRequestId = data.friendRequestId || data.friendRequestData;
        if (!friendRequestId) {
          console.error(
            "RequestList: Invalid retrievedFriendRequest data:",
            data
          );
          return;
        }

        setReceivedRequests((prev) => {
          console.log(
            "RequestList: Current receivedRequests before filtering:",
            prev
          );
          const updatedRequests = prev.filter(
            (req) => req.friendRequestId !== friendRequestId
          );
          if (prev.length === updatedRequests.length) {
            console.warn(
              "RequestList: No matching friendRequestId found for retrievedFriendRequest:",
              friendRequestId
            );
          } else {
            console.log(
              "RequestList: Updated receivedRequests after retrieve:",
              updatedRequests
            );
          }
          return updatedRequests;
        });

        // Show notification only if the current user is the sender
        if (data.sender?.userId === currentUserId) {
          const senderName = data.sender?.fullname || "Người dùng";
          message.info(`${senderName} đã thu hồi lời mời kết bạn`);
        }

        console.log(
          "RequestList: Notifying parent via onRequestsUpdate (retrievedFriendRequest)"
        );
        onRequestsUpdate?.();
      } catch (error) {
        console.error(
          "RequestList: Error handling retrievedFriendRequest:",
          error
        );
      }
    };

    console.log("RequestList: Registering socket listeners");
    socketService.onNewFriendRequest(handleNewFriendRequest);
    socketService.onRejectedFriendRequest(handleRejectedFriendRequest);
    socketService.onAcceptedFriendRequest(handleAcceptedFriendRequest);
    socketService.onRetrievedFriendRequest(handleRetrievedFriendRequest);

    // Sync requests on reconnect
    socketService.onReconnect(() => {
      console.log("RequestList: Reconnected, refreshing friend requests");
      getRequests();
    });

    return () => {
      console.log("RequestList: Cleaning up socket listeners");
      // Socket.IO cleanup handled by SocketProvider
    };
  }, [onRequestsUpdate, onSelectConversation]);

  const handleAccept = async (requestId: string, senderId: string) => {
    try {
      console.log("RequestList: Accepting friend request:", requestId);
      await acceptFriendRequest(requestId);
      setReceivedRequests((prev) =>
        prev.filter((req) => req.friendRequestId !== requestId)
      );
      message.success(
        t.accepted_friend_request || "Đã chấp nhận lời mời kết bạn"
      );
      console.log(
        "RequestList: Notifying parent via onRequestsUpdate (accept)"
      );
      onRequestsUpdate?.();

      if (onSelectConversation) {
        try {
          const conversation = await createConversation(senderId);
          onSelectConversation(conversation);
        } catch (error) {
          console.error(
            "RequestList: Error creating conversation after accept:",
            error
          );
        }
      }
    } catch (error) {
      console.error("RequestList: Error accepting friend request:", error);
      message.error(
        error instanceof Error
          ? error.message
          : t.accept_friend_request_error ||
              "Không thể chấp nhận lời mời kết bạn"
      );
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      console.log("RequestList: Rejecting friend request:", requestId);
      await rejectFriendRequest(requestId);
      setReceivedRequests((prev) =>
        prev.filter((req) => req.friendRequestId !== requestId)
      );
      message.success(
        t.rejected_friend_request || "Đã từ chối lời mời kết bạn"
      );
      console.log(
        "RequestList: Notifying parent via onRequestsUpdate (reject)"
      );
      onRequestsUpdate?.();
    } catch (error) {
      console.error("RequestList: Error rejecting friend request:", error);
      message.error(
        error instanceof Error
          ? error.message
          : t.reject_friend_request_error || "Không thể từ chối lời mời kết bạn"
      );
    }
  };

  const handleCancel = async (requestId: string) => {
    try {
      console.log("RequestList: Canceling friend request:", requestId);
      message.loading({
        content: t.processing || "Đang xử lý...",
        key: "cancelRequest",
      });
      await cancelFriendRequest(requestId);
      setSentRequests((prev) =>
        prev.filter((req) => req.friendRequestId !== requestId)
      );
      message.success({
        content:
          t.revoke_friend_request_success || "Đã thu hồi lời mời kết bạn",
        key: "cancelRequest",
        duration: 2,
      });
      console.log(
        "RequestList: Notifying parent via onRequestsUpdate (cancel)"
      );
      // Close the modal if it's open
      if (isModalVisible) {
        setIsModalVisible(false);
      }
      onRequestsUpdate?.();
    } catch (error) {
      console.error("RequestList: Error canceling friend request:", error);
      message.error({
        content:
          error instanceof Error
            ? error.message
            : t.revoke_friend_request_error ||
              "Không thể thu hồi lời mời kết bạn",
        key: "cancelRequest",
        duration: 3,
      });
    }
  };

  const handleFriendClick = async (userId: string) => {
    try {
      console.log("RequestList: Handling friend click for user:", userId);

      // Set loading state
      const loadingMsg = message.loading(
        t.opening_conversation || "Đang mở cuộc trò chuyện...",
        0
      );

      // Create or get the conversation
      const conversation = await createConversation(userId);

      // Clear loading message
      loadingMsg();

      // Close modal first AFTER we have the conversation
      setIsModalVisible(false);

      // This exactly matches FriendList.tsx behavior
      if (conversation && onSelectConversation) {
        console.log(
          "RequestList: Using onSelectConversation with conversation:",
          conversation
        );
        onSelectConversation(conversation);
      }

      if (onSelectFriend) {
        onSelectFriend(userId);
      }
    } catch (error) {
      console.error("RequestList: Error creating conversation:", error);
      message.error(
        t.create_conversation_error || "Không thể tạo cuộc trò chuyện"
      );
    }
  };

  const handleUserClick = (
    user: {
      userId: string;
      fullname: string;
      urlavatar?: string;
      isMale?: boolean;
      birthday?: string;
      phone?: string;
    },
    requestId?: string,
    fromTab?: string
  ) => {
    console.log("RequestList: User clicked:", user.userId);
    setSelectedUser({
      userId: user.userId,
      fullname: user.fullname || "Unknown",
      phone: user.phone || "",
      avatar: user.urlavatar,
      isMale: user.isMale,
      birthday: user.birthday,
    });
    setSelectedRequestId(requestId || null);
    setActiveTab(fromTab || activeTab);
    setIsModalVisible(true);
  };

  const handleModalClose = () => {
    console.log("RequestList: Closing user modal");
    setIsModalVisible(false);
    setSelectedUser(null);
  };

  const isCurrentUser = (userId: string): boolean => {
    const currentUserId = localStorage.getItem("userId");
    return userId === currentUserId;
  };

  const isFriend = (userId: string): boolean => {
    const isInReceived = receivedRequests.some(
      (request) =>
        request.senderId.userId === userId ||
        request.receiverId.userId === userId
    );
    const isInSent = sentRequests.some(
      (request) =>
        request.senderId.userId === userId ||
        request.receiverId.userId === userId
    );
    return isInReceived || isInSent;
  };

  return (
    <div className="request-list w-full h-full flex flex-col bg-white dark:bg-gray-900">
      <div className="p-4 border-b dark:border-gray-700">
        <h2 className="text-xl font-semibold">
          {t.friend_requests || "Lời mời kết bạn"}
        </h2>
      </div>

      <Tabs
        defaultActiveKey="received"
        className="px-4 flex-1"
        onChange={(key) => setActiveTab(key)}>
        <TabPane
          tab={
            <span className="pl-5">
              {t.friend_request_received || "Lời mời đã nhận"} (
              {receivedRequests.length})
            </span>
          }
          key="received"
          className="pl-5">
          {error ? (
            <div className="p-4 text-center text-red-500">{error}</div>
          ) : receivedRequests.length === 0 ? (
            <div className="p-4 text-center">
              {t.no_requests || "Không có lời mời nào"}
            </div>
          ) : (
            <div className="overflow-y-auto space-y-4 p-4">
              {receivedRequests.map((request) => (
                <div
                  key={request.friendRequestId}
                  className="p-4 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-start">
                    <div
                      className="cursor-pointer flex-shrink-0 mr-3"
                      onClick={() =>
                        handleUserClick(
                          request.senderId,
                          request.friendRequestId,
                          "received"
                        )
                      }>
                      <Avatar
                        name={
                          request.senderId.fullname ||
                          t.unknown_user ||
                          "Unknown"
                        }
                        avatarUrl={request.senderId.urlavatar}
                        size={60}
                        className="flex-shrink-0"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-col">
                        <div
                          className="font-medium text-lg cursor-pointer hover:underline"
                          onClick={() =>
                            handleUserClick(
                              request.senderId,
                              request.friendRequestId,
                              "received"
                            )
                          }>
                          {request.senderId.fullname ||
                            t.unknown_user ||
                            "Unknown"}
                        </div>
                        <div className="text-sm text-gray-500">
                          {/* {formatDate(request.createdAt)} */}
                        </div>
                        {request.message && (
                          <div className="mt-2 p-3 bg-gray-200 dark:bg-gray-800 rounded-lg w-2/4 border-b-gray-900">
                            {request.message}
                          </div>
                        )}
                        <div className="mt-3 flex space-x-2">
                          <Button
                            type="primary"
                            className="flex-1 bg-blue-600 hover:bg-blue-700"
                            onClick={() =>
                              handleAccept(
                                request.friendRequestId,
                                request.senderId.userId
                              )
                            }>
                            {t.agree || "Đồng ý"}
                          </Button>
                          <Button
                            className="flex-1"
                            onClick={() =>
                              handleReject(request.friendRequestId)
                            }>
                            {t.decline || "Từ chối"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabPane>

        <TabPane
          tab={
            <span className="pl-1">
              {t.friend_request_sent || "Lời mời đã gửi"} ({sentRequests.length}
              )
            </span>
          }
          key="sent">
          <div className="p-4">
            {error ? (
              <div className="p-4 text-center text-red-500">{error}</div>
            ) : sentRequests.length === 0 ? (
              <div className="p-4 text-center">
                {t.no_requests || "Không có lời mời nào"}
              </div>
            ) : (
              <div className="overflow-y-auto space-y-4 p-4">
                {sentRequests.map((request) => (
                  <div
                    key={request.friendRequestId}
                    className="p-4 border-b dark:border-gray-700">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start flex-1">
                        <div
                          className="cursor-pointer flex-shrink-0 mr-3"
                          onClick={() =>
                            handleUserClick(
                              request.receiverId,
                              request.friendRequestId,
                              "sent"
                            )
                          }>
                          <Avatar
                            name={
                              request.receiverId.fullname ||
                              t.unknown_user ||
                              "Unknown"
                            }
                            avatarUrl={request.receiverId.urlavatar}
                            size={60}
                            className="flex-shrink-0"
                          />
                        </div>
                        <div className="flex-1">
                          <div className="flex flex-col">
                            <div
                              className="font-medium text-lg cursor-pointer hover:underline"
                              onClick={() =>
                                handleUserClick(
                                  request.receiverId,
                                  request.friendRequestId,
                                  "sent"
                                )
                              }>
                              {request.receiverId.fullname ||
                                t.unknown_user ||
                                "Unknown"}
                            </div>
                            <div className="text-sm text-gray-500">
                              {/* {formatDate(request.createdAt)} */}
                            </div>
                            {request.message && (
                              <div className="mt-2 p-3 bg-gray-200 dark:bg-gray-800 rounded-lg w-full  border-b-gray-900">
                                {request.message}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="ml-4">
                        <Button
                          danger
                          onClick={() => handleCancel(request.friendRequestId)}>
                          {t.cancel_request || "Thu hồi lời mời"}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabPane>
      </Tabs>

      <UserInfoHeaderModal
        visible={isModalVisible}
        onCancel={handleModalClose}
        searchResult={selectedUser}
        isCurrentUser={isCurrentUser}
        isFriend={isFriend}
        handleUpdate={() => {}}
        handleMessage={(userId, conversation) => {
          // If conversation is passed, use it directly
          if (conversation && onSelectConversation) {
            console.log(
              "RequestList: Using passed conversation from modal:",
              conversation
            );
            onSelectConversation(conversation);
          } else {
            // Otherwise, fall back to the original behavior
            handleFriendClick(userId);
          }
        }}
        handleSendFriendRequest={() => {}}
        isSending={false}
        onRequestsUpdate={onRequestsUpdate}
        isFromReceivedTab={activeTab === "received" && !!selectedRequestId}
        isFromSentTab={activeTab === "sent" && !!selectedRequestId}
        requestId={selectedRequestId}
        onAccept={handleAccept}
        onReject={handleReject}
        onCancelRequest={handleCancel}
      />
    </div>
  );
};

const RequestListWithErrorBoundary: React.FC<RequestListProps> = (props) => {
  return (
    <ErrorBoundary>
      <RequestList {...props} />
    </ErrorBoundary>
  );
};

export default RequestListWithErrorBoundary;
