import React, { useState, useEffect } from "react";
import { Tabs, Button, message } from "antd";
import { Avatar } from "../common/Avatar";
import { useLanguage } from "../../features/auth/context/LanguageContext";
import ErrorBoundary from "../common/ErrorBoundary";

interface FriendRequest {
  id: string;
  userId: string;
  name: string;
  avatarUrl?: string;
  message?: string;
  date?: string;
  source?: string; // How they found the user (e.g., "Từ gợi ý kết bạn", "Từ số điện thoại")
}

interface RequestListProps {
  onSelectFriend?: (friendId: string) => void;
}

const { TabPane } = Tabs;

const RequestList: React.FC<RequestListProps> = ({ onSelectFriend }) => {
  const { t } = useLanguage();
  const [receivedRequests, setReceivedRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const getRequests = async () => {
      try {
        setLoading(true);
        // In a real implementation, you would fetch from your API
        // For now, we'll use mock data similar to the image
        
        // Mock data for received requests
        const mockReceivedRequests: FriendRequest[] = [
          {
            id: "1",
            userId: "user1",
            name: "Đặng Phan",
            avatarUrl: "https://randomuser.me/api/portraits/men/32.jpg",
            message: "Xin chào, mình là Đặng Phan. Kết bạn với mình nhé!",
            date: "16/02",
            source: "Từ gợi ý kết bạn"
          },
          {
            id: "2",
            userId: "user2",
            name: "Susan",
            avatarUrl: "https://randomuser.me/api/portraits/women/44.jpg",
            message: "Xin chào, mình là Susan. Kết bạn với mình nhé!",
            date: "21/01",
            source: "Từ số điện thoại"
          }
        ];
        
        // Mock data for sent requests
        const mockSentRequests: FriendRequest[] = [
          {
            id: "3",
            userId: "user3",
            name: "Hothanh Hhh",
            avatarUrl: "https://randomuser.me/api/portraits/men/45.jpg",
            date: "10/03"
          },
          {
            id: "4",
            userId: "user4",
            name: "Nguyễn Xuân Thiện",
            avatarUrl: "https://randomuser.me/api/portraits/men/22.jpg",
            date: "05/03"
          },
          {
            id: "5",
            userId: "user5",
            name: "Nguyễn Hữu Quốc",
            avatarUrl: "https://randomuser.me/api/portraits/men/67.jpg",
            date: "01/03"
          }
        ];
        
        setReceivedRequests(mockReceivedRequests);
        setSentRequests(mockSentRequests);
        setError(null);
      } catch (err) {
        console.error("Error fetching friend requests:", err);
        setError(err instanceof Error ? err.message : "Không thể tải lời mời kết bạn");
      } finally {
        setLoading(false);
      }
    };

    getRequests();
  }, []);

  const handleAccept = async (requestId: string) => {
    try {
      // In a real implementation, call your API
      // await acceptFriendRequest(requestId);
      
      // Update UI
      setReceivedRequests(prev => prev.filter(req => req.id !== requestId));
      message.success("Đã chấp nhận lời mời kết bạn");
    } catch (error) {
      console.error("Error accepting friend request:", error);
      message.error("Không thể chấp nhận lời mời kết bạn");
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      // In a real implementation, call your API
      // await rejectFriendRequest(requestId);
      
      // Update UI
      setReceivedRequests(prev => prev.filter(req => req.id !== requestId));
      message.success("Đã từ chối lời mời kết bạn");
    } catch (error) {
      console.error("Error rejecting friend request:", error);
      message.error("Không thể từ chối lời mời kết bạn");
    }
  };

  const handleCancel = async (requestId: string) => {
    try {
      // In a real implementation, call your API
      // await cancelFriendRequest(requestId);
      
      // Update UI
      setSentRequests(prev => prev.filter(req => req.id !== requestId));
      message.success("Đã thu hồi lời mời kết bạn");
    } catch (error) {
      console.error("Error canceling friend request:", error);
      message.error("Không thể thu hồi lời mời kết bạn");
    }
  };

  // Add a function to handle clicking on a friend
  const handleFriendClick = (userId: string) => {
    if (onSelectFriend) {
      onSelectFriend(userId);
    }
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
            // In the received requests section
            <div className="overflow-y-auto">
              {receivedRequests.map(request => (
                <div key={request.id} className="p-4 border-b dark:border-gray-700">
                  <div className="flex items-start">
                    <div 
                      className="cursor-pointer flex-shrink-0 mr-3"
                      onClick={() => handleFriendClick(request.userId)}
                    >
                      <Avatar 
                        name={request.name} 
                        avatarUrl={request.avatarUrl} 
                        size={60}
                        className="flex-shrink-0"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-col">
                        <div 
                          className="font-medium text-lg cursor-pointer hover:underline"
                          onClick={() => handleFriendClick(request.userId)}
                        >
                          {request.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {request.date} - {request.source}
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
                            onClick={() => handleAccept(request.id)}
                          >
                            {t.agree || "Đồng ý"}
                          </Button>
                          <Button 
                            className="flex-1"
                            onClick={() => handleReject(request.id)}
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
                <div key={request.id} className="p-4 border-b dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div 
                        className="cursor-pointer mr-3"
                        onClick={() => handleFriendClick(request.userId)}
                      >
                        <Avatar 
                          name={request.name} 
                          avatarUrl={request.avatarUrl} 
                          size={50}
                        />
                      </div>
                      <div>
                        <div 
                          className="font-medium cursor-pointer hover:underline"
                          onClick={() => handleFriendClick(request.userId)}
                        >
                          {request.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          Bạn đã gửi lời mời
                        </div>
                      </div>
                    </div>
                    <Button 
                      className="w-full max-w-xs"
                      onClick={() => handleCancel(request.id)}
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