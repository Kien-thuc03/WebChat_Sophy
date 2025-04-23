import React, { useState, useEffect } from 'react';
import { Avatar } from '../../common/Avatar';
import { Button, Switch, Modal, Input, App, Dropdown, Menu } from 'antd';
import { 
  BellOutlined,
  PushpinOutlined,
  UsergroupAddOutlined,
  ClockCircleOutlined,
  EyeInvisibleOutlined,  
  EditOutlined,
  WarningOutlined,
  DeleteOutlined,
  FileImageOutlined,
  FileOutlined,
  LinkOutlined,
  TeamOutlined,
  RightOutlined,
  CopyOutlined,
  ShareAltOutlined,
  SettingOutlined,
  UserAddOutlined,
  LogoutOutlined,
  FileTextOutlined,
  DownloadOutlined,
  PlayCircleOutlined,
  CloseOutlined,
  LeftOutlined,
  MoreOutlined,
  LockOutlined,
  UserDeleteOutlined,
  RightOutlined as RightArrowOutlined
} from '@ant-design/icons';
import { Conversation } from '../../../features/chat/types/conversationTypes';
import { useConversations } from '../../../features/chat/hooks/useConversations';
import { getUserById, getConversationDetail } from "../../../api/API";
import { User } from "../../../features/auth/types/authTypes";
import GroupAvatar from '../GroupAvatar';
import { useLanguage } from "../../../features/auth/context/LanguageContext";
import GroupManagement from './GroupManagement';
import MediaGallery from './MediaGallery';
import { useChatInfo } from '../../../features/chat/hooks/useChatInfo';
import { formatMessageTime, formatRelativeTime } from '../../../utils/dateUtils';
import { useNavigate } from 'react-router-dom';

interface ChatInfoProps {
  conversation: Conversation;
  onLeaveGroup?: () => void; // Callback khi rời nhóm thành công
}

// Extended conversation interface with additional properties returned by the API
interface DetailedConversation extends Conversation {
  isMuted?: boolean;
  isPinned?: boolean;
  isHidden?: boolean;
  groupLink?: string;
  mutualGroups?: number;
  notes?: any[];
  polls?: any[];
  sharedMedia?: any[];
  sharedFiles?: any[];
  sharedLinks?: any[];
}

const ChatInfo: React.FC<ChatInfoProps> = ({ conversation, onLeaveGroup }) => {
  const [activeKeys, setActiveKeys] = useState<string[]>([]);
  const [isEditNameModalVisible, setIsEditNameModalVisible] = useState(false);
  const [localName, setLocalName] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [localUserCache, setLocalUserCache] = useState<Record<string, User>>({});
  const [detailedConversation, setDetailedConversation] = useState<DetailedConversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [showGroupManagement, setShowGroupManagement] = useState(false);
  const [showMediaGallery, setShowMediaGallery] = useState(false);
  const [showFileGallery, setShowFileGallery] = useState(false);
  const [mediaGalleryType, setMediaGalleryType] = useState<'media' | 'files' | null>(null);
  const { userCache, userAvatars } = useConversations();
  const { t } = useLanguage();
  const [userRole, setUserRole] = useState<'owner' | 'co-owner' | 'member'>('member');
  const { 
    leaveGroupConversation, 
    fetchSharedMedia, 
    fetchSharedFiles, 
    downloadFile,
    addCoOwner,
    removeCoOwnerDirectly,
    removeGroupMember
  } = useChatInfo();
  const { message, modal } = App.useApp();
  const [sharedMedia, setSharedMedia] = useState<any[]>([]);
  const [sharedFiles, setSharedFiles] = useState<any[]>([]);
  const [sharedLinks, setSharedLinks] = useState<any[]>([]);
  const [selectedMedia, setSelectedMedia] = useState<string | null>(null);
  const [selectedMediaType, setSelectedMediaType] = useState<'image' | 'video' | null>(null);
  const [isMediaModalOpen, setIsMediaModalOpen] = useState<boolean>(false);
  const [currentMediaIndex, setCurrentMediaIndex] = useState<number>(0);
  const navigate = useNavigate();
  const [showMembersList, setShowMembersList] = useState(false);
  const [hoveredMemberId, setHoveredMemberId] = useState<string | null>(null);

  // Fetch detailed conversation information
  useEffect(() => {
    const fetchConversationDetails = async () => {
      if (conversation?.conversationId) {
        try {
          setLoading(true);
          const conversationData = await getConversationDetail(conversation.conversationId);
          setDetailedConversation(conversationData as DetailedConversation);
          
          // Initialize state values based on fetched data
          if (conversationData) {
            // Cast to DetailedConversation to access extended properties
            const detailedData = conversationData as DetailedConversation;
            setIsMuted(detailedData.isMuted || false);
            setIsPinned(detailedData.isPinned || false);
            setIsHidden(detailedData.isHidden || false);
            
            // Fetch media and files
            loadMediaAndFiles(conversation.conversationId);
          }
        } catch (error) {
          console.error('Failed to load conversation details:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchConversationDetails();
  }, [conversation?.conversationId]);

  // Use detailed conversation data if available, otherwise fallback to prop
  const currentConversation = detailedConversation || conversation;

  // Determine if this is a group conversation
  const isGroup = currentConversation.isGroup;
  const groupName = currentConversation.groupName;
  const groupAvatarUrl = currentConversation.groupAvatarUrl;
  const groupMembers = currentConversation.groupMembers || [];
  
  // Group link for sharing (would come from the API in a real implementation)
  const groupLink = detailedConversation?.groupLink || "zalo.me/g/hotcjo791";
  
  // Number of mutual groups (would come from the API in a real implementation)
  const mutualGroups = detailedConversation?.mutualGroups || 20;

  // Check user role when the conversation data is available
  useEffect(() => {
    if (currentConversation?.rules) {
      const currentUserId = localStorage.getItem('userId') || '';
      
      if (currentConversation.rules.ownerId === currentUserId) {
        setUserRole('owner');
      } else if (currentConversation.rules.coOwnerIds?.includes(currentUserId)) {
        setUserRole('co-owner');
      } else {
        setUserRole('member');
      }
    }
  }, [currentConversation]);

  // Determine if user can manage the group
  const canManageGroup = userRole === 'owner' || userRole === 'co-owner';

  /**
   * Gets the ID of the other user in a one-on-one conversation
   */
  const getOtherUserId = (conversation: Conversation): string => {
    // Get current user ID from localStorage (or any authentication method you use)
    const currentUserId = localStorage.getItem('userId') || '';
    
    // If it's a group chat, there's no single "other user"
    if (conversation.isGroup) {
      return '';
    }
    
    // If the current user is the creator, return the receiverId
    if (currentUserId === conversation.creatorId) {
      return conversation.receiverId || '';
    }
    
    // If the current user is the receiver, return the creatorId
    if (currentUserId === conversation.receiverId) {
      return conversation.creatorId;
    }
    
    // Fallback: Return receiverId if we can't determine
    return conversation.receiverId || conversation.creatorId;
  };

  // Get the other user's ID using our helper function
  const otherUserId = getOtherUserId(currentConversation);
  // Get user info from either the global or local cache
  const otherUserInfo = userCache[otherUserId] || localUserCache[otherUserId];

  // Load user data if not already in cache
  useEffect(() => {
    const loadUserData = async () => {
      if (!isGroup && otherUserId && !userCache[otherUserId] && !localUserCache[otherUserId]) {
        try {
          const userData = await getUserById(otherUserId);
          if (userData) {
            setLocalUserCache(prev => ({
              ...prev,
              [otherUserId]: userData
            }));
          }
        } catch (error) {
          console.error(`Failed to load data for user ${otherUserId}:`, error);
        }
      }
    };
    
    loadUserData();
  }, [isGroup, otherUserId, userCache, localUserCache]);

  const handlePanelChange = (keys: string | string[]) => {
    setActiveKeys(Array.isArray(keys) ? keys : [keys]);
  };

  const handleToggleMute = () => {
    setIsMuted(!isMuted);
    // Here you would implement API call to update mute status
    // Example: updateConversationMuteStatus(currentConversation.conversationId, !isMuted);
  };

  const handleTogglePin = () => {
    setIsPinned(!isPinned);
    // Here you would implement API call to update pin status
    // Example: updateConversationPinStatus(currentConversation.conversationId, !isPinned);
  };

  const handleToggleHidden = () => {
    setIsHidden(!isHidden);
    // Here you would implement API call to update hidden status
    // Example: updateConversationHiddenStatus(currentConversation.conversationId, !isHidden);
  };

  const handleEditName = () => {
    setLocalName(isGroup ? groupName || '' : otherUserInfo?.fullname || '');
    setIsEditNameModalVisible(true);
  };

  const handleSaveLocalName = () => {
    // Save local name logic using the API
    // Example: updateConversationLocalName(currentConversation.conversationId, localName);
    setIsEditNameModalVisible(false);
  };

  const handleDeleteChat = () => {
    Modal.confirm({
      title: 'Xóa lịch sử trò chuyện',
      content: 'Bạn có chắc chắn muốn xóa toàn bộ lịch sử trò chuyện? Hành động này không thể hoàn tác.',
      okText: 'Xóa',
      cancelText: 'Hủy',
      okButtonProps: { danger: true },
      onOk: () => {
        // Delete chat history logic using the API
        // Example: deleteConversationHistory(currentConversation.conversationId);
      }
    });
  };

  const handleCopyGroupLink = () => {
    navigator.clipboard.writeText(groupLink);
    // You could add a notification here to show the link was copied
  };

  const handleShareGroupLink = () => {
    // Share group link logic here
  };

  const handleLeaveGroup = async () => {
    // Lấy thông tin cuộc trò chuyện mới nhất trước khi kiểm tra
    if (currentConversation.conversationId) {
      try {
        // Hiển thị trạng thái đang tải
        const loadingKey = 'check-role';
        message.loading({ content: 'Đang kiểm tra...', key: loadingKey });
        
        // Lấy lại thông tin conversation mới nhất để có quyền mới nhất
        const updatedConversation = await getConversationDetail(currentConversation.conversationId);
        
        // Cập nhật conversation detail
        setDetailedConversation(updatedConversation as DetailedConversation);
        
        // Kiểm tra lại quyền dựa trên thông tin mới nhất
        const currentUserId = localStorage.getItem('userId') || '';
        const isOwner = updatedConversation.rules?.ownerId === currentUserId;
        
        message.destroy(loadingKey);
        
        // Nếu là chủ nhóm, yêu cầu chuyển quyền
        if (isOwner) {
          modal.confirm({
            title: 'Không thể rời nhóm',
            content: 'Bạn là trưởng nhóm. Vui lòng chuyển quyền trưởng nhóm cho người khác trước khi rời nhóm.',
            okText: 'Chuyển quyền',
            cancelText: 'Hủy',
            onOk: () => {
              // Chuyển đến trang quản lý nhóm để chuyển quyền trưởng nhóm
              setShowGroupManagement(true);
            }
          });
          return;
        }
        
        // Xử lý rời nhóm cho các thành viên khác
        modal.confirm({
          title: 'Rời nhóm',
          content: 'Bạn có chắc chắn muốn rời khỏi nhóm này?',
          okText: 'Rời nhóm',
          cancelText: 'Hủy',
          okButtonProps: { danger: true },
          onOk: async () => {
            try {
              const key = 'leave-group';
              message.loading({ content: 'Đang xử lý...', key });
              
              const result = await leaveGroupConversation(currentConversation.conversationId);
              
              if (result) {
                message.success({ 
                  content: 'Đã rời nhóm thành công.',
                  key, 
                  duration: 2 
                });
                
                // Đảm bảo xóa hết state local về cuộc trò chuyện này
                setDetailedConversation(null);
                
                // Gọi callback để cập nhật giao diện ngay lập tức
                if (onLeaveGroup) {
                  onLeaveGroup();
                } else {
                  // Fallback: Reload trang nếu không có callback
                  setTimeout(() => window.location.reload(), 1000);
                }
              } else {
                message.error({ content: 'Không thể rời nhóm', key, duration: 2 });
              }
            } catch (err: any) {
              console.error('Failed to leave group:', err);
              // Xử lý trường hợp lỗi cụ thể
              if (err.response?.status === 400 && err.response?.data?.message?.includes('owner')) {
                message.error('Bạn là trưởng nhóm, không thể rời nhóm. Vui lòng chuyển quyền trước.');
              } else {
                message.error('Không thể rời nhóm. Vui lòng thử lại.');
              }
            }
          }
        });
      } catch (err) {
        console.error('Error checking user role:', err);
        message.error('Đã xảy ra lỗi. Vui lòng thử lại sau.');
      }
    }
  };

  const handleShowGroupManagement = () => {
    setShowGroupManagement(true);
  };

  const handleBackFromGroupManagement = () => {
    setShowGroupManagement(false);
  };

  const handleShowMediaGallery = (type: 'media' | 'files') => {
    setMediaGalleryType(type);
    setShowMediaGallery(true);
  };

  const handleBackFromMediaGallery = () => {
    setShowMediaGallery(false);
    setMediaGalleryType(null);
  };

  // Determine the display name based on whether it's a group or individual conversation
  const displayName = isGroup 
    ? groupName || 'Nhóm chat' 
    : otherUserInfo?.fullname || t.loading || 'Đang tải...';

  // Determine online status
  const onlineStatus = isGroup ? `${groupMembers.length} thành viên` : 'Online';

  // Function to load media and files
  const loadMediaAndFiles = async (conversationId: string) => {
    try {
      // Fetch shared media
      const media = await fetchSharedMedia(conversationId);
      setSharedMedia(media);
      
      // Fetch shared files
      const files = await fetchSharedFiles(conversationId);
      setSharedFiles(files);
      
      // For links, we'll use the mock data for now since it's not clear if there's an API for it
      // In a real implementation, you'd fetch this from the API as well
      if (detailedConversation?.sharedLinks) {
        setSharedLinks(detailedConversation.sharedLinks);
      }
    } catch (error) {
      console.error('Error loading media and files:', error);
    }
  };

  // Function to handle file download
  const handleDownloadFile = (url: string, downloadUrl: string | undefined, filename: string) => {
    // Use the downloadUrl if available, otherwise fall back to regular url
    const fileUrl = downloadUrl || url;
    downloadFile(fileUrl, filename);
    message.success(`Đang tải xuống ${filename}`);
  };

  // Thêm hàm xử lý xem trước media
  const handleMediaPreview = (media: any, type: 'image' | 'video', index: number) => {
    const url = media.downloadUrl || media.url;
    setSelectedMedia(url);
    setSelectedMediaType(type);
    setIsMediaModalOpen(true);
    setCurrentMediaIndex(index);
  };

  // Đóng modal xem trước
  const closeMediaModal = () => {
    setIsMediaModalOpen(false);
    setSelectedMedia(null);
    setSelectedMediaType(null);
    
    // Tìm và dừng video
    const videoElement = document.getElementById('media-preview-video') as HTMLVideoElement;
    if (videoElement) {
      videoElement.pause();
      videoElement.currentTime = 0;
    }
    
    // Để đảm bảo, dừng tất cả các video
    const videos = document.querySelectorAll('video');
    videos.forEach(video => {
      video.pause();
      video.currentTime = 0;
    });
  };

  // Chuyển đến ảnh/video trước
  const handlePrevMedia = () => {
    if (currentMediaIndex > 0) {
      const prevIndex = currentMediaIndex - 1;
      const prevMedia = sharedMedia[prevIndex];
      setCurrentMediaIndex(prevIndex);

      const mediaType = prevMedia.type?.startsWith('image') ? 'image' : 'video';
      setSelectedMediaType(mediaType);
      setSelectedMedia(prevMedia.downloadUrl || prevMedia.url);
    }
  };

  // Chuyển đến ảnh/video tiếp theo
  const handleNextMedia = () => {
    if (currentMediaIndex < sharedMedia.length - 1) {
      const nextIndex = currentMediaIndex + 1;
      const nextMedia = sharedMedia[nextIndex];
      setCurrentMediaIndex(nextIndex);
      
      const mediaType = nextMedia.type?.startsWith('image') ? 'image' : 'video';
      setSelectedMediaType(mediaType);
      setSelectedMedia(nextMedia.downloadUrl || nextMedia.url);
    }
  };

  // Tải xuống media
  const handleDownloadMedia = () => {
    if (selectedMedia) {
      const fileName = sharedMedia[currentMediaIndex]?.name || (selectedMediaType === 'image' ? 'image.jpg' : 'video.mp4');
      downloadFile(selectedMedia, fileName);
      message.success(`Đang tải xuống ${fileName}`);
    }
  };

  // Function to handle click on members count
  const handleShowMembers = () => {
    setShowMembersList(true);
  };

  const handleBackFromMembersList = () => {
    setShowMembersList(false);
  };

  // Function to add a co-owner
  const handleAddCoOwner = async (memberId: string) => {
    if (!currentConversation.conversationId || !currentConversation.rules) return;
    
    try {
      message.loading({ content: 'Đang thêm phó nhóm...', key: 'add-co-owner' });
      const result = await addCoOwner(
        currentConversation.conversationId,
        memberId,
        currentConversation.rules.coOwnerIds || []
      );
      
      if (result) {
        message.success({ content: 'Đã thêm phó nhóm thành công', key: 'add-co-owner', duration: 2 });
        // Update the conversation data
        setDetailedConversation(result as DetailedConversation);
      } else {
        message.error({ content: 'Không thể thêm phó nhóm', key: 'add-co-owner', duration: 2 });
      }
    } catch (err) {
      console.error('Error adding co-owner:', err);
      message.error('Đã xảy ra lỗi. Vui lòng thử lại sau.');
    }
  };

  // Function to remove a co-owner
  const handleRemoveCoOwner = async (memberId: string) => {
    if (!currentConversation.conversationId || !currentConversation.rules) return;
    
    try {
      message.loading({ content: 'Đang gỡ quyền phó nhóm...', key: 'remove-co-owner' });
      const result = await removeCoOwnerDirectly(
        currentConversation.conversationId,
        memberId
      );
      
      if (result) {
        message.success({ content: 'Đã gỡ quyền phó nhóm thành công', key: 'remove-co-owner', duration: 2 });
        // Update the conversation data
        setDetailedConversation(result as DetailedConversation);
      } else {
        message.error({ content: 'Không thể gỡ quyền phó nhóm', key: 'remove-co-owner', duration: 2 });
      }
    } catch (err) {
      console.error('Error removing co-owner:', err);
      message.error('Đã xảy ra lỗi. Vui lòng thử lại sau.');
    }
  };

  // Function to remove a member
  const handleRemoveMember = async (memberId: string) => {
    if (!currentConversation.conversationId) return;
    
    modal.confirm({
      title: 'Xóa thành viên',
      content: 'Bạn có chắc chắn muốn xóa thành viên này khỏi nhóm?',
      okText: 'Xóa',
      cancelText: 'Hủy',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          const key = 'remove-member';
          message.loading({ content: 'Đang xóa thành viên...', key });
          
          const success = await removeGroupMember(currentConversation.conversationId, memberId);
          
          if (success) {
            message.success({ content: 'Đã xóa thành viên khỏi nhóm', key, duration: 2 });
            
            // Update the conversation data to reflect the change
            const updatedConversation = await getConversationDetail(currentConversation.conversationId);
            setDetailedConversation(updatedConversation as DetailedConversation);
          } else {
            message.error({ content: 'Không thể xóa thành viên', key, duration: 2 });
          }
        } catch (err: any) {
          console.error('Error removing member:', err);
          
          // Handle specific error messages from the API
          if (err.response?.status === 403) {
            message.error('Bạn không có quyền xóa thành viên này khỏi nhóm');
          } else {
            message.error('Không thể xóa thành viên. Vui lòng thử lại sau.');
          }
        }
      }
    });
  };

  // If showing members list view
  if (showMembersList && isGroup) {
    return (
      <div className="h-full bg-white">
        <div className="flex-none p-4 border-b border-gray-200 flex items-center">
          <Button 
            type="text"
            className="flex items-center mr-2"
            icon={<LeftOutlined />}
            onClick={handleBackFromMembersList}
          />
          <h2 className="text-lg font-semibold">
            Thành viên
          </h2>
        </div>
        
        <div className="p-4 mb-4">
          <Button 
            block 
            icon={<UserAddOutlined />} 
            className="flex items-center justify-center bg-gray-100 hover:bg-gray-200 border-gray-200"
          >
            <span>Thêm thành viên</span>
          </Button>
        </div>
        
        <div className="px-4">
          <div className="flex justify-between items-center mb-2">
            <span>Danh sách thành viên ({groupMembers.length})</span>
            <MoreOutlined className="text-gray-500" />
          </div>
        </div>
        
        <div className="member-list overflow-y-auto">
          {groupMembers.map(memberId => {
            const memberInfo = userCache[memberId] || localUserCache[memberId];
            const isCurrentUser = memberId === localStorage.getItem('userId');
            const isOwner = currentConversation.rules?.ownerId === memberId;
            const isCoOwner = currentConversation.rules?.coOwnerIds?.includes(memberId) || false;
            
            // Determine if the current user should see the menu for this member
            const currentUserRole = userRole;
            let canShowMenu = false;
            
            if (currentUserRole === 'owner') {
              // Owner can see menu for everyone
              canShowMenu = true;
            } else if (currentUserRole === 'co-owner') {
              // Co-owner can see menu for regular members only
              canShowMenu = !isOwner && !isCoOwner;
            }
            
            return (
              <div 
                key={memberId}
                className="flex items-center justify-between p-3 hover:bg-gray-100 relative"
                onMouseEnter={() => setHoveredMemberId(memberId)}
                onMouseLeave={() => setHoveredMemberId(null)}
              >
                <div className="flex items-center">
                  <Avatar 
                    name={memberInfo?.fullname || 'User'}
                    avatarUrl={memberInfo?.urlavatar || userAvatars[memberId]}
                    size={48}
                    className="rounded-full mr-3"
                  />
                  <div>
                    <div className="font-medium flex items-center">
                      {memberInfo?.fullname || `User-${memberId.substring(0, 6)}`}
                      {isCurrentUser && <span className="text-gray-500 ml-2">(Bạn)</span>}
                    </div>
                    <div className="text-sm text-gray-500">
                      {isOwner ? 'Trưởng nhóm' : isCoOwner ? 'Phó nhóm' : ''}
                    </div>
                  </div>
                </div>
                
                {hoveredMemberId === memberId && canShowMenu && (
                  <div className="absolute right-4">
                    <Dropdown
                      overlay={
                        <Menu>
                          {isCurrentUser && userRole === 'owner' ? (
                            <Menu.Item key="leave" onClick={handleLeaveGroup} icon={<LogoutOutlined />}>
                              Rời nhóm
                            </Menu.Item>
                          ) : userRole === 'owner' && isCoOwner ? (
                            <>
                              <Menu.Item key="remove-co-owner" onClick={() => handleRemoveCoOwner(memberId)} icon={<LockOutlined />}>
                                Gỡ quyền phó nhóm
                              </Menu.Item>
                              <Menu.Item key="remove-member" onClick={() => handleRemoveMember(memberId)} icon={<UserDeleteOutlined />}>
                                Xóa khỏi nhóm
                              </Menu.Item>
                            </>
                          ) : userRole === 'owner' && !isOwner && !isCoOwner ? (
                            <>
                              <Menu.Item key="add-co-owner" onClick={() => handleAddCoOwner(memberId)} icon={<LockOutlined />}>
                                Thêm phó nhóm
                              </Menu.Item>
                              <Menu.Item key="remove-member" onClick={() => handleRemoveMember(memberId)} icon={<UserDeleteOutlined />}>
                                Xóa khỏi nhóm
                              </Menu.Item>
                            </>
                          ) : null}
                        </Menu>
                      }
                      trigger={['click']}
                      placement="bottomRight"
                    >
                      <Button 
                        type="text" 
                        icon={<MoreOutlined />} 
                        className="flex items-center justify-center"
                      />
                    </Dropdown>
                  </div>
                )}
                
                {isOwner && !isCurrentUser && (
                  <Button
                    type="link"
                    className="text-blue-500"
                  >
                    Kết bạn
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // If showing group management view
  if (showGroupManagement && isGroup) {
    return (
      <GroupManagement 
        conversation={currentConversation}
        groupLink={groupLink}
        onBack={handleBackFromGroupManagement}
        onDisband={onLeaveGroup}
      />
    );
  }

  // If showing media gallery view
  if (showMediaGallery && mediaGalleryType) {
    return (
      <div className="h-full bg-white">
        <div className="flex-none p-4 border-b border-gray-200 flex items-center">
          <Button 
            type="text"
            className="flex items-center mr-2"
            icon={<LeftOutlined />}
            onClick={handleBackFromMediaGallery}
          />
          <h2 className="text-lg font-semibold">
            Kho lưu trữ
          </h2>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {mediaGalleryType === 'media' ? (
            <MediaGallery
              type="media" 
              items={sharedMedia}
              conversationId={conversation.conversationId}
              onPreviewMedia={handleMediaPreview}
              onDownload={handleDownloadFile}
            />
          ) : (
            <MediaGallery
              type="files"
              items={sharedFiles}
              conversationId={conversation.conversationId}
              onPreviewMedia={handleMediaPreview}
              onDownload={handleDownloadFile}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="chat-info flex flex-col h-full bg-white">
      {/* Header - Fixed */}
      <div className="flex-none p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-center">
          {isGroup ? 'Thông tin nhóm' : 'Thông tin hội thoại'}
        </h2>
      </div>

      {/* Main content - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
              <p className="text-gray-500">{t.loading || 'Đang tải...'}</p>
            </div>
          </div>
        ) : (
          <>
            {/* User/Group Info Section */}
            <div className="py-6 text-center border-b border-gray-100">
              <div className="flex flex-col items-center">
                {isGroup ? (
                  <GroupAvatar
                    members={groupMembers}
                    userAvatars={userAvatars}
                    size={80}
                    className="mb-3 border-2 border-white"
                    groupAvatarUrl={groupAvatarUrl || undefined}
                  />
                ) : (
                  <Avatar 
                    name={otherUserInfo?.fullname || 'User'}
                    avatarUrl={otherUserInfo?.urlavatar}
                    size={80}
                    className="rounded-full mb-3"
                  />
                )}
                <div className="flex items-center justify-center gap-2 mb-1">
                  <h3 className="text-lg font-semibold">
                    {displayName}
                  </h3>
                  <EditOutlined 
                    onClick={handleEditName}
                    className="text-gray-500 hover:text-blue-500 cursor-pointer"
                  />
                </div>
                <p className="text-sm text-gray-500 mb-4">{onlineStatus}</p>

                {/* Quick Actions - Different for group vs individual */}
                <div className="flex justify-center gap-8 w-full mt-2">
                  <div className="flex flex-col items-center">
                    <Button
                      type="text"
                      shape="circle"
                      icon={<BellOutlined className={isMuted ? 'text-blue-500' : 'text-gray-500'} />}
                      onClick={handleToggleMute}
                      className="flex items-center justify-center h-10 w-10 bg-gray-100"
                    />
                    <span className="text-xs mt-1">Tắt thông báo</span>
                  </div>
                  
                  <div className="flex flex-col items-center">
                    <Button
                      type="text"
                      shape="circle"
                      icon={<PushpinOutlined className={isPinned ? 'text-blue-500' : 'text-gray-500'} />}
                      onClick={handleTogglePin}
                      className="flex items-center justify-center h-10 w-10 bg-gray-100"
                    />
                    <span className="text-xs mt-1">Ghim hội thoại</span>
                  </div>
                  
                  {isGroup ? (
                    <>
                      <div className="flex flex-col items-center">
                        <Button
                          type="text"
                          shape="circle"
                          icon={<UserAddOutlined className="text-gray-500" />}
                          className="flex items-center justify-center h-10 w-10 bg-gray-100"
                        />
                        <span className="text-xs mt-1">Thêm thành viên</span>
                      </div>
                      
                      <div className="flex flex-col items-center">
                        <Button
                          type="text"
                          shape="circle"
                          icon={<SettingOutlined className="text-gray-500" />}
                          onClick={handleShowGroupManagement}
                          className="flex items-center justify-center h-10 w-10 bg-gray-100"
                        />
                        <span className="text-xs mt-1">Quản lý nhóm</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center">
                      <Button
                        type="text"
                        shape="circle"
                        icon={<UsergroupAddOutlined className="text-gray-500" />}
                        className="flex items-center justify-center h-10 w-10 bg-gray-100"
                      />
                      <span className="text-xs mt-1">Tạo nhóm</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Group Members or Mutual Groups Section */}
            {isGroup ? (
              // Group Members Section for Groups
              <div className="border-b border-gray-100">
                <div 
                  className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50"
                  onClick={() => setActiveKeys(prev => prev.includes("members") ? prev.filter(k => k !== "members") : [...prev, "members"])}
                >
                  <div className="flex items-center">
                    <TeamOutlined className="text-gray-500 mr-3" />
                    <span className="font-medium">Thành viên nhóm</span>
                  </div>
                  <RightOutlined className={`text-gray-400 transition-transform ${activeKeys.includes("members") ? 'transform rotate-90' : ''}`} />
                </div>
                
                {activeKeys.includes("members") && (
                  <div className="p-4 border-t border-gray-100">
                    <div className="flex items-center mb-4">
                      <TeamOutlined className="text-gray-500 mr-2" />
                      <span className="cursor-pointer hover:text-blue-500" onClick={handleShowMembers}>{groupMembers.length} thành viên</span>
                    </div>
                    
                    <div className="mb-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Link tham gia nhóm</span>
                      </div>
                      <div className="flex items-center mt-2 p-2 bg-gray-50 rounded">
                        <span className="text-blue-500 flex-1 truncate">{groupLink}</span>
                        <Button 
                          type="text" 
                          icon={<CopyOutlined />} 
                          onClick={handleCopyGroupLink}
                          className="text-gray-500 hover:text-blue-500"
                        />
                        <Button 
                          type="text" 
                          icon={<ShareAltOutlined />} 
                          onClick={handleShareGroupLink}
                          className="text-gray-500 hover:text-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // Mutual Groups Section for Individual Chats
              <div className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <TeamOutlined className="text-gray-500 mr-3" />
                    <span>{mutualGroups} nhóm chung</span>
                  </div>
                </div>
              </div>
            )}
            
            {/* Group Board Section - Only for Groups */}
            {isGroup && (
              <div className="border-b border-gray-100">
                <div 
                  className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50"
                  onClick={() => setActiveKeys(prev => prev.includes("board") ? prev.filter(k => k !== "board") : [...prev, "board"])}
                >
                  <div className="flex items-center">
                    <FileTextOutlined className="text-gray-500 mr-3" />
                    <span className="font-medium">Bảng tin nhóm</span>
                  </div>
                  <RightOutlined className={`text-gray-400 transition-transform ${activeKeys.includes("board") ? 'transform rotate-90' : ''}`} />
                </div>
                
                {activeKeys.includes("board") && (
                  <div className="p-4 border-t border-gray-100 space-y-3">
                    <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded cursor-pointer">
                      <div className="flex items-center">
                        <ClockCircleOutlined className="text-gray-500 mr-2" />
                        <span>Danh sách nhắc hẹn</span>
                      </div>
                      <RightOutlined className="text-gray-400" />
                    </div>
                    
                    <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded cursor-pointer">
                      <div className="flex items-center">
                        <FileTextOutlined className="text-gray-500 mr-2" />
                        <span>Ghi chú, ghim, bình chọn</span>
                      </div>
                      <RightOutlined className="text-gray-400" />
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Reminders - Only for Individual Chats */}
            {!isGroup && (
              <div className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <ClockCircleOutlined className="text-gray-500 mr-3" />
                    <span>Danh sách nhắc hẹn</span>
                  </div>
                </div>
              </div>
            )}

            {/* Media Section - Update to use downloadUrl */}
            <div className="border-b border-gray-100">
              <div className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50"
                onClick={() => setActiveKeys(prev => prev.includes("media") ? prev.filter(k => k !== "media") : [...prev, "media"])}>
                <div className="flex items-center">
                  <FileImageOutlined className="text-gray-500 mr-3" />
                  <span className="font-medium">Ảnh/Video</span>
                </div>
                <RightOutlined className={`text-gray-400 transition-transform ${activeKeys.includes("media") ? 'transform rotate-90' : ''}`} />
              </div>
              
              {activeKeys.includes("media") && (
                <div className="p-4 border-t border-gray-100">
                  {sharedMedia.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2">
                      {sharedMedia.slice(0, 6).map((item, index) => (
                        <div 
                          key={`media-${index}`} 
                          className="aspect-square bg-gray-100 rounded overflow-hidden relative cursor-pointer border border-gray-200"
                          onClick={() => {
                            const mediaType = item.type?.startsWith('image') ? 'image' : 'video';
                            handleMediaPreview(item, mediaType, index);
                          }}
                        >
                          {item.type && item.type.startsWith('image') ? (
                            <img 
                              src={item.url}
                              alt={item.name || `Image ${index}`}
                              className="w-full h-full object-cover"
                            />
                          ) : item.type && item.type.startsWith('video') ? (
                            <div className="absolute inset-0 flex items-center justify-center">
                              {/* Nếu có thumbnailUrl thì hiển thị thumbnail */}
                              {item.thumbnailUrl ? (
                                <>
                                  <img 
                                    src={item.thumbnailUrl} 
                                    alt={item.name || "Video"} 
                                    className="w-full h-full object-cover absolute inset-0"
                                  />
                                  <div className="absolute inset-0 bg-black opacity-30"></div>
                                </>
                              ) : (
                                <div className="absolute inset-0 bg-black opacity-70"></div>
                              )}
                              
                              {/* Icon play video */}
                              <div className="z-10 text-white bg-black bg-opacity-50 rounded-full p-2">
                                <PlayCircleOutlined className="text-3xl" />
                              </div>
                              
                              {/* Hiển thị nhãn video ở góc dưới */}
                              <div className="absolute bottom-1 right-2 bg-black bg-opacity-70 text-white text-xs px-1 rounded">
                                Video
                              </div>
                            </div>
                          ) : (
                            <div className="aspect-square bg-gray-200 rounded overflow-hidden relative">
                              <div className="absolute inset-0 flex items-center justify-center">
                                <FileImageOutlined className="text-gray-500 text-xl" />
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 text-center py-2">
                      Chưa có ảnh/video nào
                    </div>
                  )}
                  
                  {sharedMedia.length > 0 && (
                    <div 
                      className="flex justify-center items-center mt-3 py-2 bg-gray-100 rounded cursor-pointer hover:bg-gray-200"
                      onClick={() => handleShowMediaGallery('media')}
                    >
                      <span>Xem tất cả</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* File Section - Update to use downloadUrl */}
            <div className="border-b border-gray-100">
              <div className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50"
                onClick={() => setActiveKeys(prev => prev.includes("files") ? prev.filter(k => k !== "files") : [...prev, "files"])}>
                <div className="flex items-center">
                  <FileOutlined className="text-gray-500 mr-3" />
                  <span className="font-medium">File</span>
                </div>
                <RightOutlined className={`text-gray-400 transition-transform ${activeKeys.includes("files") ? 'transform rotate-90' : ''}`} />
              </div>
              
              {activeKeys.includes("files") && (
                <div className="p-4 border-t border-gray-100">
                  {sharedFiles.length > 0 ? (
                    <div className="space-y-3">
                      {sharedFiles.map((file, index) => {
                        // Determine file type icon and background color
                        let FileIcon = FileOutlined;
                        let bgColor = "bg-blue-500";
                        
                        if (file.name) {
                          const ext = file.name.split('.').pop()?.toLowerCase();
                          if (ext === 'json') {
                            bgColor = "bg-blue-400";
                          } else if (ext === 'env') {
                            bgColor = "bg-cyan-400";
                          } else if (['jpg', 'png', 'gif', 'jpeg'].includes(ext || '')) {
                            FileIcon = FileImageOutlined;
                            bgColor = "bg-purple-400";
                          } else if (['mp4', 'avi', 'mov'].includes(ext || '')) {
                            bgColor = "bg-red-400";
                          } else if (['zip', 'rar', '7z'].includes(ext || '')) {
                            bgColor = "bg-yellow-500";
                          } else if (['docx', 'doc', 'pdf'].includes(ext || '')) {
                            bgColor = "bg-blue-600";
                          }
                        }
                        
                        // Format date - không sử dụng padStart để tránh số 0 phía trước
                        let formattedDate = '';
                        if (file.createdAt) {
                          const fileDate = new Date(file.createdAt);
                          const today = new Date();
                          const yesterday = new Date();
                          yesterday.setDate(yesterday.getDate() - 1);
                          
                          // Format thời gian
                          const hours = fileDate.getHours();
                          const minutes = fileDate.getMinutes() < 10 ? '0' + fileDate.getMinutes() : fileDate.getMinutes();
                          const timeString = `${hours}:${minutes}`;
                          
                          // Định dạng ngày
                          if (fileDate.toDateString() === today.toDateString()) {
                            formattedDate = `Hôm nay, ${timeString}`;
                          } else if (fileDate.toDateString() === yesterday.toDateString()) {
                            formattedDate = `Hôm qua, ${timeString}`;
                          } else if (fileDate.getFullYear() === today.getFullYear()) {
                            const day = fileDate.getDate();
                            const month = fileDate.getMonth() + 1;
                            formattedDate = `${day}/${month}`;
                          } else {
                            const day = fileDate.getDate();
                            const month = fileDate.getMonth() + 1;
                            formattedDate = `${day}/${month}/${fileDate.getFullYear()}`;
                          }
                        }
                        
                        return (
                          <div key={`file-${index}`} className="flex items-center justify-between py-2">
                            <div className="flex items-center">
                              <div className={`w-10 h-10 rounded flex items-center justify-center text-white ${bgColor} mr-3`}>
                                <span className="text-xs font-bold uppercase">{file.name?.split('.').pop() || 'FILE'}</span>
                              </div>
                              <div>
                                <div className="font-medium">{file.name}</div>
                                <div className="flex items-center text-xs text-gray-500">
                                  <span>{file.size ? `${Math.round(file.size / 1024)} KB` : ''}</span>
                                  {file.size && <span className="mx-1">•</span>}
                                  <span>{formattedDate}</span>
                                </div>
                              </div>
                            </div>
                            <Button 
                              type="link" 
                              className="text-gray-400 hover:text-blue-500"
                              onClick={() => handleDownloadFile(file.url, file.downloadUrl, file.name)}
                            >
                              <DownloadOutlined />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 text-center py-2">
                      {isGroup ? 'Chưa có file nào' : 'Chưa có File được chia sẻ từ sau 10/3/2025'}
                    </div>
                  )}
                  
                  {sharedFiles.length > 0 && (
                    <div 
                      className="flex justify-center items-center mt-3 py-2 bg-gray-100 rounded cursor-pointer hover:bg-gray-200"
                      onClick={() => handleShowMediaGallery('files')}
                    >
                      <span>Xem tất cả</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Link Section */}
            <div className="cursor-pointer hover:bg-gray-50" onClick={() => setActiveKeys(prev => prev.includes("links") ? prev.filter(k => k !== "links") : [...prev, "links"])}>
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <div className="flex items-center">
                  <LinkOutlined className="text-gray-500 mr-3" />
                  <span>Link</span>
                </div>
                <RightOutlined className={`text-gray-400 transition-transform ${activeKeys.includes("links") ? 'transform rotate-90' : ''}`} />
              </div>
              {activeKeys.includes("links") && (
                <div className="p-4 border-b border-gray-100 bg-gray-50">
                  {sharedLinks.length > 0 ? (
                    <div className="space-y-3">
                      {/* Mock links - in real implementation, these would come from the API */}
                      <div className="flex items-center justify-between p-2 bg-white rounded">
                        <div className="flex items-center">
                          <LinkOutlined className="text-blue-500 mr-2" />
                          <div>
                            <div className="font-medium truncate w-52">
                              {isGroup ? 'render.com' : '3e9a-2401-d800-a0e-6d-4873-72e5-6f11-a9e1.ngrok-free.app'}
                            </div>
                            <div className="text-xs text-gray-500">19/04</div>
                          </div>
                        </div>
                        <div className="flex space-x-1">
                          <Button type="text" icon={<ShareAltOutlined />} size="small" />
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-white rounded">
                        <div className="flex items-center">
                          <LinkOutlined className="text-blue-500 mr-2" />
                          <div>
                            <div className="font-medium truncate w-52">
                              {isGroup ? 'socket.io\\dist\\typed-events.js' : 'raw.githubusercontent.com/.../cursor_win_id_modifier.ps1'}
                            </div>
                            <div className="text-xs text-gray-500">{isGroup ? '16/04' : '18/04'}</div>
                          </div>
                        </div>
                        <div className="flex space-x-1">
                          <Button type="text" icon={<ShareAltOutlined />} size="small" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 text-center py-2">
                      Chưa có link nào
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Thiết lập bảo mật section */}
            <div className="cursor-pointer hover:bg-gray-50" onClick={() => setActiveKeys(prev => prev.includes("security") ? prev.filter(k => k !== "security") : [...prev, "security"])}>
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <div className="flex items-center">
                  <EyeInvisibleOutlined className="text-gray-500 mr-3" />
                  <span>Thiết lập bảo mật</span>
                </div>
                <RightOutlined className={`text-gray-400 transition-transform ${activeKeys.includes("security") ? 'transform rotate-90' : ''}`} />
              </div>
              {activeKeys.includes("security") && (
                <div className="p-4 border-b border-gray-100 bg-gray-50">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Tin nhắn tự xóa</p>
                        <p className="text-sm text-gray-500">Không bao giờ</p>
                      </div>
                      <Switch checked={false} size="small" />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Ẩn trò chuyện</p>
                        <p className="text-sm text-gray-500">Yêu cầu mật khẩu để xem</p>
                      </div>
                      <Switch checked={isHidden} onChange={handleToggleHidden} size="small" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Report and Delete Section */}
            <div className="mt-2">
              <div className="flex items-center text-red-500 px-4 py-3 cursor-pointer hover:bg-gray-50">
                <WarningOutlined className="mr-3" />
                <span>Báo xấu</span>
              </div>
              <div className="flex items-center text-red-500 px-4 py-3 cursor-pointer hover:bg-gray-50" onClick={handleDeleteChat}>
                <DeleteOutlined className="mr-3" />
                <span>Xóa lịch sử trò chuyện</span>
              </div>
              {isGroup && (
                <div className="flex items-center text-red-500 px-4 py-3 cursor-pointer hover:bg-gray-50" onClick={handleLeaveGroup}>
                  <LogoutOutlined className="mr-3" />
                  <span>Rời nhóm</span>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Modal xem trước ảnh/video */}
      <Modal
        open={isMediaModalOpen}
        onCancel={closeMediaModal}
        footer={null}
        centered
        width="auto"
        bodyStyle={{ padding: 0, backgroundColor: '#000000' }}
        style={{ 
          maxWidth: '100vw',
          backgroundColor: '#000000'
        }}
        className="media-preview-modal"
        closeIcon={false}
        keyboard={true}
      >
        <div className="relative flex flex-col h-[90vh] justify-center items-center bg-black">
          {/* Thanh trên cùng với nút đóng và chỉ số */}
          <div className="absolute top-0 left-0 right-0 bg-black bg-opacity-70 py-3 px-4 flex justify-between items-center z-20">
            <div className="w-8"></div> {/* Phần trống để cân bằng với nút đóng */}
            <div className="text-white font-medium text-sm">
              {currentMediaIndex + 1} / {sharedMedia.length}
            </div>
            <Button
              type="text"
              icon={<CloseOutlined style={{ fontSize: '20px' }} />}
              onClick={closeMediaModal}
              className="flex items-center justify-center h-8 w-8 bg-transparent hover:bg-opacity-80 text-white"
              style={{ border: 'none' }}
            />
          </div>

          {/* Hiển thị ảnh hoặc video */}
          <div className="flex justify-center items-center w-full h-full">
            {selectedMediaType === 'image' ? (
              <img
                src={selectedMedia || ''}
                alt="Preview"
                style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain' }}
                className="select-none"
              />
            ) : selectedMediaType === 'video' ? (
              <video
                src={selectedMedia || ''}
                controls
                autoPlay
                style={{ maxWidth: '100%', maxHeight: '80vh' }}
                className="select-none"
                id="media-preview-video"
                onError={(e) => console.error("Video load error:", e)}
              />
            ) : null}
          </div>

          {/* Thanh công cụ ở dưới */}
          <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-4 flex justify-between items-center">
            {/* Thông tin về ảnh/video */}
            <div className="text-sm max-w-[50%] truncate">
              {sharedMedia[currentMediaIndex]?.name || (selectedMediaType === 'image' ? 'Hình ảnh' : 'Video')}
            </div>
            
            {/* Các nút chức năng */}
            <div className="flex space-x-4">
              <Button
                type="link"
                icon={<DownloadOutlined style={{ fontSize: '20px', color: 'white' }} />}
                onClick={handleDownloadMedia}
                className="flex items-center justify-center h-10 w-10 bg-transparent text-white"
                style={{ border: 'none' }}
              />
            </div>
          </div>

          {/* Nút điều hướng trước/sau */}
          <div className="absolute inset-y-0 left-0 right-0 flex justify-between items-center px-2 pointer-events-none">
            {/* Nút trước */}
            <div className="pointer-events-auto">
              {currentMediaIndex > 0 && (
                <Button
                  type="text"
                  icon={<LeftOutlined style={{ fontSize: '20px', color: 'white' }} />}
                  onClick={handlePrevMedia}
                  className="flex items-center justify-center h-12 w-12 bg-red-600 rounded-none"
                  style={{ border: 'none' }}
                />
              )}
            </div>
            
            {/* Nút sau */}
            <div className="pointer-events-auto">
              {currentMediaIndex < sharedMedia.length - 1 && (
                <Button
                  type="text"
                  icon={<RightArrowOutlined style={{ fontSize: '20px', color: 'white' }} />}
                  onClick={handleNextMedia}
                  className="flex items-center justify-center h-12 w-12 bg-black bg-opacity-50 rounded-full"
                  style={{ border: 'none' }}
                />
              )}
            </div>
          </div>
        </div>
      </Modal>

      {/* Edit Local Name Modal */}
      <Modal
        title="Đổi tên gợi nhớ"
        open={isEditNameModalVisible}
        onOk={handleSaveLocalName}
        onCancel={() => setIsEditNameModalVisible(false)}
        okText="Lưu"
        cancelText="Hủy"
      >
        <Input
          value={localName}
          onChange={(e) => setLocalName(e.target.value)}
          className="w-full p-2 border rounded"
          placeholder="Nhập tên gợi nhớ"
        />
      </Modal>
    </div>
  );
};

export default ChatInfo; 