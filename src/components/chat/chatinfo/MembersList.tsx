import React, { useState, useEffect, useCallback } from 'react';
import { Button, Dropdown, Menu, App, notification } from 'antd';
import { 
  UserAddOutlined,
  MoreOutlined,
  LeftOutlined,
  LockOutlined,
  LogoutOutlined,
  UserDeleteOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { Avatar } from '../../common/Avatar';
import { User } from "../../../features/auth/types/authTypes";
import { Conversation } from '../../../features/chat/types/conversationTypes';
import { getUserById, fetchFriends, getConversationDetail } from "../../../api/API";
import UserInfoHeaderModal from '../../header/modal/UserInfoHeaderModal';
import { useNavigate } from 'react-router-dom';
import socketService from '../../../services/socketService';

// Define interface for simplified member info
interface MemberInfo {
  userId: string;
  fullname: string;
  phone?: string;
  urlavatar?: string;
  isMale?: boolean;
  birthday?: string;
}

interface MembersListProps {
  conversation: Conversation;
  userCache: Record<string, User>;
  userAvatars: Record<string, string>;
  userRole: 'owner' | 'co-owner' | 'member';
  onBack: () => void;
  onLeaveGroup: () => void;
  addCoOwner: (conversationId: string, userId: string, currentCoOwnerIds: string[]) => Promise<Conversation | null>;
  removeCoOwner: (conversationId: string, userId: string) => Promise<Conversation | null>;
  removeMember: (conversationId: string, userId: string) => Promise<boolean>;
}

const MembersList: React.FC<MembersListProps> = ({
  conversation: initialConversation,
  userCache,
  userAvatars,
  userRole: initialUserRole,
  onBack,
  onLeaveGroup,
  addCoOwner,
  removeCoOwner,
  removeMember
}) => {
  // Keep local state of conversation to update it after changes
  const [conversation, setConversation] = useState<Conversation>(initialConversation);
  const [userRole, setUserRole] = useState(initialUserRole);
  const [hoveredMemberId, setHoveredMemberId] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<MemberInfo | null>(null);
  const [isUserInfoModalVisible, setIsUserInfoModalVisible] = useState(false);
  const [friendList, setFriendList] = useState<string[]>([]);
  const [localUserCache, setLocalUserCache] = useState<Record<string, User>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activityLog, setActivityLog] = useState<Array<{title: string, description: string, timestamp: number}>>([]);
  const { message } = App.useApp();
  const navigate = useNavigate();

  const groupMembers = conversation.groupMembers || [];
  const currentUserId = localStorage.getItem('userId') || '';

  // Function to get user name from cache or default value
  const getUserName = useCallback((userId: string): string => {
    const user = userCache[userId] || localUserCache[userId];
    return user ? user.fullname : 'Một thành viên';
  }, [userCache, localUserCache]);

  // Update this function to only log to console without showing UI notification
  const updateGroupState = useCallback((userId: string, action: string) => {
    console.log(`Group event: ${action}`, { userId, conversationId: conversation.conversationId });
  }, [conversation.conversationId]);

  // Register socket event handlers in a dedicated useEffect
  useEffect(() => {
    if (!conversation.conversationId) return;
    
    // Handler for when a user leaves the group
    const handleUserLeftGroup = (data: { conversationId: string, userId: string }) => {
      if (data.conversationId !== conversation.conversationId) return;
      
      console.log('MembersList: User left group:', data);
      
      // If current user left, go back
      if (data.userId === currentUserId) {
        onBack();
        return;
      }
      
      // Update the conversation by removing the member
      setConversation(prev => {
        return {
          ...prev,
          groupMembers: prev.groupMembers?.filter(id => id !== data.userId) || []
        };
      });
      
      updateGroupState(data.userId, 'userLeftGroup');
    };
    
    // Handler for when a group is deleted
    const handleGroupDeleted = (data: { conversationId: string }) => {
      if (data.conversationId !== conversation.conversationId) return;
      
      console.log('MembersList: Group deleted:', data);
      
      // Go back to conversation list
      onBack();
    };
    
    // Handler for when co-owners are added
    const handleGroupCoOwnerAdded = (data: { conversationId: string, newCoOwnerIds: string[] }) => {
      if (data.conversationId !== conversation.conversationId) return;
      
      console.log('MembersList: Co-owner added:', data);
      
      // Get existing co-owner IDs
      const existingCoOwnerIds = conversation.rules?.coOwnerIds || [];
      
      // Find the new co-owners (those in newCoOwnerIds but not in existingCoOwnerIds)
      const newCoOwners = data.newCoOwnerIds.filter(id => !existingCoOwnerIds.includes(id));
      
      // Update the conversation with the new co-owners
      setConversation(prev => {
        if (!prev.rules) return prev;
        
        return {
          ...prev,
          rules: {
            ...prev.rules,
            coOwnerIds: data.newCoOwnerIds
          }
        };
      });
      
      // If current user is in the new co-owners list, update role
      if (data.newCoOwnerIds.includes(currentUserId) && !existingCoOwnerIds.includes(currentUserId)) {
        setUserRole('co-owner');
      } 
      
      if (newCoOwners.length > 0) {
        updateGroupState(newCoOwners[0], 'groupCoOwnerAdded');
      }
    };
    
    // Handler for when a co-owner is removed
    const handleGroupCoOwnerRemoved = (data: { conversationId: string, removedCoOwner: string }) => {
      if (data.conversationId !== conversation.conversationId) return;
      
      console.log('MembersList: Co-owner removed:', data);
      
      // Update the conversation by removing the co-owner
      setConversation(prev => {
        if (!prev.rules || !prev.rules.coOwnerIds) return prev;
        
        return {
          ...prev,
          rules: {
            ...prev.rules,
            coOwnerIds: prev.rules.coOwnerIds.filter(id => id !== data.removedCoOwner)
          }
        };
      });
      
      // If current user was removed as co-owner, update role
      if (data.removedCoOwner === currentUserId) {
        setUserRole('member');
      }
      
      updateGroupState(data.removedCoOwner, 'groupCoOwnerRemoved');
    };
    
    // Handler for when group owner changes
    const handleGroupOwnerChanged = (data: { conversationId: string, newOwner: string }) => {
      if (data.conversationId !== conversation.conversationId) return;
      
      console.log('MembersList: Owner changed:', data);
      
      const previousOwner = conversation.rules?.ownerId || '';
      
      // Update the conversation with the new owner
      setConversation(prev => {
        if (!prev.rules) return prev;
        
        return {
          ...prev,
          rules: {
            ...prev.rules,
            ownerId: data.newOwner,
            // If the new owner was a co-owner, remove them from co-owners list
            coOwnerIds: prev.rules.coOwnerIds ? 
              prev.rules.coOwnerIds.filter(id => id !== data.newOwner) : 
              []
          }
        };
      });
      
      // Update the user role based on the change
      if (data.newOwner === currentUserId) {
        setUserRole('owner');
      } else if (previousOwner === currentUserId) {
        // If current user was the previous owner, downgrade to member
        setUserRole('member');
      }
      
      updateGroupState(data.newOwner, 'groupOwnerChanged');
    };
    
    // Register socket event handlers
    socketService.on('userLeftGroup', handleUserLeftGroup);
    socketService.on('groupDeleted', handleGroupDeleted);
    socketService.on('groupCoOwnerAdded', handleGroupCoOwnerAdded);
    socketService.on('groupCoOwnerRemoved', handleGroupCoOwnerRemoved);
    socketService.on('groupOwnerChanged', handleGroupOwnerChanged);
    
    // Cleanup function
    return () => {
      socketService.off('userLeftGroup', handleUserLeftGroup);
      socketService.off('groupDeleted', handleGroupDeleted);
      socketService.off('groupCoOwnerAdded', handleGroupCoOwnerAdded);
      socketService.off('groupCoOwnerRemoved', handleGroupCoOwnerRemoved);
      socketService.off('groupOwnerChanged', handleGroupOwnerChanged);
    };
  }, [conversation.conversationId, conversation.rules?.ownerId, conversation.rules?.coOwnerIds, updateGroupState, currentUserId, onBack]);

  // Function to refresh conversation data
  const refreshConversationData = async () => {
    try {
      if (!conversation.conversationId) return;
      
      const updatedConversation = await getConversationDetail(conversation.conversationId);
      if (updatedConversation) {
        setConversation(updatedConversation);
        console.log('Conversation data refreshed:', updatedConversation);
      }
    } catch (err) {
      console.error('Error refreshing conversation data:', err);
    }
  };

  // Function to refresh friend list data without closing the modal
  const refreshFriendList = async () => {
    try {
      const friendsData = await fetchFriends();
      if (friendsData && Array.isArray(friendsData)) {
        // Extract user IDs from friend list
        const friendIds = friendsData.map(friend => 
          friend.userId || friend._id || friend.id || ''
        ).filter(id => id);
        setFriendList(friendIds);
        console.log('Friend list refreshed:', friendIds);
      }
    } catch (err) {
      console.error('Error refreshing friend list:', err);
    }
  };

  // Fetch friend list and initialize conversation data on component mount
  useEffect(() => {
    refreshFriendList();
    refreshConversationData();
  }, []);

  // Update conversation when the prop changes
  useEffect(() => {
    setConversation(initialConversation);
    setUserRole(initialUserRole);
  }, [initialConversation, initialUserRole]);

  // Load user data for members not in cache
  useEffect(() => {
    const loadMissingUsers = async () => {
      for (const memberId of groupMembers) {
        if (!userCache[memberId] && !localUserCache[memberId]) {
          try {
            const userData = await getUserById(memberId);
            if (userData) {
              setLocalUserCache(prev => ({
                ...prev,
                [memberId]: userData
              }));
            }
          } catch (error) {
            console.error(`Failed to load data for user ${memberId}:`, error);
          }
        }
      }
    };
    
    loadMissingUsers();
  }, [groupMembers, userCache, localUserCache]);

  // Check if a user is a friend
  const isFriend = (userId: string): boolean => {
    const currentUserId = localStorage.getItem('userId');
    if (userId === currentUserId) return true; // Self is considered a "friend"
    return friendList.includes(userId);
  };

  // Check if the current user is the user being viewed
  const isCurrentUser = (userId: string): boolean => {
    const currentUserId = localStorage.getItem('userId');
    return userId === currentUserId;
  };

  // Handle click on friend request button
  const handleFriendRequest = async (memberId: string) => {
    try {
      // Refresh friend list first to ensure it's up to date
      await refreshFriendList();
      
      const memberData = await getUserById(memberId);
      if (memberData) {
        setSelectedMember({
          userId: memberData.userId,
          fullname: memberData.fullname,
          phone: memberData.phone,
          urlavatar: memberData.urlavatar,
          isMale: memberData.isMale,
          birthday: memberData.birthday
        });
        setIsUserInfoModalVisible(true);
      }
    } catch (err) {
      console.error('Error fetching member data:', err);
      message.error('Không thể tải thông tin người dùng');
    }
  };

  // Handle when friend request successful or completed
  const handleFriendActionComplete = () => {
    // Close the modal
    setIsUserInfoModalVisible(false);
    setSelectedMember(null);
    
    // Refresh the friend list after a short delay
    setTimeout(() => {
      refreshFriendList();
    }, 500);
  };

  // Only refresh friend list without closing modal
  const handleFriendListRefresh = () => {
    refreshFriendList();
  };

  // Handle messaging a user
  const handleMessage = async (userId: string, conversation: Conversation) => {
    // Navigate to conversation
    if (conversation?.conversationId) {
      navigate(`/chat/${conversation.conversationId}`);
    }
  };

  // Handle send friend request from modal
  const handleSendFriendRequest = (userId: string) => {
    // This is handled by the UserInfoHeaderModal
    console.log('Send friend request to:', userId);
  };

  // Function to add a co-owner
  const handleAddCoOwner = async (memberId: string) => {
    if (!conversation.conversationId || !conversation.rules) return;
    
    try {
      message.loading({ content: 'Đang thêm phó nhóm...', key: 'add-co-owner' });
      const result = await addCoOwner(
        conversation.conversationId,
        memberId,
        conversation.rules.coOwnerIds || []
      );
      
      if (result) {
        message.success({ content: 'Đã thêm phó nhóm thành công', key: 'add-co-owner', duration: 2 });
        // Immediately update the local conversation state
        await refreshConversationData();
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
    if (!conversation.conversationId) return;
    
    try {
      message.loading({ content: 'Đang gỡ quyền phó nhóm...', key: 'remove-co-owner' });
      const result = await removeCoOwner(
        conversation.conversationId,
        memberId
      );
      
      if (result) {
        message.success({ content: 'Đã gỡ quyền phó nhóm thành công', key: 'remove-co-owner', duration: 2 });
        // Immediately update the local conversation state
        await refreshConversationData();
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
    if (!conversation.conversationId) return;
    
    App.useApp().modal.confirm({
      title: 'Xóa thành viên',
      content: 'Bạn có chắc chắn muốn xóa thành viên này khỏi nhóm?',
      okText: 'Xóa',
      cancelText: 'Hủy',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          const key = 'remove-member';
          message.loading({ content: 'Đang xóa thành viên...', key });
          
          const success = await removeMember(conversation.conversationId, memberId);
          
          if (success) {
            message.success({ content: 'Đã xóa thành viên khỏi nhóm', key, duration: 2 });
            // Immediately update the local conversation state
            await refreshConversationData();
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

  return (
    <div className="h-full bg-white">
      <div className="flex-none p-4 border-b border-gray-200 flex items-center">
        <Button 
          type="text"
          className="flex items-center mr-2"
          icon={<LeftOutlined />}
          onClick={onBack}
        />
        <h2 className="text-lg font-semibold">
          Thành viên
        </h2>
        {isRefreshing && (
          <div className="ml-2 text-xs text-gray-500">Đang cập nhật...</div>
        )}
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
          const isCurrentUserMember = memberId === localStorage.getItem('userId');
          const isOwner = conversation.rules?.ownerId === memberId;
          const isCoOwner = conversation.rules?.coOwnerIds?.includes(memberId) || false;
          const isMemberFriend = isFriend(memberId);
          
          // Determine if the current user should see the menu for this member
          let canShowMenu = false;
          
          if (userRole === 'owner') {
            // Owner can see menu for everyone
            canShowMenu = true;
          } else if (userRole === 'co-owner') {
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
                    {isCurrentUserMember && <span className="text-gray-500 ml-2">(Bạn)</span>}
                  </div>
                  <div className="text-sm text-gray-500">
                    {isOwner ? 'Trưởng nhóm' : isCoOwner ? 'Phó nhóm' : ''}
                  </div>
                </div>
              </div>
              
              {/* Buttons container with proper spacing */}
              <div className="flex items-center space-x-2">
                {/* Kết bạn/Nhắn tin button (only for non-current user) */}
                {!isCurrentUserMember && (
                  <>
                    {!isMemberFriend ? (
                      <Button
                        type="link"
                        className="text-blue-500"
                        onClick={() => handleFriendRequest(memberId)}
                      >
                        Kết bạn
                      </Button>
                    ) : (
                      <Button
                        type="link"
                        className="text-blue-500"
                        onClick={() => handleFriendRequest(memberId)}
                      >
                        Nhắn tin
                      </Button>
                    )}
                  </>
                )}
                
                {/* Three dots menu (only show when hovering) */}
                {hoveredMemberId === memberId && canShowMenu && (
                  <Dropdown
                    overlay={
                      <Menu>
                        {isCurrentUserMember && userRole === 'owner' ? (
                          <Menu.Item key="leave" onClick={onLeaveGroup} icon={<LogoutOutlined />}>
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
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* User Info Modal for friend requests */}
      {selectedMember && (
        <UserInfoHeaderModal
          visible={isUserInfoModalVisible}
          onCancel={() => setIsUserInfoModalVisible(false)}
          searchResult={{
            userId: selectedMember.userId,
            fullname: selectedMember.fullname,
            phone: selectedMember.phone || '',
            avatar: selectedMember.urlavatar,
            isMale: selectedMember.isMale,
            birthday: selectedMember.birthday
          }}
          isCurrentUser={isCurrentUser}
          isFriend={isFriend}
          handleUpdate={() => {}}
          handleMessage={(userId, conversation) => {
            handleMessage(userId, conversation);
            handleFriendActionComplete();
          }}
          handleSendFriendRequest={handleSendFriendRequest}
          isSending={false}
          onRequestsUpdate={handleFriendListRefresh}
        />
      )}
    </div>
  );
};

export default MembersList; 