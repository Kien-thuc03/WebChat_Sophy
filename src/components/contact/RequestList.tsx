import React, { useState, useEffect } from "react";
import { Tabs, Button, message } from "antd";
import { Avatar } from "../common/Avatar";
import { useLanguage } from "../../features/auth/context/LanguageContext";
import ErrorBoundary from "../common/ErrorBoundary";
import UserInfoHeaderModal, { UserResult } from "../header/modal/UserInfoHeaderModal";
import { 
  getFriendRequestsReceived, 
  getFriendRequestsSent, 
  acceptFriendRequest, 
  rejectFriendRequest, 
  cancelFriendRequest 
} from "../../api/API";

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
  onRequestsUpdate?: () => void; // Add this prop
}

const { TabPane } = Tabs;

const RequestList: React.FC<RequestListProps> = ({ onSelectFriend, onRequestsUpdate }) => {
  const { t } = useLanguage();
  const [receivedRequests, setReceivedRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserResult | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffSecs = Math.floor(diffMs / 1000);
      const diffMins = Math.floor(diffSecs / 60);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);
      
      if (diffSecs < 60) {
        return "vừa xong";
      } else if (diffMins < 60) {
        return `${diffMins} phút trước`;
      } else if (diffHours < 24) {
        return `${diffHours} giờ trước`;
      } else if (diffDays < 30) {
        return `${diffDays} ngày trước`;
      } else {
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
      }
    } catch (error) {
      console.error("Error formatting date:", error);
      return dateString;
    }
  };

  useEffect(() => {
    const getRequests = async () => {
      try {
        setLoading(true);
        
        const receivedData = await getFriendRequestsReceived();
        const sentData = await getFriendRequestsSent();

        setReceivedRequests(receivedData);
        setSentRequests(sentData);
        setError(null);
        
        // Notify parent component about the update
        onRequestsUpdate?.();
      } catch (err) {
        console.error("Error fetching friend requests:", err);
        setError(err instanceof Error ? err.message : "Không thể tải lời mời kết bạn");
      } finally {
        setLoading(false);
      }
    };

    getRequests();
  }, [onRequestsUpdate]);

  const handleAccept = async (requestId: string) => {
    try {
      await acceptFriendRequest(requestId);
      setReceivedRequests(prev => prev.filter(req => req.friendRequestId !== requestId));
      message.success("Đã chấp nhận lời mời kết bạn");
      onRequestsUpdate?.();
    } catch (error) {
      console.error("Error accepting friend request:", error);
      message.error(error instanceof Error ? error.message : "Không thể chấp nhận lời mời kết bạn");
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      await rejectFriendRequest(requestId);
      setReceivedRequests(prev => prev.filter(req => req.friendRequestId !== requestId));
      message.success("Đã từ chối lời mời kết bạn");
      onRequestsUpdate?.();
    } catch (error) {
      console.error("Error rejecting friend request:", error);
      message.error(error instanceof Error ? error.message : "Không thể từ chối lời mời kết bạn");
    }
  };

  const handleCancel = async (requestId: string) => {
    try {
      message.loading({ content: "Đang xử lý...", key: "cancelRequest" });
      await cancelFriendRequest(requestId);
      setSentRequests(prev => prev.filter(req => req.friendRequestId !== requestId));
      message.success({ 
        content: "Đã thu hồi lời mời kết bạn", 
        key: "cancelRequest",
        duration: 2 
      });
      onRequestsUpdate?.();
    } catch (error) {
      console.error("Error canceling friend request:", error);
      
      // Show error message
      message.error({ 
        content: error instanceof Error ? error.message : "Không thể thu hồi lời mời kết bạn",
        key: "cancelRequest",
        duration: 3
      });
    }
  };

  const handleFriendClick = (userId: string) => {
    if (onSelectFriend) {
      onSelectFriend(userId);
    }
  };

  const handleUserClick = (user: { 
      userId: string; 
      fullname: string; 
      urlavatar?: string;
      isMale?: boolean;
      birthday?: string;
      phone?: string;
    }) => {
      setSelectedUser({
        userId: user.userId,
        fullname: user.fullname,
        phone: user.phone || "",
        avatar: user.urlavatar,
        isMale: user.isMale,
        birthday: user.birthday
      });
      setIsModalVisible(true);
    };

  const handleModalClose = () => {
    setIsModalVisible(false);
    setSelectedUser(null);
  };

  const isCurrentUser = (userId: string): boolean => {
    const currentUserId = localStorage.getItem('userId');
    return userId === currentUserId;
  };

  const isFriend = (userId: string): boolean => {
    // Check if the user is in received or sent requests
    const isInReceived = receivedRequests.some(
      request => request.senderId.userId === userId || request.receiverId.userId === userId
    );
    const isInSent = sentRequests.some(
      request => request.senderId.userId === userId || request.receiverId.userId === userId
    );
    return isInReceived || isInSent;
  };

  return (
    <div className="request-list w-full h-full flex flex-col bg-white dark:bg-gray-900">
      <div className="p-4 border-b dark:border-gray-700">
        <h2 className="text-xl font-semibold">{t.friend_requests || "Lời mời kết bạn"}</h2>
      </div>

      <Tabs defaultActiveKey="received" className="px-4 flex-1">
        <TabPane tab={`Lời mời đã nhận (${receivedRequests.length})`} key="received">
          {loading ? (
            <div className="p-4 text-center">{t.loading || "Đang tải..."}</div>
          ) : error ? (
            <div className="p-4 text-center text-red-500">{error}</div>
          ) : receivedRequests.length === 0 ? (
            <div className="p-4 text-center">Không có lời mời nào</div>
          ) : (
            <div className="overflow-y-auto">
              {receivedRequests.map(request => (
                <div key={request.friendRequestId} className="p-4 border-b dark:border-gray-700">
                  <div className="flex items-start">
                    <div 
                      className="cursor-pointer flex-shrink-0 mr-3"
                      onClick={() => handleUserClick(request.senderId)}
                    >
                      <Avatar 
                        name={request.senderId.fullname} 
                        avatarUrl={request.senderId.urlavatar} 
                        size={60}
                        className="flex-shrink-0"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-col">
                        <div 
                          className="font-medium text-lg cursor-pointer hover:underline"
                          onClick={() => handleUserClick(request.senderId)}
                        >
                          {request.senderId.fullname}
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatDate(request.createdAt)}
                        </div>
                        {request.message && (
                          <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            {request.message}
                          </div>
                        )}
                        <div className="mt-3 flex space-x-2">
                          <Button 
                            type="primary" 
                            className="flex-1 bg-blue-600 hover:bg-blue-700"
                            onClick={() => handleAccept(request.friendRequestId)}
                          >
                            {t.agree || "Đồng ý"}
                          </Button>
                          <Button 
                            className="flex-1"
                            onClick={() => handleReject(request.friendRequestId)}
                          >
                            {t.cancel || "Từ chối"}
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
        
        <TabPane tab={`Lời mời đã gửi (${sentRequests.length})`} key="sent">
          {loading ? (
            <div className="p-4 text-center">{t.loading || "Đang tải..."}</div>
          ) : error ? (
            <div className="p-4 text-center text-red-500">{error}</div>
          ) : sentRequests.length === 0 ? (
            <div className="p-4 text-center">Không có lời mời nào đã gửi</div>
          ) : (
            <div className="overflow-y-auto">
              {sentRequests.map(request => (
                <div key={request.friendRequestId} className="p-4 border-b dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div 
                        className="cursor-pointer mr-3"
                        onClick={() => handleUserClick(request.receiverId)}
                      >
                        <Avatar 
                          name={request.receiverId.fullname} 
                          avatarUrl={request.receiverId.urlavatar} 
                          size={50}
                        />
                      </div>
                      <div>
                        <div 
                          className="font-medium cursor-pointer hover:underline"
                          onClick={() => handleUserClick(request.receiverId)}
                        >
                          {request.receiverId.fullname}
                        </div>
                        <div className="text-sm text-gray-500">
                          Bạn đã gửi lời mời {formatDate(request.createdAt)}
                        </div>
                      </div>
                    </div>
                    <Button 
                      className="w-full max-w-xs"
                      onClick={() => handleCancel(request.friendRequestId)}
                    >
                      Thu hồi lời mời
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabPane>
      </Tabs>

      <UserInfoHeaderModal
        visible={isModalVisible}
        onCancel={handleModalClose}
        searchResult={selectedUser}
        isCurrentUser={isCurrentUser}
        isFriend={isFriend}
        handleUpdate={() => {}}
        handleMessage={handleFriendClick}
        handleSendFriendRequest={() => {}}
        isSending={false}
        onRequestsUpdate={onRequestsUpdate}
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
