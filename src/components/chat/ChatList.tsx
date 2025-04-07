import React, { useState, useRef, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEllipsisH, faChevronRight } from "@fortawesome/free-solid-svg-icons";
import { List } from "antd";
import Header from "../header/Header";
import { Avatar } from "../common/Avatar";
import { useConversations } from "../../features/chat/hooks/useConversations";
import ErrorBoundary from "../common/ErrorBoundary";
import { formatMessageTime } from "../../utils/dateUtils";
import ChatNav from "./ChatNav";
import GroupAvatar from "./GroupAvatar";

import { Conversation } from "../../features/chat/types/conversationTypes";

interface ChatListProps {
  onSelectConversation: (conversation: Conversation) => void;
}

const ChatList: React.FC<ChatListProps> = ({ onSelectConversation }) => {
  const { conversations, userCache, displayNames, userAvatars } = useConversations();
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        buttonRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setActiveMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="chat-list w-80 bg-white border-r">
      <Header />
      <ChatNav />
      <List
        className="overflow-y-auto h-[calc(100vh-64px)]"
        dataSource={conversations}
        renderItem={(chat) => (
          <List.Item
            className="flex items-center gap-3 hover:bg-gray-50 cursor-pointer px-3 py-2"
            onClick={() => onSelectConversation(chat)}
          >
            {/* Avatar section */}
            <div className="relative shrink-0 pl-2">
              {chat.isGroup && chat.groupMembers.length > 0 ? (
                <GroupAvatar
                  members={chat.groupMembers}
                  userAvatars={userAvatars}
                  size={40}
                  className="cursor-pointer"
                  groupAvatarUrl={chat.groupAvatarUrl || undefined}
                />
              ) : (
                <Avatar
                  name={userCache[chat.receiverId || ""]?.fullname || "User"}
                  avatarUrl={userCache[chat.receiverId || ""]?.urlavatar}
                  size={40}
                  className="cursor-pointer"
                />
              )}
            </div>

            {/* Content section */}
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center relative group">
                <span className="truncate font-semibold text-gray-900">
                  {displayNames[chat.conversationId] ||
                    chat.receiverId ||
                    "Private Chat"}
                </span>
                <div className="flex items-center">
                  <span className="text-xs text-gray-500 group-hover:opacity-0 transition-opacity duration-200">
                    {chat.lastMessage && formatMessageTime(chat.lastMessage.createdAt)}
                  </span>
                  <div className="absolute right-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <button
                      ref={buttonRef}
                      className="p-1 rounded hover:bg-gray-100"
                      title="Thêm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenu(activeMenu === chat.conversationId ? null : chat.conversationId);
                      }}
                    >
                      <FontAwesomeIcon icon={faEllipsisH} className="fa fa-ellipsis-h text-gray-600" />
                    </button>
                    <div
                      ref={menuRef}
                      className={`absolute z-20 w-50 bg-white shadow-lg rounded-md border border-gray-200 right-0 mt-1 ${activeMenu === chat.conversationId ? 'block' : 'hidden'}`}
                    >
                      <div className="py-1">
                        <div className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">
                          Ghim hội thoại
                        </div>
                        <div className="border-t border-gray-200"></div>
                        <div className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer relative group/sub flex items-center justify-between">
                          <span>Phân loại</span>
                          <FontAwesomeIcon icon={faChevronRight} className="text-gray-400 ml-2" />
                          <div className="absolute hidden group-hover/sub:block left-full top-0 w-64 bg-white shadow-lg rounded-md border border-gray-200">
                            <div className="py-1">
                              <div className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">Khách hàng</div>
                              <div className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">Gia đình</div>
                              <div className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">Công việc</div>
                              <div className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">Bạn bè</div>
                              <div className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">Trả lời sau</div>
                              <div className="border-t border-gray-200"></div>
                              <div className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">Quản lý thẻ phân loại</div>
                            </div>
                          </div>
                        </div>
                        <div className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">
                          Đánh dấu chưa đọc
                        </div>
                        <div className="border-t border-gray-200"></div>
                        <div className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer relative group/sub flex items-center justify-between">
                          <span>Tắt thông báo</span>
                          <FontAwesomeIcon icon={faChevronRight} className="text-gray-400 ml-2" />
                          <div className="absolute hidden group-hover/sub:block left-full top-0 w-64 bg-white shadow-lg rounded-md border border-gray-200">
                            <div className="py-1">
                              <div className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">Trong 1 giờ</div>
                              <div className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">Trong 4 giờ</div>
                              <div className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">Cho đến 8:00 AM</div>
                              <div className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">Cho đến khi được mở lại</div>
                            </div>
                          </div>
                        </div>
                        <div className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">
                          Ẩn trò chuyện
                        </div>
                        <div className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer relative group/sub flex items-center justify-between">
                          <span>Tin nhắn tự xóa</span>
                          <FontAwesomeIcon icon={faChevronRight} className="text-gray-400 ml-2" />
                          <div className="absolute hidden group-hover/sub:block left-full top-0 w-64 bg-white shadow-lg rounded-md border border-gray-200">
                            <div className="py-1">
                              <div className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">1 ngày</div>
                              <div className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">7 ngày</div>
                              <div className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">14 ngày</div>
                              <div className="border-t border-gray-200"></div>
                              <div className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">Không bao giờ</div>
                            </div>
                          </div>
                        </div>
                        <div className="border-t border-gray-200"></div>
                        <div className="px-4 py-2 text-sm text-red-500 hover:bg-gray-100 cursor-pointer">
                          Xóa hội thoại
                        </div>
                        <div className="border-t border-gray-200"></div>
                        <div className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">
                          Báo xấu
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center text-sm text-gray-500 truncate">
                {chat.lastMessage?.senderId && (
                  <span className="mr-1 truncate">
                    {userCache[chat.lastMessage.senderId]?.fullname ||
                      chat.lastMessage.senderId}
                    :
                  </span>
                )}
                <span className="truncate">
                  {chat.lastMessage?.content || "Chưa có tin nhắn"}
                </span>
              </div>
            </div>

            {/* Actions section */}
            <div className="shrink-0">
              <i className="fa fa-ellipsis-h text-gray-400 cursor-pointer hover:text-gray-600"></i>
            </div>
          </List.Item>
        )}
        locale={{
          emptyText: (
            <div className="p-4 text-center text-gray-500">
              Không có hội thoại nào
            </div>
          ),
        }}
      />
    </div>
  );
};

const ChatListWithErrorBoundary: React.FC<ChatListProps> = (props) => {
  return (
    <ErrorBoundary>
      <ChatList {...props} />
    </ErrorBoundary>
  );
};

export default ChatListWithErrorBoundary;