import React from 'react';
import { SearchOutlined, VideoCameraOutlined, UserAddOutlined, RightOutlined } from '@ant-design/icons';
import { ChatHeaderProps } from '../../features/chat/types/chatTypes';
import { Conversation } from '../../features/chat/types/conversationTypes';
import GroupAvatar from './GroupAvatar';
import { useConversations } from '../../features/chat/hooks/useConversations';
import { Avatar } from '../common/Avatar';
import { useLanguage } from "../../features/auth/context/LanguageContext";

interface ExtendedChatHeaderProps extends ChatHeaderProps {
  conversation: Conversation;
}

const ChatHeader: React.FC<ExtendedChatHeaderProps> = ({ conversation }) => {
  const { userCache, userAvatars } = useConversations();
  const { t } = useLanguage(); // Sử dụng context
  const isGroup = conversation.isGroup;
  const groupName = conversation.groupName;
  const groupAvatarUrl = conversation.groupAvatarUrl;
  const groupMembers = conversation.groupMembers;
  const receiverInfo = conversation.receiverId ? userCache[conversation.receiverId] : null;

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
              name={receiverInfo?.fullname || 'User'}
              avatarUrl={userCache[conversation.receiverId || ""]?.urlavatar}
              size={40}
              className="rounded-lg"
            />
          )}
        </div>

        {/* Title and Member Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center">
            <h2 className="text-lg font-semibold truncate">
              {isGroup ? groupName : (receiverInfo?.fullname || t.loading || 'Đang tải...')}
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
              <span className="text-gray-500">{receiverInfo?.phone || conversation.receiverId}</span>
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
        <button
          className="p-2 rounded-lg hover:bg-gray-100"
          title={t.video_call || 'Cuộc gọi video'}
        >
          <VideoCameraOutlined className="text-xl text-gray-600" />
        </button>
        <button
          className="p-2 rounded-lg hover:bg-gray-100"
          title={t.search_messages || 'Tìm kiếm tin nhắn'}
        >
          <SearchOutlined className="text-xl text-gray-600" />
        </button>
        <button
          className="p-2 rounded-lg hover:bg-gray-100"
          title={t.conversation_info || 'Thông tin hội thoại'}
        >
          <RightOutlined className="text-xl text-gray-600" />
        </button>
      </div>
    </header>
  );
};

export default ChatHeader;