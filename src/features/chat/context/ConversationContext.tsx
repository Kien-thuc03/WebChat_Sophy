import React, { createContext, useState, useContext, useEffect, useCallback, ReactNode } from 'react';
import { fetchConversations, getUserById } from '../../../api/API';
import { Conversation, Message } from '../types/conversationTypes';
import { User } from '../../auth/types/authTypes';

interface ConversationContextType {
  conversations: Conversation[];
  userCache: Record<string, User>;
  userAvatars: Record<string, string>;
  displayNames: Record<string, string>;
  updateConversationWithNewMessage: (conversationId: string, message: Message) => void;
  refreshConversations: () => Promise<void>;
}

const ConversationContext = createContext<ConversationContextType | undefined>(undefined);

export const ConversationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [userCache, setUserCache] = useState<Record<string, User>>({});
  const [displayNames, setDisplayNames] = useState<Record<string, string>>({});
  const [userAvatars, setUserAvatars] = useState<Record<string, string>>({});

  // Định dạng tên nhóm chat dựa trên danh sách thành viên
  const formatGroupName = (members: string[] = []) => {
    if (!members.length) return "Nhóm không có thành viên";
    const memberNames = members.slice(0, 3).map(id => userCache[id]?.fullname || id).join(", ");
    return members.length > 3 ? `${memberNames}...` : memberNames;
  };

  // Lấy tên hiển thị cho một cuộc trò chuyện
  const getDisplayName = async (chat: Conversation) => {
    if (chat.isGroup) {
      return chat.groupName || formatGroupName(chat.groupMembers);
    }
    
    const currentUserId = localStorage.getItem('userId');
    // Xác định ID của người dùng khác trong cuộc trò chuyện
    const otherUserId = chat.creatorId === currentUserId ? chat.receiverId : chat.creatorId;
    
    if (otherUserId) {
      try {
        if (!userCache[otherUserId]) {
          const userData = await getUserById(otherUserId);
          setUserCache((prev) => ({
            ...prev,
            [otherUserId]: userData,
          }));
          return userData?.fullname || otherUserId;
        }
        return userCache[otherUserId]?.fullname || otherUserId;
      } catch (error) {
        console.error("Lỗi khi lấy thông tin người dùng:", error);
        return otherUserId;
      }
    }
    return "Cuộc trò chuyện riêng tư";
  };

  // Tải danh sách hội thoại
  const loadConversations = async () => {
    try {
      const data = await fetchConversations();
      // Sắp xếp theo thời gian tin nhắn cuối cùng, mới nhất lên đầu
      const sortedConversations = data.sort((a, b) => {
        const timeA = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
        const timeB = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
        return timeB - timeA;
      });
      setConversations(sortedConversations);
    } catch (error) {
      console.error("Lỗi khi tải danh sách hội thoại:", error);
    }
  };

  // Cập nhật conversation khi có tin nhắn mới
  const updateConversationWithNewMessage = useCallback((conversationId: string, message: Message) => {
    setConversations(prevConversations => {
      // Tìm conversation cần cập nhật
      const conversationIndex = prevConversations.findIndex(
        conv => conv.conversationId === conversationId
      );
      
      if (conversationIndex === -1) return prevConversations;
      
      // Tạo một bản sao của danh sách conversations
      const updatedConversations = [...prevConversations];
      
      // Cập nhật tin nhắn cuối cùng cho conversation
      const updatedConversation: Conversation = {
        ...updatedConversations[conversationIndex],
        lastMessage: {
          messageId: message.messageId,
          content: message.content,
          type: message.type,
          senderId: message.senderId,
          createdAt: message.createdAt
        },
        newestMessageId: message.messageId,
        lastChange: message.createdAt
      };
      
      // Xóa conversation khỏi vị trí cũ
      updatedConversations.splice(conversationIndex, 1);
      
      // Thêm conversation đã cập nhật vào đầu danh sách
      return [updatedConversation, ...updatedConversations];
    });
  }, []);

  // Làm mới danh sách cuộc trò chuyện
  const refreshConversations = useCallback(async () => {
    await loadConversations();
  }, []);

  // Tải thông tin người dùng
  useEffect(() => {
    const fetchUserInfo = async () => {
      for (const chat of conversations) {
        // Lấy thông tin người dùng trong nhóm
        if (chat.isGroup && chat.groupMembers) {
          for (const memberId of chat.groupMembers) {
            if (!userCache[memberId]) {
              try {
                const userData = await getUserById(memberId);
                setUserCache((prev) => ({
                  ...prev,
                  [memberId]: userData,
                }));

                if (userData?.urlavatar) {
                  setUserAvatars((prev) => ({
                    ...prev,
                    [memberId]: userData.urlavatar,
                  }));
                }
              } catch (error) {
                console.warn(`Không thể tải thông tin thành viên ${memberId}`);
              }
            }
          }
        }
        
        // Cập nhật tên hiển thị
        const displayName = await getDisplayName(chat);
        setDisplayNames((prev) => ({
          ...prev,
          [chat.conversationId]: displayName,
        }));

        // Lấy thông tin người gửi tin nhắn cuối cùng
        if (chat.lastMessage?.senderId && !userCache[chat.lastMessage.senderId]) {
          try {
            const userData = await getUserById(chat.lastMessage.senderId);
            setUserCache((prev) => ({
              ...prev,
              [chat.lastMessage?.senderId as string]: userData,
            }));
          } catch (error) {
            console.warn(`Không thể tải thông tin người gửi ${chat.lastMessage.senderId}`);
          }
        }
      }
    };

    fetchUserInfo();
  }, [conversations]);

  // Tải dữ liệu khi khởi tạo
  useEffect(() => {
    loadConversations();
  }, []);

  const value = {
    conversations,
    userCache,
    userAvatars,
    displayNames,
    updateConversationWithNewMessage,
    refreshConversations
  };

  return (
    <ConversationContext.Provider value={value}>
      {children}
    </ConversationContext.Provider>
  );
};

export const useConversationContext = () => {
  const context = useContext(ConversationContext);
  if (context === undefined) {
    throw new Error('useConversationContext must be used within a ConversationProvider');
  }
  return context;
}; 