import React, { useState, useEffect } from "react";
import { Modal, Button, message } from "antd";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import {
  getUserByPhone,
  sendFriendRequest,
  fetchFriends,
  createConversation,
} from "../../../api/API";
import UserInfoHeaderModal, { UserResult } from "./UserInfoHeaderModal";
import UserModal from "../../content/modal/UserModal";
import { Conversation } from "../../../features/chat/types/conversationTypes";

interface AddFriendModalProps {
  visible: boolean;
  onClose: () => void;
  onRequestsUpdate?: () => void;
  onSelectConversation?: (conversation: Conversation) => void;
}

interface Friend {
  userId: string;
  fullname: string;
  phone: string;
  avatar?: string;
}

interface ApiError {
  message?: string;
}

const AddFriendModal: React.FC<AddFriendModalProps> = ({
  visible,
  onClose,
  onRequestsUpdate,
  onSelectConversation,
}) => {
  const [phone, setPhone] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<UserResult | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [friendMessage, setFriendMessage] = useState("");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [infoModalVisible, setInfoModalVisible] = useState(false);

  // Lấy userId của người dùng hiện tại từ localStorage
  const currentUserId = localStorage.getItem("userId");

  // Lấy danh sách bạn bè khi component mount
  useEffect(() => {
    const loadFriends = async () => {
      try {
        const friendsList = await fetchFriends();
        setFriends(friendsList);
      } catch (error) {
        console.error("Lỗi khi lấy danh sách bạn bè:", error);
      }
    };
    loadFriends();
  }, []);

  // Kiểm tra xem người dùng có phải là bạn bè không
  const isFriend = (userId: string) => {
    return friends.some((friend) => friend.userId === userId);
  };

  // Kiểm tra xem người dùng có phải là chính mình không
  const isCurrentUser = (userId: string) => {
    return userId === currentUserId;
  };

  const handleSearch = async () => {
    if (!phone || phone.trim() === "") {
      message.error("Vui lòng nhập số điện thoại");
      return;
    }

    setIsSearching(true);
    setSearchResult(null);

    try {
      let formattedPhone = phone;
      if (phone.startsWith("+84")) {
        formattedPhone = "0" + phone.slice(3);
      }

      const userData = await getUserByPhone(formattedPhone);
      if (!userData?.userId) {
        throw new Error("Không tìm thấy thông tin người dùng");
      }

      console.log("User data from getUserByPhone:", userData);

      setSearchResult({
        userId: userData.userId,
        fullname: userData.fullname,
        phone: userData.phone,
        avatar: userData.urlavatar,
        isMale: userData.isMale,
        birthday: userData.birthday,
      });

      // Hiển thị modal thông tin người dùng
      setInfoModalVisible(true);
    } catch (error: unknown) {
      const err = error as ApiError;
      message.error(err.message || "Không tìm thấy người dùng");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSendFriendRequest = async (userId: string) => {
    if (!userId) {
      message.error("ID người dùng không hợp lệ");
      return;
    }

    setIsSending(true);
    try {
      const response = await sendFriendRequest(userId, friendMessage);
      message.success(response.message || "Đã gửi lời mời kết bạn thành công");

      // Cập nhật lại danh sách bạn bè
      setFriends([
        ...friends,
        {
          userId,
          fullname: searchResult!.fullname,
          phone: searchResult!.phone,
        },
      ]);

      // Gọi callback để cập nhật danh sách lời mời
      onRequestsUpdate?.();
      setInfoModalVisible(false);
      setSearchResult(null);
      setPhone("");
      setFriendMessage("");
    } catch (error: unknown) {
      const err = error as ApiError;
      message.error(err.message || "Không thể gửi lời mời kết bạn");
    } finally {
      setIsSending(false);
    }
  };

  const handleMessage = async (userId: string, conversation?: Conversation) => {
    try {
      // Nếu đã có conversation được truyền, sử dụng nó
      if (conversation && onSelectConversation) {
        console.log("AddFriendModal: Using passed conversation:", conversation);
        onSelectConversation(conversation);
        setInfoModalVisible(false);
        onClose();
        return;
      }

      // Nếu không, tạo conversation mới
      message.loading("Đang mở cuộc trò chuyện...", 0.5);

      // Tạo hoặc lấy conversation
      const newConversation = await createConversation(userId);

      if (newConversation && onSelectConversation) {
        console.log("AddFriendModal: Created conversation:", newConversation);
        onSelectConversation(newConversation);
      } else {
        message.error("Không thể tạo cuộc trò chuyện");
      }

      setInfoModalVisible(false);
      onClose();
    } catch (error) {
      console.error("Lỗi khi tạo cuộc trò chuyện:", error);
      message.error("Không thể tạo cuộc trò chuyện");
    }
  };

  const handleUpdate = () => {
    message.info("Chức năng cập nhật thông tin đang được phát triển!");
    setInfoModalVisible(false);
    onClose();
  };

  return (
    <>
      {/* Modal nhập số điện thoại */}
      <Modal
        title="Thêm bạn"
        visible={visible}
        onCancel={onClose}
        footer={[
          <Button key="cancel" onClick={onClose}>
            Hủy
          </Button>,
          <Button
            key="submit"
            type="primary"
            onClick={handleSearch}
            loading={isSearching}>
            Tìm kiếm
          </Button>,
        ]}>
        <p>Nhập số điện thoại để tìm kiếm bạn bè.</p>
        <PhoneInput
          international
          defaultCountry="VN"
          placeholder="Nhập số điện thoại"
          value={phone}
          onChange={(value) => setPhone(value || "")}
          className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSearch();
            }
          }}
        />
      </Modal>

      {/* Modal thông tin người dùng */}
      {searchResult && isCurrentUser(searchResult.userId) ? (
        <UserModal
          isOpen={infoModalVisible}
          onClose={() => {
            setInfoModalVisible(false);
            setSearchResult(null);
            setPhone("");
            setFriendMessage("");
          }}
        />
      ) : (
        <UserInfoHeaderModal
          visible={infoModalVisible}
          onCancel={() => {
            setInfoModalVisible(false);
            setSearchResult(null);
            setPhone("");
            setFriendMessage("");
          }}
          searchResult={searchResult}
          isCurrentUser={isCurrentUser}
          isFriend={isFriend}
          handleUpdate={handleUpdate}
          handleMessage={handleMessage}
          handleSendFriendRequest={handleSendFriendRequest}
          isSending={isSending}
        />
      )}
    </>
  );
};

export default AddFriendModal;
