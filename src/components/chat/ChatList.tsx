import React, { useEffect } from "react";
import { List, Avatar } from "antd";
import Header from "../header/Header";
import { useConversations } from "../../features/chat/hooks/useConversations";
import ErrorBoundary from '../common/ErrorBoundary';
import { useAuth } from "../../features/auth/hooks/useAuth";
import { formatMessageTime } from "../../utils/dateUtils";

const ChatList: React.FC = () => {
  const conversations = useConversations();
  const { user } = useAuth();

  return (
    <div className="chat-list w-80 bg-white border-r">
      <Header />
      <List
        className="overflow-y-auto h-[calc(100vh-64px)]"
        dataSource={conversations}
        renderItem={(chat) => (
          <List.Item
            className="grid grid-cols-[60px,auto,5px,22px] gap-0 hover:bg-gray-50 cursor-pointer items-center px-2 py-3"
          >
            {/* Avatar section */}
            <div className="flex items-center justify-center">
              <div className="relative">
                <div className="flex items-center justify-center">
                  <Avatar 
                    src={chat.type === 'group' ? '/images/group-avatar.png' : '/images/default-avatar.png'}
                    size={48}
                    draggable={false}
                    className="cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Content section */}
            <div className="flex flex-col min-w-0">
              <div className="truncate font-semibold text-gray-900">
                {chat.type === 'group' ? chat.groupName : chat.receiverId || 'Private Chat'}
              </div>
              <div className="flex items-center text-sm text-gray-500 truncate">
                {chat.lastMessage?.senderId && (
                  <span className="mr-1 truncate">{chat.lastMessage.senderId}:</span>
                )}
                <span className="truncate">{chat.lastMessage?.content || 'Chưa có tin nhắn'}</span>
              </div>
            </div>

            {/* Time section */}
            <div className="text-xs text-gray-500">
              {chat.lastMessage && formatMessageTime(chat.lastMessage.createdAt)}
            </div>

            {/* Actions section */}
            <div className="relative">
              <button 
                type="button" 
                title="Thêm" 
                className="p-1 hover:bg-gray-100 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <i className="fa fa-ellipsis-h text-gray-400"></i>
              </button>
            </div>
          </List.Item>
        )}
        locale={{
          emptyText: (
            <div className="p-4 text-center text-gray-500">
              Không có hội thoại nào
            </div>
          )
        }}
      />
    </div>
  );
};

const ChatListWithErrorBoundary: React.FC = () => {
  return (
    <ErrorBoundary>
      <ChatList />
    </ErrorBoundary>
  );
};

export default ChatListWithErrorBoundary;