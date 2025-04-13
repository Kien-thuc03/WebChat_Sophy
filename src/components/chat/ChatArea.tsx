import React, { useState, useEffect, useRef } from 'react';
import { Input, Button, message, Alert, Empty, Spin } from 'antd';
import { SendOutlined, PaperClipOutlined, SmileOutlined, ReloadOutlined, DownOutlined } from '@ant-design/icons';
import { Conversation, Message } from '../../features/chat/types/conversationTypes';
import { getMessages, sendMessage, fetchConversations, getConversationDetail } from '../../api/API';
import { useLanguage } from '../../features/auth/context/LanguageContext';
import { formatMessageTime } from '../../utils/dateUtils';
import { Avatar } from '../common/Avatar';
import { useConversations } from '../../features/chat/hooks/useConversations';
import { BsEmojiSmile } from 'react-icons/bs';
import { PiPaperclipBold } from 'react-icons/pi';

// Chuyển đổi Message từ API sang định dạng tin nhắn cần hiển thị
interface DisplayMessage {
  id: string;
  content: string;
  timestamp: string;
  sender: {
    id: string;
    name: string;
    avatar?: string;
  };
  type: 'text' | 'image' | 'file';
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  isRead?: boolean;
  isError?: boolean;
}

interface ChatAreaProps {
  conversation: Conversation;
}

const ChatArea: React.FC<ChatAreaProps> = ({ conversation }) => {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { t } = useLanguage();
  const { userCache } = useConversations();
  const currentUserId = localStorage.getItem('userId') || '';

  // Kiểm tra xem conversation có hợp lệ không
  const isValidConversation = conversation && 
                             conversation.conversationId && 
                             typeof conversation.conversationId === 'string' &&
                             conversation.conversationId.startsWith('conv');

  useEffect(() => {
    // Reset state khi chuyển cuộc trò chuyện
    setMessages([]);
    setError(null);
    setNotFound(false);
    setHasMore(false);
    setNextCursor(null);
    
    // Chỉ tải tin nhắn khi conversation hợp lệ
    if (isValidConversation) {
      fetchMessages();
    } else if (conversation && conversation.conversationId) {
      console.error(`Conversation ID không hợp lệ: ${conversation.conversationId}`);
      setError(`ID cuộc trò chuyện không hợp lệ. Vui lòng thử lại hoặc chọn cuộc trò chuyện khác.`);
    }
  }, [conversation?.conversationId]);

  const fetchMessages = async (lastMessageTime?: string) => {
    if (!isValidConversation) {
      setError('Không thể tải tin nhắn. ID cuộc trò chuyện không hợp lệ.');
      return;
    }
    
    try {
      if (lastMessageTime) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError(null);
      
      if (!lastMessageTime) {
        setNotFound(false);
      }
      
      console.log(`Đang tải tin nhắn cho cuộc trò chuyện: ${conversation.conversationId}`);
      
      // Không cần kiểm tra conversation trước vì getMessages đã làm điều đó
      
      // Lấy tin nhắn với phân trang nếu có
      const result = await getMessages(conversation.conversationId, lastMessageTime);
      console.log('Kết quả API getMessages:', result);
      
      const messagesData = result.messages;
      
      // Cập nhật trạng thái phân trang
      setHasMore(result.hasMore || false);
      setNextCursor(result.nextCursor);
      
      // Kiểm tra dữ liệu trả về
      if (!Array.isArray(messagesData)) {
        console.error('Dữ liệu tin nhắn không hợp lệ:', messagesData);
        setError('Không thể tải tin nhắn. Dữ liệu không hợp lệ.');
        return;
      }
      
      console.log(`Nhận được ${messagesData.length} tin nhắn từ API`);
      
      if (messagesData.length === 0 && !lastMessageTime) {
        console.log('Không có tin nhắn nào trong cuộc trò chuyện');
        setMessages([]);
        return;
      }
      
      // Chuyển đổi Message từ API sang định dạng tin nhắn hiển thị
      const displayMessages: DisplayMessage[] = messagesData.map(msg => {
        // Kiểm tra tin nhắn hợp lệ và hỗ trợ cả messageId và messageDetailId
        const messageId = msg.messageId || msg.messageDetailId;
        if (!msg || !messageId) {
          console.warn('Tin nhắn không hợp lệ:', msg);
          return null;
        }
        
        const sender = userCache[msg.senderId] || { fullname: 'Người dùng', urlavatar: '' };
        
        return {
          id: messageId,
          content: msg.content || '',
          timestamp: msg.createdAt || new Date().toISOString(),
          sender: {
            id: msg.senderId || '',
            name: sender.fullname || 'Người dùng',
            avatar: sender.urlavatar || ''
          },
          type: (msg.type as 'text' | 'image' | 'file') || 'text',
          isRead: true // Giả sử tất cả tin nhắn đã đọc
        };
      }).filter(Boolean) as DisplayMessage[]; // Lọc bỏ các tin nhắn null
      
      console.log(`Đã chuyển đổi thành ${displayMessages.length} tin nhắn hiển thị`);
      
      // Cập nhật danh sách tin nhắn
      if (lastMessageTime) {
        // Thêm tin nhắn cũ vào đầu danh sách nếu đang tải thêm
        setMessages(prev => [...displayMessages, ...prev]);
      } else {
        // Thay thế hoàn toàn nếu là lần tải đầu tiên
        setMessages(displayMessages);
      }
      
      console.log(`Đã tải ${displayMessages.length} tin nhắn`);
    } catch (error: any) {
      console.error('Lỗi khi tải tin nhắn:', error);
      
      let errorMessage = 'Không thể tải tin nhắn. Vui lòng thử lại sau.';
      
      // Hiển thị lỗi chi tiết hơn nếu có
      if (error.response) {
        console.error('Chi tiết lỗi từ server:', {
          status: error.response.status,
          data: error.response.data
        });
        
        if (error.response.status === 404) {
          errorMessage = 'Không tìm thấy cuộc trò chuyện. Cuộc trò chuyện có thể đã bị xóa.';
          setNotFound(true); // Đánh dấu là không tìm thấy
        } else if (error.response.status === 401) {
          errorMessage = 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.';
        } else if (error.response.status === 403) {
          errorMessage = 'Bạn không có quyền truy cập cuộc trò chuyện này.';
        }
      } else if (error.message) {
        // Hiển thị thông báo lỗi cụ thể
        errorMessage = error.message;
        
        // Kiểm tra xem có phải lỗi không tìm thấy không
        if (error.message.includes('not found') || 
            error.message.includes('không tìm thấy') || 
            error.message.includes('không tồn tại')) {
          setNotFound(true);
        }
      }
      
      setError(errorMessage);
      message.error(errorMessage);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      
      // Chỉ cuộn xuống dưới khi tải mới, không cuộn khi tải thêm
      if (!lastMessageTime && messages.length > 0) {
        setTimeout(scrollToBottom, 100);
      }
    }
  };

  // Hàm tải thêm tin nhắn cũ hơn
  const loadMoreMessages = () => {
    if (hasMore && nextCursor) {
      fetchMessages(nextCursor);
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !isValidConversation) return;
    
    const tempContent = inputValue;
    setInputValue(''); // Reset input ngay lập tức
    
    // Tạo tin nhắn tạm thời để hiển thị ngay
    const tempMessage: DisplayMessage = {
      id: `temp-${Date.now()}`,
      content: tempContent,
      timestamp: new Date().toISOString(),
      sender: {
        id: currentUserId,
        name: 'Bạn',
        avatar: userCache[currentUserId]?.urlavatar || ''
      },
      type: 'text',
      isRead: false
    };
    
    // Hiển thị tin nhắn tạm thời
    setMessages(prev => [...prev, tempMessage]);
    scrollToBottom();
    
    try {
      // Gửi tin nhắn thực tế
      const newMessage = await sendMessage(
        conversation.conversationId,
        tempContent,
        'text'
      );
      
      if (!newMessage || !newMessage.messageId) {
        throw new Error('Không nhận được phản hồi hợp lệ từ server');
      }
      
      // Thay thế tin nhắn tạm bằng tin nhắn thật
      const sender = userCache[currentUserId] || { fullname: 'Bạn', urlavatar: '' };
      const realMessage: DisplayMessage = {
        id: newMessage.messageId,
        content: newMessage.content,
        timestamp: newMessage.createdAt,
        sender: {
          id: newMessage.senderId,
          name: sender.fullname,
          avatar: sender.urlavatar
        },
        type: 'text',
        isRead: false
      };
      
      setMessages(prev => 
        prev.map(msg => msg.id === tempMessage.id ? realMessage : msg)
      );
      
    } catch (error) {
      console.error('Lỗi khi gửi tin nhắn:', error);
      // Đánh dấu tin nhắn tạm là lỗi
      setMessages(prev => 
        prev.map(msg => 
          msg.id === tempMessage.id 
            ? {...msg, content: msg.content + ' (Không gửi được)', isError: true} 
            : msg
        )
      );
      message.error('Không thể gửi tin nhắn');
    }
  };

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Kiểm tra xem tin nhắn có phải của người dùng hiện tại không
  const isOwnMessage = (senderId: string) => senderId === currentUserId;

  // Kiểm tra xem có nên hiển thị avatar cho tin nhắn này không
  const shouldShowAvatar = (index: number, senderId: string) => {
    if (index === 0) return true;
    if (index > 0 && messages[index - 1].sender.id !== senderId) return true;
    return false;
  };

  // Hàm làm mới danh sách cuộc trò chuyện
  const handleRefreshConversations = async () => {
    try {
      setRefreshing(true);
      
      // Gọi API trực tiếp để lấy lại danh sách cuộc trò chuyện
      await fetchConversations();
      
      // Thông báo cho người dùng
      message.success('Đã làm mới danh sách cuộc trò chuyện');
      
      // Thiết lập lại trạng thái not-found
      setNotFound(false);
      
      // Thông báo cho người dùng chọn cuộc trò chuyện mới
      setError('Vui lòng chọn lại cuộc trò chuyện từ danh sách.');
    } catch (error) {
      console.error('Lỗi khi làm mới danh sách cuộc trò chuyện:', error);
      message.error('Không thể làm mới danh sách cuộc trò chuyện');
    } finally {
      setRefreshing(false);
    }
  };

  // Nếu không có conversation hợp lệ, hiển thị thông báo
  if (!isValidConversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-500">
          Vui lòng chọn một cuộc trò chuyện
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex flex-col h-full overflow-hidden bg-white rounded-lg relative">
        {/* Khu vực hiển thị tin nhắn */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
          {/* Nút tải thêm tin nhắn */}
          {hasMore && (
            <div className="text-center pb-2">
              <Button 
                onClick={loadMoreMessages} 
                loading={loadingMore}
                icon={<DownOutlined rotate={180} />}
                size="small"
              >
                Tải thêm tin nhắn
              </Button>
            </div>
          )}
          
          {loadingMore && (
            <div className="text-center py-2">
              <Spin size="small" /> <span className="text-xs text-gray-500 ml-2">Đang tải tin nhắn cũ hơn...</span>
            </div>
          )}
          
          {loading && <div className="text-center py-4">{t.loading || 'Đang tải...'}</div>}
          
          {notFound && (
            <div className="flex flex-col items-center justify-center py-8">
              <Empty
                description="Không tìm thấy cuộc trò chuyện này"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
              <div className="mt-4 text-center">
                <p className="text-gray-500 mb-4">
                  Cuộc trò chuyện có thể đã bị xóa hoặc bạn không còn là thành viên.
                </p>
                <Button 
                  type="primary" 
                  icon={<ReloadOutlined />} 
                  loading={refreshing}
                  onClick={handleRefreshConversations}
                >
                  Làm mới danh sách cuộc trò chuyện
                </Button>
              </div>
            </div>
          )}
          
          {error && !notFound && (
            <div className="text-center py-2">
              <Alert
                message="Lỗi khi tải tin nhắn"
                description={error}
                type="error"
                showIcon
              />
              <div className="mt-2">
                <Button type="primary" onClick={() => fetchMessages()}>Thử lại</Button>
              </div>
            </div>
          )}
          
          {messages.length === 0 && !loading && !error && !notFound && (
            <div className="text-center text-gray-500 py-10">
              {t.no_messages || 'Chưa có tin nhắn nào. Hãy bắt đầu cuộc trò chuyện!'}
            </div>
          )}
          
          <div className="space-y-3">
            {messages.map((message, index) => {
              if (!message) return null;
              
              const isOwn = isOwnMessage(message.sender.id);
              const showAvatar = !isOwn && shouldShowAvatar(index, message.sender.id);
              const showSender = showAvatar;
              
              return (
                <div key={message.id} className={`flex mb-2 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                  {!isOwn && showAvatar && (
                    <div className="flex-shrink-0 mr-2">
                      <Avatar 
                        name={message.sender.name}
                        avatarUrl={message.sender.avatar}
                        size={30}
                        className="rounded-full"
                      />
                    </div>
                  )}
                  
                  <div className={`flex flex-col max-w-[70%]`}>
                    {showSender && !isOwn && (
                      <div className="text-xs mb-1 ml-1 text-gray-600">
                        {message.sender.name}
                      </div>
                    )}
                    
                    <div 
                      className={`px-3 py-2 rounded-2xl ${
                        isOwn 
                          ? message.isError ? 'bg-red-100 text-red-800' : 'bg-blue-500 text-white rounded-tr-none' 
                          : 'bg-gray-100 text-gray-800 rounded-tl-none'
                      }`}
                    >
                      {/* Hiển thị nội dung tin nhắn dựa vào loại */}
                      {message.type === 'image' ? (
                        <img src={message.fileUrl || message.content} alt="Hình ảnh" className="max-w-xs max-h-60 rounded-lg" />
                      ) : message.type === 'file' ? (
                        <div className="flex items-center gap-2">
                          <i className="fas fa-file text-gray-500"></i>
                          <span>{message.fileName || message.content}</span>
                        </div>
                      ) : (
                        <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                      )}
                    </div>
                    
                    <div className={`flex text-xs text-gray-500 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                      <span>{formatMessageTime(message.timestamp)}</span>
                      {isOwn && message.isRead && (
                        <span className="ml-1 text-blue-500">✓✓</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        </div>
        
        {/* Khu vực nhập tin nhắn (ẩn nếu không tìm thấy cuộc trò chuyện) */}
        {!notFound && (
          <div className="mt-auto p-4 border-t border-gray-200">
            <div className="flex items-center">
              <Input
                className="flex-1 rounded-lg py-2 text-base"
                placeholder="Type a message..."
                variant="outlined"
                suffix={
                  <div className="flex items-center gap-2 text-gray-500">
                    <BsEmojiSmile className="text-xl cursor-pointer hover:text-primary" />
                    <PiPaperclipBold className="text-xl cursor-pointer hover:text-primary" />
                  </div>
                }
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onPressEnter={handleKeyPress}
              />
              <Button
                type="primary"
                shape="circle"
                icon={<SendOutlined />}
                onClick={handleSendMessage}
                className="ml-2"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatArea; 