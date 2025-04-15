import React, { useState, useEffect } from 'react';
import { Avatar } from '../common/Avatar';
import { Button, Tooltip, Collapse, Badge, Switch, Modal } from 'antd';
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
  TeamOutlined
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
  const [activeKeys, setActiveKeys] = useState<string[]>(['reminders', 'media', 'files', 'links', 'security']);
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
        <h2 className="text-lg font-semibold">
          {isGroup ? 'Thông tin nhóm' : 'Thông tin hội thoại'}
        </h2>
      </div>

      {/* Main content - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        {/* User Info Section */}
        <div className="p-4 border-b border-gray-200">
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
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-semibold">
                {displayName}
              </h3>
              <Button
                type="text"
                icon={<EditOutlined />}
                size="small"
                onClick={handleEditName}
                className="text-gray-500 hover:text-blue-500"
              />
            </div>
            <p className="text-sm text-gray-500 mb-4">{onlineStatus}</p>
            {!isGroup && otherUserInfo?.phone && (
              <p className="text-sm text-gray-500 mb-4">{otherUserInfo.phone}</p>
            )}

            {/* Quick Actions */}
            <div className="flex justify-around w-full mb-4">
              <Tooltip title="Tắt thông báo">
                <Button
                  type="text"
                  icon={<BellOutlined className={isMuted ? 'text-blue-500' : ''} />}
                  onClick={handleToggleMute}
                  className="flex flex-col items-center"
                >
                  <span className="text-xs mt-1">Thông báo</span>
                </Button>
              </Tooltip>
              <Tooltip title="Ghim hội thoại">
                <Button
                  type="text"
                  icon={<PushpinOutlined className={isPinned ? 'text-blue-500' : ''} />}
                  onClick={handleTogglePin}
                  className="flex flex-col items-center"
                >
                  <span className="text-xs mt-1">Ghim</span>
                </Button>
              </Tooltip>
              <Tooltip title="Tạo nhóm">
                <Button
                  type="text"
                  icon={<UsergroupAddOutlined />}
                  className="flex flex-col items-center"
                >
                  <span className="text-xs mt-1">Tạo nhóm</span>
                </Button>
              </Tooltip>
            </div>
          </div>
        </div>

        {/* Collapsible Sections */}
        <Collapse 
          activeKey={activeKeys}
          onChange={handlePanelChange}
          className="chat-info-collapse"
          bordered={false}
        >
          {/* Reminders Section */}
          <Collapse.Panel 
            header={
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ClockCircleOutlined />
                  <span>Nhắc hẹn</span>
                </div>
                <Button type="text" icon={<PlusOutlined />} size="small" />
              </div>
            }
            key="reminders"
          >
            <div className="text-sm text-gray-500 text-center py-2">
              Chưa có nhắc hẹn nào
            </div>
          </Collapse.Panel>

          {/* Shared Groups */}
          {!isGroup && (
            <Collapse.Panel
              header={
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TeamOutlined />
                    <span>Nhóm chung</span>
                    <Badge count={0} size="small" />
                  </div>
                </div>
              }
              key="shared-groups"
            >
              <div className="space-y-2">
                <div className="text-sm text-gray-500 text-center py-2">
                  Không có nhóm chung nào
                </div>
              </div>
            </Collapse.Panel>
          )}

          {/* Media Section */}
          <Collapse.Panel 
            header={
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileImageOutlined />
                  <span>Ảnh/Video</span>
                </div>
                <Button type="text" icon={<SearchOutlined />} size="small" />
              </div>
            }
            key="media"
          >
            <div className="grid grid-cols-3 gap-2">
              {/* Media items would go here */}
              <div className="text-sm text-gray-500 text-center py-2 col-span-3">
                Chưa có ảnh/video nào
              </div>
            </div>
          </Collapse.Panel>

          {/* Files Section */}
          <Collapse.Panel 
            header={
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileOutlined />
                  <span>File</span>
                </div>
                <Button type="text" icon={<SearchOutlined />} size="small" />
              </div>
            }
            key="files"
          >
            <div className="space-y-2">
              <div className="text-sm text-gray-500 text-center py-2">
                Chưa có file nào
              </div>
            </div>
          </Collapse.Panel>

          {/* Links Section */}
          <Collapse.Panel 
            header={
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <LinkOutlined />
                  <span>Link</span>
                </div>
                <Button type="text" icon={<SearchOutlined />} size="small" />
              </div>
            }
            key="links"
          >
            <div className="space-y-2">
              <div className="text-sm text-gray-500 text-center py-2">
                Chưa có link nào
              </div>
            </div>
          </Collapse.Panel>

          {/* Security Settings */}
          <Collapse.Panel 
            header={
              <div className="flex items-center gap-2">
                <EyeInvisibleOutlined />
                <span>Thiết lập bảo mật</span>
              </div>
            }
            key="security"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Tin nhắn tự xóa</p>
                  <p className="text-sm text-gray-500">Không bao giờ</p>
                </div>
                <Button type="text" size="small">Thay đổi</Button>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Ẩn trò chuyện</p>
                  <p className="text-sm text-gray-500">Yêu cầu mật khẩu để xem</p>
                </div>
                <Switch checked={isHidden} onChange={handleToggleHidden} />
              </div>
            </div>
          </Collapse.Panel>
        </Collapse>

        {/* Report and Delete Section */}
        <div className="p-4 space-y-4">
          <Button
            icon={<WarningOutlined />}
            danger
            type="text"
            className="w-full text-left h-auto py-2"
          >
            Báo xấu
          </Button>
          <Button
            icon={<DeleteOutlined />}
            danger
            type="text"
            className="w-full text-left h-auto py-2"
            onClick={handleDeleteChat}
          >
            Xóa lịch sử trò chuyện
          </Button>
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