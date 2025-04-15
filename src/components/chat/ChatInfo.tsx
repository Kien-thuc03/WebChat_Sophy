import React, { useState, useEffect } from 'react';
import { Avatar } from '../common/Avatar';
import { Button, Tooltip, Collapse, Badge, Switch, Modal, Divider } from 'antd';
import { 
  BellOutlined,
  PushpinOutlined,
  UsergroupAddOutlined,
  ClockCircleOutlined,
  EyeInvisibleOutlined,
  SearchOutlined,
  EditOutlined,
  WarningOutlined,
  DeleteOutlined,
  PlusOutlined,
  FileImageOutlined,
  FileOutlined,
  LinkOutlined,
  TeamOutlined,
  RightOutlined
} from '@ant-design/icons';
import { Conversation } from '../../features/chat/types/conversationTypes';
import { useConversations } from '../../features/chat/hooks/useConversations';
import { getUserById } from "../../api/API";
import { User } from "../../features/auth/types/authTypes";
import GroupAvatar from './GroupAvatar';
import { useLanguage } from "../../features/auth/context/LanguageContext";

interface ChatInfoProps {
  conversation: Conversation;
}

const ChatInfo: React.FC<ChatInfoProps> = ({ conversation }) => {
  const [activeKeys, setActiveKeys] = useState<string[]>([]);
  const [isEditNameModalVisible, setIsEditNameModalVisible] = useState(false);
  const [localName, setLocalName] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [localUserCache, setLocalUserCache] = useState<Record<string, User>>({});
  const { userCache, userAvatars } = useConversations();
  const { t } = useLanguage();

  // Determine if this is a group conversation
  const isGroup = conversation.isGroup;
  const groupName = conversation.groupName;
  const groupAvatarUrl = conversation.groupAvatarUrl;
  const groupMembers = conversation.groupMembers || [];

  /**
   * Gets the ID of the other user in a one-on-one conversation
   */
  const getOtherUserId = (conversation: Conversation): string => {
    // Get current user ID from localStorage (or any authentication method you use)
    const currentUserId = localStorage.getItem('userId') || '';
    
    // If it's a group chat, there's no single "other user"
    if (conversation.isGroup) {
      return '';
    }
    
    // If the current user is the creator, return the receiverId
    if (currentUserId === conversation.creatorId) {
      return conversation.receiverId || '';
    }
    
    // If the current user is the receiver, return the creatorId
    if (currentUserId === conversation.receiverId) {
      return conversation.creatorId;
    }
    
    // Fallback: Return receiverId if we can't determine
    return conversation.receiverId || conversation.creatorId;
  };

  // Get the other user's ID using our helper function
  const otherUserId = getOtherUserId(conversation);
  // Get user info from either the global or local cache
  const otherUserInfo = userCache[otherUserId] || localUserCache[otherUserId];

  // Load user data if not already in cache
  useEffect(() => {
    const loadUserData = async () => {
      if (!isGroup && otherUserId && !userCache[otherUserId] && !localUserCache[otherUserId]) {
        try {
          const userData = await getUserById(otherUserId);
          if (userData) {
            setLocalUserCache(prev => ({
              ...prev,
              [otherUserId]: userData
            }));
          }
        } catch (error) {
          console.error(`Failed to load data for user ${otherUserId}:`, error);
        }
      }
    };
    
    loadUserData();
  }, [isGroup, otherUserId, userCache, localUserCache]);

  const handlePanelChange = (keys: string | string[]) => {
    setActiveKeys(Array.isArray(keys) ? keys : [keys]);
  };

  const handleToggleMute = () => {
    setIsMuted(!isMuted);
  };

  const handleTogglePin = () => {
    setIsPinned(!isPinned);
  };

  const handleToggleHidden = () => {
    setIsHidden(!isHidden);
  };

  const handleEditName = () => {
    setLocalName(isGroup ? groupName || '' : otherUserInfo?.fullname || '');
    setIsEditNameModalVisible(true);
  };

  const handleSaveLocalName = () => {
    // Save local name logic here
    setIsEditNameModalVisible(false);
  };

  const handleDeleteChat = () => {
    Modal.confirm({
      title: 'Xóa lịch sử trò chuyện',
      content: 'Bạn có chắc chắn muốn xóa toàn bộ lịch sử trò chuyện? Hành động này không thể hoàn tác.',
      okText: 'Xóa',
      cancelText: 'Hủy',
      okButtonProps: { danger: true },
      onOk: () => {
        // Delete chat history logic here
      }
    });
  };

  // Determine the display name based on whether it's a group or individual conversation
  const displayName = isGroup 
    ? groupName || 'Nhóm chat' 
    : otherUserInfo?.fullname || t.loading || 'Đang tải...';

  // Determine online status
  const onlineStatus = isGroup ? `${groupMembers.length} thành viên` : 'Online';

  return (
    <div className="chat-info flex flex-col h-full bg-white">
      {/* Header - Fixed */}
      <div className="flex-none p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-center">
          Thông tin hội thoại
        </h2>
      </div>

      {/* Main content - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        {/* User Info Section */}
        <div className="py-6 text-center border-b border-gray-100">
          <div className="flex flex-col items-center">
            {isGroup ? (
              <GroupAvatar
                members={groupMembers}
                userAvatars={userAvatars}
                size={80}
                className="mb-3 border-2 border-white"
                groupAvatarUrl={groupAvatarUrl || undefined}
              />
            ) : (
              <Avatar 
                name={otherUserInfo?.fullname || 'User'}
                avatarUrl={otherUserInfo?.urlavatar}
                size={80}
                className="rounded-full mb-3"
              />
            )}
            <div className="flex items-center justify-center gap-2 mb-1">
              <h3 className="text-lg font-semibold">
                {displayName}
              </h3>
              <EditOutlined 
                onClick={handleEditName}
                className="text-gray-500 hover:text-blue-500 cursor-pointer"
              />
            </div>

            {/* Quick Actions */}
            <div className="flex justify-center gap-8 w-full mt-4">
              <div className="flex flex-col items-center">
                <Button
                  type="text"
                  shape="circle"
                  icon={<BellOutlined className={isMuted ? 'text-blue-500' : 'text-gray-500'} />}
                  onClick={handleToggleMute}
                  className="flex items-center justify-center h-10 w-10 bg-gray-100"
                />
                <span className="text-xs mt-1">Tắt thông báo</span>
              </div>
              
              <div className="flex flex-col items-center">
                <Button
                  type="text"
                  shape="circle"
                  icon={<PushpinOutlined className={isPinned ? 'text-blue-500' : 'text-gray-500'} />}
                  onClick={handleTogglePin}
                  className="flex items-center justify-center h-10 w-10 bg-gray-100"
                />
                <span className="text-xs mt-1">Ghim hội thoại</span>
              </div>
              
              <div className="flex flex-col items-center">
                <Button
                  type="text"
                  shape="circle"
                  icon={<UsergroupAddOutlined className="text-gray-500" />}
                  className="flex items-center justify-center h-10 w-10 bg-gray-100"
                />
                <span className="text-xs mt-1">Tạo nhóm</span>
              </div>
            </div>
          </div>
        </div>

        {/* Button Sections */}
        <div className="mt-4 mb-4">
          {/* Danh sách nhắc hẹn - Simple Button */}
          <div className="px-4 py-3 hover:bg-gray-50 cursor-pointer">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <ClockCircleOutlined className="text-gray-500 mr-3" />
                <span>Danh sách nhắc hẹn</span>
              </div>
            </div>
          </div>

          {/* Nhóm chung - Simple Button */}
          {!isGroup && (
            <div className="px-4 py-3 hover:bg-gray-50 cursor-pointer">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <TeamOutlined className="text-gray-500 mr-3" />
                  <span>20 nhóm chung</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="h-2 bg-gray-100"></div>

        {/* Expandable Sections in Zalo style */}
        <div className="px-0 mt-2">
          {/* Ảnh/Video section */}
          <div className="cursor-pointer hover:bg-gray-50" onClick={() => setActiveKeys(prev => prev.includes("media") ? prev.filter(k => k !== "media") : [...prev, "media"])}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <div className="flex items-center">
                <FileImageOutlined className="text-gray-500 mr-3" />
                <span>Ảnh/Video</span>
              </div>
              <RightOutlined className={`text-gray-400 transition-transform ${activeKeys.includes("media") ? 'transform rotate-90' : ''}`} />
            </div>
            {activeKeys.includes("media") && (
              <div className="p-4 border-b border-gray-100 bg-gray-50">
                <div className="text-sm text-gray-500 text-center py-2">
                  Chưa có ảnh/video nào
                </div>
              </div>
            )}
          </div>

          {/* File section */}
          <div className="cursor-pointer hover:bg-gray-50" onClick={() => setActiveKeys(prev => prev.includes("files") ? prev.filter(k => k !== "files") : [...prev, "files"])}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <div className="flex items-center">
                <FileOutlined className="text-gray-500 mr-3" />
                <span>File</span>
              </div>
              <RightOutlined className={`text-gray-400 transition-transform ${activeKeys.includes("files") ? 'transform rotate-90' : ''}`} />
            </div>
            {activeKeys.includes("files") && (
              <div className="p-4 border-b border-gray-100 bg-gray-50">
                <div className="text-sm text-gray-500 text-center py-2">
                  Chưa có file nào
                </div>
              </div>
            )}
          </div>

          {/* Link section */}
          <div className="cursor-pointer hover:bg-gray-50" onClick={() => setActiveKeys(prev => prev.includes("links") ? prev.filter(k => k !== "links") : [...prev, "links"])}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <div className="flex items-center">
                <LinkOutlined className="text-gray-500 mr-3" />
                <span>Link</span>
              </div>
              <RightOutlined className={`text-gray-400 transition-transform ${activeKeys.includes("links") ? 'transform rotate-90' : ''}`} />
            </div>
            {activeKeys.includes("links") && (
              <div className="p-4 border-b border-gray-100 bg-gray-50">
                <div className="text-sm text-gray-500 text-center py-2">
                  Chưa có link nào
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="h-2 bg-gray-100 mt-2 mb-2"></div>

        {/* Thiết lập bảo mật section */}
        <div className="cursor-pointer hover:bg-gray-50" onClick={() => setActiveKeys(prev => prev.includes("security") ? prev.filter(k => k !== "security") : [...prev, "security"])}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center">
              <EyeInvisibleOutlined className="text-gray-500 mr-3" />
              <span>Thiết lập bảo mật</span>
            </div>
            <RightOutlined className={`text-gray-400 transition-transform ${activeKeys.includes("security") ? 'transform rotate-90' : ''}`} />
          </div>
          {activeKeys.includes("security") && (
            <div className="p-4 border-b border-gray-100 bg-gray-50">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Tin nhắn tự xóa</p>
                    <p className="text-sm text-gray-500">Không bao giờ</p>
                  </div>
                  <Switch checked={false} size="small" />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Ẩn trò chuyện</p>
                    <p className="text-sm text-gray-500">Yêu cầu mật khẩu để xem</p>
                  </div>
                  <Switch checked={isHidden} onChange={handleToggleHidden} size="small" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="h-2 bg-gray-100 mt-2"></div>

        {/* Report and Delete Section */}
        <div className="mt-2">
          <div className="flex items-center text-red-500 px-4 py-3 cursor-pointer hover:bg-gray-50">
            <WarningOutlined className="mr-3" />
            <span>Báo xấu</span>
          </div>
          <div className="flex items-center text-red-500 px-4 py-3 cursor-pointer hover:bg-gray-50" onClick={handleDeleteChat}>
            <DeleteOutlined className="mr-3" />
            <span>Xóa lịch sử trò chuyện</span>
          </div>
        </div>
      </div>

      {/* Edit Local Name Modal */}
      <Modal
        title="Đổi tên gợi nhớ"
        open={isEditNameModalVisible}
        onOk={handleSaveLocalName}
        onCancel={() => setIsEditNameModalVisible(false)}
        okText="Lưu"
        cancelText="Hủy"
      >
        <input
          type="text"
          value={localName}
          onChange={(e) => setLocalName(e.target.value)}
          className="w-full p-2 border rounded"
          placeholder="Nhập tên gợi nhớ"
        />
      </Modal>
    </div>
  );
};

export default ChatInfo; 