import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Button,
  message,
  Alert,
  Empty,
  Spin,
  Menu,
  Select,
  Modal
} from "antd";
import {
  ReloadOutlined,
  DownOutlined,
  DeleteOutlined,
  UndoOutlined,
  CopyOutlined,
  PushpinOutlined,
  StarOutlined,
  UnorderedListOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import {Conversation} from "../../../features/chat/types/conversationTypes";
import { User } from "../../../features/auth/types/authTypes";
import {
  getMessages,
  sendMessage,
  sendImageMessage,
  sendMessageWithImage,
  fetchConversations,
  recallMessage,
  deleteMessage,
  pinMessage,
  unpinMessage,
  getPinnedMessages,
  getSpecificMessage,
  replyMessage,
  forwardImageMessage,
} from "../../../api/API";
import { useLanguage } from "../../../features/auth/context/LanguageContext";
import { DisplayMessage } from "../../../features/chat/types/chatTypes";
import { useConversationContext } from "../../../features/chat/context/ConversationContext";
// import data from "@emoji-mart/data";
import socketService from "../../../services/socketService";
import PinnedMessages from "./PinnedMessages";
import MessageDisplay from "./MessageDisplay";
import ChatInputArea from "./ChatInputArea";

// Chuyển đổi Message từ API sang định dạng tin nhắn cần hiển thị

// Thêm interface cho định dạng dữ liệu reply
interface ReplyData {
  content: string;
  senderName: string;
  senderId: string;
  type: string;
  attachment?: {
    url: string;
    type?: string;
    name?: string;
    size?: number;
    downloadUrl?: string;
    format?: string;
  };
}

interface ChatAreaProps {
  conversation: Conversation | null;
  viewingImages?: boolean;
}

// Component hiển thị tin nhắn trả lời (chuyển từ ChatMessage)

export function ChatArea({ conversation }: ChatAreaProps) {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [, setNotifications] = useState<any[]>([]);
  const [inputValue, setInputValue] = useState("");
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
  const [emojiPickerVisible, setEmojiPickerVisible] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const { t } = useLanguage();
  const { 
    markConversationAsRead, 
    updateConversationWithNewMessage,
    updateUnreadStatus,
    userCache,
    conversations
  } = useConversationContext();
  const currentUserId = localStorage.getItem("userId") || "";
  // const [imageInputVisible, setImageInputVisible] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  
  // Thêm state để theo dõi ảnh từ paste
  const [pastedImage, setPastedImage] = useState<File | null>(null);
  const [pastedImagePreview, setPastedImagePreview] = useState<string | null>(null);
  const inputRef = useRef<any>(null); // Changed to any to avoid type issues with Ant Design
  const [typingUsers, setTypingUsers] = useState<{[key: string]: {userId: string, fullname: string, timestamp: number}}>({});
  const [typingTimers, setTypingTimers] = useState<{[key: string]: NodeJS.Timeout}>({});
  
  // Add state for pinned messages
  const [pinnedMessages, setPinnedMessages] = useState<DisplayMessage[]>([]);
  const [showPinnedMessagesPanel, setShowPinnedMessagesPanel] = useState(false);
  const [loadingPinnedMessages, setLoadingPinnedMessages] = useState(false);
  
  // Thêm typing timeout
  const TYPING_TIMEOUT = 3000; // 3 giây

  // Kiểm tra xem conversation có hợp lệ không
  const isValidConversation =
    conversation &&
    conversation.conversationId && 
    typeof conversation.conversationId === "string" &&
    conversation.conversationId.startsWith("conv");

  // Add state for the image modal
  const [, setSelectedImage] = useState<string | null>(null);
  const [, setIsImageModalOpen] = useState(false);

  // Add state for message actions
  const [messageActionLoading, setMessageActionLoading] = useState<string | null>(null);

  // Add state for tracking active message hover menu
  const [activeMessageMenu, setActiveMessageMenu] = useState<string | null>(null);

  // Add state for tracking dropdown visibility
  const [dropdownVisible, setDropdownVisible] = useState<{[key: string]: boolean}>({});
  
  const [replyingToMessage, setReplyingToMessage] = useState<DisplayMessage | null>(null);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [forwardingMessage, setForwardingMessage] = useState<DisplayMessage | null>(null);
  const [selectedConversationForForward, setSelectedConversationForForward] = useState<string | null>(null);

  // Add this state variable
  const [, setIsSending] = useState(false);
  
  // Ref para guardar una copia de userCache para operaciones asíncronas
  const userCacheRef = useRef<Record<string, User>>({});

  // Actualizar la referencia cuando cambie userCache - mantener este efecto antes de otros efectos
  useEffect(() => {
    userCacheRef.current = { ...userCache };
  }, [userCache]);

  // Thêm ref lưu conversationId hiện tại
  const currentConversationIdRef = useRef(conversation?.conversationId);
  useEffect(() => {
    currentConversationIdRef.current = conversation?.conversationId;
  }, [conversation?.conversationId]);

  useEffect(() => {
    if (!conversation) return; // Early return if no conversation
    
    async function initialLoad() {
      setLoading(true);
      setMessages([]);
      setNotifications([]);
      
      // Load pinned messages when conversation is first loaded
      if (conversation && conversation.conversationId) {
        fetchPinnedMessages();
      }
    }
    
    initialLoad();
    return () => {
      // Only attempt to leave if we have a valid conversation
      if (conversation && conversation.conversationId) {
        socketService.leaveConversation(conversation.conversationId);
      }
    };
  }, [conversation?.conversationId]);

  useEffect(() => {
    // Reset state khi chuyển cuộc trò chuyện
    setMessages([]);
    setError(null);
    setNotFound(false);
    setHasMore(false);
    setHasNewer(false);
    setOldestCursor(null);
    setNewestCursor(null);
    
    // Reset typing state
    setTypingUsers({});
    
    // Xóa tất cả timers hiện có
    Object.values(typingTimers).forEach(timer => clearTimeout(timer));
    setTypingTimers({});
    
    // Chỉ tải tin nhắn và thiết lập socket khi conversation hợp lệ
    if (isValidConversation) {
      // Mark this conversation as read when it's selected
      markConversationAsRead(conversation.conversationId);
      
      // Tải tin nhắn gần nhất với hướng 'before' và không có cursor
      fetchMessages(undefined, "before");
      
      // Tham gia vào phòng chat
      socketService.joinConversations([conversation.conversationId]);
      
      // Callback để xử lý tin nhắn mới từ socket
      const handleNewMessage = (data: any) => {
        
        // Kiểm tra xem tin nhắn có thuộc cuộc trò chuyện hiện tại không
        if (!conversation || data.conversationId !== conversation.conversationId) {
          // Cập nhật danh sách cuộc trò chuyện để hiển thị tin nhắn mới
          updateConversationWithNewMessage(data.conversationId, data.message);
          return;
        }
        
        // Also update the conversation in the list for current conversation
        updateConversationWithNewMessage(data.conversationId, data.message);
        
        // Rest of the existing code for updating the current conversation's messages
        const msg = data.message;
        
        const sender = data.sender;
        
        // Kiểm tra tin nhắn hợp lệ và xử lý dữ liệu từ MongoDB
        if (!msg) {
          console.warn("Invalid message data received: empty message");
          return;
        }
        
        // Trích xuất ID tin nhắn từ nhiều nguồn khả thi
        const messageId = msg.messageDetailId || msg.messageId || (msg._doc && (msg._doc.messageDetailId || msg._doc.messageId || msg._doc._id));

        if (!messageId) {
          console.warn("Invalid message data received: no message ID found", msg);
          return;
        }
        
        
        // Cải thiện kiểm tra tin nhắn trùng lặp
        // Kiểm tra xem tin nhắn đã tồn tại với ID thực hoặc là tin nhắn tạm với cùng nội dung
        setMessages(prevMessages => {
          // Kiểm tra theo ID thực
          const exactIdMatch = prevMessages.some(m => m.id === messageId);
          
          // Kiểm tra tin nhắn tạm dựa trên nội dung và senderId
          const tempMessageWithSameContent = prevMessages.find(m => 
            m.id.startsWith('temp-') && 
            m.sender.id === msg.senderId && 
            m.content === msg.content &&
            Math.abs(new Date(m.timestamp).getTime() - new Date(msg.createdAt || Date.now()).getTime()) < 10000
          );
          
          // Nếu đã có tin nhắn với ID thực, không thêm vào nữa
          if (exactIdMatch) {
            return prevMessages;
          }
          
          // Nếu có tin nhắn tạm với cùng nội dung, thay thế tin nhắn tạm bằng tin nhắn thực
          if (tempMessageWithSameContent) {
            
            // Tiếp tục xử lý để tạo tin nhắn hiển thị thực tế
            // Nếu là document MongoDB, sử dụng dữ liệu từ _doc
            let messageData = msg;
            if (msg._doc) {
              messageData = { ...msg._doc, messageDetailId: messageId };
            } else if (typeof msg === 'object' && Object.keys(msg).length === 0) {
              console.warn("Empty message object received");
              return prevMessages;
            }
            
            // Chuẩn hóa dữ liệu attachments và attachment
            let parsedAttachments: Array<{ url: string; type: string; name?: string; size?: number }> = [];
            if (typeof messageData.attachments === 'string' && messageData.attachments) {
              try {
                const parsed = JSON.parse(messageData.attachments);
                if (Array.isArray(parsed)) {
                  parsedAttachments = parsed;
                }
              } catch (e) {
                console.error('Failed to parse attachments string:', e);
              }
            } else if (Array.isArray(messageData.attachments)) {
              parsedAttachments = messageData.attachments;
            }
            
            // Đảm bảo cả hai trường attachment và attachments đều có giá trị nhất quán
            let mainAttachment = messageData.attachment || (parsedAttachments.length > 0 ? parsedAttachments[0] : null);
            
            // Nếu có attachment nhưng không có attachments, tạo attachments từ attachment
            if (mainAttachment && parsedAttachments.length === 0) {
              parsedAttachments = [mainAttachment];
            }
            
            // Nếu có attachments nhưng không có attachment, lấy attachment từ attachments
            if (!mainAttachment && parsedAttachments.length > 0) {
              mainAttachment = parsedAttachments[0];
            }
            
            // Tạo đối tượng tin nhắn hiển thị
            const displayMessage: DisplayMessage = {
              id: messageId,
              content: messageData.content || "",
              timestamp: messageData.createdAt || new Date().toISOString(),
              sender: {
                id: messageData.senderId || "",
                name: sender.fullname || "Người dùng",
                avatar: sender.avatar || "",
              },
              type: (messageData.type as "text" | "image" | "file") || "text",
              isRead: Array.isArray(messageData.readBy) && messageData.readBy.length > 0,
              readBy: messageData.readBy || [],
              deliveredTo: messageData.deliveredTo || [],
              sendStatus: messageData.senderId === currentUserId ? 
                (messageData.sendStatus || "sent") : "received",
              // Lưu ID tạm thời để hỗ trợ việc cập nhật
              tempId: tempMessageWithSameContent.id,
              isRecall: messageData.isRecall || false,
              hiddenFrom: messageData.hiddenFrom || [],
              isPinned: messageData.isPinned || false
            };
            
            // Gán cả hai trường attachment và attachments cho tin nhắn hiển thị
            if (parsedAttachments.length > 0) {
              displayMessage.attachments = parsedAttachments;
            }
            
            if (mainAttachment) {
              displayMessage.attachment = mainAttachment;
            }
            
            // Xử lý dựa trên loại tin nhắn để thiết lập các trường fileUrl, fileName, fileSize
            if (messageData.type === "image") {
              // Đặt fileUrl từ attachment hoặc attachments
              if (mainAttachment && mainAttachment.url) {
                displayMessage.fileUrl = mainAttachment.url;
              }
            } else if (messageData.type === "file") {
              if (mainAttachment && mainAttachment.url) {
                displayMessage.fileUrl = mainAttachment.url;
                displayMessage.fileName = mainAttachment.name;
                displayMessage.fileSize = mainAttachment.size;
              }
            }
            
            // Nếu tin nhắn này là từ người khác, đánh dấu là đã đọc
            if (displayMessage.sender.id !== currentUserId) {
              // Đánh dấu tin nhắn là đã đọc (nếu người dùng đang xem cuộc trò chuyện)
              socketService.markMessagesAsRead(conversation.conversationId, [displayMessage.id]);
              
              // Thông báo cho người gửi rằng tin nhắn đã được gửi thành công (tin nhắn đã được nhận)
              socketService.markMessagesAsDelivered(conversation.conversationId, [displayMessage.id]);
              
              // Nếu không phải là tin nhắn từ người dùng hiện tại, xóa trạng thái typing
              setTypingUsers(prev => {
                const newState = {...prev};
                delete newState[displayMessage.sender.id];
                return newState;
              });
              
              if (typingTimers[displayMessage.sender.id]) {
                clearTimeout(typingTimers[displayMessage.sender.id]);
                setTypingTimers(prev => {
                  const newTimers = {...prev};
                  delete newTimers[displayMessage.sender.id];
                  return newTimers;
                });
              }
            }
            
            // Cập nhật danh sách cuộc trò chuyện với tin nhắn mới
            updateConversationWithNewMessage(conversation.conversationId, {
              content: messageData.content,
              type: messageData.type,
              createdAt: messageData.createdAt,
              senderId: messageData.senderId
            });
            
            // Thêm thông tin reply nếu là tin nhắn trả lời
            if (msg.isReply) {
              displayMessage.isReply = true;
              displayMessage.messageReplyId = msg.messageReplyId || null;
              
              // Kiểm tra và sử dụng dữ liệu replyData nếu có
              if (msg.replyData) {
                // Nếu replyData là string, thử parse thành object
                if (typeof msg.replyData === 'string') {
                  try {
                    displayMessage.replyData = JSON.parse(msg.replyData);
                  } catch (error) {
                    console.error("Error parsing replyData string:", error);
                    // Nếu parse lỗi, cố gắng tạo một đối tượng hợp lệ
                    displayMessage.replyData = { 
                      content: msg.replyData,
                      senderName: msg.replyData.senderName,
                      senderId: '',
                      type: 'text'
                    };
                  }
                } else {
                  // Nếu là object, sử dụng trực tiếp
                  displayMessage.replyData = msg.replyData;
                }
              } else if (msg.messageReplyId) {
                // Thêm một task để fetch dữ liệu tin nhắn gốc sau
                setTimeout(async () => {
                  try {
                    const replyData = await fetchOriginalMessageForReply(msg.messageReplyId);
                    if (replyData) {
                      // Cập nhật replyData cho tin nhắn hiện tại trong state
                      setMessages(prevMessages => prevMessages.map(m => {
                        if (m.id === messageId) {
                          return { ...m, replyData };
                        }
                        return m;
                      }));
                    }
                  } catch (error) {
                    console.error("Failed to fetch original message for reply:", error);
                  }
                }, 0);
              }
              
            }
            
            // Thay thế tin nhắn tạm bằng tin nhắn thực
            return prevMessages.map(m => m.id === tempMessageWithSameContent.id ? displayMessage : m);
          }
          
          // Nếu không tìm thấy tin nhắn trùng, xử lý như bình thường
          // ... existing newMessage handling code ...
          // Nếu là document MongoDB, sử dụng dữ liệu từ _doc
          let messageData = msg;
          if (msg._doc) {
            messageData = { ...msg._doc, messageDetailId: messageId };
          } else if (typeof msg === 'object' && Object.keys(msg).length === 0) {
            console.warn("Empty message object received");
            return prevMessages;
          }
          
          // Chuẩn hóa dữ liệu attachments và attachment
          let parsedAttachments: Array<{ url: string; type: string; name?: string; size?: number }> = [];
          if (typeof messageData.attachments === 'string' && messageData.attachments) {
            try {
              const parsed = JSON.parse(messageData.attachments);
              if (Array.isArray(parsed)) {
                parsedAttachments = parsed;
              }
            } catch (e) {
              console.error('Failed to parse attachments string:', e);
            }
          } else if (Array.isArray(messageData.attachments)) {
            parsedAttachments = messageData.attachments;
          }
          
          // Đảm bảo cả hai trường attachment và attachments đều có giá trị nhất quán
          let mainAttachment = messageData.attachment || (parsedAttachments.length > 0 ? parsedAttachments[0] : null);
          
          // Nếu có attachment nhưng không có attachments, tạo attachments từ attachment
          if (mainAttachment && parsedAttachments.length === 0) {
            parsedAttachments = [mainAttachment];
          }
          
          // Nếu có attachments nhưng không có attachment, lấy attachment từ attachments
          if (!mainAttachment && parsedAttachments.length > 0) {
            mainAttachment = parsedAttachments[0];
          }
          
          // Tạo đối tượng tin nhắn hiển thị
          const displayMessage: DisplayMessage = {
            id: messageId,
            content: messageData.content || "",
            timestamp: messageData.createdAt || new Date().toISOString(),
            sender: {
              id: messageData.senderId || "",
              name: sender.fullname || "Người dùng",
              avatar: sender.avatar || "",
            },
            type: (messageData.type as "text" | "image" | "file") || "text",
            isRead: Array.isArray(messageData.readBy) && messageData.readBy.length > 0,
            readBy: messageData.readBy || [],
            deliveredTo: messageData.deliveredTo || [],
            // Thiết lập rõ ràng trạng thái tin nhắn dựa trên dữ liệu từ server
            sendStatus: messageData.senderId === currentUserId ? 
              (messageData.sendStatus || "sent") : "received",
            isRecall: messageData.isRecall || false,
            hiddenFrom: messageData.hiddenFrom || [],
            isPinned: messageData.isPinned || false
          };
          
          // Xử lý dữ liệu tin nhắn trả lời (reply message)
          if (messageData.isReply) {
            displayMessage.isReply = true;
            displayMessage.messageReplyId = messageData.messageReplyId || null;
            
            // Xử lý replyData
            if (messageData.replyData) {
              // Nếu replyData là string, thử parse thành object
              if (typeof messageData.replyData === 'string') {
                try {
                  displayMessage.replyData = JSON.parse(messageData.replyData);
                } catch (error) {
                  console.error("Error parsing replyData string for new message:", error);
                  displayMessage.replyData = { 
                    content: messageData.replyData,
                    senderName: messageData.replyData.senderName,
                    senderId: '',
                    type: 'text'
                  };
                }
              } else {
                // Nếu đã là object, gán trực tiếp
                displayMessage.replyData = messageData.replyData;
              }
            } else if (messageData.messageReplyId) {
              // Nếu không có replyData nhưng có messageReplyId, thử tìm nạp dữ liệu
              setTimeout(async () => {
                try {
                  const replyData = await fetchOriginalMessageForReply(messageData.messageReplyId);
                  if (replyData) {
                    // Cập nhật replyData cho tin nhắn trong state
                    setMessages(prevMessages => prevMessages.map(m => {
                      if (m.id === messageId) {
                        return { ...m, replyData };
                      }
                      return m;
                    }));
                  }
                } catch (error) {
                  console.error("Failed to fetch original message for reply (new message):", error);
                }
              }, 0);
            }
          }
          
          // Gán cả hai trường attachment và attachments cho tin nhắn hiển thị
          if (parsedAttachments.length > 0) {
            displayMessage.attachments = parsedAttachments;
          }
          
          if (mainAttachment) {
            displayMessage.attachment = mainAttachment;
          }
          
          // Xử lý dựa trên loại tin nhắn để thiết lập các trường fileUrl, fileName, fileSize
          if (messageData.type === "image") {
            // Đặt fileUrl từ attachment hoặc attachments
            if (mainAttachment && mainAttachment.url) {
              displayMessage.fileUrl = mainAttachment.url;
            }
          } else if (messageData.type === "file") {
            if (mainAttachment && mainAttachment.url) {
              displayMessage.fileUrl = mainAttachment.url;
              displayMessage.fileName = mainAttachment.name;
              displayMessage.fileSize = mainAttachment.size;
            }
          }
          
          // Nếu tin nhắn này là từ người khác, đánh dấu là đã đọc
          if (displayMessage.sender.id !== currentUserId) {
            // Đánh dấu tin nhắn là đã đọc (nếu người dùng đang xem cuộc trò chuyện)
            socketService.markMessagesAsRead(conversation.conversationId, [displayMessage.id]);
            
            // Thông báo cho người gửi rằng tin nhắn đã được gửi thành công (tin nhắn đã được nhận)
            socketService.markMessagesAsDelivered(conversation.conversationId, [displayMessage.id]);
          }
          
          // Nếu không phải là tin nhắn từ người dùng hiện tại, xóa trạng thái typing
          if (displayMessage.sender.id !== currentUserId) {
            setTypingUsers(prev => {
              const newState = {...prev};
              delete newState[displayMessage.sender.id];
              return newState;
            });
            
            if (typingTimers[displayMessage.sender.id]) {
              clearTimeout(typingTimers[displayMessage.sender.id]);
              setTypingTimers(prev => {
                const newTimers = {...prev};
                delete newTimers[displayMessage.sender.id];
                return newTimers;
              });
            }
          }
          
          // Cập nhật danh sách cuộc trò chuyện với tin nhắn mới
          updateConversationWithNewMessage(conversation.conversationId, {
            content: messageData.content,
            type: messageData.type,
            createdAt: messageData.createdAt,
            senderId: messageData.senderId
          });
          
          return [...prevMessages, displayMessage];
        });
        
        // Cuộn đến tin nhắn mới
        scrollToBottomSmooth();
      };
      
      // Callback để xử lý sự kiện typing
      const handleUserTyping = (data: { conversationId: string, userId: string, fullname: string }) => {
        // Chỉ xử lý event typing cho conversation hiện tại
        if (data.conversationId !== conversation.conversationId) return;
        
        // Không hiển thị typing của chính mình
        if (data.userId === currentUserId) return;
        
        // Cập nhật trạng thái typing
        setTypingUsers(prev => ({
          ...prev,
          [data.userId]: {
            userId: data.userId,
            fullname: data.fullname,
            timestamp: Date.now()
          }
        }));
        
        // Xóa typing status sau một khoảng thời gian
        if (typingTimers[data.userId]) {
          clearTimeout(typingTimers[data.userId]);
        }
        
        const timer = setTimeout(() => {
          setTypingUsers(prev => {
            const newState = {...prev};
            delete newState[data.userId];
            return newState;
          });
          
          setTypingTimers(prev => {
            const newTimers = {...prev};
            delete newTimers[data.userId];
            return newTimers;
          });
        }, TYPING_TIMEOUT);
        
        setTypingTimers(prev => ({
          ...prev,
          [data.userId]: timer
        }));
      };
      
      // Callback cho sự kiện tin nhắn đã đọc
      const handleMessageRead = (data: { conversationId: string, messageIds: string[], userId: string }) => {
        // Kiểm tra xem sự kiện liên quan đến cuộc trò chuyện hiện tại không
        if (data.conversationId !== conversation.conversationId) {
          // Still update the unread status in the conversation list even if it's not the current conversation
          updateUnreadStatus(data.conversationId, data.messageIds);
          return;
        }
        
        // Cập nhật tin nhắn đã đọc trong cuộc trò chuyện hiện tại
        if (Array.isArray(data.messageIds) && data.messageIds.length > 0) {
          setMessages(prev => 
            prev.map(msg => {
              // Nếu ID tin nhắn nằm trong danh sách đã đọc
              if (data.messageIds.includes(msg.id)) {
                // Nếu mảng readBy chưa có userId này, thêm vào
                if (!msg.readBy) {
                  msg.readBy = [data.userId];
                } else if (!msg.readBy.includes(data.userId)) {
                  msg.readBy = [...msg.readBy, data.userId];
                }
                return {
                  ...msg,
                  isRead: true,
                  readBy: msg.readBy,
                  // Add sendStatus update for own messages
                  sendStatus: msg.sender.id === currentUserId ? "read" : msg.sendStatus
                };
              }
              return msg;
            })
          );
        }
        
        // Also update the conversation in the list
        updateUnreadStatus(data.conversationId, data.messageIds);
      };
      
      // Callback cho sự kiện tin nhắn đã gửi
      const handleMessageDelivered = (data: { conversationId: string, messageIds: string[], userId: string }) => {
        if (data.conversationId !== conversation.conversationId) return;
        
        // Cập nhật trạng thái đã gửi cho tin nhắn
        setMessages(prevMessages => {
          let hasUpdates = false;
          const updatedMessages = prevMessages.map(msg => {
            if (data.messageIds.includes(msg.id)) {
              // Chỉ cập nhật thành "delivered" nếu chưa đến trạng thái "read"
              // và nếu đây là tin nhắn của người dùng hiện tại
              if (msg.sendStatus !== "read" && msg.sender.id === currentUserId && data.userId !== currentUserId) {
                hasUpdates = true;
                
                // Kiểm tra xem userId đã tồn tại trong mảng deliveredTo chưa
                const newDeliveredTo = msg.deliveredTo || [];
                if (!newDeliveredTo.includes(data.userId)) {
                  newDeliveredTo.push(data.userId);
                }
                
                return {
                  ...msg,
                  deliveredTo: newDeliveredTo,
                  sendStatus: "delivered"
                };
              }
            }
            return msg;
          });
          
          // Chỉ cập nhật state nếu có thay đổi thực sự
          return hasUpdates ? updatedMessages : prevMessages;
        });
      };
      
      // Callback khi có thành viên bị chặn
      const handleUserBlocked = (data: { conversationId: string, blockedUserId: string, fromCurrentUser?: boolean }) => {
        // Kiểm tra xem sự kiện có thuộc cuộc trò chuyện hiện tại không
        if (conversation?.conversationId !== data.conversationId) return;
        
        // Tìm thông tin người bị chặn từ cache
        const blockedUser = userCacheRef.current[data.blockedUserId];
        const blockedUserName = blockedUser?.fullname || `User-${data.blockedUserId.substring(0, 6)}`;
        
        // Chỉ kiểm tra tin nhắn trùng lặp nếu KHÔNG phải người thực hiện hành động
        // Người thực hiện hành động luôn thấy thông báo
        let shouldShowNotification = true;
        
        if (!data.fromCurrentUser) {
          // Kiểm tra xem đã có tin nhắn chặn gần đây chưa để tránh trùng lặp
          const lastMessage = messages[messages.length - 1];
          const isDuplicateNotification = lastMessage && 
                                         lastMessage.type === "notification" && 
                                         lastMessage.content.includes(blockedUserName) &&
                                         lastMessage.content.includes("bị chặn");
          
          if (isDuplicateNotification) {
            shouldShowNotification = false;
          }
        }

        if (shouldShowNotification) {
          const newNotification = {
            id: `notification-block-${Date.now()}`,
            content: `${blockedUserName} đã bị chặn khỏi nhóm`,
            type: "notification" as "notification",
            timestamp: new Date().toISOString(),
            sender: {
              id: "system",
              name: "Hệ thống",
              avatar: ""
            },
            isNotification: true,
            isRead: true,
            sendStatus: "sent"
          } as DisplayMessage;
          
          setMessages(prev => [...prev, newNotification]);
          
          // Cuộn xuống dưới để hiển thị thông báo mới
          setTimeout(() => {
            if (messagesEndRef.current) {
              messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
            }
          }, 100);
        }
      };
      
      // Callback khi có thành viên được bỏ chặn
      const handleUserUnblocked = (data: { conversationId: string, unblockedUserId: string, fromCurrentUser?: boolean }) => {
        // Nếu không phải cuộc trò chuyện hiện tại, không xử lý
        if (data.conversationId !== conversation.conversationId) {
          return;
        }
        
        // Tìm thông tin người được bỏ chặn từ cache
        const unblockedUser = userCacheRef.current[data.unblockedUserId];
        const unblockedUserName = unblockedUser?.fullname || `User-${data.unblockedUserId.substring(0, 6)}`;
        
        // Chỉ kiểm tra tin nhắn trùng lặp nếu KHÔNG phải người thực hiện hành động
        // Người thực hiện hành động luôn thấy thông báo
        let shouldShowNotification = true;
        
        if (!data.fromCurrentUser) {
          // Kiểm tra tin nhắn trùng lặp
          const lastMessage = messages[messages.length - 1];
          const isDuplicateNotification = lastMessage && 
                                         lastMessage.type === "notification" && 
                                         lastMessage.content.includes(unblockedUserName) &&
                                         lastMessage.content.includes("được bỏ chặn");
          
          if (isDuplicateNotification) {
            shouldShowNotification = false;
          }
        }
        
        if (shouldShowNotification) {
          const newNotification = {
            id: `notification-unblock-${Date.now()}`,
            content: `${unblockedUserName} đã được bỏ chặn khỏi nhóm`,
            type: "notification" as "notification",
            timestamp: new Date().toISOString(),
            sender: {
              id: "system",
              name: "Hệ thống",
              avatar: ""
            },
            isNotification: true,
            isRead: true,
            sendStatus: "sent"
          } as DisplayMessage;
          
          setMessages(prev => [...prev, newNotification]);
          
          // Cuộn xuống dưới để hiển thị thông báo mới
          setTimeout(() => {
            if (messagesEndRef.current) {
              messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
            }
          }, 100);
        }
      };
      
      // Đăng ký lắng nghe các sự kiện socket
      socketService.onNewMessage(handleNewMessage);
      socketService.onUserTyping(handleUserTyping);
      socketService.onMessageRead(handleMessageRead);
      socketService.onMessageDelivered(handleMessageDelivered);
      
      // Thêm xử lý cho các sự kiện quản lý nhóm
      const handleUserLeftGroup = (data: { conversationId: string, userId: string }): void => {
        // Kiểm tra xem sự kiện có thuộc cuộc trò chuyện hiện tại không
        if (conversation?.conversationId !== data.conversationId) return;
        
        // Lấy thông tin về người dùng đã rời nhóm
        const leftUser = userCache[data.userId];
        const leftUserName = leftUser ? leftUser.fullname : "Một thành viên";
        
        // Tạo thông báo hệ thống
        const newNotification = {
          id: `notification-leave-${Date.now()}`,
          content: `${leftUserName} đã rời khỏi nhóm`,
          type: "notification" as "notification",
          timestamp: new Date().toISOString(),
          sender: {
            id: "system",
            name: "Hệ thống",
            avatar: ""
          },
          isNotification: true,
          isRead: true,
          sendStatus: "sent"
        } as DisplayMessage;
        
        setMessages(prev => [...prev, newNotification]);
        
        // Cuộn xuống dưới để hiển thị thông báo mới
        setTimeout(() => {
          if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
          }
        }, 100);
      };
      
      const handleGroupDeleted = (data: { conversationId: string }): void => {
        // Kiểm tra xem sự kiện có thuộc cuộc trò chuyện hiện tại không
        if (conversation?.conversationId !== data.conversationId) return;
        
        // Tạo thông báo hệ thống
        const newNotification = {
          id: `notification-delete-${Date.now()}`,
          content: `Nhóm đã bị giải tán bởi trưởng nhóm`,
          type: "notification" as "notification",
          timestamp: new Date().toISOString(),
          sender: {
            id: "system",
            name: "Hệ thống",
            avatar: ""
          },
          isNotification: true,
          isRead: true,
          sendStatus: "sent"
        } as DisplayMessage;
        
        setMessages(prev => [...prev, newNotification]);
        
        // Cuộn xuống dưới để hiển thị thông báo mới
        setTimeout(() => {
          if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
          }
        }, 100);
      };
      
      const handleGroupCoOwnerRemoved = (data: { conversationId: string, removedCoOwner: string }): void => {
        // Kiểm tra xem sự kiện có thuộc cuộc trò chuyện hiện tại không
        if (conversation?.conversationId !== data.conversationId) return;
        
        // Lấy thông tin về người dùng bị gỡ quyền phó nhóm
        const removedUser = userCache[data.removedCoOwner];
        const removedUserName = removedUser ? removedUser.fullname : "Một thành viên";
        
        // Tạo thông báo hệ thống
        const newNotification = {
          id: `notification-coowner-removed-${Date.now()}`,
          content: `${removedUserName} đã bị gỡ quyền phó nhóm`,
          type: "notification" as "notification",
          timestamp: new Date().toISOString(),
          sender: {
            id: "system",
            name: "Hệ thống",
            avatar: ""
          },
          isNotification: true,
          isRead: true,
          sendStatus: "sent"
        } as DisplayMessage;
        
        setMessages(prev => [...prev, newNotification]);
        
        // Cuộn xuống dưới để hiển thị thông báo mới
        setTimeout(() => {
          if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
          }
        }, 100);
      };
      
      const handleGroupCoOwnerAdded = (data: { conversationId: string, newCoOwnerIds: string[] }): void => {
        // Kiểm tra xem sự kiện có thuộc cuộc trò chuyện hiện tại không
        if (conversation?.conversationId !== data.conversationId) return;
        
        // Chỉ hiển thị thông báo cho người dùng mới nhất được thêm vào
        const latestCoOwnerId = data.newCoOwnerIds[data.newCoOwnerIds.length - 1];
        
        // Lấy thông tin về người dùng được thêm quyền phó nhóm
        const addedUser = userCache[latestCoOwnerId];
        const addedUserName = addedUser ? addedUser.fullname : "Một thành viên";
        
        // Tạo thông báo hệ thống
        const newNotification = {
          id: `notification-coowner-added-${Date.now()}`,
          content: `${addedUserName} đã được thêm quyền phó nhóm`,
          type: "notification" as "notification",
          timestamp: new Date().toISOString(),
          sender: {
            id: "system",
            name: "Hệ thống",
            avatar: ""
          },
          isNotification: true,
          isRead: true,
          sendStatus: "sent"
        } as DisplayMessage;
        
        setMessages(prev => [...prev, newNotification]);
        
        // Cuộn xuống dưới để hiển thị thông báo mới
        setTimeout(() => {
          if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
          }
        }, 100);
      };
      
      const handleUserRemovedFromGroup = (data: { 
        conversationId: string, 
        kickedUser: { userId: string; fullname: string },
        kickedByUser: { userId: string; fullname: string }
      }): void => {
        // Kiểm tra xem sự kiện có thuộc cuộc trò chuyện hiện tại không
        if (conversation?.conversationId !== data.conversationId) return;
        
        // Lấy thông tin về người bị xóa khỏi nhóm
        const removedUser = userCache[data.kickedUser.userId] || { fullname: data.kickedUser.fullname };
        const removedUserName = removedUser?.fullname || "Một thành viên";
        
        // Lấy thông tin về người xóa
        const remover = userCache[data.kickedByUser.userId] || { fullname: data.kickedByUser.fullname };
        const removerName = remover?.fullname || "Một quản trị viên";
        
        // Tạo thông báo hệ thống
        const newNotification = {
          id: `notification-user-removed-${Date.now()}`,
          content: `${removerName} đã xóa ${removedUserName} khỏi nhóm`,
          type: "notification" as "notification",
          timestamp: new Date().toISOString(),
          sender: {
            id: "system",
            name: "Hệ thống",
            avatar: ""
          },
          isNotification: true,
          isRead: true,
          sendStatus: "sent"
        } as DisplayMessage;
        
        setMessages(prev => [...prev, newNotification]);
        
        // Cuộn xuống dưới để hiển thị thông báo mới
        setTimeout(() => {
          if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
          }
        }, 100);
      };
      
      const handleGroupOwnerChanged = (data: { conversationId: string, newOwner: string }): void => {
        // Kiểm tra xem sự kiện có thuộc cuộc trò chuyện hiện tại không
        if (conversation?.conversationId !== data.conversationId) return;
        
        // Lấy thông tin về người dùng được chuyển quyền trưởng nhóm
        const newOwnerUser = userCache[data.newOwner];
        const newOwnerName = newOwnerUser ? newOwnerUser.fullname : "Một thành viên";
        
        // Tạo thông báo hệ thống
        const newNotification = {
          id: `notification-owner-changed-${Date.now()}`,
          content: `${newOwnerName} đã trở thành trưởng nhóm mới`,
          type: "notification" as "notification",
          timestamp: new Date().toISOString(),
          sender: {
            id: "system",
            name: "Hệ thống",
            avatar: ""
          },
          isNotification: true,
          isRead: true,
          sendStatus: "sent"
        } as DisplayMessage;
        
        setMessages(prev => [...prev, newNotification]);
        
        // Cuộn xuống dưới để hiển thị thông báo mới
        setTimeout(() => {
          if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
          }
        }, 100);
      };
      
      // Đăng ký trực tiếp với đối tượng socket để đảm bảo hoạt động đúng
      if (socketService.socketInstance) {
        socketService.socketInstance.on('userBlocked', handleUserBlocked);
        socketService.socketInstance.on('userUnblocked', handleUserUnblocked);
        socketService.socketInstance.on('userLeftGroup', handleUserLeftGroup);
        socketService.socketInstance.on('groupDeleted', handleGroupDeleted);
        socketService.socketInstance.on('groupCoOwnerRemoved', handleGroupCoOwnerRemoved);
        socketService.socketInstance.on('groupCoOwnerAdded', handleGroupCoOwnerAdded);
        socketService.socketInstance.on('groupOwnerChanged', handleGroupOwnerChanged);
        socketService.socketInstance.on('userRemovedFromGroup', handleUserRemovedFromGroup);
        socketService.socketInstance.on('userAddedToGroup', handleUserAddedToGroup);
        socketService.socketInstance.on('groupNameChanged', handleGroupNameChanged);
        socketService.socketInstance.on('groupAvatarChanged', handleGroupAvatarChanged);
      } else {
        console.warn("[ChatArea] Socket instance not available, using wrapper methods");
        socketService.onUserBlocked(handleUserBlocked);
        socketService.onUserUnblocked(handleUserUnblocked);
        socketService.onUserLeftGroup(handleUserLeftGroup);
        socketService.onGroupDeleted(handleGroupDeleted);
        socketService.onGroupCoOwnerRemoved(handleGroupCoOwnerRemoved);
        socketService.onGroupCoOwnerAdded(handleGroupCoOwnerAdded);
        socketService.onGroupOwnerChanged(handleGroupOwnerChanged);
        socketService.onUserRemovedFromGroup(handleUserRemovedFromGroup);
        socketService.onUserAddedToGroup(handleUserAddedToGroup);
        socketService.onGroupNameChanged(handleGroupNameChanged);
        socketService.onGroupAvatarChanged(handleGroupAvatarChanged);
      }
      
      // Cleanup khi unmount hoặc change conversation
      return () => {
        // Hủy đăng ký các sự kiện
        socketService.off("newMessage", handleNewMessage);
        socketService.off("userTyping", handleUserTyping);
        socketService.off("messageRead", handleMessageRead);
        socketService.off("messageDelivered", handleMessageDelivered);
        
        // Hủy đăng ký trực tiếp
        if (socketService.socketInstance) {
          socketService.socketInstance.off('userBlocked', handleUserBlocked);
          socketService.socketInstance.off('userUnblocked', handleUserUnblocked);
          socketService.socketInstance.off('userLeftGroup', handleUserLeftGroup);
          socketService.socketInstance.off('groupDeleted', handleGroupDeleted);
          socketService.socketInstance.off('groupCoOwnerRemoved', handleGroupCoOwnerRemoved);
          socketService.socketInstance.off('groupCoOwnerAdded', handleGroupCoOwnerAdded);
          socketService.socketInstance.off('groupOwnerChanged', handleGroupOwnerChanged);
          socketService.socketInstance.off('userRemovedFromGroup', handleUserRemovedFromGroup);
          socketService.socketInstance.off('userAddedToGroup', handleUserAddedToGroup);
          socketService.socketInstance.off('groupNameChanged', handleGroupNameChanged);
          socketService.socketInstance.off('groupAvatarChanged', handleGroupAvatarChanged);
        } else {
          socketService.off("userBlocked", handleUserBlocked);
          socketService.off("userUnblocked", handleUserUnblocked);
          socketService.off("userLeftGroup", handleUserLeftGroup);
          socketService.off("groupDeleted", handleGroupDeleted);
          socketService.off("groupCoOwnerRemoved", handleGroupCoOwnerRemoved);
          socketService.off("groupCoOwnerAdded", handleGroupCoOwnerAdded);
          socketService.off("groupOwnerChanged", handleGroupOwnerChanged);
          socketService.off("userRemovedFromGroup", handleUserRemovedFromGroup);
          socketService.off("userAddedToGroup", handleUserAddedToGroup);
          socketService.off("groupNameChanged", handleGroupNameChanged);
          socketService.off("groupAvatarChanged", handleGroupAvatarChanged);
        }
        
        // Xóa tất cả timers
        Object.values(typingTimers).forEach(timer => clearTimeout(timer));
      };
    } else if (conversation && conversation.conversationId) {
      console.error(
        `Conversation ID không hợp lệ: ${conversation.conversationId}`
      );
      setError(
        `ID cuộc trò chuyện không hợp lệ. Vui lòng thử lại hoặc chọn cuộc trò chuyện khác.`
      );
    }
  }, [conversation?.conversationId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Xử lý đánh dấu đã đọc khi cuộn đến tin nhắn mới
  useEffect(() => {
    // Đánh dấu các tin nhắn mới (từ người khác) là đã đọc khi hiển thị
    if (isValidConversation && messages.length > 0 && conversation) {
      // Lọc các tin nhắn từ người khác, chưa được đọc
      const unreadMessages = messages
        .filter(msg => 
          msg.sender.id !== currentUserId && 
          (!msg.readBy || !msg.readBy.includes(currentUserId))
        )
        .map(msg => msg.id);
      
      if (unreadMessages.length > 0) {
        socketService.markMessagesAsRead(conversation.conversationId, unreadMessages);
      }
    }
  }, [messages, currentUserId, conversation?.conversationId, isValidConversation]);

  // UseEffect để áp dụng logic loại bỏ tin nhắn trùng lặp khi danh sách tin nhắn thay đổi
  useEffect(() => {
    // Nếu không áp dụng deduplication liên tục, hiệu suất sẽ tốt hơn
    // Chỉ áp dụng khi số lượng tin nhắn vượt quá một ngưỡng nhất định
    if (messages.length > 10) {
      const deduplicatedMessages = deduplicateMessages(messages);
      
      // Chỉ cập nhật nếu số lượng tin nhắn đã thay đổi để tránh vòng lặp vô hạn
      if (deduplicatedMessages.length !== messages.length) {
        setMessages(deduplicatedMessages);
      }
    }
  }, [messages]);


  // Xử lý khi tập tin được chọn
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Check if these are image files being uploaded directly
    const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
    
    // If images are selected and they're coming from the image input, send them directly
    if (imageFiles.length > 0 && e.target.accept === 'image/*') {
      handleSendImage(imageFiles[0]);
      return;
    }

    // For non-image files or mixed files, add to attachments as before
    const newFiles = Array.from(files);
    setAttachments((prev) => [...prev, ...newFiles]);

    // Reset input để có thể chọn lại cùng tập tin
    e.target.value = "";
  };

  // Handle direct image uploads using the new API
  const handleSendImage = async (imageFile: File) => {
    if (!isValidConversation) return;
    
    // Create and display a local message while sending
    const tempId = `temp-${Date.now()}`;
    const localImageUrl = URL.createObjectURL(imageFile);
    
    // Tạo đối tượng attachment nhất quán
    const attachmentObj = {
      url: localImageUrl,
      type: imageFile.type,
      name: imageFile.name,
      size: imageFile.size,
    };
    
    // Tạo tin nhắn tạm thời với cả hai trường attachment và attachments
    const localMessage: DisplayMessage = {
      id: tempId,
      content: "",
      timestamp: new Date().toISOString(),
      sender: {
        id: currentUserId,
        name: "You",
        avatar: userCache[currentUserId]?.urlavatar || "",
      },
      type: "image",
      sendStatus: "sending",
      // Đặt cả hai trường
      attachments: [attachmentObj],
      attachment: attachmentObj,
      // Đặt fileUrl cho hiển thị ngay lập tức
      fileUrl: localImageUrl,
    };

    // Thêm tin nhắn tạm thời vào danh sách
    setMessages((prev) => [...prev, localMessage]);
    scrollToBottomSmooth();

    try {
      setIsUploading(true);
      
      // Gửi ảnh bằng API
      const newMessage = await sendImageMessage(conversation.conversationId, imageFile);

      if (!newMessage || !newMessage.messageDetailId) {
        throw new Error("Không nhận được phản hồi hợp lệ từ server");
      }


      // Tạo sender từ cache
      const sender = userCache[currentUserId] || {
        fullname: "Bạn",
        urlavatar: "",
      };
      
      // Chuẩn hóa dữ liệu attachment và attachments từ phản hồi của server
      let mainAttachment = null;
      let attachmentsArray: Array<{ url: string; type: string; name?: string; size?: number }> = [];
      let tempAttachmentData: Array<{ url: string; type: string; name?: string; size?: number }> = [];
      let messageType = newMessage.type || "image";
      
      // Xử lý trường attachment
      if (newMessage.attachment && typeof newMessage.attachment === 'object' && 'url' in newMessage.attachment) {
        mainAttachment = newMessage.attachment;
      }
      
      // Xử lý trường attachments
      if (newMessage.attachments) {
        // Nếu là string, parse thành array
        if (typeof newMessage.attachments === 'string') {
          try {
            const parsed = JSON.parse(newMessage.attachments);
            if (Array.isArray(parsed)) {
              attachmentsArray = parsed;
            }
          } catch (e) {
            console.error('Lỗi parse attachments string:', e);
          }
        } 
        // Nếu đã là array, sử dụng trực tiếp
        else if (Array.isArray(newMessage.attachments)) {
          attachmentsArray = newMessage.attachments;
        }
      }
      
      // Đảm bảo cả hai trường đều có dữ liệu nhất quán
      if (!mainAttachment && attachmentsArray.length > 0) {
        mainAttachment = attachmentsArray[0];
      }
      
      if (mainAttachment && attachmentsArray.length === 0) {
        attachmentsArray = [mainAttachment];
      }
      
      // Tạo tin nhắn thực từ phản hồi server
      const realMessage: DisplayMessage = {
        id: newMessage.messageDetailId,
        content: newMessage.content || "Hình ảnh",
        timestamp: newMessage.createdAt,
        sender: {
          id: newMessage.senderId,
          name: sender.fullname,
          avatar: sender.urlavatar,
        },
        type: "image",
        isRead: Array.isArray(newMessage.readBy) && newMessage.readBy.length > 0,
        readBy: newMessage.readBy || [],
        deliveredTo: newMessage.deliveredTo || [],
        sendStatus: determineMessageStatus(newMessage, currentUserId),
      };
      
      // Đặt các trường liên quan đến hình ảnh
      if (mainAttachment && mainAttachment.url) {
        realMessage.fileUrl = mainAttachment.url;
        realMessage.attachment = mainAttachment;
      } else {
        // Nếu không có URL từ server, giữ URL tạm thời
        realMessage.fileUrl = localImageUrl;
        realMessage.attachment = attachmentObj;
      }
      
      if (attachmentsArray.length > 0) {
        realMessage.attachments = attachmentsArray;
      } else {
        realMessage.attachments = [attachmentObj];
      }
      
      // Thêm thông tin tập tin đính kèm
      if (messageType === "text-with-image" && newMessage.attachment) {
        // Xử lý tin nhắn với ảnh paste
        const imageAttachment = newMessage.attachment;
        
        // Cập nhật loại tin nhắn và set lại loại tin nhắn đúng
        realMessage.type = "text-with-image";
        
        // Thiết lập các trường cho tin nhắn ảnh
        realMessage.fileUrl = imageAttachment.url;
        realMessage.attachment = imageAttachment;
        realMessage.attachments = [imageAttachment];
        
        // Log để kiểm tra
      }
      else if ((messageType === "file" || messageType === "image") && attachments.length > 0 && tempAttachmentData.length > 0) {
        // Tạo đối tượng attachment cho các loại tin nhắn có file đính kèm
        const fileAttachmentObj = {
          url: tempAttachmentData[0]?.url,
          type: attachments[0].type,
          name: attachments[0].name,
          size: attachments[0].size,
        };

        // Thiết lập các trường cụ thể dựa trên loại tin nhắn
        if (messageType === "file") {
          realMessage.fileName = attachments[0].name;
          realMessage.fileSize = attachments[0].size;
        }
        
        // Thiết lập fileUrl và đảm bảo cả hai trường attachment và attachments
        realMessage.fileUrl = tempAttachmentData[0]?.url;
        realMessage.attachment = fileAttachmentObj;
        realMessage.attachments = [fileAttachmentObj];
        
      }

      // Update message in the list
      setMessages((prev) =>
        prev.map((msg) => (msg.id === tempId ? realMessage : msg))
      );

      // Update conversation list with new message
      updateConversationWithNewMessage(conversation.conversationId, {
        content: newMessage.content,
        type: newMessage.type,
        createdAt: newMessage.createdAt,
        senderId: newMessage.senderId
      });
      
    } catch (error: any) {
      console.error("Lỗi khi gửi hình ảnh:", error);
      // Mark temporary message as error
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === tempId
            ? {
                ...msg,
                content: error.message
                  ? `Hình ảnh (${error.message})`
                  : `Hình ảnh (Không gửi được)`,
                isError: true,
              }
            : msg
        )
      );
      message.error(error.message || "Không thể gửi hình ảnh");
    } finally {
      setIsUploading(false);
    }
  };

  // Xóa tập tin khỏi danh sách đính kèm
  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  // Gửi tin nhắn với tập tin đính kèm
  const handleSendMessage = async () => {
    // Kiểm tra xem có nội dung gì để gửi không (văn bản, tập tin, hoặc ảnh paste)
    if (
      (!inputValue.trim() && attachments.length === 0 && !pastedImage) ||
      !isValidConversation
    )
      return;
    
    const tempContent = inputValue;
    setInputValue(""); // Reset input ngay lập tức

    // Xác định loại tin nhắn
    let messageType = "text";
    
    // Kiểm tra xem có ảnh được paste không
    if (pastedImage) {
      messageType = "text-with-image";
    }
    // Nếu không có ảnh paste thì kiểm tra attachments
    else if (attachments.length > 0) {
      // Nếu có nhiều tập tin hoặc không phải hình ảnh, thì là 'file'
      if (attachments.length > 1) {
        messageType = "file";
      } else {
        // Nếu chỉ có 1 tập tin, kiểm tra xem có phải là hình ảnh không
        const fileType = attachments[0].type;
        messageType = fileType.startsWith("image/") ? "image" : "file";
      }
    }
    
    // Tạo đối tượng cho ảnh đính kèm (từ paste hoặc attachment)
    let attachmentObj = null;
    if (pastedImage) {
      attachmentObj = {
        url: pastedImagePreview as string,
        type: pastedImage.type,
        name: pastedImage.name || 'pasted-image.png',
        size: pastedImage.size,
      };
    } else if (messageType === "image" && attachments.length > 0) {
      attachmentObj = {
        url: URL.createObjectURL(attachments[0]),
        type: attachments[0].type,
        name: attachments[0].name,
        size: attachments[0].size,
      };
    }
    
    // Tạo tin nhắn tạm thời để hiển thị ngay
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const tempMessage: DisplayMessage = {
      id: tempId,
      content: tempContent || (
        messageType === "image" ? "Đang gửi hình ảnh..." :
        messageType === "text-with-image" ? tempContent :
        messageType === "file" ? "Đang gửi tập tin..." : ""
      ),
      timestamp: new Date().toISOString(),
      sender: {
        id: currentUserId,
        name: "Bạn",
        avatar: userCache[currentUserId]?.urlavatar || "",
      },
      type: messageType as "text" | "image" | "file" | "text-with-image",
      isRead: false,
      sendStatus: "sending",
      readBy: [],
      deliveredTo: [],
    };
    
    // Thêm thông tin tập tin nếu có
    if (attachmentObj) {
      tempMessage.fileUrl = attachmentObj.url;
      tempMessage.attachment = attachmentObj;
      tempMessage.attachments = [attachmentObj];
      
      if (messageType === "file") {
        tempMessage.fileName = attachmentObj.name;
        tempMessage.fileSize = attachmentObj.size;
      }
    }

    // Hiển thị tin nhắn tạm thời - Thêm vào cuối danh sách
    setMessages((prev) => [...prev, tempMessage]);
    scrollToBottomSmooth();

    try {
      setIsUploading(true);
      let newMessage;
      // Chuẩn bị mảng attachments để gửi lên server
      const tempAttachmentData = [];

      // Xử lý dựa trên loại tin nhắn
      if (messageType === "text-with-image" && pastedImage) {
        // Gửi tin nhắn kèm ảnh đã paste
        newMessage = await sendMessageWithImage(
          conversation.conversationId,
          tempContent,
          pastedImage
        );
        
        // Xóa ảnh đã paste sau khi gửi
        handleRemovePastedImage();
      } else {
        // Nếu có tập tin đính kèm, xử lý tải lên
        if (attachments.length > 0) {
          for (const file of attachments) {
            // Tạo một đối tượng FormData để tải lên tập tin
            const formData = new FormData();
            formData.append("file", file);

            // Giả lập trong trường hợp chưa có API tải lên
            tempAttachmentData.push({
              url: URL.createObjectURL(file),
              type: file.type,
              name: file.name,
              size: file.size,
            });
          }
        }

        // Gửi tin nhắn với tập tin đính kèm
        newMessage = await sendMessage(
          conversation.conversationId,
          tempContent,
          messageType,
          tempAttachmentData
        );
      }
      
      if (!newMessage || !newMessage.messageDetailId) {
        throw new Error("Không nhận được phản hồi hợp lệ từ server");
      }
      
      // Thay thế tin nhắn tạm bằng tin nhắn thật
      const sender = userCache[currentUserId] || {
        fullname: "Bạn",
        urlavatar: "",
      };
      const realMessage: DisplayMessage = {
        id: newMessage.messageDetailId,
        content: newMessage.content,
        timestamp: newMessage.createdAt,
        sender: {
          id: newMessage.senderId,
          name: sender.fullname,
          avatar: sender.urlavatar,
        },
        type: messageType as "text" | "image" | "file",
        isRead: Array.isArray(newMessage.readBy) && newMessage.readBy.length > 0,
        readBy: newMessage.readBy || [],
        deliveredTo: newMessage.deliveredTo || [],
        sendStatus: "sent", // Đặt rõ ràng trạng thái ban đầu khi gửi thành công là "sent"
        // Lưu ID tạm thời để hỗ trợ việc cập nhật
        tempId: tempId,
        isRecall: newMessage.isRecall || false,
        hiddenFrom: newMessage.hiddenFrom || [],
        isPinned: newMessage.isPinned || false
      };
      // Đặt các trường liên quan đến hình ảnh
      if (newMessage.attachment && newMessage.attachment.url) {
        realMessage.fileUrl = newMessage.attachment.url;
        realMessage.attachment = newMessage.attachment;
      } else if (tempAttachmentData.length > 0) {
        // Nếu không có URL từ server, giữ URL tạm thời
        realMessage.fileUrl = tempAttachmentData[0]?.url;
        realMessage.attachment = tempAttachmentData[0];
      }
      
      if (tempAttachmentData.length > 0) {
        realMessage.attachments = tempAttachmentData;
      } else if (attachmentObj) {
        realMessage.attachments = [attachmentObj];
      }
      
      // Thêm thông tin tập tin đính kèm
      if (messageType === "text-with-image" && newMessage.attachment) {
        // Xử lý tin nhắn với ảnh paste
        const imageAttachment = newMessage.attachment;
        
        // Cập nhật loại tin nhắn và set lại loại tin nhắn đúng
        realMessage.type = "text-with-image";
        
        // Thiết lập các trường cho tin nhắn ảnh
        realMessage.fileUrl = imageAttachment.url;
        realMessage.attachment = imageAttachment;
        realMessage.attachments = [imageAttachment];
      }
      else if ((messageType === "file" || messageType === "image") && attachments.length > 0 && tempAttachmentData.length > 0) {
        // Tạo đối tượng attachment cho các loại tin nhắn có file đính kèm
        const fileAttachmentObj = {
          url: tempAttachmentData[0]?.url,
          type: attachments[0].type,
          name: attachments[0].name,
          size: attachments[0].size,
        };

        // Thiết lập các trường cụ thể dựa trên loại tin nhắn
        if (messageType === "file") {
          realMessage.fileName = attachments[0].name;
          realMessage.fileSize = attachments[0].size;
        }
        
        // Thiết lập fileUrl và đảm bảo cả hai trường attachment và attachments
        realMessage.fileUrl = tempAttachmentData[0]?.url;
        realMessage.attachment = fileAttachmentObj;
        realMessage.attachments = [fileAttachmentObj];
      }

      // Cập nhật danh sách tin nhắn dựa trên hướng tải và áp dụng deduplication
      setMessages((prev) => {
        // Kiểm tra xem tin nhắn thực đã tồn tại trong danh sách chưa (bằng ID)
        const realMessageExists = prev.some(msg => msg.id === realMessage.id);
        
        // Kiểm tra xem tin nhắn tạm còn tồn tại không 
        const tempMessageExists = prev.some(msg => msg.id === tempId);
        
        // Thêm kiểm tra tin nhắn trùng lặp dựa trên nội dung
        // Tìm các tin nhắn có cùng nội dung, gửi bởi cùng người, trong khoảng thời gian 5 giây
        const similarMessages = prev.filter(msg => 
          msg.id !== tempId && // không phải tin nhắn tạm hiện tại
          msg.id !== realMessage.id && // không phải tin nhắn thực hiện tại
          msg.sender.id === realMessage.sender.id && // cùng người gửi
          msg.content === realMessage.content && // cùng nội dung
          Math.abs(new Date(msg.timestamp).getTime() - new Date(realMessage.timestamp).getTime()) < 5000 // trong vòng 5 giây
        );
        
        if (realMessageExists && tempMessageExists) {
          // Tin nhắn thực đã tồn tại và tin nhắn tạm vẫn còn - chỉ loại bỏ tin nhắn tạm
          const result = prev.filter(msg => msg.id !== tempId);
          
          // Loại bỏ thêm các tin nhắn trùng lặp nếu có
          if (similarMessages.length > 0) {
            return result.filter(msg => !similarMessages.some(similar => similar.id === msg.id));
          }
          
          return result;
        } else if (realMessageExists) {
          
          // Loại bỏ các tin nhắn trùng lặp nếu có
          if (similarMessages.length > 0) {
            return prev.filter(msg => !similarMessages.some(similar => similar.id === msg.id));
          }
          
          return prev;
        } else if (tempMessageExists) {
          // Tin nhắn tạm tồn tại, tin nhắn thực chưa có - thay thế tin nhắn tạm bằng tin nhắn thực
          const result = prev.map(msg => msg.id === tempId ? realMessage : msg);
          
          // Loại bỏ thêm các tin nhắn trùng lặp nếu có
          if (similarMessages.length > 0) {
            return result.filter(msg => !similarMessages.some(similar => similar.id === msg.id));
          }
          
          return result;
        } else {
          // Không tìm thấy cả tin nhắn tạm và tin nhắn thực - thêm tin nhắn thực vào
          // Điều này chỉ xảy ra trong trường hợp hiếm gặp khi tin nhắn tạm đã bị xóa bằng cách nào đó
          
          // Loại bỏ các tin nhắn trùng lặp nếu có, sau đó thêm tin nhắn mới
          if (similarMessages.length > 0) {
            return [...prev.filter(msg => !similarMessages.some(similar => similar.id === msg.id)), realMessage];
          }
          
          return [...prev, realMessage];
        }
      });

      // Cập nhật ChatList với tin nhắn mới
      updateConversationWithNewMessage(conversation.conversationId, {
        content: newMessage.content,
        type: newMessage.type,
        createdAt: newMessage.createdAt,
        senderId: newMessage.senderId
      });

      // Xóa danh sách tập tin đính kèm sau khi gửi
      setAttachments([]);

      // Sau khi gửi thành công, kiểm tra người nhận có đang xem conversation không để cập nhật trạng thái
      const activeUsers = socketService.getActiveUsersInConversation(conversation.conversationId);
      const otherActiveUsers = activeUsers.filter(id => id !== currentUserId);
      
      // Nếu có người nhận đang active, cập nhật trạng thái tin nhắn ngay lập tức
      if (otherActiveUsers.length > 0) {
        // Cập nhật UI để hiển thị trạng thái "đã đọc" ngay
        setMessages(prev => 
          prev.map(msg => {
            if (msg.id === tempId || msg.id === newMessage.messageDetailId) {
              return {
                ...msg,
                id: newMessage.messageDetailId || msg.id,
                deliveredTo: otherActiveUsers,
                sendStatus: "delivered" // Hoặc "read" nếu đã đọc
              };
            }
            return msg;
          })
        );
      }
    } catch (error: any) {
      console.error("Lỗi khi gửi tin nhắn:", error);
      // Đánh dấu tin nhắn tạm là lỗi
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === tempId 
            ? {
                ...msg,
                content: error.message
                  ? `${msg.content} (${error.message})`
                  : `${msg.content} (Không gửi được)`,
                isError: true,
              }
            : msg
        )
      );
      message.error(error.message || "Không thể gửi tin nhắn");
    } finally {
      setIsUploading(false);
      // Focus the input field after message is sent
      if (inputRef.current) {
        setTimeout(() => inputRef.current.focus(), 0);
      }
    }
  };

  // Forward message modal
  const handleSendForwardMessage = async () => {
    if (!forwardingMessage || !selectedConversationForForward) {
      message.error("Cannot forward message: missing conversation or message");
      return;
    }

    try {
      // Xử lý theo loại tin nhắn
      if (forwardingMessage.type === "image" && forwardingMessage.attachment) {
        // Forward image message with attachment
        await forwardImageMessage(
          forwardingMessage.id,
          selectedConversationForForward,
          forwardingMessage.attachment
        );
      } else if (forwardingMessage.type === "video" && forwardingMessage.attachment) {
        // Đặc biệt cho video - tải lại video từ URL và gửi
        try {
          // Tải file từ URL
          const videoResponse = await fetch(forwardingMessage.attachment.url);
          const videoBlob = await videoResponse.blob();
          const videoFile = new File(
            [videoBlob], 
            forwardingMessage.attachment.name || "forwarded-video.mp4", 
            { type: 'video/mp4' }
          );
          
          // Gửi qua socketService
          await socketService.sendFileMessage(selectedConversationForForward, videoFile);
          
          message.success("Video forwarded successfully");
        } catch (videoError) {
          console.error("Error forwarding video:", videoError);
          message.error("Failed to forward video");
        }
      } else if (forwardingMessage.type === "text-with-image" && forwardingMessage.attachment && forwardingMessage.content) {
        // Forward text with image using sendMessageWithImage
        const imageFile = await fetch(forwardingMessage.attachment.url)
          .then(res => res.blob())
          .then(blob => new File([blob], forwardingMessage.attachment?.name || "forwarded-image.jpg", { type: blob.type }));
        
        await sendMessageWithImage(
          selectedConversationForForward,
          forwardingMessage.content,
          imageFile
        );
      } else if (forwardingMessage.type === "file" && forwardingMessage.attachment) {
        // Forward file message - tải lại file từ URL và gửi
        try {
          // Tải file từ URL
          const fileResponse = await fetch(forwardingMessage.attachment.url);
          const fileBlob = await fileResponse.blob();
          const fileObject = new File(
            [fileBlob], 
            forwardingMessage.attachment.name || "forwarded-file", 
            { type: fileBlob.type }
          );
          
          // Gửi qua socketService
          await socketService.sendFileMessage(selectedConversationForForward, fileObject);
          
          message.success("File forwarded successfully");
        } catch (fileError) {
          console.error("Error forwarding file:", fileError);
          message.error("Failed to forward file");
        }
      } else if (forwardingMessage.content) {
        // Forward regular text message
        await sendMessage(
          selectedConversationForForward,
          forwardingMessage.content,
          "text"
        );
      } else {
        message.error("Cannot forward empty message");
        return;
      }
      
      setShowForwardModal(false);
      setForwardingMessage(null);
      setSelectedConversationForForward(null);
    } catch (error) {
      console.error("Error forwarding message:", error);
      message.error("Failed to forward message");
    }
  };

  // Helper function to get the name of the other user in a 1-on-1 conversation
  const getOtherUserName = (conv: Conversation): string => {
    const currentUserId = localStorage.getItem('userId') || '';
    
    if (conv.isGroup) {
      return conv.groupName || 'Group Chat';
    }
    
    const otherUserId = conv.creatorId === currentUserId ? conv.receiverId : conv.creatorId;
    const user = userCache[otherUserId || ''];
    
    return user?.fullname || 'User';
  };

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "auto" });
    }
  };

  // Thêm hàm scrollToBottomSmooth để cuộn mượt trong các trường hợp cần thiết
  const scrollToBottomSmooth = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (replyingToMessage) {
        handleSendReplyMessage();
      } else {
        handleSendMessage();
      }
    }
  };

  // Kiểm tra xem tin nhắn có phải của người dùng hiện tại không
  const isOwnMessage = (senderId: string) => senderId === currentUserId;

  // Hàm làm mới danh sách cuộc trò chuyện
  const handleRefreshConversations = async () => {
    try {
      setRefreshing(true);
      
      // Gọi API trực tiếp để lấy lại danh sách cuộc trò chuyện
      await fetchConversations();
      
      // Thông báo cho người dùng
      
      // Thiết lập lại trạng thái not-found
      setNotFound(false);
      
      // Thông báo cho người dùng chọn cuộc trò chuyện mới
      setError("Vui lòng chọn lại cuộc trò chuyện từ danh sách.");
    } catch (error) {
      console.error("Lỗi khi làm mới danh sách cuộc trò chuyện:", error);
      message.error("Không thể làm mới danh sách cuộc trò chuyện");
    } finally {
      setRefreshing(false);
    }
  };

  // Handle emoji selection
  const handleEmojiSelect = (emoji: any) => {
    setInputValue((prev) => prev + emoji.native);
    // Không đóng emoji picker sau khi chọn, cho phép chọn nhiều emoji
    // setEmojiPickerVisible(false);
  };

  // Toggle emoji picker visibility
  const toggleEmojiPicker = () => {
    setEmojiPickerVisible(!emojiPickerVisible);
  };

  // Close emoji picker
  const closeEmojiPicker = useCallback(() => {
    setEmojiPickerVisible(false);
  }, []);

  // Add click outside handler for emoji picker with improved detection
  useEffect(() => {
    if (emojiPickerVisible) {
      const handleClickOutside = (event: MouseEvent) => {
        const target = event.target as Element;
        const emojiPicker = document.querySelector(".emoji-picker-container");

        // Close emoji picker if clicked outside of it and not on the emoji button
        if (
          emojiPicker &&
          !emojiPicker.contains(target) &&
          !target.closest(".emoji-button")
        ) {
          closeEmojiPicker();
        }
      };

      // Use mousedown for more reliable detection
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [emojiPickerVisible, closeEmojiPicker]);

  // Custom CSS for emoji picker to fix nested container issues
  useEffect(() => {
    // Add style to fix emoji-mart nested container issues
    if (emojiPickerVisible) {
      // Add a small delay to ensure the element is in the DOM
      setTimeout(() => {
        const emojiPickerElement = document.querySelector(
          ".emoji-picker-container em-emoji-picker"
        );
        if (emojiPickerElement) {
          (emojiPickerElement as HTMLElement).style.border = "none";
          (emojiPickerElement as HTMLElement).style.boxShadow = "none";
          (emojiPickerElement as HTMLElement).style.height = "350px";
          (emojiPickerElement as HTMLElement).style.width = "320px";
        }
      }, 50);
    }
  }, [emojiPickerVisible]);

  // Handle attachments for different types
  const handleImageClick = () => {
    imageInputRef.current?.click();
  };


  // Add the determineMessageStatus function before it's used
  const determineMessageStatus = (msg: any, currentUserId: string): string => {
    
    if (msg.senderId === currentUserId) {
      // 1. Nếu có trạng thái gửi cụ thể
      if (msg.sendStatus === "read") {
        return "read";
      }
      
      // 2. Kiểm tra trực tiếp mảng readBy
      if (Array.isArray(msg.readBy) && msg.readBy.length > 0) {
        // Nếu có ít nhất một người khác đã đọc tin nhắn (không tính người gửi)
        const otherReadersCount = msg.readBy.filter((id: string) => id !== currentUserId).length;
        if (otherReadersCount > 0) {
          return "read";
        }
      }
      
      // 3. Kiểm tra trạng thái delivered
      if (msg.sendStatus === "delivered") {
        return "delivered";
      }
      
      // 4. Kiểm tra mảng deliveredTo
      if (Array.isArray(msg.deliveredTo) && msg.deliveredTo.length > 0) {
        // Nếu có ít nhất một người khác đã nhận tin nhắn (không tính người gửi)
        const otherReceiversCount = msg.deliveredTo.filter((id: string) => id !== currentUserId).length;
        if (otherReceiversCount > 0) {
          return "delivered";
        }
      }
      
      // 5. Kiểm tra trạng thái gửi khác
      if (msg.sendStatus === "sending") {
        return "sending";
      }
      
      // Mặc định trạng thái đã gửi nếu không có thông tin khác
      return "sent";
    }
    
    // Với tin nhắn nhận được, luôn đánh dấu là "received"
    return "received";
  };
  

  // Thêm hàm xử lý sự kiện paste
  const handlePaste = useCallback((e: ClipboardEvent) => {
    // Kiểm tra xem có ảnh trong clipboard không
    const items = e.clipboardData?.items;
    if (!items) return;

    // Tìm item có type là image
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        e.preventDefault(); // Ngăn hành vi paste mặc định
        
        // Lấy file từ clipboard
        const file = items[i].getAsFile();
        if (!file) continue;
        
        // Tạo URL preview cho ảnh
        const url = URL.createObjectURL(file);
        
        // Lưu ảnh vào state
        setPastedImage(file);
        setPastedImagePreview(url);
        
        // Thông báo cho người dùng
        message.success("Đã dán ảnh vào tin nhắn. Nhấn gửi để gửi tin nhắn kèm ảnh.", 2);
        
        break;
      }
    }
  }, []);

  // Thêm effect để xử lý sự kiện paste
  useEffect(() => {
    // Thêm event listener khi component được mount
    document.addEventListener('paste', handlePaste);
    
    // Cleanup khi component unmount
    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, [handlePaste]);

  // Thêm hàm để xóa ảnh đã paste
  const handleRemovePastedImage = () => {
    if (pastedImagePreview) {
      URL.revokeObjectURL(pastedImagePreview);
    }
    setPastedImage(null);
    setPastedImagePreview(null);
  };

  // Cập nhật handleInputChange để gửi sự kiện typing
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    
    // Gửi sự kiện typing nếu người dùng đang nhập
    if (isValidConversation && value.trim().length > 0) {
      const fullname = userCache[currentUserId]?.fullname || "Người dùng";
      socketService.sendTyping(conversation.conversationId, fullname);
    }
  };

  // Handle image click to open the modal
  const handleImagePreview = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    setIsImageModalOpen(true);
  };
  
  // Handle file download image in text-with-image function
  const handleDownloadFile = (url?: string, fileName?: string) => {
    if (!url) {
      message.error("URL tải xuống không có sẵn");
      return;
    }
    
    try {
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Lỗi khi tải xuống tập tin:", error);
      message.error("Không thể tải xuống tập tin. Vui lòng thử lại sau.");
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

  // Thêm hàm lọc tin nhắn trùng lặp trước khi render
  const deduplicateMessages = (messagesToDeduplicate: DisplayMessage[]): DisplayMessage[] => {
    if (!messagesToDeduplicate.length) return [];
    
    // Get current user ID to check hidden messages
    const currentUserId = localStorage.getItem("userId") || "";
    
    // First filter out any messages that should be hidden from current user
    const visibleMessages = messagesToDeduplicate.filter(msg => 
      !Array.isArray(msg.hiddenFrom) || !msg.hiddenFrom.includes(currentUserId)
    );
    
    // Sắp xếp tin nhắn theo thời gian để đảm bảo thứ tự đúng
    const sortedMessages = [...visibleMessages].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    
    const uniqueMessages: DisplayMessage[] = [];
    const seenMessages = new Set<string>(); // Set của các key đã thấy
    const processedIds = new Set<string>(); // Set của các ID đã xử lý
    
    // Tạo map tin nhắn tạm thời và tin nhắn thực
    const tempToRealMap = new Map<string, string>();
    
    // Đầu tiên, xác định các cặp tin nhắn tạm - tin nhắn thực
    for (const message of sortedMessages) {
      if (message.tempId && !message.id.startsWith('temp-')) {
        tempToRealMap.set(message.tempId, message.id);
      }
    }
    
    for (const message of sortedMessages) {
      // Bỏ qua tin nhắn tạm nếu đã có tin nhắn thực tương ứng
      if (message.id.startsWith('temp-') && tempToRealMap.has(message.id)) {
        continue;
      }
      
      // Bỏ qua tin nhắn đã xử lý
      if (processedIds.has(message.id)) {
        continue;
      }
      
      // Đánh dấu ID này đã được xử lý
      processedIds.add(message.id);
      
      // Tạo khóa nội dung dựa trên loại tin nhắn
      let contentKey = '';
      if (message.type === 'image') {
        const imageUrl = message.fileUrl || 
                        (message.attachment && message.attachment.url) || 
                        (message.attachments && message.attachments.length > 0 ? message.attachments[0].url : '');
        contentKey = `${message.sender.id}:${imageUrl}:${message.type}`;
      } else if (message.type === 'file') {
        contentKey = `${message.sender.id}:${message.fileName}:${message.fileSize}:${message.type}`;
      } else {
        contentKey = `${message.sender.id}:${message.content}:${message.type}`;
      }
      
      // Nếu khóa này đã tồn tại, kiểm tra thời gian
      if (seenMessages.has(contentKey)) {
        const existingIndex = uniqueMessages.findIndex(m => {
          // Cần tạo lại key theo cùng logic để so sánh
          if (m.type === 'image') {
            const imageUrl = m.fileUrl || 
                            (m.attachment && m.attachment.url) || 
                            (m.attachments && m.attachments.length > 0 ? m.attachments[0].url : '');
            return `${m.sender.id}:${imageUrl}:${m.type}` === contentKey;
          } else if (m.type === 'file') {
            return `${m.sender.id}:${m.fileName}:${m.fileSize}:${m.type}` === contentKey;
          } else {
            return `${m.sender.id}:${m.content}:${m.type}` === contentKey;
          }
        });
        
        if (existingIndex !== -1) {
          const existingMessage = uniqueMessages[existingIndex];
          const timeDiff = Math.abs(
            new Date(message.timestamp).getTime() - new Date(existingMessage.timestamp).getTime()
          );
          
          // Mở rộng khoảng thời gian kiểm tra trùng lặp lên 10 giây
          if (timeDiff < 10000) {
            // Luôn ưu tiên tin nhắn có ID thực sự từ server
            if (message.id.startsWith('temp-') && !existingMessage.id.startsWith('temp-')) {
              // Giữ nguyên tin nhắn hiện tại (không phải temp)
              continue;
            } else if (!message.id.startsWith('temp-') && existingMessage.id.startsWith('temp-')) {
              // Thay thế tin nhắn tạm bằng tin nhắn thực
              uniqueMessages[existingIndex] = message;
              continue;
            } 
            // Nếu cả hai đều là tin nhắn tạm hoặc đều là tin nhắn thực
            else if ((message.id.startsWith('temp-') && existingMessage.id.startsWith('temp-')) ||
                     (!message.id.startsWith('temp-') && !existingMessage.id.startsWith('temp-'))) {
              
              // Ưu tiên tin nhắn có trạng thái tốt hơn
              const statusPriority = {
                'read': 4,
                'delivered': 3,
                'sent': 2,
                'sending': 1,
                'error': 0
              };
              
              const existingStatus = existingMessage.sendStatus || 'sent';
              const newStatus = message.sendStatus || 'sent';
              
              if (statusPriority[newStatus as keyof typeof statusPriority] > 
                  statusPriority[existingStatus as keyof typeof statusPriority]) {
                uniqueMessages[existingIndex] = message;
              }
              // Nếu trạng thái bằng nhau, giữ tin nhắn mới hơn
              else if (statusPriority[newStatus as keyof typeof statusPriority] === 
                      statusPriority[existingStatus as keyof typeof statusPriority] &&
                      new Date(message.timestamp) > new Date(existingMessage.timestamp)) {
                uniqueMessages[existingIndex] = message;
              }
              
              continue;
            }
          }
        }
      }
      
      // Đánh dấu đã thấy tin nhắn này
      seenMessages.add(contentKey);
      uniqueMessages.push(message);
    }

    
    // Sắp xếp lại kết quả theo thời gian để đảm bảo thứ tự đúng
    return uniqueMessages.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  };

  // Ở phần render messages, sử dụng hàm deduplicateMessages
  const messagesToRender: DisplayMessage[] = deduplicateMessages(messages);

  // Tải tin nhắn từ server
  const fetchMessages = async (
    cursor?: string,
    direction: "before" | "after" = "before"
  ) => {
    // Define currentUserId at the beginning of the function to avoid reference error
    const currentUserId = localStorage.getItem("userId") || "";
    
    if (!isValidConversation) {
      setError("Không thể tải tin nhắn. ID cuộc trò chuyện không hợp lệ.");
      return;
    }
    
    try {
      if (cursor) {
        if (direction === "before") {
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
      
      // Lấy vị trí cuộn hiện tại để khôi phục sau khi tải thêm tin nhắn cũ
      const scrollContainer = messagesContainerRef.current;
      const scrollPosition = scrollContainer ? scrollContainer.scrollTop : 0;
      const scrollHeight = scrollContainer ? scrollContainer.scrollHeight : 0;

      // Lấy tin nhắn với phân trang và hướng tải
      // Sử dụng limit=20 để lấy 20 tin nhắn gần nhất
      const result = await getMessages(
        conversation.conversationId,
        cursor,
        direction
      );
      
      const messagesData = result.messages;
      const resultDirection = result.direction || direction;

      // Cập nhật trạng thái phân trang theo hướng tải
      // Sử dụng nullish coalescing để đảm bảo giá trị boolean chính xác
      if (resultDirection === "before") {
        const hasMoreValue = result.hasMore ?? false;
        setHasMore(hasMoreValue);
        if (result.nextCursor) {
          setOldestCursor(result.nextCursor);
        }
      } else {
        const hasMoreValue = result.hasMore ?? false;
        setHasNewer(hasMoreValue);
        if (result.nextCursor) {
          setNewestCursor(result.nextCursor);
        }
      }
      
      // Kiểm tra dữ liệu trả về
      if (!Array.isArray(messagesData)) {
        console.error("Dữ liệu tin nhắn không hợp lệ:", messagesData);
        setError("Không thể tải tin nhắn. Dữ liệu không hợp lệ.");
        return;
      }
      
      if (messagesData.length === 0 && !cursor) {
        if (currentConversationIdRef.current !== conversation.conversationId) return;
        setMessages([]);
        return;
      }
      
      // Chuyển đổi Message từ API sang định dạng tin nhắn hiển thị
      const displayMessages: DisplayMessage[] = messagesData
        .map((msg) => {
        // Kiểm tra tin nhắn hợp lệ và hỗ trợ cả messageId và messageDetailId
        const messageId = msg.messageId || msg.messageDetailId;
        if (!msg || !messageId) {
            console.warn("Tin nhắn không hợp lệ:", msg);
          return null;
        }
        
          const sender = userCache[msg.senderId] || {
            fullname: "Người dùng",
            urlavatar: "",
          };
          
          // Chuẩn hóa các trường attachments và attachment
          // 1. Xử lý các trường attachments nếu nó là string (chuyển từ JSON)
          let parsedAttachments: Array<{ url: string; type: string; name?: string; size?: number }> = [];
          if (typeof msg.attachments === 'string' && msg.attachments) {
            try {
              const parsed = JSON.parse(msg.attachments);
              if (Array.isArray(parsed)) {
                parsedAttachments = parsed;
              }
            } catch (e) {
              console.error('Failed to parse attachments string:', e);
            }
          } else if (Array.isArray(msg.attachments)) {
            parsedAttachments = msg.attachments;
          }
          
          // 2. Đảm bảo cả hai trường attachment và attachments đều có giá trị nhất quán
          let mainAttachment = msg.attachment || (parsedAttachments.length > 0 ? parsedAttachments[0] : null);
          
          // Nếu có attachment nhưng không có attachments, tạo attachments từ attachment
          if (mainAttachment && parsedAttachments.length === 0) {
            parsedAttachments = [mainAttachment];
          }
          
          // Nếu có attachments nhưng không có attachment, lấy attachment từ attachments
          if (!mainAttachment && parsedAttachments.length > 0) {
            mainAttachment = parsedAttachments[0];
          }
        
          // Tạo đối tượng tin nhắn hiển thị
          const displayMessage: DisplayMessage = {
            id: messageId,
            content: msg.content || "",
            timestamp: msg.createdAt || new Date().toISOString(),
            sender: {
              id: msg.senderId || "",
              name: sender.fullname || "Người dùng",
              avatar: sender.urlavatar || "",
            },
            type: (msg.type as "text" | "image" | "file") || "text",
            isRead: Array.isArray(msg.readBy) && msg.readBy.length > 0,
            readBy: msg.readBy || [],
            deliveredTo: msg.deliveredTo || [],
            sendStatus: determineMessageStatus(msg, currentUserId),
            isRecall: msg.isRecall || false,
            hiddenFrom: msg.hiddenFrom || [],
            isPinned: msg.isPinned || false
          };
          
          // Thêm thông tin reply nếu là tin nhắn trả lời
          if (msg.isReply) {
            displayMessage.isReply = true;
            displayMessage.messageReplyId = msg.messageReplyId || null;
            
            // Kiểm tra và sử dụng dữ liệu replyData nếu có
            if (msg.replyData) {
              // Nếu replyData là string, thử parse thành object
              if (typeof msg.replyData === 'string') {
                try {
                  displayMessage.replyData = JSON.parse(msg.replyData);
                } catch (error) {
                  console.error("Error parsing replyData string:", error);
                  displayMessage.replyData = { content: msg.replyData };
                }
              } else {
                // Nếu là object, sử dụng trực tiếp
                displayMessage.replyData = msg.replyData;
              }
            } else if (msg.messageReplyId) {
              // Thêm một task để fetch dữ liệu tin nhắn gốc sau
              setTimeout(async () => {
                try {
                  const replyData = await fetchOriginalMessageForReply(msg.messageReplyId);
                  if (replyData) {
                    // Cập nhật replyData cho tin nhắn hiện tại trong state
                    setMessages(prevMessages => prevMessages.map(m => {
                      if (m.id === messageId) {
                        return { ...m, replyData };
                      }
                      return m;
                    }));
                  }
                } catch (error) {
                  console.error("Failed to fetch original message for reply:", error);
                }
              }, 0);
            }

          }
          
          // Gán cả hai trường attachment và attachments cho tin nhắn hiển thị
          if (parsedAttachments.length > 0) {
            displayMessage.attachments = parsedAttachments;
          }
          
          if (mainAttachment) {
            displayMessage.attachment = mainAttachment;
          }
          
          // Xử lý dựa trên loại tin nhắn để thiết lập các trường fileUrl, fileName, fileSize
          if (msg.type === "image") {
            // Đặt fileUrl từ attachment hoặc attachments
            if (mainAttachment && mainAttachment.url) {
              displayMessage.fileUrl = mainAttachment.url;
              // Logging để kiểm tra
              console.log(`Đã thiết lập fileUrl cho ảnh từ attachment: ${mainAttachment.url}`);
            }
          } else if (msg.type === "file") {
            if (mainAttachment && mainAttachment.url) {
              displayMessage.fileUrl = mainAttachment.url;
              displayMessage.fileName = mainAttachment.name;
              displayMessage.fileSize = mainAttachment.size;
            }
          }
          
          // Thêm log để kiểm tra dữ liệu
          if (msg.type === "image") {
            console.log(`Tin nhắn hình ảnh ${messageId}:`, {
              hasAttachment: !!displayMessage.attachment,
              hasAttachments: !!displayMessage.attachments,
              fileUrl: displayMessage.fileUrl
            });
          }

          return displayMessage;
        })
        .filter(Boolean) as DisplayMessage[]; // Lọc bỏ các tin nhắn null

      // Filter out messages that should be hidden from current user
      const filteredMessages = displayMessages.filter(msg => {
        // Filter out messages that are hidden from current user
        if (Array.isArray(msg.hiddenFrom) && msg.hiddenFrom.includes(currentUserId)) {
          return false;
        }
        return true;
      });

      // Sắp xếp tin nhắn theo thời gian tăng dần (cũ nhất lên đầu, mới nhất xuống cuối)
      const sortedMessages = [...filteredMessages].sort(
        (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      
      // Cập nhật danh sách tin nhắn dựa trên hướng tải và áp dụng deduplication
      if (cursor) {
        if (direction === "before") {
          if (currentConversationIdRef.current !== conversation.conversationId) return;
          // Thêm tin nhắn cũ vào đầu danh sách khi kéo lên và loại bỏ trùng lặp
          setMessages((prev) => {
            // Tạo danh sách tin nhắn mới bằng cách kết hợp với tin nhắn hiện tại
            const combinedMessages = [...sortedMessages, ...prev];
            
            // Áp dụng deduplication
            const dedupedMessages = deduplicateMessages(combinedMessages);
            
            
            // Khôi phục vị trí cuộn sau khi thêm tin nhắn cũ để tránh nhảy vị trí
            setTimeout(() => {
              if (scrollContainer) {
                const newScrollHeight = scrollContainer.scrollHeight;
                const heightDifference = newScrollHeight - scrollHeight;
                scrollContainer.scrollTop = scrollPosition + heightDifference;
              }
            }, 10);
            
            return dedupedMessages;
          });
      } else {
          // Thêm tin nhắn mới vào cuối danh sách khi kéo xuống và loại bỏ trùng lặp
          if (currentConversationIdRef.current !== conversation.conversationId) return;
          setMessages((prev) => {
            // Tạo danh sách tin nhắn mới bằng cách kết hợp với tin nhắn hiện tại
            const combinedMessages = [...prev, ...sortedMessages];
            
            // Áp dụng deduplication
            const dedupedMessages = deduplicateMessages(combinedMessages);
            
            
            // Cuộn xuống dưới sau khi thêm tin nhắn mới
            scrollToBottomSmooth();
            
            return dedupedMessages;
          });
        }
      } else {
        // Thay thế hoàn toàn nếu là lần tải đầu tiên, đảm bảo tin nhắn cũ lên đầu
        // Áp dụng deduplication
        if (currentConversationIdRef.current !== conversation.conversationId) return;
        const dedupedMessages = deduplicateMessages(sortedMessages);
        
        
        setMessages(dedupedMessages);

        // Cuộn xuống sau khi tải xong - giảm thời gian đợi để cuộn ngay lập tức
        setTimeout(scrollToBottom, 10);
      }
      
    } catch (error: any) {
      console.error("Lỗi khi tải tin nhắn:", error);
      
      let errorMessage = "Không thể tải tin nhắn. Vui lòng thử lại sau.";
      
      // Hiển thị lỗi chi tiết hơn nếu có
      if (error.response) {
        console.error("Chi tiết lỗi từ server:", {
          status: error.response.status,
          data: error.response.data,
        });
        
        if (error.response.status === 404) {
          errorMessage =
            "Không tìm thấy cuộc trò chuyện. Cuộc trò chuyện có thể đã bị xóa.";
          setNotFound(true); // Đánh dấu là không tìm thấy
        } else if (error.response.status === 401) {
          errorMessage = "Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.";
        } else if (error.response.status === 403) {
          errorMessage = "Bạn không có quyền truy cập cuộc trò chuyện này.";
        }
      } else if (error.message) {
        // Hiển thị thông báo lỗi cụ thể
        errorMessage = error.message;
        
        // Kiểm tra xem có phải lỗi không tìm thấy không
        if (
          error.message.includes("not found") ||
          error.message.includes("không tìm thấy") ||
          error.message.includes("không tồn tại")
        ) {
          setNotFound(true);
        }
      }
      
      setError(errorMessage);
      // Replace static message.error call with state management
      // message.error(errorMessage);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setLoadingNewer(false);
    }
  };

  // Hàm tải thêm tin nhắn cũ hơn
  const loadMoreMessages = useCallback(async () => {
    if (loadingMore || !hasMore || !oldestCursor) return;
    try {
      setLoadingMore(true);
      await fetchMessages(oldestCursor, "before");
    } catch (error) {
      setError("Lỗi khi tải thêm tin nhắn cũ hơn!");
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, oldestCursor]);

  // Hàm tải thêm tin nhắn mới hơn
  const loadNewerMessages = () => {
    if (hasNewer && newestCursor) {
      fetchMessages(newestCursor, "after");
    } else {
      console.log("Không thể tải thêm tin nhắn mới hơn:", {
        hasNewer,
        newestCursor,
      });
    }
  };

  // Kiểm soát cuộn và tự động tải thêm tin nhắn
  useEffect(() => {
    const scrollContainer = messagesContainerRef.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;

      // Khi cuộn gần lên đầu, tải thêm tin nhắn cũ
      if (scrollTop < 100 && hasMore && !loadingMore && oldestCursor) {
        loadMoreMessages();
      }

      // Khi cuộn gần xuống cuối, tải thêm tin nhắn mới (nếu có)
      if (
        scrollHeight - scrollTop - clientHeight < 50 &&
        hasNewer &&
        !loadingNewer &&
        newestCursor
      ) {
        loadNewerMessages();
      }
    };

    scrollContainer.addEventListener("scroll", handleScroll);
    return () => scrollContainer.removeEventListener("scroll", handleScroll);
  }, [
    hasMore,
    loadingMore,
    oldestCursor,
    hasNewer,
    loadingNewer,
    newestCursor,
    loadMoreMessages,
  ]);

  
  // Function to handle sending a "like" message
  const handleSendLike = async () => {
    if (!isValidConversation) return;
    
    // Create a temporary message with thumbs up emoji
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const tempMessage: DisplayMessage = {
      id: tempId,
      content: '👍',
      timestamp: new Date().toISOString(),
      sender: {
        id: currentUserId,
        name: "Bạn",
        avatar: userCache[currentUserId]?.urlavatar || "",
      },
      type: "text",
      isRead: false,
      sendStatus: "sending",
      readBy: [],
      deliveredTo: [],
    };
    
    // Update UI with temporary message
    setMessages(prev => [...prev, tempMessage]);
    scrollToBottomSmooth();
    
    // Send message to server
    try {
      // Send the like message to the server
      const newMessage = await sendMessage(
        conversation.conversationId,
        '👍',
        "text",
        []
      );
      
      if (newMessage && newMessage.messageDetailId) {
        // Create a real message object to replace the temporary one
        const sender = userCache[currentUserId] || {
          fullname: "Bạn",
          urlavatar: "",
        };
        
        const realMessage: DisplayMessage = {
          id: newMessage.messageDetailId,
          content: '👍',
          timestamp: newMessage.createdAt,
          sender: {
            id: newMessage.senderId,
            name: sender.fullname,
            avatar: sender.urlavatar,
          },
          type: "text",
          isRead: Array.isArray(newMessage.readBy) && newMessage.readBy.length > 0,
          readBy: newMessage.readBy || [],
          deliveredTo: newMessage.deliveredTo || [],
          sendStatus: "sent",
          tempId: tempId
        };
        
        // Replace temporary message with real one
        setMessages(prevMessages => 
          prevMessages.map(msg => 
            msg.id === tempId ? realMessage : msg
          )
        );
      } else {
        console.error('Failed to send like message:', newMessage);
        // Update temp message to show error
        setMessages(prev => 
          prev.map(msg => 
            msg.id === tempId ? { ...msg, isError: true, sendStatus: undefined } : msg
          )
        );
        message.error("Không thể gửi tin nhắn. Vui lòng thử lại.");
      }
    } catch (error) {
      console.error('Error sending like message:', error);
      // Update temp message to show error
      setMessages(prev => 
        prev.map(msg => 
          msg.id === tempId ? { ...msg, isError: true, sendStatus: undefined } : msg
        )
      );
      message.error("Không thể gửi tin nhắn. Vui lòng thử lại.");
    } finally {
      // Focus the input field after like is sent
      if (inputRef.current) {
        setTimeout(() => inputRef.current.focus(), 0);
      }
    }
  };

  // Add socket listeners for message recall and delete
  useEffect(() => {
    socketService.onMessageRecall((data) => {
      if (data.conversationId === conversation?.conversationId) {
        setMessages((prevMessages) =>
          prevMessages.map((msg) =>
            msg.id === data.messageId ? { ...msg, isRecall: true } : msg
          )
        );
      }
    });

    socketService.onMessageDeleted((data) => {
      if (
        data.conversationId === conversation?.conversationId &&
        data.userId === currentUserId
      ) {
        setMessages((prevMessages) =>
          prevMessages.filter((msg) => msg.id !== data.messageId)
        );
      }
    });

    return () => {
      socketService.off("messageRecalled", () => {});
      socketService.off("messageDeleted", () => {});
    };
  }, [conversation?.conversationId, currentUserId]);

  // Add handlers for message recall and delete
  const handleRecallMessage = async (messageId: string) => {
    try {
      setMessageActionLoading(messageId);
      await recallMessage(messageId);
      // UI update will happen through socket event
      message.success("Thu hồi tin nhắn thành công");
    } catch (error) {
      console.error("Error recalling message:", error);
      message.error("Không thể thu hồi tin nhắn. Vui lòng thử lại sau.");
    } finally {
      setMessageActionLoading(null);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      setMessageActionLoading(messageId);
      await deleteMessage(messageId);
      // Immediately update UI
      setMessages((prevMessages) =>
        prevMessages.filter((msg) => msg.id !== messageId)
      );
      message.success("Xóa tin nhắn thành công");
    } catch (error) {
      console.error("Error deleting message:", error);
      message.error("Không thể xóa tin nhắn. Vui lòng thử lại sau.");
    } finally {
      setMessageActionLoading(null);
    }
  };

  // Add a function to handle copying message text
  const handleCopyMessage = (messageContent: string) => {
    navigator.clipboard.writeText(messageContent)
      .then(() => {
        message.success("Đã sao chép tin nhắn vào clipboard");
      })
      .catch(err => {
        console.error("Lỗi khi sao chép: ", err);
        message.error("Không thể sao chép tin nhắn");
      });
  };

  // Update the message menu to include the copy functionality
  const getMessageMenu = (message: DisplayMessage) => (
    <Menu className="message-options-menu">
      <Menu.Item 
        key="copy" 
        icon={<CopyOutlined />}
        onClick={() => handleCopyMessage(message.content)}
      >
        Copy tin nhắn
      </Menu.Item>
      <Menu.Item 
        key="pin" 
        icon={<PushpinOutlined />}
        onClick={() => message.isPinned ? handleUnpinMessage(message.id) : handlePinMessage(message.id)}
        disabled={messageActionLoading === message.id}
      >
        {message.isPinned ? 'Bỏ ghim tin nhắn' : 'Ghim tin nhắn'}
      </Menu.Item>
      <Menu.Item key="mark" icon={<StarOutlined />}>
        Đánh dấu tin nhắn
      </Menu.Item>
      <Menu.Item key="selectMultiple" icon={<UnorderedListOutlined />}>
        Chọn nhiều tin nhắn
      </Menu.Item>
      <Menu.Item key="viewDetails" icon={<InfoCircleOutlined />}>
        Xem chi tiết
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item 
        key="recall" 
        icon={<UndoOutlined />}
        onClick={() => handleRecallMessage(message.id)}
        disabled={!!message.isRecall || messageActionLoading === message.id}
        className="text-red-500 hover:text-red-700"
        style={{ display: isOwnMessage(message.sender.id) ? 'flex' : 'none' }}
      >
        Thu hồi
      </Menu.Item>
      <Menu.Item 
        key="delete" 
        icon={<DeleteOutlined />}
        onClick={() => handleDeleteMessage(message.id)}
        disabled={messageActionLoading === message.id}
        className="text-red-500 hover:text-red-700"
      >
        Xóa chỉ ở phía tôi
      </Menu.Item>
    </Menu>
  );


  // Add a click event handler to the document to close active menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (activeMessageMenu && !e.defaultPrevented) {
        const target = e.target as Element;
        if (!target.closest('.message-hover-controls') && !target.closest('.ant-dropdown')) {
          setActiveMessageMenu(null);
        }
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [activeMessageMenu]);

  // Add new handler functions for pinning and unpinning messages
  const handlePinMessage = async (messageId: string) => {
    try {
      setMessageActionLoading(messageId);
      await pinMessage(messageId);
      
      // Find the message that was pinned
      const pinnedMessage = messages.find(msg => msg.id === messageId);
      
      // Update the message status in the UI
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.id === messageId ? { ...msg, isPinned: true, pinnedAt: new Date().toISOString() } : msg
        )
      );
      
      // Cập nhật trực tiếp danh sách pinnedMessages và hiển thị panel ngay
      if (pinnedMessage) {
        const updatedPinnedMessage = {
          ...pinnedMessage,
          isPinned: true, 
          pinnedAt: new Date().toISOString()
        };
        
        // Cập nhật danh sách tin nhắn ghim
        setPinnedMessages(prevPinnedMessages => {
          // Kiểm tra nếu tin nhắn đã tồn tại trong danh sách ghim
          const messageExists = prevPinnedMessages.some(msg => msg.id === messageId);
          if (messageExists) {
            return prevPinnedMessages;
          }
          return [...prevPinnedMessages, updatedPinnedMessage];
        });
        
        // Hiển thị panel ghim nếu đây là tin nhắn ghim đầu tiên
        setShowPinnedMessagesPanel(true);
      }
      
      // Refresh pinned messages từ API (vẫn giữ để đồng bộ với server)
      await fetchPinnedMessages();
      
      // Add a notification message about pinning
      if (pinnedMessage) {
        let contentPreview = ''; 
        
        // For non-text messages, use appropriate description
        if (pinnedMessage.type === 'image') {
          contentPreview = 'hình ảnh';
        } else if (pinnedMessage.type === 'file') {
          contentPreview = 'tập tin';
        } else if (pinnedMessage.type === 'video') {
          contentPreview = 'video';
        } else {
          // For text messages, truncate if too long
          contentPreview = pinnedMessage.content.length > 20 
            ? pinnedMessage.content.substring(0, 20) + '...' 
            : pinnedMessage.content;
        }
              
        // Create notification message
        const notificationMessage: DisplayMessage = {
          id: `notification-pin-${Date.now()}`,
          content: `Bạn đã ghim tin nhắn ${contentPreview}`,
          timestamp: new Date().toISOString(),
          sender: {
            id: 'system',
            name: 'Hệ thống',
          },
          type: 'notification',
          // Store the pinned message ID in the attachment url field for reference
          attachment: {
            url: messageId,
            type: 'reference',
          }
        };
        
        // Add the notification to the message list
        setMessages(prevMessages => [...prevMessages, notificationMessage]);
        
        // Scroll to bottom to show the notification
        setTimeout(scrollToBottomSmooth, 100);
      }
      
      message.success("Đã ghim tin nhắn");
    } catch (error: any) {
      console.error("Error pinning message:", error);
      message.error("Không thể ghim tin nhắn. Vui lòng thử lại sau.");
    } finally {
      setMessageActionLoading(null);
    }
  };

  const handleUnpinMessage = async (messageId: string) => {
    try {
      setMessageActionLoading(messageId);
      await unpinMessage(messageId);
      
      // Update the message status in the UI
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.id === messageId ? { ...msg, isPinned: false, pinnedAt: undefined } : msg
        )
      );
      
      // Cập nhật trực tiếp danh sách pin và kiểm tra nếu cần ẩn panel
      setPinnedMessages(prevPinnedMessages => {
        const filtered = prevPinnedMessages.filter(msg => msg.id !== messageId);
        if (filtered.length === 0) {
          setShowPinnedMessagesPanel(false);
        }
        return filtered;
      });
      
      // Refresh pinned messages từ API (vẫn giữ để đồng bộ với server)
      await fetchPinnedMessages();
      
      message.success("Đã bỏ ghim tin nhắn");
    } catch (error: any) {
      console.error("Error unpinning message:", error);
      message.error("Không thể bỏ ghim tin nhắn. Vui lòng thử lại sau.");
    } finally {
      setMessageActionLoading(null);
    }
  };

  // Add function to fetch pinned messages
  const fetchPinnedMessages = async () => {
    if (!conversation || !conversation.conversationId) {
      setPinnedMessages([]);
      return;
    }

    try {
      setLoadingPinnedMessages(true);

      // Luôn gọi API để lấy danh sách ghim mới nhất từ server
      try {
        // Use the API to get all pinned messages for this conversation
        const fetchedPinnedMessages = await getPinnedMessages(conversation.conversationId);

        if (fetchedPinnedMessages && fetchedPinnedMessages.length > 0) {
          // Convert to our DisplayMessage format
          const displayPinnedMessages: DisplayMessage[] = fetchedPinnedMessages.map(msg => {
            // Find sender info from userCache
            const sender = userCache[msg.senderId] || {
              fullname: "Người dùng",
              urlavatar: "",
            };
            
            // Normalize attachments
            let fileUrl = '';
            let fileName = '';
            let fileSize = 0;
            
            // Process attachments
            if (msg.attachment) {
              fileUrl = msg.attachment.url || '';
              fileName = msg.attachment.name || '';
              fileSize = msg.attachment.size || 0;
            } else if (msg.attachments) {
              // Handle string or array
              if (typeof msg.attachments === 'string') {
                try {
                  const parsed = JSON.parse(msg.attachments);
                  if (Array.isArray(parsed) && parsed.length > 0) {
                    fileUrl = parsed[0].url || '';
                    fileName = parsed[0].name || '';
                    fileSize = parsed[0].size || 0;
                  }
                } catch (e) {
                  console.error('Failed to parse attachments:', e);
                }
              } else if (Array.isArray(msg.attachments) && msg.attachments.length > 0) {
                fileUrl = msg.attachments[0].url || '';
                fileName = msg.attachments[0].name || '';
                fileSize = msg.attachments[0].size || 0;
              }
            }
            
            // Create the display message
            return {
              id: msg.messageDetailId || '',
              content: msg.content || '',
              timestamp: msg.createdAt || new Date().toISOString(),
              type: msg.type as "text" | "image" | "file" || "text",
              sender: {
                id: msg.senderId || '',
                name: sender.fullname || "Người dùng",
                avatar: sender.urlavatar || '',
              },
              fileUrl: fileUrl || undefined,
              fileName: fileName || undefined,
              fileSize: fileSize || undefined,
              attachment: msg.attachment || (fileUrl ? {
                url: fileUrl,
                type: msg.type || '',
                name: fileName,
                size: fileSize,
                downloadUrl: fileUrl,
              } : undefined),
              isRead: true,
              sendStatus: 'read',
              isPinned: true,
              pinnedAt: msg.pinnedAt || msg.createdAt,
              isReply: msg.isReply || false,
              messageReplyId: (msg as any).messageReplyId || null,
              replyData: (msg as any).replyData || null
            };
          });

          // Sort by most recently pinned
          const sortedPinnedMessages = [...displayPinnedMessages].sort(
            (a, b) => new Date(b.pinnedAt || b.timestamp).getTime() - new Date(a.pinnedAt || a.timestamp).getTime()
          );

          // If we have pinned messages from the API, use those
          setPinnedMessages(sortedPinnedMessages);
        } else {
          // Nếu API trả về mảng rỗng thì cập nhật pinnedMessages
          setPinnedMessages([]);
        }
      } catch (apiError) {
        console.error("Error fetching pinned messages from API:", apiError);
        
        // Fallback to local state if API fails
        const localPinnedMessages = messages.filter(
          message => message.isPinned
        );
        
        // Map the messages to our display format and sort by most recently pinned
        const localSortedPinnedMessages = [...localPinnedMessages].sort(
          (a, b) => new Date(b.pinnedAt || b.timestamp).getTime() - new Date(a.pinnedAt || a.timestamp).getTime()
        );
        
        setPinnedMessages(localSortedPinnedMessages);
      }
    } catch (error) {
      console.error("Error fetching pinned messages:", error);
    } finally {
      setLoadingPinnedMessages(false);
    }
  };

  // Call fetchPinnedMessages when conversation changes or when messages are updated
  useEffect(() => {
    if (conversation?.conversationId) {
      fetchPinnedMessages();
    }
  }, [conversation?.conversationId, messages.length, messages.some(m => m.isPinned)]);

  // Render the pinned messages panel
  const renderPinnedMessagesPanel = () => {
    if (!showPinnedMessagesPanel) return null;
    
    return (
      <PinnedMessages 
        pinnedMessages={pinnedMessages}
        onViewMessage={(messageId) => {
          setShowPinnedMessagesPanel(false);
          setTimeout(() => {
            scrollToPinnedMessage(messageId);
          }, 300);
        }}
        onUnpinMessage={handleUnpinMessage}
        onClose={() => setShowPinnedMessagesPanel(false)}
        isLoading={loadingPinnedMessages}
      />
    );
  };

  // Add a new function to locate and scroll to a pinned message by ID
  const scrollToPinnedMessage = async (messageId: string) => {
    if (!messageId) {
      setShowPinnedMessagesPanel(true);
      return false;
    }
    
    // First try to find the element in the current DOM
    const element = document.getElementById(`message-${messageId}`);
    if (element) {
      // If found, scroll to it and highlight it
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add('highlight-message');
      const elementRef = element; // Store reference for callback
      setTimeout(() => {
        elementRef.classList.remove('highlight-message');
      }, 2000);
      return true;
    }
    
    // If not found in DOM, check if the message is in our loaded messages
    const messageIndex = messages.findIndex(msg => msg.id === messageId);
    if (messageIndex !== -1) {
      // Message is in our state, but not rendered. Try to scroll to its estimated position
      const messagesContainer = messagesContainerRef.current;
      if (messagesContainer) {
        // Try to scroll to approximate position
        const approximatePosition = (messageIndex / messages.length) * messagesContainer.scrollHeight;
        messagesContainer.scrollTop = approximatePosition;
        
        // Try again after a short delay for the message to render
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Check again
        const foundElement = document.getElementById(`message-${messageId}`);
        if (foundElement) {
          foundElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          foundElement.classList.add('highlight-message');
          const elementRef = foundElement; // Store reference for callback
          setTimeout(() => {
            elementRef.classList.remove('highlight-message');
          }, 2000);
          return true;
        }
      }
    }
    
    // Message not found - try more aggressive loading, especially important after page reload
    try {
      // First, try normal fetch to see if it's in recent messages
      await fetchMessages();
      
      // Try one more time after fetching
      await new Promise(resolve => setTimeout(resolve, 300));
      let foundElement = document.getElementById(`message-${messageId}`);
      if (foundElement) {
        foundElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        foundElement.classList.add('highlight-message');
        const elementRef = foundElement; // Store reference for callback
        setTimeout(() => {
          elementRef.classList.remove('highlight-message');
        }, 2000);
        return true;
      }
      
      // If still not found, try to load more historical messages
      // This is crucial after page reload when we might need to go back in history
      if (hasMore && conversation?.conversationId) {
        // Try loading more messages
        await loadMoreMessages();
        
        await new Promise(resolve => setTimeout(resolve, 500));
        foundElement = document.getElementById(`message-${messageId}`);
        if (foundElement) {
          foundElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          foundElement.classList.add('highlight-message');
          const elementRef = foundElement; // Store reference for callback
          setTimeout(() => {
            elementRef.classList.remove('highlight-message');
          }, 2000);
          return true;
        }
        try {
          // If still not found, make one more attempt with direct fetch
          // This handles cases where the message is very old
          const specificMessage = await getSpecificMessage(messageId, conversation.conversationId);
          if (specificMessage) {
            
            // Try to load messages around it
            // Access timestamp correctly based on Message interface
            const timestamp = specificMessage.createdAt;
            if (timestamp) {
              await fetchMessages(timestamp);
              
              await new Promise(resolve => setTimeout(resolve, 500));
              const finalElement = document.getElementById(`message-${messageId}`);
              if (finalElement) {
                finalElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                finalElement.classList.add('highlight-message');
                const elementRef = finalElement; // Store reference for callback
                setTimeout(() => {
                  elementRef.classList.remove('highlight-message');
                }, 2000);
                return true;
              }
            }
          }
        } catch (innerError) {
          console.error("Error fetching specific message:", innerError);
        }
      }
    } catch (error) {
      console.error("Error fetching messages while trying to find pinned message:", error);
    }
    
    // If all else fails, show the pinned messages panel
    setShowPinnedMessagesPanel(true);
    return false;
  };

  // Handle reply to message
  const handleReplyMessage = (message: DisplayMessage) => {
    // Lưu trữ tên người gửi ngay tại thời điểm nhấn trả lời
    const enhancedMessage = {
      ...message,
      sender: {
        ...message.sender,
        // Đảm bảo lưu đúng tên
        cachedName: message.sender.name || userCache[message.sender.id]?.fullname || "Người dùng"
      }
    };
    
    
    setReplyingToMessage(enhancedMessage);
    inputRef.current?.focus();
  };

  // Handle sending reply message
  const handleSendReplyMessage = async () => {
    if (!replyingToMessage || !inputValue.trim() || !conversation) return;
    
    try {
      setIsSending(true);
      
      // Tạo replyData đầy đủ từ thông tin của tin nhắn gốc
      // Đảm bảo lấy đúng tên người dùng từ thông tin hiện có
      const replyInfo: ReplyData = {
        content: replyingToMessage.content,
        senderName: replyingToMessage.sender.name || userCache[replyingToMessage.sender.id]?.fullname || "Người dùng",
        senderId: replyingToMessage.sender.id,
        type: replyingToMessage.type
      };
      
      
      // Thêm dữ liệu attachment nếu tin nhắn gốc là ảnh, video hoặc file
      if (replyingToMessage.type !== 'text' && replyingToMessage.attachment) {
        replyInfo.attachment = replyingToMessage.attachment;
      }

      // Tạo id tạm thời cho tin nhắn
      const tempId = `temp-${Date.now()}`;
      
      // Tạo một tin nhắn tạm thời để hiển thị ngay
      const tempMessage: DisplayMessage = {
        id: tempId,
        content: inputValue.trim(),
        timestamp: new Date().toISOString(),
        sender: {
          id: currentUserId,
          name: userCache[currentUserId]?.fullname || "Bạn",
          avatar: userCache[currentUserId]?.urlavatar || "",
        },
        type: "text",
        isReply: true,
        messageReplyId: replyingToMessage.id,
        replyData: replyInfo,
        sendStatus: "sending",
      };
      
      // Thêm tin nhắn tạm thời vào state messages ngay lập tức
      setMessages(prevMessages => [...prevMessages, tempMessage]);
      
      // Cuộn xuống để hiển thị tin nhắn mới
      scrollToBottomSmooth();
      
      // Reset input và reply state
      setInputValue('');
      setReplyingToMessage(null);
      setPastedImage(null);
      
      // Gửi tin nhắn trả lời đến server
      const replyResult = await replyMessage(replyingToMessage.id, tempMessage.content);
      
      // Ghi đè thông tin replyData trả về từ server với thông tin đã chuẩn bị
      if (replyResult) {
        // Kiểm tra nếu API không trả về replyData hoặc replyData không đầy đủ
        const replyData = typeof replyResult.replyData === 'string' 
          ? JSON.parse(replyResult.replyData) 
          : replyResult.replyData || {};
        
        // Đảm bảo senderName được giữ nguyên từ dữ liệu ban đầu
        if (!replyData.senderName || replyData.senderName === 'Người dùng') {
          // Sử dụng replyInfo đã tạo từ trước đó có đầy đủ thông tin
          replyResult.replyData = JSON.stringify(replyInfo);
        }
        
        // Cập nhật tin nhắn từ tạm thời -> chính thức nếu API trả về thành công
        const messageId = (replyResult as any).messageId || (replyResult as any).messageDetailId;
        if (messageId) {
          setMessages(prevMessages => 
            prevMessages.map(msg => 
              msg.id === tempId 
                ? { 
                    ...msg, 
                    id: messageId, 
                    sendStatus: "sent",
                    // Đảm bảo giữ replyData đã chuẩn bị
                    replyData: replyInfo
                  } 
                : msg
            )
          );
        }
      }
    } catch (error: any) {
      console.error("Error sending reply:", error);
      message.error("Failed to send reply");
      
      // Cập nhật trạng thái tin nhắn thành lỗi
      setMessages(prevMessages => 
        prevMessages.map(msg => 
          msg.id.startsWith('temp-') && msg.content === inputValue.trim() 
            ? { ...msg, sendStatus: "error", isError: true } 
            : msg
        )
      );
    } finally {
      setIsSending(false);
      // Focus the input field after reply is sent
      if (inputRef.current) {
        setTimeout(() => inputRef.current.focus(), 0);
      }
    }
  };

  // Handle forward message
  const handleForwardMessage = (message: DisplayMessage) => {
    setForwardingMessage(message);
    setShowForwardModal(true);
  };


  // Thêm hàm để lấy thông tin tin nhắn gốc cho các tin nhắn reply
  const fetchOriginalMessageForReply = async (messageReplyId: string): Promise<ReplyData | null> => {
    try {
      if (!messageReplyId || !conversation) return null;
       
      const originalMessage = await getSpecificMessage(messageReplyId, conversation.conversationId);
        
      if (originalMessage) {
        // Lấy thông tin người gửi từ cache
        const sender = userCache[originalMessage.senderId] || {
          fullname: "Người dùng",
          urlavatar: "",
        };
         
        // Xây dựng dữ liệu reply phù hợp
        const replyData: ReplyData = {
          content: originalMessage.content || "",
          senderName: sender.fullname || "Người dùng",
          senderId: originalMessage.senderId,
          type: originalMessage.type || "text",
        };
          
        // Nếu tin nhắn gốc có attachment, thêm vào replyData
        if (originalMessage.attachment) {
          replyData.attachment = originalMessage.attachment;
        } else if (originalMessage.attachments) {
          // Chuyển đổi attachments nếu là chuỗi JSON
          if (typeof originalMessage.attachments === 'string') {
            try {
              const parsedAttachments = JSON.parse(originalMessage.attachments);
              if (Array.isArray(parsedAttachments) && parsedAttachments.length > 0) {
                replyData.attachment = parsedAttachments[0];
              }
            } catch (e) {
              console.error('Failed to parse attachments in original message:', e);
            }
          } else if (Array.isArray(originalMessage.attachments) && originalMessage.attachments.length > 0) {
            replyData.attachment = originalMessage.attachments[0];
          }
        }
        
        return replyData;
      }
      return null;
    } catch (error) {
      console.error("Error fetching original message for reply:", error);
      return null;
    }
  };

  // Modify socket event handlers to remove notifications
  useEffect(() => {
    if (!conversation?.conversationId) return;
    
    // Handler for when a user leaves the group
    const handleUserLeftGroup = (data: { conversationId: string, userId: string }): void => {
      if (data.conversationId !== conversation.conversationId) return;

      // Lấy thông tin người rời nhóm
      const currentUserId = localStorage.getItem("userId");
      const leftUserId = data.userId;
      const leftUser = userCache[leftUserId] || { fullname: "Một thành viên" };
      const leftUserName = leftUser?.fullname || "Một thành viên";
      
      // Tạo thông báo về việc rời nhóm
      const newNotification = {
        id: `notification-user-left-${Date.now()}`,
        content: leftUserId === currentUserId 
          ? "Bạn đã rời khỏi nhóm" 
          : `${leftUserName} đã rời khỏi nhóm`,
        type: "notification" as "notification",
        timestamp: new Date().toISOString(),
        sender: {
          id: "system",
          name: "Hệ thống",
          avatar: ""
        },
        isNotification: true,
        isRead: true,
        sendStatus: "sent"
      } as DisplayMessage;
      
      setMessages(prev => [...prev, newNotification]);
      
      // Cuộn xuống dưới để hiển thị thông báo mới
      setTimeout(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    };

    // Handler for when a group is deleted
    const handleGroupDeleted = (data: { conversationId: string }): void => {
      if (data.conversationId !== conversation.conversationId) return;
      
      // Tạo thông báo về việc nhóm bị xóa
      const newNotification = {
        id: `notification-group-deleted-${Date.now()}`,
        content: "Nhóm này đã bị xóa",
        type: "notification" as "notification",
        timestamp: new Date().toISOString(),
        sender: {
          id: "system",
          name: "Hệ thống",
          avatar: ""
        },
        isNotification: true,
        isRead: true,
        sendStatus: "sent"
      } as DisplayMessage;
      
      setMessages(prev => [...prev, newNotification]);
      
      // Cuộn xuống dưới để hiển thị thông báo mới
      setTimeout(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    };

    // Handler for when co-owners are added
    const handleGroupCoOwnerAdded = (data: { conversationId: string, newCoOwnerIds: string[] }): void => {
      if (data.conversationId !== conversation.conversationId) return;
      
    };

    // Handler for when a co-owner is removed
    const handleGroupCoOwnerRemoved = (data: { conversationId: string, removedCoOwner: string }): void => {
      if (data.conversationId !== conversation.conversationId) return;
      
    };

    // Handler for when group owner changes
    const handleGroupOwnerChanged = (data: { conversationId: string, newOwner: string }): void => {
      if (data.conversationId !== conversation.conversationId) return;
      
    };

    // Handler for when a user is removed from the group
    const handleUserRemovedFromGroup = (data: { 
      conversationId: string, 
      kickedUser: { userId: string; fullname: string },
      kickedByUser: { userId: string; fullname: string }
    }): void => {
      // Kiểm tra xem sự kiện có thuộc cuộc trò chuyện hiện tại không
      if (conversation?.conversationId !== data.conversationId) return;
      
      // Lấy thông tin về người bị xóa khỏi nhóm
      const removedUser = userCache[data.kickedUser.userId] || { fullname: data.kickedUser.fullname };
      const removedUserName = removedUser?.fullname || "Một thành viên";
      
      // Lấy thông tin về người xóa
      const remover = userCache[data.kickedByUser.userId] || { fullname: data.kickedByUser.fullname };
      const removerName = remover?.fullname || "Một quản trị viên";
      
      // Kiểm tra xem người bị xóa có phải là người dùng hiện tại không
      const currentUserId = localStorage.getItem("userId");
      const isCurrentUser = data.kickedUser.userId === currentUserId;
      
      // Tạo thông báo hệ thống
      const newNotification = {
        id: `notification-user-removed-${Date.now()}`,
        content: isCurrentUser 
          ? `Bạn đã bị ${removerName} xóa khỏi nhóm` 
          : `${removerName} đã xóa ${removedUserName} khỏi nhóm`,
        type: "notification" as "notification",
        timestamp: new Date().toISOString(),
        sender: {
          id: "system",
          name: "Hệ thống",
          avatar: ""
        },
        isNotification: true,
        isRead: true,
        sendStatus: "sent"
      } as DisplayMessage;
      
      setMessages(prev => [...prev, newNotification]);
      
      // Cuộn xuống dưới để hiển thị thông báo mới
      setTimeout(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    };

    // Register socket event handlers
    socketService.on('userLeftGroup', handleUserLeftGroup);
    socketService.on('groupDeleted', handleGroupDeleted);
    socketService.on('groupCoOwnerAdded', handleGroupCoOwnerAdded);
    socketService.on('groupCoOwnerRemoved', handleGroupCoOwnerRemoved);
    socketService.on('groupOwnerChanged', handleGroupOwnerChanged);
    socketService.on('userRemovedFromGroup', handleUserRemovedFromGroup);
    
    // Cleanup function
    return () => {
      socketService.off('userLeftGroup', handleUserLeftGroup);
      socketService.off('groupDeleted', handleGroupDeleted);
      socketService.off('groupCoOwnerAdded', handleGroupCoOwnerAdded);
      socketService.off('groupCoOwnerRemoved', handleGroupCoOwnerRemoved);
      socketService.off('groupOwnerChanged', handleGroupOwnerChanged);
      socketService.off('userRemovedFromGroup', handleUserRemovedFromGroup);
    };
  }, [conversation?.conversationId, conversation?.rules?.ownerId, conversation?.rules?.coOwnerIds]);

  // Thêm handler cho sự kiện userAddedToGroup
  const handleUserAddedToGroup = (data: {
    conversationId: string;
    addedUser: { userId: string; fullname: string };
    addedByUser: { userId: string; fullname: string };
  }): void => {
    // Kiểm tra xem sự kiện có thuộc cuộc trò chuyện hiện tại không
    if (conversation?.conversationId !== data.conversationId) return;
    
    // Lấy tên người dùng từ cache hoặc từ data
    const addedUserName = userCache[data.addedUser.userId]?.fullname || data.addedUser.fullname || "Người dùng mới";
    const adderName = userCache[data.addedByUser.userId]?.fullname || data.addedByUser.fullname || "Quản trị viên";
    
    // Tạo thông báo hệ thống - chỉ tạo một thông báo duy nhất
    const newNotification = {
      id: `notification-user-added-${Date.now()}`,
      content: `${adderName} đã thêm ${addedUserName} vào nhóm`,
      type: "notification" as "notification",
      timestamp: new Date().toISOString(),
      sender: {
        id: "system",
        name: "Hệ thống",
        avatar: ""
      },
      isNotification: true,
      isRead: true,
      sendStatus: "sent"
    } as DisplayMessage;
    
    // Thêm thông báo vào danh sách tin nhắn
    setMessages(prev => [...prev, newNotification]);
    
    // Cuộn xuống dưới để hiển thị thông báo mới
    setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  // Xử lý khi tên nhóm được thay đổi
  const handleGroupNameChanged = (data: { conversationId: string, newName: string, changedBy?: { userId: string; fullname: string } }): void => {
    // Kiểm tra xem sự kiện có thuộc cuộc trò chuyện hiện tại không
    if (conversation?.conversationId !== data.conversationId) return;
    
    // Lấy thông tin người thay đổi tên nhóm
    let changerName = "Một thành viên";
    if (data.changedBy) {
      // Ưu tiên lấy tên từ userCache nếu có, nếu không thì dùng tên được truyền từ socket
      changerName = userCache[data.changedBy.userId]?.fullname || 
                    data.changedBy.fullname || 
                    changerName;
    }
    
    // Tạo thông báo hệ thống
    const newNotification = {
      id: `notification-rename-${Date.now()}`,
      content: `${changerName} đã đổi tên nhóm thành "${data.newName}"`,
      type: "notification" as "notification",
      timestamp: new Date().toISOString(),
      sender: {
        id: "system",
        name: "Hệ thống",
        avatar: ""
      },
      isNotification: true,
      isRead: true,
      sendStatus: "sent"
    } as DisplayMessage;
    
    // Thêm thông báo vào danh sách tin nhắn
    setMessages(prev => [...prev, newNotification]);
    
    // Cuộn xuống dưới để hiển thị thông báo mới
    setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  // Xử lý khi ảnh nhóm được thay đổi
  const handleGroupAvatarChanged = (data: { conversationId: string, newAvatar: string, changedBy?: { userId: string; fullname: string } }): void => {
    // Kiểm tra xem sự kiện có thuộc cuộc trò chuyện hiện tại không
    if (conversation?.conversationId !== data.conversationId) return;
    
    // Lấy thông tin người thay đổi ảnh nhóm
    let changerName = "Một thành viên";
    if (data.changedBy) {
      // Ưu tiên lấy tên từ userCache nếu có, nếu không thì dùng tên được truyền từ socket
      changerName = userCache[data.changedBy.userId]?.fullname || 
                    data.changedBy.fullname || 
                    changerName;
    }
    
    // Tạo thông báo hệ thống
    const newNotification = {
      id: `notification-avatar-changed-${Date.now()}`,
      content: `${changerName} đã thay đổi ảnh đại diện nhóm`,
      type: "notification" as "notification",
      timestamp: new Date().toISOString(),
      sender: {
        id: "system",
        name: "Hệ thống",
        avatar: ""
      },
      isNotification: true,
      isRead: true,
      sendStatus: "sent"
    } as DisplayMessage;
    
    // Thêm thông báo vào danh sách tin nhắn
    setMessages(prev => [...prev, newNotification]);
    
    // Cuộn xuống dưới để hiển thị thông báo mới
    setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex flex-col h-full overflow-hidden bg-white rounded-lg relative">
        {/* Pinned messages panel - Only show the toggle button when panel is closed, otherwise show the full component */}
        {pinnedMessages.length > 0 && !showPinnedMessagesPanel && (
          <div 
            className="bg-white border-b border-gray-200 py-2 px-4 flex justify-between items-center cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => setShowPinnedMessagesPanel(true)}
          >
            <div className="flex items-center text-gray-700">
              <PushpinOutlined className="text-yellow-600 mr-2" />
              <span>+{pinnedMessages.length} ghim</span>
            </div>
            <DownOutlined className="text-gray-400" />
          </div>
        )}
        
        {/* Pinned messages panel */}
        {renderPinnedMessagesPanel()}
        
        {/* Khu vực hiển thị tin nhắn */}
        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto p-4 bg-gray-50"
        >
          {/* Nút tải thêm tin nhắn cũ hơn */}
          {hasMore && messages.length > 0 && (
            <div className="load-more-container">
              <Button 
                onClick={loadMoreMessages} 
                loading={loadingMore}
                icon={<DownOutlined />}
                size="small"
              >
                Tải thêm
              </Button>
            </div>
          )}
          
          {loadingMore && (
            <div className="text-center py-2">
              <Spin size="small" />{" "}
              <span className="text-xs text-gray-500 ml-2">
                Đang tải tin nhắn cũ hơn...
              </span>
            </div>
          )}
          
          {loading && (
            <div className="text-center py-4">{t.loading || "Đang tải..."}</div>
          )}
          
          {notFound && (
            <div className="flex flex-col items-center justify-center py-8">
              <Empty
                description="Không tìm thấy cuộc trò chuyện này"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
              <div className="mt-4 text-center">
                <p className="text-gray-500 mb-4">
                  Cuộc trò chuyện có thể đã bị xóa hoặc bạn không còn là thành
                  viên.
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
                <Button type="primary" onClick={() => fetchMessages()}>
                  Thử lại
                </Button>
              </div>
            </div>
          )}
          
          {messages.length === 0 && !loading && !error && !notFound && (
            <div className="text-center text-gray-500 py-10">
              {t.no_messages ||
                "Chưa có tin nhắn nào. Hãy bắt đầu cuộc trò chuyện!"}
            </div>
          )}
          
          <MessageDisplay
            messages={messagesToRender}
            currentUserId={currentUserId}
            conversation={conversation}
            userCache={userCache}
            handleImagePreview={handleImagePreview}
            handleDownloadFile={handleDownloadFile}
            handleReplyMessage={handleReplyMessage}
            handleForwardMessage={handleForwardMessage}
            scrollToPinnedMessage={scrollToPinnedMessage}
            getMessageMenu={getMessageMenu}
            messageActionLoading={messageActionLoading}
            activeMessageMenu={activeMessageMenu}
            setActiveMessageMenu={setActiveMessageMenu}
            dropdownVisible={dropdownVisible}
            setDropdownVisible={setDropdownVisible}
            hoveredMessageId={hoveredMessageId}
            setHoveredMessageId={setHoveredMessageId}
            hoverTimeoutRef={hoverTimeoutRef}
          />
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
                type="primary"
                ghost
              >
                Tải thêm tin nhắn mới hơn
              </Button>
            </div>
          )}

          {loadingNewer && (
            <div className="text-center py-2">
              <Spin size="small" />{" "}
              <span className="text-xs text-gray-500 ml-2">
                Đang tải tin nhắn mới hơn...
              </span>
            </div>
          )}

          {/* Hiển thị trạng thái typing */}
          {Object.keys(typingUsers).length > 0 && (
            <div className="flex items-center text-gray-500 text-sm pl-2 pb-1">
              <div className="flex items-center space-x-1">
                <span>
                  {Object.values(typingUsers)
                    .map(user => user.fullname)
                    .join(", ")}
                </span>
                <span>{Object.keys(typingUsers).length === 1 ? " đang nhập..." : " đang nhập..."}</span>
                <span className="typing-animation">
                  <span className="dot"></span>
                  <span className="dot"></span>
                  <span className="dot"></span>
                </span>
              </div>
            </div>
          )}
        </div>
        
        {/* Khu vực nhập tin nhắn (ẩn nếu không tìm thấy cuộc trò chuyện) */}
        {!notFound && (
          <ChatInputArea
            conversationId={conversation?.conversationId || ''}
            currentUserId={currentUserId}
            userCache={userCache}
            sendMessage={sendMessage}
            sendImageMessage={sendImageMessage}
            replyMessage={replyMessage}
            updateConversationWithNewMessage={updateConversationWithNewMessage}
            scrollToBottomSmooth={scrollToBottomSmooth}
            isValidConversation={isValidConversation}
            t={t}
            attachments={attachments}
            setAttachments={setAttachments}
            pastedImage={pastedImage}
            setPastedImage={setPastedImage}
            pastedImagePreview={pastedImagePreview}
            setPastedImagePreview={setPastedImagePreview}
            replyingToMessage={replyingToMessage}
            setReplyingToMessage={setReplyingToMessage}
            inputValue={inputValue}
            setInputValue={setInputValue}
            isUploading={isUploading}
            setIsUploading={setIsUploading}
            emojiPickerVisible={emojiPickerVisible}
            setEmojiPickerVisible={setEmojiPickerVisible}
            inputRef={inputRef}
            fileInputRef={fileInputRef}
            imageInputRef={imageInputRef}
            videoInputRef={videoInputRef}
            audioInputRef={audioInputRef}
            handleSendMessage={handleSendMessage}
            handleSendReplyMessage={handleSendReplyMessage}
            handleSendLike={handleSendLike}
            handleRemoveAttachment={handleRemoveAttachment}
            handleRemovePastedImage={handleRemovePastedImage}
            handleFileChange={handleFileChange}
            handleImageClick={handleImageClick}
            handleEmojiSelect={handleEmojiSelect}
            toggleEmojiPicker={toggleEmojiPicker}
            handleKeyPress={handleKeyPress}
            onBeforeUpload={(file) => {
              // Tạo tin nhắn tạm thời cho file
              const tempId = `temp-file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
              const attachmentObj = {
                url: URL.createObjectURL(file),
                type: file.type,
                name: file.name,
                size: file.size,
              };
              // Xác định loại file
              let msgType: 'file' | 'video' | 'audio' | 'image' = 'file';
              if (file.type.startsWith('video/')) msgType = 'video';
              else if (file.type.startsWith('audio/')) msgType = 'audio';
              else if (file.type.startsWith('image/')) msgType = 'image';
              const tempMessage: DisplayMessage = {
                id: tempId,
                content: file.name,
                timestamp: new Date().toISOString(),
                sender: {
                  id: currentUserId,
                  name: userCache[currentUserId]?.fullname || 'Bạn',
                  avatar: userCache[currentUserId]?.urlavatar || '',
                },
                type: msgType,
                isRead: false,
                sendStatus: 'sending',
                readBy: [],
                deliveredTo: [],
                fileUrl: attachmentObj.url,
                fileName: file.name,
                fileSize: file.size,
                attachment: attachmentObj,
                attachments: [attachmentObj],
              };
              setMessages((prev) => [...prev, tempMessage]);
              scrollToBottomSmooth();
              return tempId;
            }}
            onUploadComplete={(result, tempId) => {
              if (!result || !result.messageDetailId) return;
              let msgType: 'file' | 'video' | 'audio' | 'image' = 'file';
              const typeStr = result.attachment?.type || (result.attachments && result.attachments[0]?.type) || '';
              if (typeStr.startsWith('video/')) msgType = 'video';
              else if (typeStr.startsWith('audio/')) msgType = 'audio';
              else if (typeStr.startsWith('image/')) msgType = 'image';
              const realMessage: DisplayMessage = {
                id: result.messageDetailId,
                content: result.content || result.fileName || '',
                timestamp: result.createdAt,
                sender: {
                  id: result.senderId,
                  name: userCache[result.senderId]?.fullname || 'Bạn',
                  avatar: userCache[result.senderId]?.urlavatar || '',
                },
                type: msgType,
                isRead: Array.isArray(result.readBy) && result.readBy.length > 0,
                readBy: result.readBy || [],
                deliveredTo: result.deliveredTo || [],
                sendStatus: 'sent',
                fileUrl: (result.attachment && result.attachment.url) || (result.attachments && result.attachments[0]?.url) || '',
                fileName: (result.attachment && result.attachment.name) || (result.attachments && result.attachments[0]?.name) || result.fileName || '',
                fileSize: (result.attachment && result.attachment.size) || (result.attachments && result.attachments[0]?.size) || result.fileSize || 0,
                attachment: result.attachment || (result.attachments && result.attachments[0]) || undefined,
                attachments: Array.isArray(result.attachments) ? result.attachments : (result.attachments ? [result.attachments] : []),
              };
              setMessages((prev) => prev.map(msg => msg.id === tempId ? realMessage : msg));
              updateConversationWithNewMessage(conversation.conversationId, {
                content: realMessage.content,
                type: msgType,
                createdAt: realMessage.timestamp,
                senderId: realMessage.sender.id
              });
            }}
            onUploadError={(error, tempId) => {
              setMessages((prev) => prev.map(msg => msg.id === tempId ? { ...msg, isError: true, sendStatus: undefined } : msg));
              message.error('Không thể gửi file. Vui lòng thử lại.');
              console.error('Error uploading file:', error);
            }}
            handleInputChange={handleInputChange}
          />
        )}

        
        {/* Forward message modal */}
        {showForwardModal && (
          <Modal
            title="Chuyển tiếp tin nhắn"
            open={showForwardModal}
            onCancel={() => setShowForwardModal(false)}
            footer={[
              <Button key="cancel" onClick={() => setShowForwardModal(false)}>
                Hủy
              </Button>,
              <Button
                key="forward"
                type="primary"
                onClick={handleSendForwardMessage}
                disabled={!selectedConversationForForward}
              >
                Chuyển tiếp
              </Button>
            ]}
          >
            <div className="mb-4">
              <div className="font-semibold mb-2">Chọn cuộc trò chuyện:</div>
              <Select
                style={{ width: '100%' }}
                placeholder="Chọn người nhận"
                onChange={(value) => setSelectedConversationForForward(value)}
              >
                {conversations
                  .filter((conv: Conversation) => conv.conversationId !== conversation?.conversationId)
                  .map((conv: Conversation) => {
                    const name = conv.isGroup 
                      ? conv.groupName 
                      : getOtherUserName(conv);
                    return (
                      <Select.Option key={conv.conversationId} value={conv.conversationId}>
                        {name}
                      </Select.Option>
                    );
                  })
                }
              </Select>
            </div>
            
            <div className="border rounded p-3 bg-gray-50">
              <div className="text-sm text-gray-500 mb-1">
                {forwardingMessage?.type === 'image' && 'Hình ảnh gốc:'}
                {forwardingMessage?.type === 'file' && 'Tập tin gốc:'}
                {forwardingMessage?.type === 'text-with-image' && 'Tin nhắn có hình ảnh:'}
                {forwardingMessage?.type === 'video' && 'Video gốc:'}
                {forwardingMessage?.type === 'audio' && 'Audio gốc:'}
                {forwardingMessage?.type === 'text' && 'Tin nhắn gốc:'}
                {!forwardingMessage?.type && 'Tin nhắn gốc:'}
              </div>
              
              {/* Hiển thị tên file nếu có */}
              {forwardingMessage?.fileName && (
                <div className="mb-2 font-medium text-blue-600">
                  <span className="mr-2">📎</span>
                  {forwardingMessage.fileName}
                  {forwardingMessage.fileSize && (
                    <span className="ml-2 text-xs text-gray-500">
                      ({(forwardingMessage.fileSize / 1024).toFixed(2)} KB)
                    </span>
                  )}
                </div>
              )}
              
              {/* Hiển thị ảnh nếu có */}
              {(forwardingMessage?.type === 'image' || forwardingMessage?.type === 'text-with-image') && forwardingMessage.attachment && (
                <div className="mb-2">
                  <img 
                    src={forwardingMessage.attachment.url} 
                    alt="Forward attachment" 
                    className="max-h-40 rounded"
                  />
                </div>
              )}
              
              {/* Hiển thị video thumbnail nếu có */}
              {forwardingMessage?.type === 'video' && forwardingMessage.attachment && (
                <div className="mb-2 relative">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-black bg-opacity-50 rounded-full p-2">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="h-6 w-6 text-white">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="bg-gray-200 h-24 w-full flex items-center justify-center rounded">
                    <span className="text-gray-500">Video</span>
                  </div>
                </div>
              )}
              
              {/* Hiển thị audio player nếu có */}
              {forwardingMessage?.type === 'audio' && forwardingMessage.attachment && (
                <div className="mb-2 bg-gray-200 p-2 rounded flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="h-6 w-6 text-gray-600 mr-2">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15.536a5 5 0 01-1.414-2.536m-1.414 5.36a9 9 0 01-2.828-7.9" />
                  </svg>
                  <span className="text-gray-600">Audio file</span>
                </div>
              )}
              
              {/* Hiển thị nội dung text */}
              {forwardingMessage?.content && (
                <div className={`text-sm ${forwardingMessage?.type === 'text' ? 'font-medium' : ''}`}>
                  {forwardingMessage.content}
                </div>
              )}
              
              {/* Hiển thị thông báo nếu tin nhắn không có nội dung */}
              {!forwardingMessage?.content && !forwardingMessage?.attachment && !forwardingMessage?.fileName && (
                <div className="text-sm text-gray-500 italic">
                  Không có nội dung để hiển thị
                </div>
              )}
            </div>
          </Modal>
        )}
      </div>
  );
}