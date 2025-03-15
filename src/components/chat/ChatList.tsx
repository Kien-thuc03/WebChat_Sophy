import React from "react";
import Header from "../header/Header";
import { useConversations } from "../../features/chat/hooks/useConversations";

const ChatList: React.FC = () => {
  const conversations = useConversations();

  return (
    <div className="chat-list w-80 bg-gray-50 ">
      <Header />
      <div className="chat-list w-80 bg-gray-50 p-4">
        {/* Thanh điều hướng danh sách tin nhắn */}
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

        {/* Danh sách hội thoại từ API */}
        <div className="space-y-2">
          {conversations.length > 0 ? (
            conversations.map((chat) => (
              <div key={chat._id} className="p-2 bg-white rounded-lg shadow-sm">
                <a
                  href={chat.conversation_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-blue-600"
                >
                  {chat.conversation_name}
                </a>
                <p className="text-sm text-gray-500">
                  {chat.latest_message
                    ? chat.latest_message.content
                    : "Không có tin nhắn"}
                </p>
                <div className="flex items-center mt-1">
                  {chat.participants.slice(0, 3).map((p) => (
                    <img
                      key={p.user_id}
                      src={p.avatar}
                      alt={p.name}
                      className="w-6 h-6 rounded-full border-2 border-white -ml-2"
                    />
                  ))}
                  {chat.participants.length > 3 && (
                    <span className="text-xs text-gray-500 ml-2">
                      +{chat.participants.length - 3}
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

export default ChatList;