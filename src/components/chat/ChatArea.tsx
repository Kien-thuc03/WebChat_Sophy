import React, { useState, useEffect, useRef } from 'react';
import { Input, Button, message } from 'antd';
import { SendOutlined, PaperClipOutlined, SmileOutlined } from '@ant-design/icons';
import { Conversation, Message } from '../../features/chat/types/conversationTypes';
import { getMessages, sendMessage } from '../../api/API';
import { useLanguage } from '../../features/auth/context/LanguageContext';
import { formatMessageTime } from '../../utils/dateUtils';
import { Avatar } from '../common/Avatar';
import { useConversations } from '../../features/chat/hooks/useConversations';

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
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { t } = useLanguage();
  const { userCache } = useConversations();
  const currentUserId = localStorage.getItem('userId') || '';

  // Kiểm tra xem conversation có hợp lệ không
  const isValidConversation = conversation && conversation.conversationId;

  useEffect(() => {
    // Reset state khi chuyển cuộc trò chuyện
    setMessages([]);
    setError(null);
    
    // Chỉ tải tin nhắn khi conversation hợp lệ
    if (isValidConversation) {
      fetchMessages();
    }
  }, [conversation?.conversationId]);

  const fetchMessages = async () => {
    if (!isValidConversation) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const messagesData = await getMessages(conversation.conversationId);
      
      // Kiểm tra dữ liệu trả về
      if (!Array.isArray(messagesData)) {
        console.error('Dữ liệu tin nhắn không hợp lệ:', messagesData);
        setError('Không thể tải tin nhắn. Dữ liệu không hợp lệ.');
        return;
      }
      
      // Chuyển đổi Message từ API sang định dạng tin nhắn hiển thị
      const displayMessages: DisplayMessage[] = messagesData.map(msg => {
        // Kiểm tra tin nhắn hợp lệ
        if (!msg || !msg.messageId) {
          console.warn('Tin nhắn không hợp lệ:', msg);
          return null;
        }
        
        const sender = userCache[msg.senderId] || { fullname: 'Người dùng', urlavatar: '' };
        
        return {
          id: msg.messageId,
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
      
      setMessages(displayMessages);
    } catch (error) {
      console.error('Lỗi khi tải tin nhắn:', error);
      setError('Không thể tải tin nhắn. Vui lòng thử lại sau.');
      message.error('Không thể tải tin nhắn');
    } finally {
      setLoading(false);
      // Chỉ cuộn nếu có tin nhắn
      if (messages.length > 0) {
        setTimeout(scrollToBottom, 100);
      }
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
    <div className="flex flex-col h-full">
      {/* Khu vực hiển thị tin nhắn */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
        {loading && <div className="text-center py-4">{t.loading || 'Đang tải...'}</div>}
        
        {error && (
          <div className="text-center text-red-500 py-2">
            {error}
            <div className="mt-2">
              <Button type="link" onClick={fetchMessages}>Thử lại</Button>
            </div>
          </div>
        )}
        
        {messages.length === 0 && !loading && !error && (
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
      
      {/* Khu vực nhập tin nhắn */}
      <div className="border-t border-gray-200 p-3 bg-white">
        <div className="flex items-center">
          <Button 
            type="text" 
            icon={<PaperClipOutlined />} 
            className="text-gray-600" 
            title='Đính kèm file'
          />
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder='Nhập tin nhắn...'
            bordered={false}
            className="flex-1"
            autoComplete="off"
            disabled={!isValidConversation}
          />
          <Button 
            type="text" 
            icon={<SmileOutlined />} 
            className="text-gray-600" 
            title='Biểu tượng cảm xúc'
          />
          <Button 
            type="primary" 
            shape="circle" 
            icon={<SendOutlined />} 
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || !isValidConversation}
          />
        </div>
      </div>
    </div>
  );
};

export default ChatArea; 