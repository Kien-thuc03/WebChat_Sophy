import React, { useState, useEffect } from 'react';
import { SearchOutlined, VideoCameraOutlined, UserAddOutlined, RightOutlined, InfoCircleOutlined, PhoneOutlined } from '@ant-design/icons';
import { ChatHeaderProps } from '../../features/chat/types/chatTypes';
import { Conversation } from '../../features/chat/types/conversationTypes';
import GroupAvatar from './GroupAvatar';
import { useConversations } from '../../features/chat/hooks/useConversations';
import { Avatar } from '../common/Avatar';
import { useLanguage } from "../../features/auth/context/LanguageContext";
import { getUserById } from "../../api/API";
import { User } from "../../features/auth/types/authTypes";
import { Button, Tooltip } from 'antd';

interface ExtendedChatHeaderProps extends ChatHeaderProps {
  conversation: Conversation;
  onInfoClick?: () => void;
  showInfo?: boolean;
}

const ChatHeader: React.FC<ExtendedChatHeaderProps> = ({ conversation, onInfoClick, showInfo }) => {
  const { userCache, userAvatars } = useConversations();
  const { t } = useLanguage(); // Sử dụng context
  const isGroup = conversation.isGroup;
  const groupName = conversation.groupName;
  const groupAvatarUrl = conversation.groupAvatarUrl;
  const groupMembers = conversation.groupMembers;
  const [localUserCache, setLocalUserCache] = useState<Record<string, User>>({});

  /**
   * Gets the correct user ID to display for a conversation
   * @param conversation The conversation object
   * @returns The ID of the other user in the conversation
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

  return (
    <header className="flex items-center justify-between px-4 py-2 bg-white border-b">
      <div className="flex items-center flex-1 group">
        {/* Avatar Group */}
        <div className="relative cursor-pointer mr-3">
          {isGroup ? (
            <GroupAvatar
              members={groupMembers}
              userAvatars={userAvatars}
              size={40}
              className="border-2 border-white"
              groupAvatarUrl={groupAvatarUrl || undefined}
            />
          ) : (
            <Avatar
              name={otherUserInfo?.fullname || 'User'}
              avatarUrl={otherUserInfo?.urlavatar}
              size={40}
              className="rounded-lg"
            />
          )}
        </div>

        {/* Title and Member Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center">
            <h2 className="text-lg font-semibold truncate">
              {isGroup ? groupName : (otherUserInfo?.fullname || t.loading || 'Đang tải...')}
            </h2>
            <button
              className="ml-2 p-1 rounded-full hover:bg-gray-100"
              title={t.edit || 'Chỉnh sửa'}
            >
              <i className="fas fa-edit text-gray-500 text-sm" />
            </button>
          </div>
          <div className="flex items-center text-sm text-gray-500">
            {isGroup ? (
              <>
                <span>{t.community || 'Cộng đồng'}</span>
                <span className="mx-1">•</span>
                <div className="flex items-center cursor-pointer hover:text-blue-500">
                  <i className="far fa-user mr-1" />
                  <span>{groupMembers.length} {t.members || 'thành viên'}</span>
                </div>
              </>
            ) : (
              <span className="text-gray-500">{otherUserInfo?.phone || otherUserId}</span>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center space-x-2">
        <button
          className="p-2 rounded-lg hover:bg-gray-100"
          title={t.add_to_community || 'Thêm bạn vào cộng đồng'}
        >
          <UserAddOutlined className="text-xl text-gray-600" />
        </button>
        <Tooltip title={t.calls || 'Gọi thoại'}>
          <Button
            type="text"
            icon={<PhoneOutlined />}
            className="flex items-center justify-center w-10 h-10"
          />
        </Tooltip>
        <Tooltip title={t.video_call || 'Gọi video'}>
          <Button
            type="text"
            icon={<VideoCameraOutlined />}
            className="flex items-center justify-center w-10 h-10"
          />
        </Tooltip>
        <Tooltip title={t.conversation_info || 'Thông tin hội thoại'}>
          <Button
            type="text"
            icon={<InfoCircleOutlined />}
            className={`flex items-center justify-center w-10 h-10 ${showInfo ? 'text-blue-500' : ''}`}
            onClick={onInfoClick}
          />
        </Tooltip>
      </div>
    </header>
  );
};

export default ChatHeader;