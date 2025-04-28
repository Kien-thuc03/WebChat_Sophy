import React, { useState, useEffect, useCallback, useReducer, useMemo } from "react";
import { Button, Switch, Tooltip, Modal, Input, List , notification } from "antd";
import {
  ArrowLeftOutlined,
  QuestionCircleOutlined,
  CopyOutlined,
  ShareAltOutlined,
  ReloadOutlined,
  UserDeleteOutlined,
  TeamOutlined,
  DeleteOutlined,
  LockOutlined,
  SearchOutlined
} from "@ant-design/icons";
import { Conversation } from "../../../features/chat/types/conversationTypes";
import { User } from "../../../features/auth/types/authTypes";
import { useChatInfo } from "../../../features/chat/hooks/useChatInfo";
import { useConversations } from "../../../features/chat/hooks/useConversations";
import { getUserById, getConversationDetail } from "../../../api/API";
import { Avatar } from "../../common/Avatar";
import BlockedMembersList from "./BlockedMembersList";
import socketService from '../../../services/socketService';

interface GroupManagementProps {
  conversation: Conversation;
  groupLink: string;
  onBack: () => void;
  onDisband?: () => void;
  onAfterTransferOwner?: () => void;
}

// User roles enum
enum UserRole {
  OWNER = "owner",
  CO_OWNER = "co-owner",
  MEMBER = "member",
}

// Thêm reducer types
type State = {
  conversation: Conversation;
  userRole: UserRole;
  showOwnerManagement: boolean;
  isAddCoOwnerModalVisible: boolean;
  searchQuery: string;
  selectedMember: string | null;
  selectedNewOwner: string | null;
  isTransferOwnerModalVisible: boolean;
  showBlockedMembers: boolean;
  localUserCache: Record<string, User>;
  renderKey: number;
};

type Action =
  | { type: 'UPDATE_CONVERSATION'; payload: Conversation }
  | { type: 'SET_USER_ROLE'; payload: UserRole }
  | { type: 'TOGGLE_OWNER_MANAGEMENT' }
  | { type: 'TOGGLE_ADD_CO_OWNER_MODAL' }
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'SET_SELECTED_MEMBER'; payload: string | null }
  | { type: 'SET_SELECTED_NEW_OWNER'; payload: string | null }
  | { type: 'TOGGLE_TRANSFER_OWNER_MODAL' }
  | { type: 'TOGGLE_BLOCKED_MEMBERS' }
  | { type: 'UPDATE_USER_CACHE'; payload: Record<string, User> }
  | { type: 'FORCE_RENDER' };

// Thêm reducer function
const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'UPDATE_CONVERSATION':
      return {
        ...state,
        conversation: action.payload,
        userRole: determineUserRole(action.payload)
      };
    case 'SET_USER_ROLE':
      return { ...state, userRole: action.payload };
    case 'TOGGLE_OWNER_MANAGEMENT':
      return { ...state, showOwnerManagement: !state.showOwnerManagement };
    case 'TOGGLE_ADD_CO_OWNER_MODAL':
      return { ...state, isAddCoOwnerModalVisible: !state.isAddCoOwnerModalVisible };
    case 'SET_SEARCH_QUERY':
      return { ...state, searchQuery: action.payload };
    case 'SET_SELECTED_MEMBER':
      return { ...state, selectedMember: action.payload };
    case 'SET_SELECTED_NEW_OWNER':
      return { ...state, selectedNewOwner: action.payload };
    case 'TOGGLE_TRANSFER_OWNER_MODAL':
      return { ...state, isTransferOwnerModalVisible: !state.isTransferOwnerModalVisible };
    case 'TOGGLE_BLOCKED_MEMBERS':
      return { ...state, showBlockedMembers: !state.showBlockedMembers };
    case 'UPDATE_USER_CACHE':
      return { ...state, localUserCache: { ...state.localUserCache, ...action.payload } };
    case 'FORCE_RENDER':
      return { ...state, renderKey: Date.now() };
    default:
      return state;
  }
};

// Thêm hàm determineUserRole
const determineUserRole = (conversationData: Conversation): UserRole => {
  const currentUserId = localStorage.getItem("userId") || "";
  
  if (conversationData.rules?.ownerId === currentUserId) {
    return UserRole.OWNER;
  } else if (
    conversationData.rules?.coOwnerIds &&
    conversationData.rules?.coOwnerIds.includes(currentUserId)
  ) {
    return UserRole.CO_OWNER;
  } else {
    return UserRole.MEMBER;
  }
};

// Tối ưu socket event handling với useCallback
const useSocketEvents = (conversationId: string, dispatch: React.Dispatch<Action>, conversation: Conversation) => {
  const currentUserId = localStorage.getItem("userId") || "";
  const handleGroupCoOwnerAdded = useCallback((data: { conversationId: string, newCoOwnerIds: string[], byUserId?: string }) => {
    if (data.conversationId !== conversationId) return;
    // Nếu event không gửi đủ conversation, gọi lại API để lấy conversation mới nhất
    if (!data.newCoOwnerIds || !Array.isArray(data.newCoOwnerIds)) return;
    // Nếu coOwnerIds đã giống thì không làm gì cả
    const existingCoOwnerIds = conversation.rules?.coOwnerIds || [];
    if (JSON.stringify(existingCoOwnerIds) === JSON.stringify(data.newCoOwnerIds)) return;
    // Gọi lại API để lấy conversation mới nhất
    getConversationDetail(conversationId).then((updatedConversation) => {
      if (updatedConversation) {
        dispatch({ type: 'UPDATE_CONVERSATION', payload: updatedConversation });
      }
    });
  }, [conversationId, conversation, dispatch]);

  const handleGroupCoOwnerRemoved = useCallback((data: { conversationId: string, removedCoOwner: string }) => {
    if (data.conversationId !== conversationId) return;
    // Gọi lại API để lấy conversation mới nhất
    getConversationDetail(conversationId).then((updatedConversation) => {
      if (updatedConversation) {
        dispatch({ type: 'UPDATE_CONVERSATION', payload: updatedConversation });
      }
    });
  }, [conversationId, dispatch]);

  const handleGroupOwnerChanged = useCallback((data: { conversationId: string, newOwner: string }) => {
    if (data.conversationId !== conversationId) return;
    getConversationDetail(conversationId).then((updatedConversation) => {
      if (updatedConversation) {
        dispatch({ type: 'UPDATE_CONVERSATION', payload: updatedConversation });
      }
    });
  }, [conversationId, dispatch]);

  useEffect(() => {
    if (!conversationId) return;
    socketService.on('groupCoOwnerAdded', handleGroupCoOwnerAdded);
    socketService.on('groupCoOwnerRemoved', handleGroupCoOwnerRemoved);
    socketService.on('groupOwnerChanged', handleGroupOwnerChanged);
    return () => {
      socketService.off('groupCoOwnerAdded', handleGroupCoOwnerAdded);
      socketService.off('groupCoOwnerRemoved', handleGroupCoOwnerRemoved);
      socketService.off('groupOwnerChanged', handleGroupOwnerChanged);
    };
  }, [conversationId, handleGroupCoOwnerAdded, handleGroupCoOwnerRemoved, handleGroupOwnerChanged]);
};

const GroupManagement: React.FC<GroupManagementProps> = ({
  conversation: initialConversation,
  groupLink,
  onBack,
  onDisband,
  onAfterTransferOwner
}) => {
  // Thay thế các useState bằng useReducer
  const [state, dispatch] = useReducer(reducer, {
    conversation: initialConversation,
    userRole: UserRole.MEMBER,
    showOwnerManagement: false,
    isAddCoOwnerModalVisible: false,
    searchQuery: "",
    selectedMember: null,
    selectedNewOwner: null,
    isTransferOwnerModalVisible: false,
    showBlockedMembers: false,
    localUserCache: {},
    renderKey: Date.now()
  });

  // Destructure state
  const {
    conversation,
    userRole,
    showOwnerManagement,
    isAddCoOwnerModalVisible,
    searchQuery,
    selectedMember,
    selectedNewOwner,
    isTransferOwnerModalVisible,
    showBlockedMembers,
    localUserCache,
    renderKey
  } = state;
  
  // State for managing owners and co-owners
  const [permissions, setPermissions] = useState({
    canChangeNameAndAvatar: false,
    canPinMessages: true,
    canCreateNotes: true,
    canCreatePolls: true,
    canSendMessages: true,
  });

  // State for the additional settings
  const [settings, setSettings] = useState({
    approvalRequired: false,
    highlightAdminMessages: true,
    allowAccessToHistory: false,
    allowLinkInvitation: true,
  });

  // Use the chat info hook
  const { loading, error, addCoOwner, removeCoOwnerDirectly, transferOwnership, deleteGroupConversation, blockGroupMember, unblockGroupMember } = useChatInfo();
  const { userCache, userAvatars } = useConversations();

  // Function to get user name from cache or default value
  const getUserName = useCallback((userId: string): string => {
    const user = userCache[userId] || localUserCache[userId];
    return user ? user.fullname : 'Một thành viên';
  }, [userCache, localUserCache]);
  
  // Sử dụng custom hook cho socket events
  useSocketEvents(conversation.conversationId, dispatch, conversation);

  // Load user data for members not in the cache
  useEffect(() => {
    const loadMemberData = async () => {
      // Get all member IDs that need to be loaded
      const allMemberIds = conversation.groupMembers || [];
      const missingMemberIds = allMemberIds.filter(
        id => !userCache[id] && !localUserCache[id]
      );

      if (missingMemberIds.length === 0) return;

      // Load data for each missing member
      for (const memberId of missingMemberIds) {
        try {
          const userData = await getUserById(memberId);
          if (userData) {
            dispatch({ type: 'UPDATE_USER_CACHE', payload: {
              [memberId]: userData
            } });
          }
        } catch (error) {
          console.error(`Failed to load data for user ${memberId}:`, error);
        }
      }
    };

    loadMemberData();
  }, [conversation.groupMembers, userCache, localUserCache]);

  // Update the local conversation when the prop changes
  useEffect(() => {
    dispatch({ type: 'UPDATE_CONVERSATION', payload: initialConversation });
  }, [initialConversation]);

  // Fetch the most up-to-date conversation data when component mounts
  useEffect(() => {
    refreshConversationData();
  }, []);

  // Update handler for new messages
  const handleNewMessage = (data: any) => {
    if (data.conversationId === conversation.conversationId) {
      // Refresh the conversation data with a small delay to ensure backend sync
      setTimeout(() => {
        refreshConversationData();
      }, 300);
    }
  };

  // Add event listener for new messages to keep conversation data fresh
  useEffect(() => {
    if (!conversation.conversationId) return;
    
    // Listen for new message events
    socketService.on('newMessage', handleNewMessage);
    
    // Cleanup function
    return () => {
      socketService.off('newMessage', handleNewMessage);
    };
  }, [conversation.conversationId]);

  const handlePermissionChange = (permissionKey: keyof typeof permissions) => {
    // Only owner and co-owners can change permissions
    if (userRole === UserRole.MEMBER) return;

    setPermissions((prev) => ({
      ...prev,
      [permissionKey]: !prev[permissionKey],
    }));
  };

  const handleSettingChange = (settingKey: keyof typeof settings) => {
    // Only owner and co-owners can change settings
    if (userRole === UserRole.MEMBER) return;

    setSettings((prev) => ({
      ...prev,
      [settingKey]: !prev[settingKey],
    }));
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(groupLink);
    // You could add notification here
  };

  const handleShareLink = () => {
    // Implement share functionality
  };

  const handleRefreshLink = () => {
    // Only owner and co-owners can refresh the link
    if (userRole === UserRole.MEMBER) return;

    // Implement link refresh functionality
  };

  const handleDisbandGroup = () => {
    // Only owner can disband the group
    if (userRole !== UserRole.OWNER) return;

    // Implement disband group functionality with confirmation
    Modal.confirm({
      title: 'Giải tán nhóm',
      content: 'Bạn có chắc chắn muốn giải tán nhóm? Tất cả thành viên sẽ bị xóa khỏi nhóm và không thể hoàn tác hành động này.',
      okText: 'Giải tán',
      cancelText: 'Hủy',
      okButtonProps: { danger: true },
      onOk: async () => {
        if (!conversation.conversationId) {
          notification.error({
            message: 'Lỗi',
            description: 'Không thể giải tán nhóm. Vui lòng thử lại.'
          });
          return;
        }
        
        try {
          // Turn on loading state
          const key = 'disband-group';
          notification.open({
            key,
            message: 'Đang xử lý',
            description: 'Đang giải tán nhóm...',
            duration: 0
          });
          
          const result = await deleteGroupConversation(conversation.conversationId);
          
          if (result) {
            notification.success({
              key,
              message: 'Thành công',
              description: 'Đã giải tán nhóm thành công.',
              duration: 2
            });
            
            // Gọi callback để cập nhật giao diện ngay lập tức
            if (onDisband) {
              onDisband();
            } else {
              // Fallback nếu không có callback
              onBack();
            }
          } else {
            notification.error({
              key,
              message: 'Lỗi',
              description: error || 'Không thể giải tán nhóm',
              duration: 2
            });
          }
        } catch (err) {
          console.error('Failed to disband group:', err);
          notification.error({
            message: 'Lỗi',
            description: 'Không thể giải tán nhóm. Vui lòng thử lại.',
            duration: 2
          });
        }
      }
    });
  };


  // Get owner and co-owner data
  const owner = conversation.rules?.ownerId || "";
  const coOwners = conversation.rules?.coOwnerIds || [];
  
  // Filter group members that aren't owner or co-owners
  const regularMembers = conversation.groupMembers?.filter(
    (memberId) => 
      memberId !== owner && 
      !coOwners.includes(memberId)
  ) || [];

  // Function to get user details from cache or local state
  const getUserDetails = (userId: string): User | null => {
    return userCache[userId] || localUserCache[userId] || null;
  };

  // Tối ưu handleAddCoOwner
  const handleAddCoOwner = useCallback(async () => {
    if (!selectedMember || !conversation.conversationId) {
      notification.error({
        message: 'Lỗi',
        description: 'Không thể thêm phó nhóm. Vui lòng thử lại.'
      });
      return;
    }
    try {
      const key = 'coowner';
      notification.open({
        key,
        message: 'Đang xử lý',
        description: 'Đang thêm phó nhóm...',
        duration: 0
      });
      const updatedConversation = await addCoOwner(
        conversation.conversationId,
        selectedMember,
        conversation.rules?.coOwnerIds || []
      );
      if (updatedConversation) {
        dispatch({ type: 'UPDATE_CONVERSATION', payload: updatedConversation });
        dispatch({ type: 'TOGGLE_ADD_CO_OWNER_MODAL' });
        dispatch({ type: 'SET_SELECTED_MEMBER', payload: null });
        notification.success({
          key,
          message: 'Thành công',
          description: 'Đã thêm phó nhóm thành công',
          duration: 2
        });
      }
    } catch (err) {
      console.error('Failed to add co-owner:', err);
      notification.error({
        message: 'Lỗi',
        description: 'Không thể thêm phó nhóm. Vui lòng thử lại.',
        duration: 2
      });
    }
  }, [conversation.conversationId, selectedMember, conversation.rules?.coOwnerIds]);

  // Tối ưu handleRemoveCoOwner
  const handleRemoveCoOwner = useCallback(async (coOwnerId: string) => {
    if (!conversation.conversationId) {
      notification.error({
        message: 'Lỗi',
        description: 'Không thể xóa phó nhóm. Vui lòng thử lại.'
      });
      return;
    }
    try {
      const key = 'coowner-remove';
      notification.open({
        key,
        message: 'Đang xử lý',
        description: 'Đang xóa phó nhóm...',
        duration: 0
      });
      const updatedConversation = await removeCoOwnerDirectly(
        conversation.conversationId,
        coOwnerId
      );
      if (updatedConversation) {
        dispatch({ type: 'UPDATE_CONVERSATION', payload: updatedConversation });
        notification.success({
          key,
          message: 'Thành công',
          description: 'Đã xóa phó nhóm thành công',
          duration: 2
        });
      }
    } catch (err) {
      console.error('Failed to remove co-owner:', err);
      notification.error({
        message: 'Lỗi',
        description: 'Không thể xóa phó nhóm. Vui lòng thử lại.',
        duration: 2
      });
    }
  }, [conversation.conversationId]);

  // Tối ưu handleTransferOwnership
  const handleTransferOwnership = useCallback(async () => {
    if (!selectedNewOwner || !conversation.conversationId) {
      notification.error({
        message: 'Lỗi',
        description: 'Vui lòng chọn thành viên để chuyển quyền trưởng nhóm.'
      });
      return;
    }
    
    try {
      const key = 'transfer-owner';
      notification.open({
        key,
        message: 'Đang xử lý',
        description: 'Đang chuyển quyền trưởng nhóm...',
        duration: 0
      });
      
      const updatedConversation = await transferOwnership(
        conversation.conversationId,
        selectedNewOwner
      );
      
      if (updatedConversation) {
        dispatch({ type: 'UPDATE_CONVERSATION', payload: updatedConversation });
        dispatch({ type: 'TOGGLE_TRANSFER_OWNER_MODAL' });
        dispatch({ type: 'SET_SELECTED_NEW_OWNER', payload: null });
        dispatch({ type: 'TOGGLE_OWNER_MANAGEMENT' });
        
        notification.success({
          key,
          message: 'Thành công',
          description: 'Đã chuyển quyền trưởng nhóm thành công. Bạn có thể rời nhóm an toàn bây giờ.',
          duration: 5
        });
        
        setTimeout(() => {
          Modal.info({
            title: 'Chuyển quyền thành công',
            content: 'Bạn đã chuyển quyền trưởng nhóm thành công và hiện là thành viên thường. Bạn có thể rời nhóm bằng cách nhấn vào "Rời nhóm" ở cuối trang.',
            okText: 'Đã hiểu',
            onOk: () => {
              if (onAfterTransferOwner) {
                onAfterTransferOwner();
              } else {
                dispatch({ type: 'TOGGLE_OWNER_MANAGEMENT' });
              }
            }
          });
        }, 1000);
      }
    } catch (err) {
      console.error('Failed to transfer ownership:', err);
      notification.error({
        message: 'Lỗi',
        description: 'Không thể chuyển quyền trưởng nhóm. Vui lòng thử lại.',
        duration: 2
      });
    }
  }, [conversation.conversationId, selectedNewOwner, onAfterTransferOwner]);

  // Add handler function for showing blocked members list
  const handleShowBlockedMembers = () => {
    dispatch({ type: 'TOGGLE_BLOCKED_MEMBERS' });
  };

  const handleBackFromBlockedMembers = () => {
    dispatch({ type: 'TOGGLE_BLOCKED_MEMBERS' });
    // Refresh conversation data when returning from blocked members list
    refreshConversationData();
  };

  // Tối ưu refreshConversationData
  const refreshConversationData = useCallback(async () => {
    try {
      if (!conversation.conversationId) return;
      
      const updatedConversation = await getConversationDetail(conversation.conversationId);
      if (updatedConversation) {
        dispatch({ type: 'UPDATE_CONVERSATION', payload: updatedConversation });
        
        const newRole = determineUserRole(updatedConversation);
        if (newRole !== userRole) {
          setTimeout(() => {
            dispatch({ type: 'SET_USER_ROLE', payload: newRole });
            dispatch({ type: 'FORCE_RENDER' });
          }, 50);
        } else {
          dispatch({ type: 'FORCE_RENDER' });
        }
      }
    } catch (err) {
      console.error('Error refreshing conversation data:', err);
    }
  }, [conversation.conversationId, userRole]);

  // Tối ưu handleMemberBlockStatusChange
  const handleMemberBlockStatusChange = useCallback((updatedConversation: Conversation) => {
    if (updatedConversation) {
      dispatch({ type: 'UPDATE_CONVERSATION', payload: updatedConversation });
    }
  }, []);

  // Tối ưu filtered members với useMemo
  const filteredMembers = useMemo(() => {
    const members = [...regularMembers, ...(conversation.rules?.coOwnerIds || [])];
    return members.filter(memberId => {
      const memberDetails = getUserDetails(memberId);
      return memberDetails?.fullname.toLowerCase().includes(searchQuery.toLowerCase()) || false;
    });
  }, [regularMembers, conversation.rules?.coOwnerIds, searchQuery, getUserDetails]);

  const renderOwnerCoOwnerView = () => {
    const ownerData = getUserDetails(owner);

    return (
      <div className="group-management flex flex-col h-full bg-white" key={`group-management-${renderKey}`}>
        {/* Header */}
        <div className="flex items-center p-4 border-b border-gray-200 relative">
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            className="absolute"
            onClick={() => dispatch({ type: 'TOGGLE_OWNER_MANAGEMENT' })}
          />
          <div className="flex items-center justify-center w-full">
            <h2 className="text-lg font-semibold text-center">Trưởng & phó nhóm</h2>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Owner section */}
          <div className="mb-4">
            <div className="flex items-center mb-3">
              {ownerData ? (
                <>
                  <Avatar 
                    name={ownerData.fullname}
                    avatarUrl={ownerData.urlavatar}
                    size={40}
                  />
                  <div className="ml-3">
                    <div className="font-semibold">{ownerData.fullname}</div>
                    <div className="text-sm text-gray-500">Trưởng nhóm</div>
                  </div>
                </>
              ) : (
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse"></div>
                  <div className="ml-3">
                    <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                    <div className="h-3 bg-gray-100 rounded w-16 mt-1 animate-pulse"></div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Co-owner section */}
          <div className="mb-4">
            {coOwners.length > 0 ? (
              coOwners.map((coOwnerId) => {
                const coOwnerData = getUserDetails(coOwnerId);
                
                return (
                  <div key={coOwnerId} className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      {coOwnerData ? (
                        <>
                          <Avatar 
                            name={coOwnerData.fullname}
                            avatarUrl={coOwnerData.urlavatar}
                            size={40}
                          />
                          <div className="ml-3">
                            <div className="font-semibold">{coOwnerData.fullname}</div>
                            <div className="text-sm text-gray-500">Phó nhóm</div>
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse"></div>
                          <div className="ml-3">
                            <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                            <div className="h-3 bg-gray-100 rounded w-16 mt-1 animate-pulse"></div>
                          </div>
                        </div>
                      )}
                    </div>
                    {userRole === UserRole.OWNER && (
                      <Button 
                        danger
                        type="text"
                        onClick={() => handleRemoveCoOwner(coOwnerId)}
                      >
                        Xóa
                      </Button>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="text-center text-gray-500 py-2">
                Chưa có phó nhóm
              </div>
            )}
          </div>

          {/* Add co-owner button - only for owner */}
          {userRole === UserRole.OWNER && (
            <Button
              type="default"
              block
              className="mt-4"
              onClick={() => dispatch({ type: 'TOGGLE_ADD_CO_OWNER_MODAL' })}
            >
              Thêm phó nhóm
            </Button>
          )}

          {/* Transfer ownership button - only for owner */}
          {userRole === UserRole.OWNER && (
            <Button
              type="default"
              block
              className="mt-4"
              onClick={() => dispatch({ type: 'TOGGLE_TRANSFER_OWNER_MODAL' })}
            >
              Chuyển quyền trưởng nhóm
            </Button>
          )}
        </div>
      </div>
    );
  };

  // Modal for adding co-owner
  const renderAddCoOwnerModal = () => {
    return (
      <Modal
        title="Điều chỉnh phó nhóm"
        open={isAddCoOwnerModalVisible}
        onCancel={() => dispatch({ type: 'TOGGLE_ADD_CO_OWNER_MODAL' })}
        footer={[
          <Button key="cancel" onClick={() => dispatch({ type: 'TOGGLE_ADD_CO_OWNER_MODAL' })}>
            Hủy
          </Button>,
          <Button
            key="submit"
            type="primary"
            disabled={!selectedMember}
            loading={loading}
            onClick={handleAddCoOwner}
          >
            Xác nhận
          </Button>
        ]}
      >
        <div className="py-2">
          <Input
            placeholder="Tìm kiếm thành viên"
            prefix={<SearchOutlined />}
            value={searchQuery}
            onChange={(e) => dispatch({ type: 'SET_SEARCH_QUERY', payload: e.target.value })}
            className="mb-4"
          />
          
          <List
            dataSource={filteredMembers}
            renderItem={(memberId) => {
              const memberDetails = getUserDetails(memberId);
              const isSelected = selectedMember === memberId;
              
              if (!memberDetails) return null;
              
              return (
                <List.Item
                  className={`cursor-pointer hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''}`}
                  onClick={() => dispatch({ type: 'SET_SELECTED_MEMBER', payload: memberId })}
                >
                  <div className="flex items-center w-full">
                    <div className="mr-3">
                      <input
                        type="radio"
                        checked={isSelected}
                        onChange={() => {}}
                        className="form-radio h-4 w-4 text-blue-600"
                        aria-label={`Select ${memberDetails.fullname}`}
                      />
                    </div>
                    <Avatar 
                      name={memberDetails.fullname} 
                      avatarUrl={memberDetails.urlavatar}
                      size={32}
                    />
                    <div className="ml-3">{memberDetails.fullname}</div>
                  </div>
                </List.Item>
              );
            }}
          />
          
          {filteredMembers.length === 0 && (
            <div className="text-center py-4 text-gray-500">
              Không tìm thấy thành viên
            </div>
          )}
        </div>
      </Modal>
    );
  };

  // Thêm modal chuyển quyền trưởng nhóm
  const renderTransferOwnerModal = () => {
    return (
      <Modal
        title="Chuyển quyền trưởng nhóm"
        open={isTransferOwnerModalVisible}
        onCancel={() => dispatch({ type: 'TOGGLE_TRANSFER_OWNER_MODAL' })}
        footer={[
          <Button key="cancel" onClick={() => dispatch({ type: 'TOGGLE_TRANSFER_OWNER_MODAL' })}>
            Hủy
          </Button>,
          <Button
            key="submit"
            type="primary"
            danger
            disabled={!selectedNewOwner}
            loading={loading}
            onClick={handleTransferOwnership}
          >
            Xác nhận
          </Button>
        ]}
      >
        <div className="py-2">
          <div className="mb-3 text-red-500">
            <b>Lưu ý:</b> Sau khi chuyển quyền trưởng nhóm, bạn sẽ trở thành thành viên thường và không thể hoàn tác thao tác này.
          </div>
          
          <Input
            placeholder="Tìm kiếm thành viên"
            prefix={<SearchOutlined />}
            value={searchQuery}
            onChange={(e) => dispatch({ type: 'SET_SEARCH_QUERY', payload: e.target.value })}
            className="mb-4"
          />
          
          <List
            dataSource={filteredMembers}
            renderItem={(memberId) => {
              const memberDetails = getUserDetails(memberId);
              const isSelected = selectedNewOwner === memberId;
              
              if (!memberDetails) return null;
              
              return (
                <List.Item
                  className={`cursor-pointer hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''}`}
                  onClick={() => dispatch({ type: 'SET_SELECTED_NEW_OWNER', payload: memberId })}
                >
                  <div className="flex items-center w-full">
                    <div className="mr-3">
                      <input
                        type="radio"
                        checked={isSelected}
                        onChange={() => {}}
                        className="form-radio h-4 w-4 text-blue-600"
                        aria-label={`Select ${memberDetails.fullname}`}
                      />
                    </div>
                    <Avatar 
                      name={memberDetails.fullname} 
                      avatarUrl={memberDetails.urlavatar}
                      size={32}
                    />
                    <div className="ml-3">
                      <div>{memberDetails.fullname}</div>
                      {coOwners.includes(memberId) && (
                        <span className="text-xs text-blue-500">Phó nhóm</span>
                      )}
                    </div>
                  </div>
                </List.Item>
              );
            }}
          />
          
          {filteredMembers.length === 0 && (
            <div className="text-center py-4 text-gray-500">
              Không tìm thấy thành viên
            </div>
          )}
        </div>
      </Modal>
    );
  };

  // If showing blocked members view
  if (showBlockedMembers) {
    return (
      <BlockedMembersList
        conversation={conversation}
        userCache={userCache}
        userAvatars={userAvatars}
        userRole={userRole}
        onBack={handleBackFromBlockedMembers}
        blockMember={blockGroupMember}
        unblockMember={unblockGroupMember}
        onConversationUpdate={handleMemberBlockStatusChange}
      />
    );
  }

  // If in owner/co-owner management view
  if (showOwnerManagement) {
    return (
      <>
        {renderOwnerCoOwnerView()}
        {renderAddCoOwnerModal()}
        {renderTransferOwnerModal()}
      </>
    );
  }

  // For regular members, show simplified view without activity log
  if (userRole === UserRole.MEMBER) {
    return (
      <div className="group-management flex flex-col h-full bg-white" key={`group-management-${renderKey}`}>
        {/* Header */}
        <div className="flex items-center p-4 border-b border-gray-200 relative">
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            className="absolute"
            onClick={onBack}
          />
          <div className="flex items-center justify-center">
            <h2 className="text-lg font-semibold text-center">Quản lý nhóm</h2>
          </div>
        </div>

        {/* Admin only notice */}
        <div className="bg-gray-100 p-3 flex items-center justify-center">
          <LockOutlined className="mr-2 text-gray-600" />
          <span className="text-gray-600">
            Tính năng chỉ dành cho quản trị viên
          </span>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Member Permissions Section - read only */}
          <div className="mb-4">
            <div className="font-medium mb-3">
              Cho phép các thành viên trong nhóm:
            </div>

            <div className="space-y-4">
              {/* Change name and avatar */}
              <div className="flex items-center justify-between text-gray-500">
                <span>Thay đổi tên & ảnh đại diện của nhóm</span>
                <div className="border rounded-sm w-5 h-5 flex items-center justify-center border-gray-300">
                  {permissions.canChangeNameAndAvatar && (
                    <span className="text-gray-400 text-xs">✓</span>
                  )}
                </div>
              </div>

              {/* Pin messages */}
              <div className="flex items-center justify-between text-gray-500">
                <span>Ghim tin nhắn, ghi chú, bình chọn lên đầu hội thoại</span>
                <div className="border rounded-sm w-5 h-5 flex items-center justify-center border-gray-300">
                  {permissions.canPinMessages && (
                    <span className="text-gray-400 text-xs">✓</span>
                  )}
                </div>
              </div>

              {/* Create notes */}
              <div className="flex items-center justify-between text-gray-500">
                <span>Tạo mới ghi chú, nhắc hẹn</span>
                <div className="border rounded-sm w-5 h-5 flex items-center justify-center border-gray-300">
                  {permissions.canCreateNotes && (
                    <span className="text-gray-400 text-xs">✓</span>
                  )}
                </div>
              </div>

              {/* Create polls */}
              <div className="flex items-center justify-between text-gray-500">
                <span>Tạo mới bình chọn</span>
                <div className="border rounded-sm w-5 h-5 flex items-center justify-center border-gray-300">
                  {permissions.canCreatePolls && (
                    <span className="text-gray-400 text-xs">✓</span>
                  )}
                </div>
              </div>

              {/* Send messages */}
              <div className="flex items-center justify-between text-gray-500">
                <span>Gửi tin nhắn</span>
                <div className="border rounded-sm w-5 h-5 flex items-center justify-center border-gray-300">
                  {permissions.canSendMessages && (
                    <span className="text-gray-400 text-xs">✓</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200 my-4"></div>

          {/* Group Settings Section - read only */}
          <div className="space-y-4">
            {/* Approval */}
            <div className="flex items-center justify-between py-2 text-gray-500">
              <div className="flex items-center">
                <span>Chế độ phê duyệt thành viên mới</span>
                <QuestionCircleOutlined className="ml-1 text-gray-400" />
              </div>
              <Switch
                size="small"
                checked={settings.approvalRequired}
                disabled
              />
            </div>

            {/* Highlight admin messages */}
            <div className="flex items-center justify-between py-2 border-t border-gray-100 text-gray-500">
              <div className="flex items-center">
                <span>Đánh dấu tin nhắn từ trưởng/phó nhóm</span>
                <QuestionCircleOutlined className="ml-1 text-gray-400" />
              </div>
              <Switch
                size="small"
                checked={settings.highlightAdminMessages}
                disabled
              />
            </div>

            {/* Access to history */}
            <div className="flex items-center justify-between py-2 border-t border-gray-100 text-gray-500">
              <div className="flex items-center">
                <span>Cho phép thành viên mới đọc tin nhắn gần nhất</span>
                <QuestionCircleOutlined className="ml-1 text-gray-400" />
              </div>
              <Switch
                size="small"
                checked={settings.allowAccessToHistory}
                disabled
              />
            </div>

            {/* Link invitation */}
            <div className="flex items-center justify-between py-2 border-t border-gray-100 text-gray-500">
              <div className="flex items-center">
                <span>Cho phép dùng link tham gia nhóm</span>
                <QuestionCircleOutlined className="ml-1 text-gray-400" />
              </div>
              <Switch
                size="small"
                checked={settings.allowLinkInvitation}
                disabled
              />
            </div>

            {/* Group invitation link - readonly */}
            {settings.allowLinkInvitation && (
              <div className="flex flex-col mt-2 bg-gray-50 p-3 rounded-md">
                <div className="flex items-center justify-between">
                  <span className="text-blue-500 truncate flex-1">
                    {groupLink}
                  </span>
                  <div className="flex space-x-1">
                    <Button
                      type="text"
                      icon={<CopyOutlined />}
                      size="small"
                      onClick={handleCopyLink}
                    />
                    <Button
                      type="text"
                      icon={<ShareAltOutlined />}
                      size="small"
                      onClick={handleShareLink}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // For owner and co-owner, show normal view with appropriate restrictions
  return (
    <div className="group-management flex flex-col h-full bg-white" key={`group-management-${renderKey}`}>
      {/* Header */}
      <div className="flex items-center p-4 border-b border-gray-200 relative">
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          className="absolute"
          onClick={onBack}
        />
        <div className="flex items-center justify-center w-full">
          <h2 className="text-lg font-semibold text-center">Quản lý nhóm</h2>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Member Permissions Section */}
        <div className="mb-4">
          <div className="font-medium mb-3">
            Cho phép các thành viên trong nhóm:
          </div>

          <div className="space-y-4">
            {/* Change name and avatar */}
            <div className="flex items-center justify-between">
              <span>Thay đổi tên & ảnh đại diện của nhóm</span>
              <div
                onClick={() => handlePermissionChange("canChangeNameAndAvatar")}
                className={`border rounded-sm w-5 h-5 flex items-center justify-center cursor-pointer ${
                  permissions.canChangeNameAndAvatar
                    ? "bg-blue-500 border-blue-500"
                    : "border-gray-400"
                }`}
              >
                {permissions.canChangeNameAndAvatar && (
                  <span className="text-white text-xs">✓</span>
                )}
              </div>
            </div>

            {/* Pin messages */}
            <div className="flex items-center justify-between">
              <span>Ghim tin nhắn, ghi chú, bình chọn lên đầu hội thoại</span>
              <div
                onClick={() => handlePermissionChange("canPinMessages")}
                className={`border rounded-sm w-5 h-5 flex items-center justify-center cursor-pointer ${
                  permissions.canPinMessages
                    ? "bg-blue-500 border-blue-500"
                    : "border-gray-400"
                }`}
              >
                {permissions.canPinMessages && (
                  <span className="text-white text-xs">✓</span>
                )}
              </div>
            </div>

            {/* Create notes */}
            <div className="flex items-center justify-between">
              <span>Tạo mới ghi chú, nhắc hẹn</span>
              <div
                onClick={() => handlePermissionChange("canCreateNotes")}
                className={`border rounded-sm w-5 h-5 flex items-center justify-center cursor-pointer ${
                  permissions.canCreateNotes
                    ? "bg-blue-500 border-blue-500"
                    : "border-gray-400"
                }`}
              >
                {permissions.canCreateNotes && (
                  <span className="text-white text-xs">✓</span>
                )}
              </div>
            </div>

            {/* Create polls */}
            <div className="flex items-center justify-between">
              <span>Tạo mới bình chọn</span>
              <div
                onClick={() => handlePermissionChange("canCreatePolls")}
                className={`border rounded-sm w-5 h-5 flex items-center justify-center cursor-pointer ${
                  permissions.canCreatePolls
                    ? "bg-blue-500 border-blue-500"
                    : "border-gray-400"
                }`}
              >
                {permissions.canCreatePolls && (
                  <span className="text-white text-xs">✓</span>
                )}
              </div>
            </div>

            {/* Send messages */}
            <div className="flex items-center justify-between">
              <span>Gửi tin nhắn</span>
              <div
                onClick={() => handlePermissionChange("canSendMessages")}
                className={`border rounded-sm w-5 h-5 flex items-center justify-center cursor-pointer ${
                  permissions.canSendMessages
                    ? "bg-blue-500 border-blue-500"
                    : "border-gray-400"
                }`}
              >
                {permissions.canSendMessages && (
                  <span className="text-white text-xs">✓</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200 my-4"></div>

        {/* Group Settings Section */}
        <div className="space-y-4">
          {/* Approval */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center">
              <span>Chế độ phê duyệt thành viên mới</span>
              <Tooltip title="Yêu cầu phê duyệt trước khi thành viên mới tham gia nhóm">
                <QuestionCircleOutlined className="ml-1 text-gray-400" />
              </Tooltip>
            </div>
            <Switch
              size="small"
              checked={settings.approvalRequired}
              onChange={() => handleSettingChange("approvalRequired")}
            />
          </div>

          {/* Highlight admin messages */}
          <div className="flex items-center justify-between py-2 border-t border-gray-100">
            <div className="flex items-center">
              <span>Đánh dấu tin nhắn từ trưởng/phó nhóm</span>
              <Tooltip title="Tin nhắn của trưởng/phó nhóm sẽ được đánh dấu để dễ nhận biết">
                <QuestionCircleOutlined className="ml-1 text-gray-400" />
              </Tooltip>
            </div>
            <Switch
              size="small"
              checked={settings.highlightAdminMessages}
              onChange={() => handleSettingChange("highlightAdminMessages")}
            />
          </div>

          {/* Access to history */}
          <div className="flex items-center justify-between py-2 border-t border-gray-100">
            <div className="flex items-center">
              <span>Cho phép thành viên mới đọc tin nhắn gần nhất</span>
              <Tooltip title="Thành viên mới có thể xem lịch sử tin nhắn của nhóm">
                <QuestionCircleOutlined className="ml-1 text-gray-400" />
              </Tooltip>
            </div>
            <Switch
              size="small"
              checked={settings.allowAccessToHistory}
              onChange={() => handleSettingChange("allowAccessToHistory")}
            />
          </div>

          {/* Link invitation */}
          <div className="flex items-center justify-between py-2 border-t border-gray-100">
            <div className="flex items-center">
              <span className="font-medium">
                Cho phép dùng link tham gia nhóm
              </span>
              <Tooltip title="Bất kỳ ai có link đều có thể tham gia nhóm">
                <QuestionCircleOutlined className="ml-1 text-gray-400" />
              </Tooltip>
            </div>
            <Switch
              size="small"
              checked={settings.allowLinkInvitation}
              onChange={() => handleSettingChange("allowLinkInvitation")}
            />
          </div>

          {/* Group invitation link */}
          {settings.allowLinkInvitation && (
            <div className="flex flex-col mt-2 bg-gray-50 p-3 rounded-md">
              <div className="flex items-center justify-between">
                <span className="text-blue-500 truncate flex-1">
                  {groupLink}
                </span>
                <div className="flex space-x-1">
                  <Button
                    type="text"
                    icon={<CopyOutlined />}
                    size="small"
                    onClick={handleCopyLink}
                  />
                  <Button
                    type="text"
                    icon={<ShareAltOutlined />}
                    size="small"
                    onClick={handleShareLink}
                  />
                  <Button
                    type="text"
                    icon={<ReloadOutlined />}
                    size="small"
                    onClick={handleRefreshLink}
                    title="Lấy link mới"
                    disabled={userRole !== UserRole.OWNER}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200 my-4"></div>

        {/* Admin Actions */}
        <div className="space-y-3">
          <div 
            className="flex items-center py-2 cursor-pointer"
            onClick={handleShowBlockedMembers}
          >
            <UserDeleteOutlined className="mr-2 text-gray-600" />
            <span>Chặn khỏi nhóm</span>
          </div>
          
          {/* Only show for owner */}
          {userRole === UserRole.OWNER && (
            <div 
              className="flex items-center py-2 cursor-pointer"
              onClick={() => dispatch({ type: 'TOGGLE_OWNER_MANAGEMENT' })}
            >
              <TeamOutlined className="mr-2 text-gray-600" />
              <span>Trưởng & phó nhóm</span>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200 my-4"></div>

        {/* Disband Group - Only for owner */}
        {userRole === UserRole.OWNER && (
          <div className="my-4">
            <Button
              danger
              type="primary"
              icon={<DeleteOutlined />}
              block
              onClick={handleDisbandGroup}
            >
              Giải tán nhóm
            </Button>
          </div>
        )}
      </div>
      
      {/* Co-owner management modal */}
      {renderAddCoOwnerModal()}
    </div>
  );
};

export default GroupManagement;
