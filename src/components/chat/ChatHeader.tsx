import React, { useEffect, useState } from 'react';
import { SearchOutlined, VideoCameraOutlined, UserAddOutlined, RightOutlined } from '@ant-design/icons';
import { ChatHeaderProps } from '../../features/chat/types/chatTypes';
import { getUserById } from '../../api/API';
import { User } from '../../features/auth/types/authTypes';
import { Conversation } from '../../features/chat/types/conversationTypes';
import GroupAvatar from './GroupAvatar';

interface ExtendedChatHeaderProps extends ChatHeaderProps {
  conversation: Conversation;
}

const ChatHeader: React.FC<ExtendedChatHeaderProps> = ({ conversation }) => {
  const [receiverInfo, setReceiverInfo] = useState<User | null>(null);
  const [userAvatars, setUserAvatars] = useState<Record<string, string>>({});
  const isGroup = conversation.isGroup;
  const groupName = conversation.groupName;
  const groupAvatarUrl = conversation.groupAvatarUrl;
  const groupMembers = conversation.groupMembers;

  useEffect(() => {
    const fetchReceiverInfo = async () => {
      if (!isGroup && conversation.receiverId) {
        try {
          const userData = await getUserById(conversation.receiverId);
          setReceiverInfo(userData);
          if (userData?.urlavatar) {
            setUserAvatars(prev => ({
              ...prev,
              [conversation.receiverId as string]: userData.urlavatar
            }));
          }
        } catch (error) {
          console.error('Lỗi khi lấy thông tin người dùng:', error);
        }
      } else if (isGroup && groupMembers.length > 0) {
        // Fetch avatars for group members
        const avatars: Record<string, string> = {};
        for (const memberId of groupMembers.slice(0, 4)) { // Limit to first 4 members
          try {
            const userData = await getUserById(memberId);
            if (userData?.urlavatar) {
              avatars[memberId] = userData.urlavatar;
            }
          } catch (error) {
            console.error(`Lỗi khi lấy thông tin thành viên ${memberId}:`, error);
          }
        }
        setUserAvatars(avatars);
      }
    };

    fetchReceiverInfo();
  }, [isGroup, conversation.receiverId, groupMembers]);
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
            <div className="w-10 h-10 rounded-lg overflow-hidden">
              <img
                src={userAvatars[conversation.receiverId as string] || '/images/default-avatar.png'}
                alt="Avatar"
                className="w-full h-full object-cover"
              />
            </div>
          )}
        </div>

        {/* Title and Member Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center">
            <h2 className="text-lg font-semibold truncate">
            {isGroup ? groupName : (receiverInfo?.fullname || 'Đang tải...')}
          </h2>
            <button
              className="ml-2 p-1 rounded-full hover:bg-gray-100"
              title="Chỉnh sửa"
            >
              <i className="fas fa-edit text-gray-500 text-sm" />
            </button>
          </div>
          <div className="flex items-center text-sm text-gray-500">
            {isGroup ? (
              <>
                <span>Cộng đồng</span>
                <span className="mx-1">•</span>
                <div className="flex items-center cursor-pointer hover:text-blue-500">
                  <i className="far fa-user mr-1" />
                  <span>{groupMembers.length} thành viên</span>
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
          title="Thêm bạn vào cộng đồng"
        >
          <UserAddOutlined className="text-xl text-gray-600" />
        </button>
        <button
          className="p-2 rounded-lg hover:bg-gray-100"
          title="Cuộc gọi video"
        >
          <VideoCameraOutlined className="text-xl text-gray-600" />
        </button>
        <button
          className="p-2 rounded-lg hover:bg-gray-100"
          title="Tìm kiếm tin nhắn"
        >
          <SearchOutlined className="text-xl text-gray-600" />
        </button>
        <button
          className="p-2 rounded-lg hover:bg-gray-100"
          title="Thông tin hội thoại"
        >
          <RightOutlined className="text-xl text-gray-600" />
        </button>
      </div>
    </header>
  );
};

export default ChatHeader;