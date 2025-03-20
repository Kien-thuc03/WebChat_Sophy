import React from "react";
import Header from "../header/Header";
import { useConversations } from "../../features/chat/hooks/useConversations";
import ErrorBoundary from '../common/ErrorBoundary';
import { useAuth } from "../../features/auth/hooks/useAuth";

const ChatList: React.FC = () => {
  const conversations = useConversations();
  const { user } = useAuth();

  const getConversationName = (chat: any) => {
    if (chat.type === 'group' && chat.groupName) {
      return chat.groupName;
    }
    // For private chats, show the other participant's name
    return "Private Chat"; // You'll need to fetch user details
  };

  return (
    <div className="chat-list w-80 bg-gray-50 ">
      <Header />
      <div className="chat-list w-80 bg-gray-50 p-4">
        {/* Navigation buttons */}
        <div className="flex justify-between mb-4">
          <button type="button" className="text-blue-500 font-semibold">
            Tất cả
          </button>
          <button type="button" className="text-gray-500">
            Chưa đọc
          </button>
          <button type="button" className="text-gray-500">
            Phân loại
          </button>
          <button type="button" className="text-gray-500">
            •••
          </button>
        </div>

        {/* Conversations list */}
        <div className="space-y-2">
          {conversations.length > 0 ? (
            conversations.map((chat) => (
              <div key={chat._id} className="p-2 bg-white rounded-lg shadow-sm">
                <div className="font-semibold text-blue-600">
                  {getConversationName(chat)}
                </div>
                <p className="text-sm text-gray-500">
                  {chat.lastMessage
                    ? chat.lastMessage.content
                    : "Không có tin nhắn"}
                </p>
                <div className="flex items-center mt-1">
                  {/* Temporarily show placeholder for participants */}
                  <div className="w-6 h-6 rounded-full bg-gray-300"></div>
                  {chat.type === 'group' && chat.groupMembers && chat.groupMembers.length > 1 && (
                    <span className="text-xs text-gray-500 ml-2">
                      +{chat.groupMembers.length - 1}
                    </span>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-500">Không có hội thoại nào.</p>
          )}
        </div>
      </div>
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