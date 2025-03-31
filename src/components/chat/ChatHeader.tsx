import React from 'react';
import { Avatar } from 'antd';
import { SearchOutlined, VideoCameraOutlined, UserAddOutlined, RightOutlined } from '@ant-design/icons';
import { ChatHeaderProps } from '../../features/chat/types/chatTypes';

const ChatHeader: React.FC<ChatHeaderProps> = ({
  isGroup = false,
  groupName = '',
  groupAvatarUrl = null,
  groupMembers = []
}) => {
  return (
    <header className="flex items-center justify-between px-4 py-2 bg-white border-b">
      <div className="flex items-center flex-1 group">
        {/* Avatar Group */}
        <div className="relative cursor-pointer mr-3">
          <div className="flex -space-x-2 overflow-hidden">
            <Avatar
              src={groupAvatarUrl || '/images/group-avatar.png'}
              className="border-2 border-white"
              size={40}
            />
          </div>
        </div>

        {/* Title and Member Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center">
            <h2 className="text-lg font-semibold truncate">{groupName}</h2>
            <button
              className="ml-2 p-1 rounded-full hover:bg-gray-100"
              title="Chỉnh sửa"
            >
              <i className="fas fa-edit text-gray-500 text-sm" />
            </button>
          </div>
          <div className="flex items-center text-sm text-gray-500">
            <span>Cộng đồng</span>
            <span className="mx-1">•</span>
            <div className="flex items-center cursor-pointer hover:text-blue-500">
              <i className="far fa-user mr-1" />
              <span>{groupMembers.length} thành viên</span>
            </div>
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