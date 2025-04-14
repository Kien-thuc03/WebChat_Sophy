import React, { useState } from 'react';
import { Avatar } from '../common/Avatar';
import { Button, Tooltip } from 'antd';
import { 
  BellOutlined,
  UserOutlined,
  FileImageOutlined,
  FileOutlined,
  LinkOutlined,
  SettingOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import { Conversation } from '../../features/chat/types/conversationTypes';

interface ChatInfoProps {
  conversation: Conversation;
}

const ChatInfo: React.FC<ChatInfoProps> = ({ conversation }) => {
  return (
    <div className="w-[240px] h-full bg-white border-l border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <Avatar 
            name={conversation.groupName || 'Group'}
            avatarUrl={conversation.groupAvatarUrl || undefined}
            size={48}
            className="rounded-full"
          />
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-gray-900 truncate">
              {conversation.groupName || 'Group'}
            </h3>
            <p className="text-sm text-gray-500">
              {conversation.groupMembers?.length || 0} thành viên
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-y-auto h-[calc(100%-80px)]">
        <div className="p-4 border-b border-gray-200">
          <Button 
            type="text" 
            icon={<BellOutlined />}
            className="w-full text-left h-auto py-2 flex items-center gap-3"
          >
            <span>Tắt thông báo</span>
          </Button>
        </div>

        <div className="border-b border-gray-200">
          <div className="p-4 text-sm font-medium text-gray-900">
            Thành viên nhóm
          </div>
          <div className="px-4 pb-4">
            <Button 
              type="text" 
              icon={<UserOutlined />}
              className="w-full text-left h-auto py-2 flex items-center gap-3"
            >
              <span>Xem thành viên ({conversation.groupMembers?.length || 0})</span>
            </Button>
          </div>
        </div>

        <div className="border-b border-gray-200">
          <div className="p-4 text-sm font-medium text-gray-900">
            Chia sẻ trong nhóm
          </div>
          <div className="px-4 pb-4">
            <Button 
              type="text" 
              icon={<FileImageOutlined />}
              className="w-full text-left h-auto py-2 flex items-center gap-3"
            >
              <span>Ảnh/Video</span>
            </Button>
            <Button 
              type="text" 
              icon={<FileOutlined />}
              className="w-full text-left h-auto py-2 flex items-center gap-3"
            >
              <span>File</span>
            </Button>
            <Button 
              type="text" 
              icon={<LinkOutlined />}
              className="w-full text-left h-auto py-2 flex items-center gap-3"
            >
              <span>Link</span>
            </Button>
          </div>
        </div>

        <div className="border-b border-gray-200">
          <div className="p-4 text-sm font-medium text-gray-900">
            Cài đặt khác
          </div>
          <div className="px-4 pb-4">
            <Button 
              type="text" 
              icon={<ClockCircleOutlined />}
              className="w-full text-left h-auto py-2 flex items-center gap-3"
            >
              <span>Tin nhắn tự xóa</span>
            </Button>
            <Button 
              type="text" 
              icon={<SettingOutlined />}
              className="w-full text-left h-auto py-2 flex items-center gap-3"
            >
              <span>Cài đặt nhóm</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInfo; 