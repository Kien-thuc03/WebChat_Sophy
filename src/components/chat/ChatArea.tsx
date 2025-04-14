import React, { useState, useEffect, useRef } from 'react';
import { Input, Button, message, Alert, Empty, Spin } from 'antd';
import { SendOutlined, PaperClipOutlined, SmileOutlined, ReloadOutlined, DownOutlined } from '@ant-design/icons';
import { Conversation, Message } from '../../features/chat/types/conversationTypes';
import { getMessages, sendMessage, fetchConversations, getConversationDetail } from '../../api/API';
import { useLanguage } from '../../features/auth/context/LanguageContext';
import { formatMessageTime } from '../../utils/dateUtils';
import { Avatar } from '../common/Avatar';
import { useConversationContext } from '../../features/chat/context/ConversationContext';
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
  attachments?: Array<{
    url: string;
    type: string;
    name?: string;
    size?: number;
  }>;
}

interface ChatAreaProps {
  conversation: Conversation;
}

const ChatArea: React.FC<ChatAreaProps> = ({ conversation }) => {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadingNewer, setLoadingNewer] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [hasNewer, setHasNewer] = useState(false);
  const [oldestCursor, setOldestCursor] = useState<string | null>(null);
  const [newestCursor, setNewestCursor] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<Array<File>>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const { t } = useLanguage();
  const { userCache, updateConversationWithNewMessage } = useConversationContext();
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
    setHasNewer(false);
    setOldestCursor(null);
    setNewestCursor(null);
    
    // Chỉ tải tin nhắn khi conversation hợp lệ
    if (isValidConversation) {
      fetchMessages();
    } else if (conversation && conversation.conversationId) {
      console.error(`Conversation ID không hợp lệ: ${conversation.conversationId}`);
      setError(`ID cuộc trò chuyện không hợp lệ. Vui lòng thử lại hoặc chọn cuộc trò chuyện khác.`);
    }
  }, [conversation?.conversationId]);

  const fetchMessages = async (cursor?: string, direction: 'before' | 'after' = 'before') => {
    if (!isValidConversation) {
      setError('Không thể tải tin nhắn. ID cuộc trò chuyện không hợp lệ.');
      return;
    }
    
    try {
      if (cursor) {
        if (direction === 'before') {
          setLoadingMore(true);
        } else {
          setLoadingNewer(true);
        }
      } else {
        setLoading(true);
      }
      setError(null);
      
      if (!cursor) {
        setNotFound(false);
      }
      
      console.log(`Đang tải tin nhắn cho cuộc trò chuyện: ${conversation.conversationId}`);
      console.log(`Hướng tải: ${direction}, Cursor: ${cursor || 'none'}`);
      
      // Lấy vị trí cuộn hiện tại để khôi phục sau khi tải thêm tin nhắn cũ
      const scrollContainer = messagesContainerRef.current;
      const scrollPosition = scrollContainer ? scrollContainer.scrollTop : 0;
      const scrollHeight = scrollContainer ? scrollContainer.scrollHeight : 0;
      
      // Lấy tin nhắn với phân trang và hướng tải
      const result = await getMessages(conversation.conversationId, cursor, 20, direction);
      console.log('Kết quả API getMessages:', result);
      
      const messagesData = result.messages;
      const resultDirection = result.direction || direction;
      
      // Cập nhật trạng thái phân trang theo hướng tải
      if (resultDirection === 'before') {
        setHasMore(result.hasMore || false);
        if (result.nextCursor) {
          setOldestCursor(result.nextCursor);
        }
      } else {
        setHasNewer(result.hasMore || false);
        if (result.nextCursor) {
          setNewestCursor(result.nextCursor);
        }
      }
      
      // Kiểm tra dữ liệu trả về
      if (!Array.isArray(messagesData)) {
        console.error('Dữ liệu tin nhắn không hợp lệ:', messagesData);
        setError('Không thể tải tin nhắn. Dữ liệu không hợp lệ.');
        return;
      }
      
      console.log(`Nhận được ${messagesData.length} tin nhắn từ API`);
      
      if (messagesData.length === 0 && !cursor) {
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
        
        // Tạo đối tượng tin nhắn hiển thị
        const displayMessage: DisplayMessage = {
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
        
        // Xử lý cho tin nhắn hình ảnh và tập tin
        if (msg.type === 'image' && msg.attachments && msg.attachments.length > 0) {
          displayMessage.fileUrl = msg.attachments[0].url;
        } else if (msg.type === 'file' && msg.attachments && msg.attachments.length > 0) {
          displayMessage.fileUrl = msg.attachments[0].url;
          displayMessage.fileName = msg.attachments[0].name;
          displayMessage.fileSize = msg.attachments[0].size;
        }
        
        // Thêm thông tin đính kèm
        if (msg.attachments && msg.attachments.length > 0) {
          displayMessage.attachments = msg.attachments;
        }
        
        return displayMessage;
      }).filter(Boolean) as DisplayMessage[]; // Lọc bỏ các tin nhắn null
      
      console.log(`Đã chuyển đổi thành ${displayMessages.length} tin nhắn hiển thị`);
      
      // Sắp xếp tin nhắn theo thời gian tăng dần (cũ nhất lên đầu, mới nhất xuống cuối)
      const sortedMessages = [...displayMessages].sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      
      // Cập nhật danh sách tin nhắn dựa trên hướng tải
      if (cursor) {
        if (direction === 'before') {
          // Thêm tin nhắn cũ vào đầu danh sách khi kéo lên
          setMessages(prev => [...sortedMessages, ...prev]);
          
          // Khôi phục vị trí cuộn sau khi thêm tin nhắn cũ để tránh nhảy vị trí
          setTimeout(() => {
            if (scrollContainer) {
              const newScrollHeight = scrollContainer.scrollHeight;
              const heightDifference = newScrollHeight - scrollHeight;
              scrollContainer.scrollTop = scrollPosition + heightDifference;
            }
          }, 10);
        } else {
          // Thêm tin nhắn mới vào cuối danh sách khi kéo xuống
          setMessages(prev => [...prev, ...sortedMessages]);
          scrollToBottom();
        }
      } else {
        // Thay thế hoàn toàn nếu là lần tải đầu tiên, đảm bảo tin nhắn cũ lên đầu
        setMessages(sortedMessages);
        
        // Cuộn xuống sau khi tải xong
        setTimeout(scrollToBottom, 100);
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
      setLoadingNewer(false);
    }
  };

  // Hàm tải thêm tin nhắn cũ hơn
  const loadMoreMessages = () => {
    if (hasMore && oldestCursor) {
      fetchMessages(oldestCursor, 'before');
    }
  };
  
  // Hàm tải thêm tin nhắn mới hơn
  const loadNewerMessages = () => {
    if (hasNewer && newestCursor) {
      fetchMessages(newestCursor, 'after');
    }
  };

  // Kiểm soát cuộn và tự động tải thêm tin nhắn
  useEffect(() => {
    const scrollContainer = messagesContainerRef.current;
    if (!scrollContainer) return;
    
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
      
      // Khi cuộn gần lên đầu, tải thêm tin nhắn cũ
      if (scrollTop < 50 && hasMore && !loadingMore && oldestCursor) {
        loadMoreMessages();
      }
      
      // Khi cuộn gần xuống cuối, tải thêm tin nhắn mới (nếu có)
      if (scrollHeight - scrollTop - clientHeight < 50 && hasNewer && !loadingNewer && newestCursor) {
        loadNewerMessages();
      }
    };
    
    scrollContainer.addEventListener('scroll', handleScroll);
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, [hasMore, loadingMore, oldestCursor, hasNewer, loadingNewer, newestCursor]);

  // Xử lý chọn tập tin đính kèm
  const handleAttachmentClick = () => {
    fileInputRef.current?.click();
  };

  // Xử lý khi tập tin được chọn
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Thêm tập tin vào danh sách đính kèm
    const newFiles = Array.from(files);
    setAttachments(prev => [...prev, ...newFiles]);
    
    // Reset input để có thể chọn lại cùng tập tin
    e.target.value = '';
  };

  // Xóa tập tin khỏi danh sách đính kèm
  const handleRemoveAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // Gửi tin nhắn với tập tin đính kèm
  const handleSendMessage = async () => {
    // Kiểm tra xem có nội dung gì để gửi không (văn bản hoặc tập tin)
    if ((!inputValue.trim() && attachments.length === 0) || !isValidConversation) return;
    
    const tempContent = inputValue;
    setInputValue(''); // Reset input ngay lập tức
    
    // Xác định loại tin nhắn
    let messageType = 'text';
    if (attachments.length > 0) {
      // Nếu có nhiều tập tin hoặc không phải hình ảnh, thì là 'file'
      if (attachments.length > 1) {
        messageType = 'file';
      } else {
        // Nếu chỉ có 1 tập tin, kiểm tra xem có phải là hình ảnh không
        const fileType = attachments[0].type;
        messageType = fileType.startsWith('image/') ? 'image' : 'file';
      }
    }
    
    // Tạo tin nhắn tạm thời để hiển thị ngay
    const tempMessage: DisplayMessage = {
      id: `temp-${Date.now()}`,
      content: tempContent || (messageType === 'image' ? 'Đang gửi hình ảnh...' : 'Đang gửi tập tin...'),
      timestamp: new Date().toISOString(),
      sender: {
        id: currentUserId,
        name: 'Bạn',
        avatar: userCache[currentUserId]?.urlavatar || ''
      },
      type: messageType as 'text' | 'image' | 'file',
      isRead: false,
      ...(messageType === 'file' && attachments.length > 0 ? {
        fileName: attachments[0].name,
        fileSize: attachments[0].size
      } : {})
    };
    
    // Hiển thị tin nhắn tạm thời - Thêm vào cuối danh sách
    setMessages(prev => [...prev, tempMessage]);
    scrollToBottom();
    
    try {
      setIsUploading(true);
      
      // Chuẩn bị mảng attachments để gửi lên server
      const attachmentData = [];
      
      // Nếu có tập tin đính kèm, xử lý tải lên
      if (attachments.length > 0) {
        // Tùy thuộc vào API của bạn, bạn có thể cần tải lên tập tin trước
        // Và sau đó gửi đường dẫn trong mảng attachments
        // Ví dụ đơn giản:
        for (const file of attachments) {
          // Tạo một đối tượng FormData để tải lên tập tin
          const formData = new FormData();
          formData.append('file', file);
          
          // Tải lên tập tin và lấy URL từ server
          // Đây là ví dụ, bạn cần thay thế bằng API thực tế của bạn
          // const uploadResponse = await uploadFile(formData);
          // attachmentData.push({
          //   url: uploadResponse.fileUrl,
          //   type: file.type,
          //   name: file.name,
          //   size: file.size
          // });
          
          // Giả lập trong trường hợp chưa có API tải lên
          attachmentData.push({
            url: URL.createObjectURL(file),
            type: file.type,
            name: file.name,
            size: file.size
          });
        }
      }
      
      // Gửi tin nhắn với tập tin đính kèm
      const newMessage = await sendMessage(
        conversation.conversationId,
        tempContent,
        messageType,
        attachmentData
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
        type: messageType as 'text' | 'image' | 'file',
        isRead: false,
        attachments: newMessage.attachments || attachmentData
      };
      
      // Thêm thông tin tập tin nếu là tin nhắn tập tin
      if (messageType === 'file' && attachments.length > 0) {
        realMessage.fileName = attachments[0].name;
        realMessage.fileSize = attachments[0].size;
        realMessage.fileUrl = attachmentData[0]?.url;
      } else if (messageType === 'image' && attachments.length > 0) {
        realMessage.fileUrl = attachmentData[0]?.url;
      }
      
      // Cập nhật tin nhắn trong danh sách
      setMessages(prev => 
        prev.map(msg => msg.id === tempMessage.id ? realMessage : msg)
      );
      
      // Cập nhật ChatList với tin nhắn mới
      updateConversationWithNewMessage(conversation.conversationId, newMessage);
      
      // Xóa danh sách tập tin đính kèm sau khi gửi
      setAttachments([]);
      
    } catch (error: any) {
      console.error('Lỗi khi gửi tin nhắn:', error);
      // Đánh dấu tin nhắn tạm là lỗi
      setMessages(prev => 
        prev.map(msg => 
          msg.id === tempMessage.id 
            ? {...msg, content: error.message ? `${msg.content} (${error.message})` : `${msg.content} (Không gửi được)`, isError: true} 
            : msg
        )
      );
      message.error(error.message || 'Không thể gửi tin nhắn');
    } finally {
      setIsUploading(false);
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
    <div className="w-full h-full flex flex-col">
      <div className="flex flex-col h-full overflow-hidden bg-white rounded-lg relative">
        {/* Khu vực hiển thị tin nhắn */}
        <div 
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto p-4 bg-gray-50"
        >
          {/* Nút tải thêm tin nhắn cũ hơn */}
          {hasMore && (
            <div className="text-center pb-2">
              <Button 
                onClick={loadMoreMessages} 
                loading={loadingMore}
                icon={<DownOutlined rotate={180} />}
                size="small"
              >
                Tải thêm tin nhắn cũ hơn
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
          
          {/* Nút tải thêm tin nhắn mới hơn */}
          {hasNewer && (
            <div className="text-center pt-2">
              <Button 
                onClick={loadNewerMessages} 
                loading={loadingNewer}
                icon={<DownOutlined />}
                size="small"
              >
                Tải thêm tin nhắn mới hơn
              </Button>
            </div>
          )}
          
          {loadingNewer && (
            <div className="text-center py-2">
              <Spin size="small" /> <span className="text-xs text-gray-500 ml-2">Đang tải tin nhắn mới hơn...</span>
            </div>
          )}
        </div>
        
        {/* Khu vực nhập tin nhắn (ẩn nếu không tìm thấy cuộc trò chuyện) */}
        {!notFound && (
          <div className="flex-shrink-0 p-4 border-t border-gray-200 bg-white">
            {/* Hiển thị danh sách tập tin đính kèm */}
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {attachments.map((file, index) => (
                  <div 
                    key={index} 
                    className="flex items-center gap-1 bg-gray-100 rounded px-2 py-1"
                  >
                    {file.type.startsWith('image/') ? (
                      <img 
                        src={URL.createObjectURL(file)} 
                        alt={file.name} 
                        className="w-10 h-10 object-cover rounded"
                      />
                    ) : (
                      <i className="fas fa-file text-gray-500"></i>
                    )}
                    <span className="text-xs truncate max-w-32">{file.name}</span>
                    <button 
                      onClick={() => handleRemoveAttachment(index)}
                      className="text-gray-500 hover:text-red-500"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            <div className="flex items-center">
              <Input
                className="flex-1 rounded-lg py-2 text-base"
                placeholder={isUploading ? "Đang tải lên..." : "Type a message..."}
                variant="outlined"
                disabled={isUploading}
                suffix={
                  <div className="flex items-center gap-2 text-gray-500">
                    <BsEmojiSmile className="text-xl cursor-pointer hover:text-primary" />
                    <PiPaperclipBold 
                      className="text-xl cursor-pointer hover:text-primary" 
                      onClick={handleAttachmentClick}
                    />
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      className="hidden"
                      multiple
                      accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                      aria-label="Tải lên tập tin đính kèm"
                    />
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
                loading={isUploading}
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