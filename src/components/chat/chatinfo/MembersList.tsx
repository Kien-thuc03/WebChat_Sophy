import React, { useState, useEffect, useCallback, useRef } from "react";
import { Button, Dropdown, Menu, App } from "antd";
import {
  UserAddOutlined,
  MoreOutlined,
  LeftOutlined,
  LockOutlined,
  LogoutOutlined,
  UserDeleteOutlined,
} from "@ant-design/icons";
import { Avatar } from "../../common/Avatar";
import { User } from "../../../features/auth/types/authTypes";
import { Conversation } from "../../../features/chat/types/conversationTypes";
import {
  getUserById,
  fetchFriends,
  getConversationDetail,
  removeUserFromGroup,
} from "../../../api/API";
import UserInfoHeaderModal from "../../header/modal/UserInfoHeaderModal";
import { useNavigate } from "react-router-dom";
import socketService from "../../../services/socketService";
import { useConversationContext } from "../../../features/chat/context/ConversationContext";
import AddMemberModal from "../modals/AddMemberModal";
import { useLanguage } from "../../../features/auth/context/LanguageContext";

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
  userRole: "owner" | "co-owner" | "member";
  onBack: () => void;
  onLeaveGroup: () => void;
  addCoOwner: (
    conversationId: string,
    userId: string,
    currentCoOwnerIds: string[]
  ) => Promise<Conversation | null>;
  removeCoOwner: (
    conversationId: string,
    userId: string
  ) => Promise<Conversation | null>;
  removeMember: (conversationId: string, userId: string) => Promise<boolean>;
  onRefreshConversationData?: () => void;
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
  onRefreshConversationData,
}) => {
  const { t } = useLanguage(); // Add language context
  // Keep local state of conversation to update it after changes
  const [conversation, setConversation] =
    useState<Conversation>(initialConversation);
  const [userRole, setUserRole] = useState(initialUserRole);
  const [hoveredMemberId, setHoveredMemberId] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<MemberInfo | null>(null);
  const [isUserInfoModalVisible, setIsUserInfoModalVisible] = useState(false);
  const [friendList, setFriendList] = useState<string[]>([]);
  const [localUserCache, setLocalUserCache] = useState<Record<string, User>>(
    {}
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [, setMemberCount] = useState<number>(
    initialConversation.groupMembers?.length || 0
  );
  const { message, modal } = App.useApp();
  const navigate = useNavigate();

  const { updateConversationMembers, updateConversationWithNewMessage } =
    useConversationContext();

  const [renderKey, setRenderKey] = useState<number>(Date.now());
  const [isAddMemberModalVisible, setIsAddMemberModalVisible] = useState(false);

  const groupMembers = conversation.groupMembers || [];
  const currentUserId = localStorage.getItem("userId") || "";

  // Thêm biến ref để theo dõi xem người dùng đã bị kick chưa
  const hasBeenRemovedRef = useRef(false);

  // Thêm state cho loading
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);
  const [updatingMemberId, setUpdatingMemberId] = useState<string | null>(null);

  // NEW: flag to prevent loop on API error
  const [isApiError, setIsApiError] = useState(false);

  // Function to get user name from cache or default value
  const getUserName = useCallback(
    (userId: string): string => {
      const user = userCache[userId] || localUserCache[userId];
      return user ? user.fullname : "Một thành viên";
    },
    [userCache, localUserCache]
  );

  // Lắng nghe sự kiện socket khi component mount
  useEffect(() => {
    // Đảm bảo socket đã kết nối
    if (!socketService.isConnected) {
      socketService.connect();
    }

    // Xác thực user nếu cần
    const currentUserId = localStorage.getItem("userId");
    if (currentUserId) {
      socketService.authenticate(currentUserId);
    }

    // Tham gia vào room của conversation
    if (conversation.conversationId) {
      socketService.joinConversations([conversation.conversationId]);
    }

    const handleUserRemovedFromGroup = (data: {
      conversationId: string;
      kickedUser: { userId: string; fullname: string };
      kickedByUser: { userId: string; fullname: string };
    }) => {
      if (data.conversationId !== conversation.conversationId) {
        return;
      }

      const userId = data.kickedUser.userId;
      const removedById = data.kickedByUser.userId;

      // If current user is removed, show notification and go back
      if (userId === currentUserId) {
        // Kiểm tra biến cờ để tránh xử lý nhiều lần
        if (hasBeenRemovedRef.current) {
          return; // Đã xử lý rồi, thoát ngay
        }

        // Đánh dấu là đã xử lý
        hasBeenRemovedRef.current = true;

        // Đánh dấu cuộc trò chuyện là đã bị xóa khỏi danh sách của người dùng
        updateConversationMembers(conversation.conversationId, userId);

        // Đóng modal hoặc panel hiện tại
        onBack();

        // Huỷ đăng ký sự kiện sau khi đã xử lý để tránh lặp lại
        socketService.off("userRemovedFromGroup", handleUserRemovedFromGroup);

        // Lưu thông tin người kick để hiển thị trong modal
        const kickedByName = data.kickedByUser.fullname;

        // Đặt hẹn giờ để đảm bảo chuyển hướng diễn ra
        setTimeout(() => {
          // Trực tiếp chuyển hướng ra trang chính
          window.location.href = "/main";

          // Hiển thị thông báo dạng modal sau khi đã bắt đầu chuyển trang
          setTimeout(() => {
            modal.error({
              title: t.user_removed_from_group || "Bạn đã bị xóa khỏi nhóm",
              content:
                t.user_removed_from_group_by?.replace("{0}", kickedByName) ||
                `${kickedByName} đã xóa bạn khỏi nhóm chat này`,
              okText: t.understood || "Đã hiểu",
              centered: true,
            });
          }, 100);
        }, 100);

        return;
      }

      // Update the conversation by removing the member
      setConversation((prev) => {
        const updatedMembers =
          prev.groupMembers?.filter((id) => id !== userId) || [];
        return {
          ...prev,
          groupMembers: updatedMembers,
        };
      });

      // Update member count
      setMemberCount((prev) => Math.max(0, prev - 1));

      // Update the conversation in context
      updateConversationMembers(conversation.conversationId, userId);

      // Add system message
      updateConversationWithNewMessage(conversation.conversationId, {
        type: "system",
        content: `${getUserName(removedById)} đã xóa ${getUserName(userId)} khỏi nhóm`,
        senderId: removedById,
        createdAt: new Date().toISOString(),
      });
    };

    const handleUserAddedToGroup = (data: {
      conversationId: string;
      addedUser: { userId: string; fullname: string };
      addedByUser: { userId: string; fullname: string };
    }) => {
      if (data.conversationId === conversation.conversationId) {
        // Cập nhật state local trước để UI phản hồi nhanh
        setConversation((prev) => {
          if (!prev.groupMembers.includes(data.addedUser.userId)) {
            return {
              ...prev,
              groupMembers: [...prev.groupMembers, data.addedUser.userId],
            };
          }
          return prev;
        });

        // Gọi API để cập nhật đầy đủ thông tin về thành viên mới
        refreshConversationData();

        // Load thông tin người dùng mới nếu chưa có trong cache
        if (
          !userCache[data.addedUser.userId] &&
          !localUserCache[data.addedUser.userId]
        ) {
          getUserById(data.addedUser.userId)
            .then((userData) => {
              if (userData) {
                setLocalUserCache((prev) => ({
                  ...prev,
                  [data.addedUser.userId]: userData,
                }));
              }
            })
            .catch((error) => {
              console.error("Error loading new member data:", error);
            });
        }
      }
    };

    // Đăng ký lắng nghe sự kiện
    socketService.on("userRemovedFromGroup", handleUserRemovedFromGroup);
    socketService.on("userAddedToGroup", handleUserAddedToGroup);

    // Cleanup khi component unmount
    return () => {
      if (conversation.conversationId) {
        socketService.leaveConversation(conversation.conversationId);
      }
      socketService.off("userRemovedFromGroup", handleUserRemovedFromGroup);
      socketService.off("userAddedToGroup", handleUserAddedToGroup);

      // Reset biến cờ khi unmount
      hasBeenRemovedRef.current = false;
    };
  }, [
    conversation.conversationId,
    updateConversationMembers,
    updateConversationWithNewMessage,
    onBack,
    navigate,
  ]);

  // Add this function to determine user role from conversation data
  const determineUserRole = useCallback(
    (conversationData: Conversation): "owner" | "co-owner" | "member" => {
      const currentUserId = localStorage.getItem("userId") || "";

      if (conversationData.rules?.ownerId === currentUserId) {
        return "owner";
      } else if (conversationData.rules?.coOwnerIds?.includes(currentUserId)) {
        return "co-owner";
      } else {
        return "member";
      }
    },
    []
  );

  // Register socket event handlers in a dedicated useEffect
  useEffect(() => {
    if (!conversation.conversationId) {
      return;
    }

    // Handler for when a user leaves the group
    const handleUserLeftGroup = (data: {
      conversationId: string;
      userId: string;
    }) => {
      if (data.conversationId !== conversation.conversationId) {
        return;
      }

      // If current user left, go back
      if (data.userId === currentUserId) {
        onBack();
        return;
      }

      // Update the conversation by removing the member
      setConversation((prev) => {
        const updatedMembers =
          prev.groupMembers?.filter((id) => id !== data.userId) || [];
        return {
          ...prev,
          groupMembers: updatedMembers,
        };
      });

      // Update member count
      setMemberCount((prev) => Math.max(0, prev - 1));

      // Update the conversation in context
      updateConversationMembers(conversation.conversationId, data.userId);

      // Add system message
      updateConversationWithNewMessage(conversation.conversationId, {
        type: "system",
        content: `${getUserName(data.userId)} đã rời nhóm`,
        senderId: data.userId,
        createdAt: new Date().toISOString(),
      });
    };

    // Handler for when a group is deleted
    const handleGroupDeleted = (data: { conversationId: string }) => {
      if (data.conversationId !== conversation.conversationId) return;

      try {
        // Unregister event to prevent duplicate handling
        socketService.off("groupDeleted", handleGroupDeleted);
        if (hasBeenRemovedRef.current) {
          return;
        }
        hasBeenRemovedRef.current = true;
        modal.error({
          title: t.group_disbanded || "Nhóm đã bị giải tán",
          content:
            t.group_disbanded_by_admin ||
            "Nhóm chat này đã bị giải tán bởi người quản trị",
          okText: t.understood || "Đã hiểu",
          centered: true,
        });
        // Gọi callback để Dashboard xử lý UI (reset selectedConversation, panel, ...)
        if (typeof onLeaveGroup === "function") {
          onLeaveGroup();
        } else if (typeof onBack === "function") {
          onBack();
        }
      } catch (error) {
        console.error("Error handling group deletion:", error);
        if (typeof onLeaveGroup === "function") {
          onLeaveGroup();
        } else if (typeof onBack === "function") {
          onBack();
        }
      }
    };

    // Handler for when co-owners are added
    const handleGroupCoOwnerAdded = (data: {
      conversationId: string;
      newCoOwnerIds: string[];
      byUserId?: string;
    }) => {
      if (data.conversationId !== conversation.conversationId) return;
      if (onRefreshConversationData) onRefreshConversationData();
    };

    // Handler for when a co-owner is removed
    const handleGroupCoOwnerRemoved = (data: {
      conversationId: string;
      removedCoOwner: string;
      byUserId?: string;
    }) => {
      if (data.conversationId !== conversation.conversationId) return;
      if (onRefreshConversationData) onRefreshConversationData();
    };

    // Handler for when group owner changes
    const handleGroupOwnerChanged = (data: {
      conversationId: string;
      newOwner: string;
      byUserId?: string;
    }) => {
      if (data.conversationId !== conversation.conversationId) return;
      if (onRefreshConversationData) onRefreshConversationData();
    };

    // Handler for when a user is blocked
    const handleUserBlocked = (data: {
      conversationId: string;
      blockedUserId: string;
      fromCurrentUser?: boolean;
    }) => {
      if (data.conversationId !== conversation.conversationId) {
        return;
      }

      // Force refresh to update our data - this ensures we have the latest state
      // including any UI updates that might be needed when a user is blocked
      refreshConversationData();
    };

    // Handler for when a user is unblocked
    const handleUserUnblocked = (data: {
      conversationId: string;
      unblockedUserId: string;
      fromCurrentUser?: boolean;
    }) => {
      if (data.conversationId !== conversation.conversationId) {
        return;
      }

      // Force refresh to update our data - this ensures we have the latest state
      // including any UI updates that might be needed when a user is unblocked
      refreshConversationData();
    };

    // Register socket event handlers
    socketService.on("userLeftGroup", handleUserLeftGroup);
    socketService.on("groupDeleted", handleGroupDeleted);
    socketService.on("groupCoOwnerAdded", handleGroupCoOwnerAdded);
    socketService.on("groupCoOwnerRemoved", handleGroupCoOwnerRemoved);
    socketService.on("groupOwnerChanged", handleGroupOwnerChanged);
    socketService.on("userBlocked", handleUserBlocked);
    socketService.on("userUnblocked", handleUserUnblocked);

    // Cleanup function
    return () => {
      socketService.off("userLeftGroup", handleUserLeftGroup);
      socketService.off("groupDeleted", handleGroupDeleted);
      socketService.off("groupCoOwnerAdded", handleGroupCoOwnerAdded);
      socketService.off("groupCoOwnerRemoved", handleGroupCoOwnerRemoved);
      socketService.off("groupOwnerChanged", handleGroupOwnerChanged);
      socketService.off("userBlocked", handleUserBlocked);
      socketService.off("userUnblocked", handleUserUnblocked);
    };
  }, [
    conversation.conversationId,
    conversation.rules?.ownerId,
    conversation.rules?.coOwnerIds,
    currentUserId,
    onBack,
    updateConversationMembers,
    updateConversationWithNewMessage,
    userRole,
    determineUserRole,
    getUserName,
    onRefreshConversationData,
  ]);

  // Update the refreshConversationData function to trigger full re-render
  const refreshConversationData = async () => {
    if (isApiError) return; // Nếu đang lỗi, không gọi lại nữa
    try {
      if (!conversation.conversationId) return;
      setIsRefreshing(true);
      const updatedConversation = await getConversationDetail(
        conversation.conversationId
      );
      if (updatedConversation) {
        setConversation(updatedConversation);
        setIsApiError(false); // Reset error flag on success
        // Update user role based on the fresh data
        const newRole = determineUserRole(updatedConversation);
        if (newRole !== userRole) {
          setTimeout(() => {
            setUserRole(newRole);
            setRenderKey(Date.now());
          }, 50);
        } else {
          setRenderKey(Date.now());
        }
      }
    } catch (err) {
      setIsApiError(true);
      setIsRefreshing(false);
      message.error(
        "Không thể lấy chi tiết cuộc trò chuyện. Vui lòng thử lại sau."
      );
    } finally {
      setIsRefreshing(false);
    }
  };

  // Function to refresh friend list data without closing the modal
  const refreshFriendList = async () => {
    try {
      const friendsData = await fetchFriends();
      if (friendsData && Array.isArray(friendsData)) {
        // Extract user IDs from friend list
        const friendIds = friendsData
          .map((friend) => friend.userId || "")
          .filter((id) => id);
        setFriendList(friendIds);
      }
    } catch (err) {
      // Error handling without logs
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
              setLocalUserCache((prev) => ({
                ...prev,
                [memberId]: userData,
              }));
            }
          } catch (error) {
            // Error handling without logs
          }
        }
      }
    };

    loadMissingUsers();
  }, [groupMembers, userCache, localUserCache]);

  // Check if a user is a friend
  const isFriend = (userId: string): boolean => {
    const currentUserId = localStorage.getItem("userId");
    if (userId === currentUserId) return true; // Self is considered a "friend"
    return friendList.includes(userId);
  };

  // Check if the current user is the user being viewed
  const isCurrentUser = (userId: string): boolean => {
    const currentUserId = localStorage.getItem("userId");
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
          birthday: memberData.birthday,
        });
        setIsUserInfoModalVisible(true);
      }
    } catch (err) {
      message.error("Không thể tải thông tin người dùng");
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
    console.log("userId", userId);
    if (conversation?.conversationId) {
      navigate(`/chat/${conversation.conversationId}`);
    }
  };

  // Handle send friend request from modal
  const handleSendFriendRequest = (userId: string) => {
    // This is handled by the UserInfoHeaderModal
    console.log("handleSendFriendRequest userId", userId);
  };

  // Function to add a co-owner
  const handleAddCoOwner = async (memberId: string) => {
    setIsApiError(false); // Reset flag trước khi thao tác
    if (!conversation.conversationId || !conversation.rules) return;
    try {
      setIsUpdatingRole(true);
      setUpdatingMemberId(memberId);

      message.loading({
        content: t.adding_deputy || "Đang thêm phó nhóm...",
        key: "add-co-owner",
      });

      // Optimistic update
      setConversation((prev) => ({
        ...prev,
        rules: {
          ...prev.rules,
          ownerId: prev.rules?.ownerId || "",
          coOwnerIds: [...(prev.rules?.coOwnerIds || []), memberId],
        },
      }));

      const result = await addCoOwner(
        conversation.conversationId,
        memberId,
        conversation.rules.coOwnerIds || []
      );

      if (result) {
        message.success({
          content: t.deputy_added || "Đã thêm phó nhóm thành công",
          key: "add-co-owner",
          duration: 2,
        });
        setConversation(result);
        if (typeof setIsAddMemberModalVisible === "function")
          setIsAddMemberModalVisible(false);
        if (typeof setSelectedMember === "function") setSelectedMember(null);
      }
    } catch (err) {
      // Revert optimistic update on error
      setConversation(conversation);
      message.error(t.update_error || "Đã xảy ra lỗi. Vui lòng thử lại sau.");
    } finally {
      setIsUpdatingRole(false);
      setUpdatingMemberId(null);
    }
  };

  // Function to remove a co-owner
  const handleRemoveCoOwner = async (memberId: string) => {
    setIsApiError(false); // Reset flag trước khi thao tác
    if (!conversation.conversationId) return;
    try {
      setIsUpdatingRole(true);
      setUpdatingMemberId(memberId);

      message.loading({
        content: t.removing_deputy || "Đang gỡ quyền phó nhóm...",
        key: "remove-co-owner",
      });

      // Optimistic update
      setConversation((prev) => ({
        ...prev,
        rules: {
          ...prev.rules,
          ownerId: prev.rules?.ownerId || "",
          coOwnerIds:
            prev.rules?.coOwnerIds?.filter((id) => id !== memberId) || [],
        },
      }));

      const result = await removeCoOwner(conversation.conversationId, memberId);
      if (result) {
        message.success({
          content: t.deputy_removed || "Đã gỡ quyền phó nhóm thành công",
          key: "remove-co-owner",
          duration: 2,
        });
        setConversation(result);
      }
    } catch (err) {
      // Revert optimistic update on error
      setConversation(conversation);
      message.error(t.update_error || "Đã xảy ra lỗi. Vui lòng thử lại sau.");
    } finally {
      setIsUpdatingRole(false);
      setUpdatingMemberId(null);
    }
  };

  // Function to remove a member
  const handleRemoveMember = async (memberId: string) => {
    setIsApiError(false); // Reset flag trước khi thao tác
    if (!conversation.conversationId) return;

    modal.confirm({
      title: t.remove_member_title || "Xóa thành viên",
      content:
        t.remove_member_confirm ||
        "Bạn có chắc chắn muốn xóa thành viên này khỏi nhóm?",
      okText: t.confirm || "Xóa",
      cancelText: t.cancel || "Hủy",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          const key = "remove-member";
          message.loading({
            content: t.removing_member || "Đang xóa thành viên...",
            key,
          });

          // Đảm bảo socket đã kết nối
          if (!socketService.isConnected) {
            socketService.connect();
          }

          // Gọi API xóa thành viên
          await removeUserFromGroup(conversation.conversationId, memberId);

          message.success({
            content: t.member_removed || "Đã xóa thành viên khỏi nhóm",
            key,
            duration: 2,
          });

          // Cập nhật state local ngay lập tức
          setConversation((prev) => ({
            ...prev,
            groupMembers: prev.groupMembers.filter((id) => id !== memberId),
          }));
          setMemberCount((prev) => prev - 1);

          // Cập nhật trong context
          updateConversationMembers(conversation.conversationId, memberId);

          // Thêm tin nhắn hệ thống
          updateConversationWithNewMessage(conversation.conversationId, {
            type: "system",
            content: `Thành viên đã bị xóa khỏi nhóm`,
            senderId: memberId,
            createdAt: new Date().toISOString(),
          });
        } catch (error: unknown) {
          if (error instanceof Error) {
            message.error(
              error.message ||
                t.cannot_remove_member ||
                "Không thể xóa thành viên. Vui lòng thử lại sau."
            );
          } else {
            message.error(
              t.cannot_remove_member ||
                "Không thể xóa thành viên. Vui lòng thử lại sau."
            );
          }
        }
      },
    });
  };

  // Update how canShowMenu is calculated in the render function - extract it to a function
  const calculateCanShowMenu = useCallback(
    (memberId: string, currentUserRole: string): boolean => {
      const isOwner = conversation.rules?.ownerId === memberId;
      const isCoOwner =
        conversation.rules?.coOwnerIds?.includes(memberId) || false;
      const isCurrentUser = memberId === localStorage.getItem("userId");

      // Always show menu for the current user to allow leaving the group
      if (isCurrentUser) {
        return true;
      }

      if (currentUserRole === "owner") {
        // Owner can see menu for everyone
        return true;
      } else if (currentUserRole === "co-owner") {
        // Co-owner can see menu for regular members only
        return !isOwner && !isCoOwner;
      }

      return false;
    },
    [conversation.rules]
  );

  // Update the handler for new message to force a re-render
  const handleNewMessage = (data: any) => {
    if (data.conversationId === conversation.conversationId) {
      // Refresh the conversation data with a small delay to ensure backend sync
      setTimeout(() => {
        refreshConversationData();
      }, 300);
    }
  };

  // Add back the useEffect to listen for new messages
  useEffect(() => {
    if (!conversation.conversationId) return;

    // Listen for new message events
    socketService.on("newMessage", handleNewMessage);

    // Cleanup function
    return () => {
      socketService.off("newMessage", handleNewMessage);
    };
  }, [conversation.conversationId]);

  // Handler to show the add member modal
  const handleShowAddMemberModal = () => {
    setIsAddMemberModalVisible(true);
  };

  // Handler to close the add member modal
  const handleCloseAddMemberModal = () => {
    setIsAddMemberModalVisible(false);
  };

  // Thêm loading indicator vào UI
  const renderLoadingIndicator = (memberId: string) => {
    if (isUpdatingRole && updatingMemberId === memberId) {
      return <div className="ml-2 text-xs text-gray-500">Đang cập nhật...</div>;
    }
    return null;
  };

  // Sửa phần render member để thêm loading indicator
  const renderMember = (memberId: string) => {
    const memberInfo = userCache[memberId] || localUserCache[memberId];
    const isCurrentUserMember = memberId === localStorage.getItem("userId");
    const isOwner = conversation.rules?.ownerId === memberId;
    const isCoOwner = conversation.rules?.coOwnerIds?.includes(memberId);
    const isMemberFriend = isFriend(memberId);
    const canShowMenu = calculateCanShowMenu(memberId, userRole);

    return (
      <div
        key={memberId}
        className="flex items-center justify-between p-3 hover:bg-gray-100 relative"
        onMouseEnter={() => setHoveredMemberId(memberId)}
        onMouseLeave={() => setHoveredMemberId(null)}>
        <div className="flex items-center">
          <Avatar
            name={memberInfo?.fullname || "User"}
            avatarUrl={memberInfo?.urlavatar || userAvatars[memberId]}
            size={48}
            className="rounded-full mr-3"
          />
          <div>
            <div className="font-medium flex items-center">
              {memberInfo?.fullname || `User-${memberId.substring(0, 6)}`}
              {isCurrentUserMember && (
                <span className="text-gray-500 ml-2">({t.you || "Bạn"})</span>
              )}
            </div>
            <div className="text-sm text-gray-500">
              {isOwner
                ? t.group_leader || "Trưởng nhóm"
                : isCoOwner
                  ? t.deputy || "Phó nhóm"
                  : ""}
              {renderLoadingIndicator(memberId)}
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
                  onClick={() => handleFriendRequest(memberId)}>
                  {t.add_friend_button || "Kết bạn"}
                </Button>
              ) : (
                <Button
                  type="link"
                  className="text-blue-500"
                  onClick={() => handleFriendRequest(memberId)}>
                  {t.message_button || "Nhắn tin"}
                </Button>
              )}
            </>
          )}

          {/* Three dots menu (only show when hovering) */}
          {hoveredMemberId === memberId && canShowMenu && (
            <Dropdown
              overlay={
                <Menu>
                  {isCurrentUserMember ? (
                    <Menu.Item
                      key="leave"
                      onClick={() => {
                        // Thêm thông báo rời nhóm vào conversation
                        updateConversationWithNewMessage(
                          conversation.conversationId,
                          {
                            type: "system",
                            content: `${getUserName(currentUserId)} đã rời khỏi nhóm`,
                            senderId: currentUserId,
                            createdAt: new Date().toISOString(),
                          }
                        );

                        // Sau đó gọi hàm rời nhóm
                        onLeaveGroup();
                      }}
                      icon={<LogoutOutlined />}>
                      {t.leave_group || "Rời nhóm"}
                    </Menu.Item>
                  ) : userRole === "owner" && isCoOwner ? (
                    <>
                      <Menu.Item
                        key="remove-co-owner"
                        onClick={() => handleRemoveCoOwner(memberId)}
                        icon={<LockOutlined />}>
                        {t.remove_deputy || "Gỡ quyền phó nhóm"}
                      </Menu.Item>
                      <Menu.Item
                        key="remove-member"
                        onClick={() => handleRemoveMember(memberId)}
                        icon={<UserDeleteOutlined />}>
                        {t.remove_from_group || "Xóa khỏi nhóm"}
                      </Menu.Item>
                    </>
                  ) : userRole === "owner" && !isOwner && !isCoOwner ? (
                    <>
                      <Menu.Item
                        key="add-co-owner"
                        onClick={() => handleAddCoOwner(memberId)}
                        icon={<LockOutlined />}>
                        {t.add_deputy || "Thêm phó nhóm"}
                      </Menu.Item>
                      <Menu.Item
                        key="remove-member"
                        onClick={() => handleRemoveMember(memberId)}
                        icon={<UserDeleteOutlined />}>
                        {t.remove_from_group || "Xóa khỏi nhóm"}
                      </Menu.Item>
                    </>
                  ) : userRole === "co-owner" && !isOwner && !isCoOwner ? (
                    <Menu.Item
                      key="remove-member"
                      onClick={() => handleRemoveMember(memberId)}
                      icon={<UserDeleteOutlined />}>
                      {t.remove_from_group || "Xóa khỏi nhóm"}
                    </Menu.Item>
                  ) : null}
                </Menu>
              }
              trigger={["click"]}
              placement="bottomRight">
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
  };

  // 1. Cập nhật userRole khi conversation thay đổi
  useEffect(() => {
    const newRole = determineUserRole(conversation);
    if (newRole !== userRole) {
      setUserRole(newRole);
    }
  }, [conversation, determineUserRole]);

  return (
    <div className="h-full bg-white" key={`members-list-${renderKey}`}>
      <div className="flex-none p-4 border-b border-gray-200 flex items-center">
        <Button
          type="text"
          className="flex items-center mr-2"
          icon={<LeftOutlined />}
          onClick={onBack}
        />
        <h2 className="text-lg font-semibold">
          {t.member_list || "Thành viên"}
        </h2>
        {isRefreshing && (
          <div className="ml-2 text-xs text-gray-500">
            {t.loading_contacts || "Đang cập nhật..."}
          </div>
        )}
      </div>

      <div className="p-4 mb-4">
        <Button
          block
          icon={<UserAddOutlined />}
          className="flex items-center justify-center bg-gray-100 hover:bg-gray-200 border-gray-200"
          onClick={handleShowAddMemberModal}>
          <span>{t.add_member || "Thêm thành viên"}</span>
        </Button>
      </div>

      <div className="px-4">
        <div className="flex justify-between items-center mb-2">
          <span>
            {t.members_list || "Danh sách thành viên"} ({groupMembers.length})
          </span>
          <MoreOutlined className="text-gray-500" />
        </div>
      </div>

      <div className="member-list overflow-y-auto">
        {groupMembers.map((memberId) => renderMember(memberId))}
      </div>

      {/* User Info Modal for friend requests */}
      {selectedMember && (
        <UserInfoHeaderModal
          visible={isUserInfoModalVisible}
          onCancel={() => setIsUserInfoModalVisible(false)}
          searchResult={{
            userId: selectedMember.userId,
            fullname: selectedMember.fullname,
            phone: selectedMember.phone || "",
            avatar: selectedMember.urlavatar,
            isMale: selectedMember.isMale,
            birthday: selectedMember.birthday,
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

      {/* Add Member Modal */}
      <AddMemberModal
        visible={isAddMemberModalVisible}
        onClose={handleCloseAddMemberModal}
        conversationId={conversation.conversationId}
        groupMembers={conversation.groupMembers || []}
        refreshConversationData={refreshConversationData}
      />
    </div>
  );
};

export default MembersList;
