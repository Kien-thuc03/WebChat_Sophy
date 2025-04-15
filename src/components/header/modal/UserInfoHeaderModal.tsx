import React, { useEffect, useState } from "react";
import { Modal, Button, message } from "antd";
import { ArrowLeftOutlined, EditOutlined, CloseOutlined } from "@ant-design/icons";
import { 
  getFriendRequestsSent, 
  cancelFriendRequest, 
  getFriendRequestsReceived,
  acceptFriendRequest,
  rejectFriendRequest
} from "../../../api/API";

export interface UserResult {
  userId: string;
  fullname: string;
  phone: string;
  avatar?: string;
  isMale?: boolean;
  birthday?: string;
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
}

const UserInfoHeaderModal: React.FC<UserInfoHeaderModalProps> = ({
  visible,
  onCancel,
  searchResult,
  isCurrentUser,
  isFriend,
  handleUpdate,
  handleMessage,
  handleSendFriendRequest,
  isSending,
}) => {
  const [randomImageId, setRandomImageId] = useState<number>(1);
  const [hasSentFriendRequest, setHasSentFriendRequest] = useState<boolean>(false);
  const [friendRequestId, setFriendRequestId] = useState<string | undefined>(undefined);
  const [hasPendingRequest, setHasPendingRequest] = useState<boolean>(false);
  const [pendingRequestId, setPendingRequestId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (visible) {
      setRandomImageId(Math.floor(Math.random() * 100) + 1);
    }
  }, [visible]);

  useEffect(() => {
    const checkFriendRequest = async () => {
      if (searchResult && !isCurrentUser(searchResult.userId) && !isFriend(searchResult.userId)) {
        try {
          // Check if we sent a request
          const sentResult = await getFriendRequestsSent();
          setHasSentFriendRequest(sentResult.hasSent);
          setFriendRequestId(sentResult.requestId);
          
          try {
            // Check if we have a pending request from this user
            const pendingRequests = await getFriendRequestsReceived();
            
            if (Array.isArray(pendingRequests)) {
              // Define a proper interface for the request object
              interface FriendRequest {
                senderId: {
                  userId: string;
                  fullname?: string;
                  urlavatar?: string;
                };
                status: string;
                friendRequestId: string;
              }
              
              const pendingRequest = pendingRequests.find(
                (request: FriendRequest) => 
                  request.senderId?.userId === searchResult.userId && 
                  request.status === 'pending'
              );
              
              if (pendingRequest) {
                setHasPendingRequest(true);
                setPendingRequestId(pendingRequest.friendRequestId);
              } else {
                setHasPendingRequest(false);
                setPendingRequestId(undefined);
              }
            }
          } catch (receivedErr) {
            console.error("Error checking received friend requests:", receivedErr);
            setHasPendingRequest(false);
            setPendingRequestId(undefined);
          }
        } catch (err: unknown) {
          console.error("Error checking sent friend requests:", err);
          setHasSentFriendRequest(false);
          setFriendRequestId(undefined);
        }
      } else {
        setHasSentFriendRequest(false);
        setFriendRequestId(undefined);
        setHasPendingRequest(false);
        setPendingRequestId(undefined);
      }
    };

    checkFriendRequest();
  }, [searchResult, isCurrentUser, isFriend]);

  if (!searchResult) return null;

  const isCurrentUserProfile = isCurrentUser(searchResult.userId);

  // Hàm xử lý hủy yêu cầu kết bạn
  const handleCancelFriendRequest = async () => {
    if (!friendRequestId) {
      message.error("Không tìm thấy yêu cầu kết bạn để thu hồi");
      return;
    }

    try {
      const { message: successMessage } = await cancelFriendRequest(friendRequestId);
      message.success(successMessage);
      setHasSentFriendRequest(false);
      setFriendRequestId(undefined);
    } catch (error: unknown) {
      const err = error as { message?: string };
      message.error(err.message || "Thu hồi yêu cầu kết bạn thất bại");
    }
  };

  // Add a function to handle accepting friend requests
  const handleAcceptFriendRequest = async () => {
    if (!pendingRequestId) {
      message.error("Không tìm thấy yêu cầu kết bạn");
      return;
    }
    
    try {
      const result = await acceptFriendRequest(pendingRequestId);
      message.success(result.message);
      setHasPendingRequest(false);
      setPendingRequestId(undefined);
      // Refresh the friend list if needed
    } catch (err: unknown) {
      const error = err as Error;
      message.error(error.message || "Không thể chấp nhận lời mời kết bạn");
    }
  };

  // Update the function to handle rejecting friend requests
  const handleRejectFriendRequest = async () => {
    if (!pendingRequestId) {
      message.error("Không tìm thấy yêu cầu kết bạn");
      return;
    }
    
    try {
      const result = await rejectFriendRequest(pendingRequestId);
      message.success(result.message);
      setHasPendingRequest(false);
      setPendingRequestId(undefined);
    } catch (err: unknown) {
      const error = err as Error;
      message.error(error.message || "Không thể từ chối lời mời kết bạn");
    }
  };

  return (
    <Modal
      title={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center">
            <ArrowLeftOutlined className="mr-2 cursor-pointer" onClick={onCancel} />
            <span>Thông tin tài khoản</span>
          </div>
          <CloseOutlined className="cursor-pointer" onClick={onCancel} />
        </div>
      }
      visible={visible}
      onCancel={onCancel}
      footer={null}
      closable={false}
      width={518}
      bodyStyle={{ padding: 0 }}
    >
      <div className="relative">
        {/* Ảnh bìa */}
        <div
          className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-r from-blue-400 to-blue-600"
          style={{
            backgroundImage: `url(https://picsum.photos/id/${randomImageId}/800/200)`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />

        {/* Ảnh đại diện */}
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

        {/* Thông tin người dùng */}
        <div className="pt-40 px-4 pb-4">
          <div className="flex items-center">
            <h2 className="text-xl font-semibold ml-20">{searchResult.fullname}</h2>
            {isCurrentUserProfile && (
              <EditOutlined className="ml-2 text-blue-500 cursor-pointer" onClick={handleUpdate} />
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

        {/* Nút hành động */}
        <div className="border-t border-gray-200">
          <div className="p-4 grid grid-cols-2 gap-4">
            {isCurrentUserProfile ? (
              <Button type="primary" block onClick={handleUpdate}>
                Cập nhật
              </Button>
            ) : isFriend(searchResult.userId) ? (
              <Button
                type="primary"
                block
                onClick={() => handleMessage(searchResult.userId)}
              >
                Nhắn tin
              </Button>
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
                  block
                  onClick={handleCancelFriendRequest}
                >
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
            ) : (
              <>
                <Button
                  type="default"
                  block
                  onClick={() => handleSendFriendRequest(searchResult.userId)}
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
  );
};

export default UserInfoHeaderModal;