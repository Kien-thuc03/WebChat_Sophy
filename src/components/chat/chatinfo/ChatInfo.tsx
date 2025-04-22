import React, { useState, useEffect } from 'react';
import { Avatar } from '../../common/Avatar';
import { Button, Tooltip, Collapse, Badge, Switch, Modal, Divider, Input } from 'antd';
import { 
  BellOutlined,
  PushpinOutlined,
  UsergroupAddOutlined,
  ClockCircleOutlined,
  EyeInvisibleOutlined,
  SearchOutlined,
  EditOutlined,
  WarningOutlined,
  DeleteOutlined,
  PlusOutlined,
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
  NotificationOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import { Conversation } from '../../../features/chat/types/conversationTypes';
import { useConversations } from '../../../features/chat/hooks/useConversations';
import { getUserById, getConversationDetail } from "../../../api/API";
import { User } from "../../../features/auth/types/authTypes";
import GroupAvatar from '../GroupAvatar';
import { useLanguage } from "../../../features/auth/context/LanguageContext";
import GroupManagement from './GroupManagement';

interface ChatInfoProps {
  conversation: Conversation;
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

const ChatInfo: React.FC<ChatInfoProps> = ({ conversation }) => {
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
  const { userCache, userAvatars } = useConversations();
  const { t } = useLanguage();

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

  const handleLeaveGroup = () => {
    Modal.confirm({
      title: 'Rời nhóm',
      content: 'Bạn có chắc chắn muốn rời khỏi nhóm này?',
      okText: 'Rời nhóm',
      cancelText: 'Hủy',
      okButtonProps: { danger: true },
      onOk: () => {
        // Leave group logic using the API
        // Example: leaveGroup(currentConversation.conversationId);
      }
    });
  };

  const handleShowGroupManagement = () => {
    setShowGroupManagement(true);
  };

  const handleBackFromGroupManagement = () => {
    setShowGroupManagement(false);
  };

  // Determine the display name based on whether it's a group or individual conversation
  const displayName = isGroup 
    ? groupName || 'Nhóm chat' 
    : otherUserInfo?.fullname || t.loading || 'Đang tải...';

  // Determine online status
  const onlineStatus = isGroup ? `${groupMembers.length} thành viên` : 'Online';

  // Mock data for shared media/files/links
  const sharedMedia = detailedConversation?.sharedMedia || [];
  const sharedFiles = detailedConversation?.sharedFiles || [];
  const sharedLinks = detailedConversation?.sharedLinks || [];

  // If showing group management view
  if (showGroupManagement && isGroup) {
    return (
      <GroupManagement 
        conversation={currentConversation}
        groupLink={groupLink}
        onBack={handleBackFromGroupManagement}
      />
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
                      <span>{groupMembers.length} thành viên</span>
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

            {/* Media Section */}
            <div className="cursor-pointer hover:bg-gray-50" onClick={() => setActiveKeys(prev => prev.includes("media") ? prev.filter(k => k !== "media") : [...prev, "media"])}>
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <div className="flex items-center">
                  <FileImageOutlined className="text-gray-500 mr-3" />
                  <span>Ảnh/Video</span>
                </div>
                <RightOutlined className={`text-gray-400 transition-transform ${activeKeys.includes("media") ? 'transform rotate-90' : ''}`} />
              </div>
              {activeKeys.includes("media") && (
                <div className="p-4 border-b border-gray-100 bg-gray-50">
                  {sharedMedia.length > 0 ? (
                    <div className="grid grid-cols-4 gap-2">
                      {/* Mock images/videos - in real implementation, these would come from the API */}
                      <div className="aspect-square bg-gray-200 rounded overflow-hidden relative">
                        <div className="absolute inset-0 flex items-center justify-center">
                          <FileImageOutlined className="text-gray-500 text-xl" />
                        </div>
                      </div>
                      <div className="aspect-square bg-gray-200 rounded overflow-hidden relative">
                        <div className="absolute inset-0 flex items-center justify-center">
                          <FileImageOutlined className="text-gray-500 text-xl" />
                        </div>
                      </div>
                      <div className="aspect-square bg-gray-200 rounded overflow-hidden relative">
                        <div className="absolute inset-0 flex items-center justify-center">
                          <FileImageOutlined className="text-gray-500 text-xl" />
                        </div>
                      </div>
                      <div className="aspect-square bg-gray-200 rounded overflow-hidden relative">
                        <div className="absolute inset-0 flex items-center justify-center">
                          <FileImageOutlined className="text-gray-500 text-xl" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 text-center py-2">
                      Chưa có ảnh/video nào
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* File Section */}
            <div className="cursor-pointer hover:bg-gray-50" onClick={() => setActiveKeys(prev => prev.includes("files") ? prev.filter(k => k !== "files") : [...prev, "files"])}>
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <div className="flex items-center">
                  <FileOutlined className="text-gray-500 mr-3" />
                  <span>File</span>
                </div>
                <RightOutlined className={`text-gray-400 transition-transform ${activeKeys.includes("files") ? 'transform rotate-90' : ''}`} />
              </div>
              {activeKeys.includes("files") && (
                <div className="p-4 border-b border-gray-100 bg-gray-50">
                  {isGroup && sharedFiles.length > 0 ? (
                    <div className="space-y-3">
                      {/* Mock files - in real implementation, these would come from the API */}
                      <div className="flex items-center justify-between p-2 bg-white rounded">
                        <div className="flex items-center">
                          <FileOutlined className="text-blue-500 mr-2" />
                          <div>
                            <div className="font-medium">user_data.json</div>
                            <div className="text-xs text-gray-500">105.22 KB</div>
                          </div>
                        </div>
                        <div className="flex space-x-1">
                          <Button type="text" icon={<ShareAltOutlined />} size="small" />
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-white rounded">
                        <div className="flex items-center">
                          <FileOutlined className="text-blue-500 mr-2" />
                          <div>
                            <div className="font-medium">.env</div>
                            <div className="text-xs text-gray-500">913 B</div>
                          </div>
                        </div>
                        <div className="flex space-x-1">
                          <Button type="text" icon={<ShareAltOutlined />} size="small" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 text-center py-2">
                      {isGroup ? 'Chưa có file nào' : 'Chưa có File được chia sẻ từ sau 10/3/2025'}
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