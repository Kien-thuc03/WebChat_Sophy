import React, { useState } from "react";
import { Modal, Button, message } from "antd";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { getUserByPhone, sendFriendRequest } from "../../../api/API";

interface AddFriendModalProps {
  visible: boolean;
  onClose: () => void;
}

interface UserResult {
  userId: string;
  fullname: string;
  phone: string;
  avatar?: string;
}

interface ApiError {
  message?: string;
}

const AddFriendModal: React.FC<AddFriendModalProps> = ({ visible, onClose }) => {
  const [phone, setPhone] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<UserResult | null>(null);
  const [isSending, setIsSending] = useState(false);

  const handleSearch = async () => {
    if (!phone || phone.trim() === "") {
      message.error("Vui lòng nhập số điện thoại");
      return;
    }

    setIsSearching(true);
    setSearchResult(null);

    try {
      // Format phone number if needed
      let formattedPhone = phone;
      if (phone.startsWith("+84")) {
        formattedPhone = "0" + phone.slice(3);
      }

      const userData = await getUserByPhone(formattedPhone);
      setSearchResult({
        userId: userData.userId,
        fullname: userData.fullname,
        phone: userData.phone,
        avatar: userData.avatar
      });
    } catch (error: unknown) {
      const err = error as ApiError;
      message.error(err.message || "Không tìm thấy người dùng");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSendFriendRequest = async (userId: string) => {
    setIsSending(true);
    try {
      await sendFriendRequest(userId);
      message.success("Đã gửi lời mời kết bạn thành công");
    } catch (error: unknown) {
      const err = error as ApiError;
      message.error(err.message || "Không thể gửi lời mời kết bạn");
    } finally {
      setIsSending(false);
    }
  };

  return (
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
          loading={isSearching}
        >
          Tìm kiếm
        </Button>,
      ]}
    >
      <p>Nhập số điện thoại để tìm kiếm bạn bè.</p>
      <PhoneInput
        international
        defaultCountry="VN"
        placeholder="Nhập số điện thoại"
        value={phone}
        onChange={value => setPhone(value || '')}
        className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
      />

      {searchResult && (
        <div className="mt-4 border-t pt-4">
          <h3 className="text-sm font-medium mb-2">Kết quả tìm kiếm</h3>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden mr-3">
                {searchResult.avatar ? (
                  <img 
                    src={searchResult.avatar} 
                    alt={searchResult.fullname} 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "/images/default-avatar.png";
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-blue-500 text-white">
                    {searchResult.fullname.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <p className="font-medium">{searchResult.fullname}</p>
                <p className="text-sm text-gray-500">{searchResult.phone}</p>
              </div>
            </div>
            <Button 
              type="primary"
              onClick={() => handleSendFriendRequest(searchResult.userId)}
              loading={isSending}
            >
              Kết bạn
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default AddFriendModal;