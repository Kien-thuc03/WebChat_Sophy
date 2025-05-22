import React, { useState, useEffect, useRef } from "react";
import { Avatar } from "../../common/Avatar";
import { Button, Switch, Modal, Input, App } from "antd";
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
  RightOutlined as RightArrowOutlined,
} from "@ant-design/icons";
import { Conversation } from "../../../features/chat/types/conversationTypes";
import { useConversations } from "../../../features/chat/hooks/useConversations";
import { getUserById, getConversationDetail } from "../../../api/API";
import { User } from "../../../features/auth/types/authTypes";
import GroupAvatar from "../GroupAvatar";
import { useLanguage } from "../../../features/auth/context/LanguageContext";
import GroupManagement from "./GroupManagement";
import MediaGallery from "./MediaGallery";
import MembersList from "./MembersList";
import { useChatInfo } from "../../../features/chat/hooks/useChatInfo";
import { useNavigate } from "react-router-dom";
import GroupModal from "../modals/GroupModal";
import { useConversationContext } from "../../../features/chat/context/ConversationContext";
import AddMemberModal from "../modals/AddMemberModal";
import AddGroupModal from "../../header/modal/AddGroupModal";
import socketService from "../../../services/socketService";

interface ChatInfoProps {
  conversation: Conversation;
  onClose: () => void;
  onSelectConversation: (conversation: Conversation) => void;
  onLeaveGroup?: () => void;
}

// DetailedConversation extends the base Conversation type
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

// Define a simplified user interface for the selected member
interface MemberInfo {
  userId: string;
  fullname: string;
  phone?: string;
  urlavatar?: string;
  isMale?: boolean;
  birthday?: string;
}

const ChatInfo: React.FC<ChatInfoProps> = ({
  conversation,
  onClose,
  onSelectConversation,
  onLeaveGroup,
}) => {
  if (!conversation || !conversation.conversationId) return null;

  const [activeKeys, setActiveKeys] = useState<string[]>([]);
  const [isEditNameModalVisible, setIsEditNameModalVisible] = useState(false);
  const [localName, setLocalName] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [localUserCache, setLocalUserCache] = useState<Record<string, User>>(
    {}
  );
  const [detailedConversation, setDetailedConversation] =
    useState<DetailedConversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [showGroupManagement, setShowGroupManagement] = useState(false);
  const [showMediaGallery, setShowMediaGallery] = useState(false);
  const [showFileGallery, setShowFileGallery] = useState(false);
  const [mediaGalleryType, setMediaGalleryType] = useState<
    "media" | "files" | null
  >(null);
  const { userCache, userAvatars } = useConversations();
  const { t } = useLanguage();
  const [userRole, setUserRole] = useState<"owner" | "co-owner" | "member">(
    "member"
  );
  const {
    leaveGroupConversation,
    fetchSharedMedia,
    fetchSharedFiles,
    downloadFile,
    addCoOwner,
    removeCoOwnerDirectly,
    removeGroupMember,
    transferOwnership,
  } = useChatInfo();
  const { message, modal } = App.useApp();
  const [sharedMedia, setSharedMedia] = useState<any[]>([]);
  const [sharedFiles, setSharedFiles] = useState<any[]>([]);
  const [sharedLinks, setSharedLinks] = useState<any[]>([]);
  const [selectedMedia, setSelectedMedia] = useState<string | null>(null);
  const [selectedMediaType, setSelectedMediaType] = useState<
    "image" | "video" | null
  >(null);
  const [isMediaModalOpen, setIsMediaModalOpen] = useState<boolean>(false);
  const [currentMediaIndex, setCurrentMediaIndex] = useState<number>(0);
  const navigate = useNavigate();
  const [showMembersList, setShowMembersList] = useState(false);
  const [hoveredMemberId, setHoveredMemberId] = useState<string | null>(null);
  const [showOwnershipTransfer, setShowOwnershipTransfer] = useState(false);
  const [newOwnerSelected, setNewOwnerSelected] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<MemberInfo | null>(null);
  const [isUserInfoModalVisible, setIsUserInfoModalVisible] = useState(false);
  const [friendList, setFriendList] = useState<string[]>([]);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showAddGroupModal, setShowAddGroupModal] = useState(false);
  const { conversations } = useConversationContext();
  const [isAddMemberModalVisible, setIsAddMemberModalVisible] = useState(false);
  const [groupMembers, setGroupMembers] = useState<string[]>([]);
  const [memberCount, setMemberCount] = useState<number>(0);

  const hasShownGroupDeletedRef = useRef<string | null>(null);

  // Find the most up-to-date conversation data from context
  const updatedConversation =
    conversations.find(
      (conv: Conversation) =>
        conv.conversationId === conversation.conversationId
    ) || conversation;

  // Combine the updated conversation with detailed data
  const currentConversation: DetailedConversation = {
    ...updatedConversation,
    ...(detailedConversation || {}),
  };

  // Determine if this is a group conversation
  const isGroup = currentConversation.isGroup;
  const groupName = currentConversation.groupName;
  const groupAvatarUrl = currentConversation.groupAvatarUrl;
  
  // Cập nhật danh sách thành viên và số lượng thành viên khi conversation thay đổi
  useEffect(() => {
    if (currentConversation.groupMembers) {
      setGroupMembers(currentConversation.groupMembers);
      setMemberCount(currentConversation.groupMembers.length);
    }
  }, [currentConversation.groupMembers]);

  // Group link for sharing (would come from the API in a real implementation)
  const groupLink = currentConversation?.groupLink || "zalo.me/g/hotcjo791";

  // Number of mutual groups (would come from the API in a real implementation)
  const mutualGroups = currentConversation?.mutualGroups || 20;

  // Check user role when the conversation data is available
  useEffect(() => {
    if (currentConversation?.rules) {
      const currentUserId = localStorage.getItem("userId") || "";

      if (currentConversation.rules.ownerId === currentUserId) {
        setUserRole("owner");
      } else if (
        currentConversation.rules.coOwnerIds?.includes(currentUserId)
      ) {
        setUserRole("co-owner");
      } else {
        setUserRole("member");
      }
    }
  }, [currentConversation]);

  // Determine if user can manage the group
  const canManageGroup = userRole === "owner" || userRole === "co-owner";

  /**
   * Gets the ID of the other user in a one-on-one conversation
   */
  const getOtherUserId = (conversation: Conversation): string => {
    // Get current user ID from localStorage (or any authentication method you use)
    const currentUserId = localStorage.getItem("userId") || "";

    // If it's a group chat, there's no single "other user"
    if (conversation.isGroup) {
      return "";
    }

    // If the current user is the creator, return the receiverId
    if (currentUserId === conversation.creatorId) {
      return conversation.receiverId || "";
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
      if (
        !isGroup &&
        otherUserId &&
        !userCache[otherUserId] &&
        !localUserCache[otherUserId]
      ) {
        try {
          const userData = await getUserById(otherUserId);
          if (userData) {
            setLocalUserCache((prev) => ({
              ...prev,
              [otherUserId]: userData,
            }));
          }
        } catch (error) {
          console.error(`Failed to load data for user ${otherUserId}:`, error);
        }
      }
    };

    loadUserData();
  }, [isGroup, otherUserId, userCache, localUserCache]);

  // Add this function to allow refreshing conversation data
  const refreshConversationData = async () => {
    if (!conversation?.conversationId) return;
    try {
      setLoading(true);
      const conversationData = await getConversationDetail(
        conversation.conversationId
      );
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
      // Nếu lỗi 403 hoặc không phải thành viên, không hiển thị lỗi nữa
      const errObj = error as any;
      if ((errObj && errObj.response && errObj.response.status === 403) || (errObj && errObj.message && errObj.message.includes('not a member'))) {
        setDetailedConversation(null);
        if (typeof onLeaveGroup === 'function') onLeaveGroup();
        return;
      }
      console.error("Failed to load conversation details:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch detailed conversation information
  useEffect(() => {
    if (!conversation?.conversationId) return;
    refreshConversationData();
  }, [
    conversation?.conversationId,
    updatedConversation?.groupName,
    updatedConversation?.groupMembers?.length,
  ]);

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
    setLocalName(isGroup ? groupName || "" : otherUserInfo?.fullname || "");
    setIsEditNameModalVisible(true);
  };

  const handleSaveLocalName = () => {
    // Save local name logic using the API
    // Example: updateConversationLocalName(currentConversation.conversationId, localName);
    setIsEditNameModalVisible(false);
  };

  const handleDeleteChat = () => {
    Modal.confirm({
      title: "Xóa lịch sử trò chuyện",
      content:
        "Bạn có chắc chắn muốn xóa toàn bộ lịch sử trò chuyện? Hành động này không thể hoàn tác.",
      okText: "Xóa",
      cancelText: "Hủy",
      okButtonProps: { danger: true },
      onOk: () => {
        // Delete chat history logic using the API
        // Example: deleteConversationHistory(currentConversation.conversationId);
      },
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
        const loadingKey = "check-role";
        message.loading({ content: "Đang kiểm tra...", key: loadingKey });

        // Lấy lại thông tin conversation mới nhất để có quyền mới nhất
        const updatedConversation = await getConversationDetail(
          currentConversation.conversationId
        );

        // Cập nhật conversation detail
        setDetailedConversation(updatedConversation as DetailedConversation);

        // Kiểm tra lại quyền dựa trên thông tin mới nhất
        const currentUserId = localStorage.getItem("userId") || "";
        const isOwner = updatedConversation.rules?.ownerId === currentUserId;

        message.destroy(loadingKey);

        // Nếu là chủ nhóm, yêu cầu chuyển quyền
        if (isOwner) {
          modal.confirm({
            title: "Chuyển quyền trưởng nhóm",
            content:
              "Bạn là trưởng nhóm. Để rời nhóm, bạn cần chuyển quyền trưởng nhóm cho người khác trước. Lưu ý: Sau khi chuyển quyền trưởng nhóm, bạn sẽ trở thành thành viên thường và không thể hoàn tác thao tác này.",
            okText: "Chuyển quyền",
            cancelText: "Hủy",
            onOk: () => {
              // Chuyển đến trang chuyển quyền trưởng nhóm
              setShowOwnershipTransfer(true);
            },
          });
          return;
        }

        // Xử lý rời nhóm cho các thành viên khác
        modal.confirm({
          title: "Rời nhóm",
          content: "Bạn có chắc chắn muốn rời khỏi nhóm này?",
          okText: "Rời nhóm",
          cancelText: "Hủy",
          okButtonProps: { danger: true },
          onOk: async () => {
            try {
              const key = "leave-group";
              message.loading({ content: "Đang xử lý...", key });

              const result = await leaveGroupConversation(
                currentConversation.conversationId
              );

              if (result) {
                message.success({
                  content: "Đã rời nhóm thành công.",
                  key,
                  duration: 2,
                });

                // Đảm bảo xóa hết state local về cuộc trò chuyện này
                setDetailedConversation(null);

                // Gọi callback để cập nhật giao diện ngay lập tức
                if (typeof onLeaveGroup === 'function') {
                  onLeaveGroup();
                } else if (typeof onClose === 'function') {
                  onClose();
                } 
              } else {
                message.error({
                  content: "Không thể rời nhóm",
                  key,
                  duration: 2,
                });
              }
            } catch (err: any) {
              console.error("Failed to leave group:", err);
              // Xử lý trường hợp lỗi cụ thể
              if (
                err.response?.status === 400 &&
                err.response?.data?.message?.includes("owner")
              ) {
                message.error(
                  "Bạn là trưởng nhóm, không thể rời nhóm. Vui lòng chuyển quyền trước."
                );
              } else {
                message.error("Không thể rời nhóm. Vui lòng thử lại sau.");
              }
            }
          },
        });
      } catch (err) {
        console.error("Error checking user role:", err);
        message.error("Đã xảy ra lỗi. Vui lòng thử lại sau.");
      }
    }
  };

  const handleTransferOwnership = async (newOwnerId: string) => {
    if (!currentConversation.conversationId) return;

    try {
      message.loading({
        content: "Đang chuyển quyền...",
        key: "transfer-ownership",
      });
      const result = await transferOwnership(
        currentConversation.conversationId,
        newOwnerId
      );

      if (result) {
        message.success({
          content: "Đã chuyển quyền trưởng nhóm thành công",
          key: "transfer-ownership",
          duration: 2,
        });

        // Cập nhật lại conversation sau khi chuyển quyền
        setDetailedConversation(result as DetailedConversation);

        // Explicitly update the user role to member
        setUserRole("member");

        // Quay lại màn hình thông tin nhóm
        setShowOwnershipTransfer(false);

        // Hỏi người dùng có muốn rời nhóm sau khi chuyển quyền không
        modal.confirm({
          title: "Rời nhóm",
          content:
            "Bạn đã chuyển quyền trưởng nhóm thành công. Bạn có muốn rời nhóm ngay bây giờ không?",
          okText: "Rời nhóm",
          cancelText: "Ở lại",
          onOk: () => handleLeaveGroup(),
        });
      } else {
        message.error({
          content: "Không thể chuyển quyền trưởng nhóm",
          key: "transfer-ownership",
          duration: 2,
        });
      }
    } catch (err) {
      console.error("Error transferring ownership:", err);
      message.error("Không thể chuyển quyền trưởng nhóm. Vui lòng thử lại.");
    }
  };

  const handleBackFromOwnershipTransfer = () => {
    setShowOwnershipTransfer(false);
    setNewOwnerSelected(null);
  };

  const handleShowGroupManagement = () => {
    // Get the current userId and check if it's still the owner or co-owner
    const currentUserId = localStorage.getItem("userId") || "";
    const isOwner = currentConversation.rules?.ownerId === currentUserId;
    const isCoOwner =
      currentConversation.rules?.coOwnerIds?.includes(currentUserId);

    // Force refresh the user role based on the latest data
    if (isOwner) {
      setUserRole("owner");
    } else if (isCoOwner) {
      setUserRole("co-owner");
    } else {
      setUserRole("member");
    }

    // Refresh conversation data first to ensure we have latest data
    refreshConversationData().then(() => {
      // Now show the group management screen
      setShowGroupManagement(true);
    });
  };

  const handleBackFromGroupManagement = () => {
    setShowGroupManagement(false);
  };

  const handleShowMediaGallery = (type: "media" | "files") => {
    setMediaGalleryType(type);
    setShowMediaGallery(true);
  };

  const handleBackFromMediaGallery = () => {
    setShowMediaGallery(false);
    setMediaGalleryType(null);
  };

  // Determine the display name based on whether it's a group or individual conversation
  const displayName = isGroup
    ? groupName || "Nhóm chat"
    : otherUserInfo?.fullname || t.loading || "Đang tải...";

  // Determine online status
  const onlineStatus = isGroup ? `${memberCount} thành viên` : "Online";

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
      if (currentConversation?.sharedLinks) {
        setSharedLinks(currentConversation.sharedLinks);
      }
    } catch (error) {
      console.error("Error loading media and files:", error);
    }
  };

  // Function to handle file download
  const handleDownloadFile = (
    url: string,
    downloadUrl: string | undefined,
    filename: string
  ) => {
    // Use the downloadUrl if available, otherwise fall back to regular url
    const fileUrl = downloadUrl || url;
    downloadFile(fileUrl, filename);
    message.success(`Đang tải xuống ${filename}`);
  };

  // Thêm hàm xử lý xem trước media
  const handleMediaPreview = (
    media: any,
    type: "image" | "video",
    index: number
  ) => {
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
    const videoElement = document.getElementById(
      "media-preview-video"
    ) as HTMLVideoElement;
    if (videoElement) {
      videoElement.pause();
      videoElement.currentTime = 0;
    }

    // Để đảm bảo, dừng tất cả các video
    const videos = document.querySelectorAll("video");
    videos.forEach((video) => {
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

      const mediaType = prevMedia.type?.startsWith("image") ? "image" : "video";
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

      const mediaType = nextMedia.type?.startsWith("image") ? "image" : "video";
      setSelectedMediaType(mediaType);
      setSelectedMedia(nextMedia.downloadUrl || nextMedia.url);
    }
  };

  // Tải xuống media
  const handleDownloadMedia = () => {
    if (selectedMedia) {
      const fileName =
        sharedMedia[currentMediaIndex]?.name ||
        (selectedMediaType === "image" ? "image.jpg" : "video.mp4");
      downloadFile(selectedMedia, fileName);
      message.success(`Đang tải xuống ${fileName}`);
    }
  };

  const handleShowMembers = () => {
    // Refresh conversation data first to ensure we have latest data
    refreshConversationData().then(() => {
      setShowMembersList(true);
    });
  };

  const handleBackFromMembersList = () => {
    setShowMembersList(false);
  };

  const handleCreateGroup = () => {
    setShowAddGroupModal(true);
  };

  const handleCloseAddGroupModal = () => {
    setShowAddGroupModal(false);
  };

  // Lắng nghe sự kiện thay đổi thành viên nhóm từ socket
  useEffect(() => {
    if (!currentConversation.conversationId) return;
    
    // Xử lý khi một thành viên bị xóa khỏi nhóm
    const handleMemberRemoved = (data: {
      conversationId: string;
      userId: string;
    }) => {
      if (data.conversationId === currentConversation.conversationId) {
        // Cập nhật số lượng thành viên
        setMemberCount((prev) => Math.max(0, prev - 1));
        
        // Cập nhật danh sách thành viên nhóm
        setGroupMembers((prevMembers) => 
          prevMembers.filter(id => id !== data.userId)
        );
      }
    };

    // Xử lý khi một thành viên bị kick khỏi nhóm
    const handleUserRemovedFromGroup = (data: {
      conversationId: string;
      kickedUser: { userId: string; fullname: string };
      kickedByUser: { userId: string; fullname: string };
    }) => {
      if (data.conversationId === currentConversation.conversationId) {
        // Cập nhật số lượng thành viên
        setMemberCount((prev) => Math.max(0, prev - 1));
        
        // Cập nhật danh sách thành viên nhóm
        setGroupMembers((prevMembers) => 
          prevMembers.filter(id => id !== data.kickedUser.userId)
        );
      }
    };

    // Xử lý khi một thành viên mới được thêm vào nhóm
    const handleUserAddedToGroup = (data: {
      conversationId: string;
      addedUser: { userId: string; fullname: string };
      addedByUser: { userId: string; fullname: string };
    }) => {
      if (data.conversationId === currentConversation.conversationId) {
        const addedUserId = data.addedUser.userId;
        
        // Kiểm tra xem thành viên này đã có trong danh sách chưa
        if (!groupMembers.includes(addedUserId)) {
          // Cập nhật số lượng thành viên
          setMemberCount((prev) => prev + 1);
          
          // Cập nhật danh sách thành viên nhóm
          setGroupMembers((prevMembers) => [...prevMembers, addedUserId]);
          
          // Gọi API để lấy thông tin nhóm mới nhất
          refreshConversationData();
        }
      }
    };

    // Đăng ký lắng nghe các sự kiện
    socketService.on("userRemovedFromGroup", handleUserRemovedFromGroup);
    socketService.on("userLeftGroup", handleMemberRemoved);
    socketService.on("userAddedToGroup", handleUserAddedToGroup);

    // Hủy đăng ký khi component unmount
    return () => {
      socketService.off("userRemovedFromGroup", handleUserRemovedFromGroup);
      socketService.off("userLeftGroup", handleMemberRemoved);
      socketService.off("userAddedToGroup", handleUserAddedToGroup);
    };
  }, [currentConversation.conversationId, groupMembers]);

  // Lắng nghe sự kiện nhóm bị giải tán để đẩy mọi thành viên ra khỏi conversation
  useEffect(() => {
    if (!currentConversation.conversationId) return;

    const handleGroupDeleted = (data: { conversationId: string }) => {
      if (data.conversationId !== currentConversation.conversationId) return;
      // Nếu đã hiển thị thông báo cho conversation này thì bỏ qua
      if (hasShownGroupDeletedRef.current === data.conversationId) return;
      hasShownGroupDeletedRef.current = data.conversationId;
      modal.error({
        title: 'Nhóm đã bị giải tán',
        content: 'Nhóm chat này đã bị giải tán bởi người quản trị',
        okText: 'Đã hiểu',
        centered: true,
      });
      if (typeof onLeaveGroup === 'function') {
        onLeaveGroup();
      }
    };

    socketService.on('groupDeleted', handleGroupDeleted);
    return () => {
      socketService.off('groupDeleted', handleGroupDeleted);
    };
  }, [currentConversation.conversationId, onLeaveGroup]);

  // If showing members list view
  if (showMembersList && isGroup) {
    return (
      <MembersList
        conversation={currentConversation}
        userCache={userCache}
        userAvatars={userAvatars}
        userRole={userRole}
        onBack={handleBackFromMembersList}
        onLeaveGroup={onLeaveGroup || (() => {})}
        addCoOwner={addCoOwner}
        removeCoOwner={removeCoOwnerDirectly}
        removeMember={removeGroupMember}
        onRefreshConversationData={refreshConversationData}
      />
    );
  }

  // If showing ownership transfer view
  if (showOwnershipTransfer && isGroup) {
    return (
      <div className="h-full bg-white">
        <div className="flex-none p-4 border-b border-gray-200 flex items-center">
          <Button
            type="text"
            className="flex items-center mr-2"
            icon={<LeftOutlined />}
            onClick={handleBackFromOwnershipTransfer}
          />
          <h2 className="text-lg font-semibold">Chuyển quyền trưởng nhóm</h2>
        </div>

        <div className="p-4">
          <div className="bg-yellow-50 p-3 rounded border border-yellow-200 mb-4">
            <p className="text-yellow-700 text-sm">
              Lưu ý: Sau khi chuyển quyền trưởng nhóm, bạn sẽ trở thành thành
              viên thường và không thể hoàn tác thao tác này.
            </p>
          </div>
        </div>

        <div className="px-4 mb-3">
          <h3 className="font-medium text-gray-700">Chọn trưởng nhóm mới</h3>
        </div>

        <div className="member-list overflow-y-auto">
          {groupMembers.map((memberId) => {
            const memberInfo = userCache[memberId] || localUserCache[memberId];
            const isCurrentUser = memberId === localStorage.getItem("userId");
            const isOwner = currentConversation.rules?.ownerId === memberId;
            const isCoOwner =
              currentConversation.rules?.coOwnerIds?.includes(memberId) ||
              false;
            const isSelected = newOwnerSelected === memberId;

            // Skip the current user (owner) from the list
            if (isCurrentUser) return null;

            return (
              <div
                key={memberId}
                className={`flex items-center justify-between p-3 hover:bg-gray-100 relative cursor-pointer ${isSelected ? "bg-blue-50" : ""}`}
                onClick={() => setNewOwnerSelected(memberId)}>
                <div className="flex items-center">
                  <Avatar
                    name={memberInfo?.fullname || "User"}
                    avatarUrl={memberInfo?.urlavatar || userAvatars[memberId]}
                    size={48}
                    className="rounded-full mr-3"
                  />
                  <div>
                    <div className="font-medium flex items-center">
                      {memberInfo?.fullname ||
                        `User-${memberId.substring(0, 6)}`}
                    </div>
                    <div className="text-sm text-gray-500">
                      {isCoOwner ? "Phó nhóm" : "Thành viên"}
                    </div>
                  </div>
                </div>

                {isSelected && (
                  <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      viewBox="0 0 20 20"
                      fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="p-4 border-t border-gray-200 flex justify-center">
          <Button
            type="primary"
            size="large"
            disabled={!newOwnerSelected}
            onClick={() =>
              newOwnerSelected && handleTransferOwnership(newOwnerSelected)
            }
            className="w-full">
            Chuyển quyền
          </Button>
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
        onAfterTransferOwner={handleBackFromGroupManagement}
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
          <h2 className="text-lg font-semibold">Kho lưu trữ</h2>
        </div>

        <div className="flex-1 overflow-y-auto">
          {mediaGalleryType === "media" ? (
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
    <>
      <div className="chat-info flex flex-col h-full bg-white">
        {/* Header - Fixed */}
        <div className="flex-none p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-center">
            {isGroup ? "Thông tin nhóm" : "Thông tin hội thoại"}
          </h2>
        </div>

        {/* Main content - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                <p className="text-gray-500">{t.loading || "Đang tải..."}</p>
              </div>
            </div>
          ) : (
            <>
              {/* User/Group Info Section */}
              <div className="py-6 text-center border-b border-gray-100">
                <div className="flex flex-col items-center">
                  {isGroup ? (
                    <div
                      className="cursor-pointer"
                      onClick={() => setShowGroupModal(true)}>
                      <GroupAvatar
                        members={groupMembers}
                        userAvatars={userAvatars}
                        size={80}
                        className="mb-3 border-2 border-white"
                        groupAvatarUrl={groupAvatarUrl || undefined}
                      />
                    </div>
                  ) : (
                    <Avatar
                      name={otherUserInfo?.fullname || "User"}
                      avatarUrl={otherUserInfo?.urlavatar}
                      size={80}
                      className="rounded-full mb-3"
                    />
                  )}
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <h3 className="text-lg font-semibold">{displayName}</h3>
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
                        icon={
                          <BellOutlined
                            className={
                              isMuted ? "text-blue-500" : "text-gray-500"
                            }
                          />
                        }
                        onClick={handleToggleMute}
                        className="flex items-center justify-center h-10 w-10 bg-gray-100"
                      />
                      <span className="text-xs mt-1">Tắt thông báo</span>
                    </div>

                    <div className="flex flex-col items-center">
                      <Button
                        type="text"
                        shape="circle"
                        icon={
                          <PushpinOutlined
                            className={
                              isPinned ? "text-blue-500" : "text-gray-500"
                            }
                          />
                        }
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
                            onClick={() => setIsAddMemberModalVisible(true)}
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
                          icon={
                            <UsergroupAddOutlined className="text-gray-500" />
                          }
                          className="flex items-center justify-center h-10 w-10 bg-gray-100"
                          onClick={handleCreateGroup}
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
                    onClick={() =>
                      setActiveKeys((prev) =>
                        prev.includes("members")
                          ? prev.filter((k) => k !== "members")
                          : [...prev, "members"]
                      )
                    }>
                    <div className="flex items-center">
                      <TeamOutlined className="text-gray-500 mr-3" />
                      <span className="font-medium">Thành viên nhóm</span>
                    </div>
                    <RightOutlined
                      className={`text-gray-400 transition-transform ${activeKeys.includes("members") ? "transform rotate-90" : ""}`}
                    />
                  </div>

                  {activeKeys.includes("members") && (
                    <div className="p-4 border-t border-gray-100">
                      <div className="flex items-center mb-4">
                        <TeamOutlined className="text-gray-500 mr-2" />
                        <span
                          className="cursor-pointer hover:text-blue-500"
                          onClick={handleShowMembers}>
                          <i className="far fa-user mr-1" />
                          <span>
                            {memberCount} {t.members || "thành viên"}
                          </span>
                        </span>
                      </div>

                      <div className="mb-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">
                            Link tham gia nhóm
                          </span>
                        </div>
                        <div className="flex items-center mt-2 p-2 bg-gray-50 rounded">
                          <span className="text-blue-500 flex-1 truncate">
                            {groupLink}
                          </span>
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
                    onClick={() =>
                      setActiveKeys((prev) =>
                        prev.includes("board")
                          ? prev.filter((k) => k !== "board")
                          : [...prev, "board"]
                      )
                    }>
                    <div className="flex items-center">
                      <FileTextOutlined className="text-gray-500 mr-3" />
                      <span className="font-medium">Bảng tin nhóm</span>
                    </div>
                    <RightOutlined
                      className={`text-gray-400 transition-transform ${activeKeys.includes("board") ? "transform rotate-90" : ""}`}
                    />
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
                <div
                  className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50"
                  onClick={() =>
                    setActiveKeys((prev) =>
                      prev.includes("media")
                        ? prev.filter((k) => k !== "media")
                        : [...prev, "media"]
                    )
                  }>
                  <div className="flex items-center">
                    <FileImageOutlined className="text-gray-500 mr-3" />
                    <span className="font-medium">Ảnh/Video</span>
                  </div>
                  <RightOutlined
                    className={`text-gray-400 transition-transform ${activeKeys.includes("media") ? "transform rotate-90" : ""}`}
                  />
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
                              const mediaType = item.type?.startsWith("image")
                                ? "image"
                                : "video";
                              handleMediaPreview(item, mediaType, index);
                            }}>
                            {item.type && item.type.startsWith("image") ? (
                              <img
                                src={item.url}
                                alt={item.name || `Image ${index}`}
                                className="w-full h-full object-cover"
                              />
                            ) : item.type && item.type.startsWith("video") ? (
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
                        onClick={() => handleShowMediaGallery("media")}>
                        <span>Xem tất cả</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* File Section - Update to use downloadUrl */}
              <div className="border-b border-gray-100">
                <div
                  className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50"
                  onClick={() =>
                    setActiveKeys((prev) =>
                      prev.includes("files")
                        ? prev.filter((k) => k !== "files")
                        : [...prev, "files"]
                    )
                  }>
                  <div className="flex items-center">
                    <FileOutlined className="text-gray-500 mr-3" />
                    <span className="font-medium">File</span>
                  </div>
                  <RightOutlined
                    className={`text-gray-400 transition-transform ${activeKeys.includes("files") ? "transform rotate-90" : ""}`}
                  />
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
                            const ext = file.name
                              .split(".")
                              .pop()
                              ?.toLowerCase();
                            if (ext === "json") {
                              bgColor = "bg-blue-400";
                            } else if (ext === "env") {
                              bgColor = "bg-cyan-400";
                            } else if (
                              ["jpg", "png", "gif", "jpeg"].includes(ext || "")
                            ) {
                              FileIcon = FileImageOutlined;
                              bgColor = "bg-purple-400";
                            } else if (
                              ["mp4", "avi", "mov"].includes(ext || "")
                            ) {
                              bgColor = "bg-red-400";
                            } else if (
                              ["zip", "rar", "7z"].includes(ext || "")
                            ) {
                              bgColor = "bg-yellow-500";
                            } else if (
                              ["docx", "doc", "pdf"].includes(ext || "")
                            ) {
                              bgColor = "bg-blue-600";
                            }
                          }

                          // Format date - không sử dụng padStart để tránh số 0 phía trước
                          let formattedDate = "";
                          if (file.createdAt) {
                            const fileDate = new Date(file.createdAt);
                            const today = new Date();
                            const yesterday = new Date();
                            yesterday.setDate(yesterday.getDate() - 1);

                            // Format thời gian
                            const hours = fileDate.getHours();
                            const minutes =
                              fileDate.getMinutes() < 10
                                ? "0" + fileDate.getMinutes()
                                : fileDate.getMinutes();
                            const timeString = `${hours}:${minutes}`;

                            // Định dạng ngày
                            if (
                              fileDate.toDateString() === today.toDateString()
                            ) {
                              formattedDate = `Hôm nay, ${timeString}`;
                            } else if (
                              fileDate.toDateString() ===
                              yesterday.toDateString()
                            ) {
                              formattedDate = `Hôm qua, ${timeString}`;
                            } else if (
                              fileDate.getFullYear() === today.getFullYear()
                            ) {
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
                            <div
                              key={`file-${index}`}
                              className="flex items-center justify-between py-2">
                              <div className="flex items-center">
                                <div
                                  className={`w-10 h-10 rounded flex items-center justify-center text-white ${bgColor} mr-3`}>
                                  <span className="text-xs font-bold uppercase">
                                    {file.name?.split(".").pop() || "FILE"}
                                  </span>
                                </div>
                                <div>
                                  <div className="font-medium">{file.name}</div>
                                  <div className="flex items-center text-xs text-gray-500">
                                    <span>
                                      {file.size
                                        ? `${Math.round(file.size / 1024)} KB`
                                        : ""}
                                    </span>
                                    {file.size && (
                                      <span className="mx-1">•</span>
                                    )}
                                    <span>{formattedDate}</span>
                                  </div>
                                </div>
                              </div>
                              <Button
                                type="link"
                                className="text-gray-400 hover:text-blue-500"
                                onClick={() =>
                                  handleDownloadFile(
                                    file.url,
                                    file.downloadUrl,
                                    file.name
                                  )
                                }>
                                <DownloadOutlined />
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500 text-center py-2">
                        {isGroup
                          ? "Chưa có file nào"
                          : "Chưa có File được chia sẻ từ sau 10/3/2025"}
                      </div>
                    )}

                    {sharedFiles.length > 0 && (
                      <div
                        className="flex justify-center items-center mt-3 py-2 bg-gray-100 rounded cursor-pointer hover:bg-gray-200"
                        onClick={() => handleShowMediaGallery("files")}>
                        <span>Xem tất cả</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Link Section */}
              <div
                className="cursor-pointer hover:bg-gray-50"
                onClick={() =>
                  setActiveKeys((prev) =>
                    prev.includes("links")
                      ? prev.filter((k) => k !== "links")
                      : [...prev, "links"]
                  )
                }>
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                  <div className="flex items-center">
                    <LinkOutlined className="text-gray-500 mr-3" />
                    <span>Link</span>
                  </div>
                  <RightOutlined
                    className={`text-gray-400 transition-transform ${activeKeys.includes("links") ? "transform rotate-90" : ""}`}
                  />
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
                                {isGroup
                                  ? "render.com"
                                  : "3e9a-2401-d800-a0e-6d-4873-72e5-6f11-a9e1.ngrok-free.app"}
                              </div>
                              <div className="text-xs text-gray-500">19/04</div>
                            </div>
                          </div>
                          <div className="flex space-x-1">
                            <Button
                              type="text"
                              icon={<ShareAltOutlined />}
                              size="small"
                            />
                          </div>
                        </div>
                        <div className="flex items-center justify-between p-2 bg-white rounded">
                          <div className="flex items-center">
                            <LinkOutlined className="text-blue-500 mr-2" />
                            <div>
                              <div className="font-medium truncate w-52">
                                {isGroup
                                  ? "socket.io\\dist\\typed-events.js"
                                  : "raw.githubusercontent.com/.../cursor_win_id_modifier.ps1"}
                              </div>
                              <div className="text-xs text-gray-500">
                                {isGroup ? "16/04" : "18/04"}
                              </div>
                            </div>
                          </div>
                          <div className="flex space-x-1">
                            <Button
                              type="text"
                              icon={<ShareAltOutlined />}
                              size="small"
                            />
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
              <div
                className="cursor-pointer hover:bg-gray-50"
                onClick={() =>
                  setActiveKeys((prev) =>
                    prev.includes("security")
                      ? prev.filter((k) => k !== "security")
                      : [...prev, "security"]
                  )
                }>
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                  <div className="flex items-center">
                    <EyeInvisibleOutlined className="text-gray-500 mr-3" />
                    <span>Thiết lập bảo mật</span>
                  </div>
                  <RightOutlined
                    className={`text-gray-400 transition-transform ${activeKeys.includes("security") ? "transform rotate-90" : ""}`}
                  />
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
                          <p className="text-sm text-gray-500">
                            Yêu cầu mật khẩu để xem
                          </p>
                        </div>
                        <Switch
                          checked={isHidden}
                          onChange={handleToggleHidden}
                          size="small"
                        />
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
                <div
                  className="flex items-center text-red-500 px-4 py-3 cursor-pointer hover:bg-gray-50"
                  onClick={handleDeleteChat}>
                  <DeleteOutlined className="mr-3" />
                  <span>Xóa lịch sử trò chuyện</span>
                </div>
                {isGroup && (
                  <div
                    className="flex items-center text-red-500 px-4 py-3 cursor-pointer hover:bg-gray-50"
                    onClick={handleLeaveGroup}>
                    <LogoutOutlined className="mr-3" />
                    <span>Rời nhóm</span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modal xem trước ảnh/video */}
      <Modal
        open={isMediaModalOpen}
        onCancel={closeMediaModal}
        footer={null}
        centered
        width="auto"
        bodyStyle={{ padding: 0, backgroundColor: "#000000" }}
        style={{
          maxWidth: "100vw",
          backgroundColor: "#000000",
        }}
        className="media-preview-modal"
        closeIcon={false}
        keyboard={true}>
        <div className="relative flex flex-col h-[90vh] justify-center items-center bg-black">
          {/* Thanh trên cùng với nút đóng và chỉ số */}
          <div className="absolute top-0 left-0 right-0 bg-black bg-opacity-70 py-3 px-4 flex justify-between items-center z-20">
            <div className="w-8"></div>{" "}
            {/* Phần trống để cân bằng với nút đóng */}
            <div className="text-white font-medium text-sm">
              {currentMediaIndex + 1} / {sharedMedia.length}
            </div>
            <Button
              type="text"
              icon={<CloseOutlined style={{ fontSize: "20px" }} />}
              onClick={closeMediaModal}
              className="flex items-center justify-center h-8 w-8 bg-transparent hover:bg-opacity-80 text-white"
              style={{ border: "none" }}
            />
          </div>

          {/* Hiển thị ảnh hoặc video */}
          <div className="flex justify-center items-center w-full h-full">
            {selectedMediaType === "image" ? (
              <img
                src={selectedMedia || ""}
                alt="Preview"
                style={{
                  maxWidth: "100%",
                  maxHeight: "80vh",
                  objectFit: "contain",
                }}
                className="select-none"
              />
            ) : selectedMediaType === "video" ? (
              <video
                src={selectedMedia || ""}
                controls
                autoPlay
                style={{ maxWidth: "100%", maxHeight: "80vh" }}
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
              {sharedMedia[currentMediaIndex]?.name ||
                (selectedMediaType === "image" ? "Hình ảnh" : "Video")}
            </div>

            {/* Các nút chức năng */}
            <div className="flex space-x-4">
              <Button
                type="link"
                icon={
                  <DownloadOutlined
                    style={{ fontSize: "20px", color: "white" }}
                  />
                }
                onClick={handleDownloadMedia}
                className="flex items-center justify-center h-10 w-10 bg-transparent text-white"
                style={{ border: "none" }}
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
                  icon={
                    <LeftOutlined
                      style={{ fontSize: "20px", color: "white" }}
                    />
                  }
                  onClick={handlePrevMedia}
                  className="flex items-center justify-center h-12 w-12 bg-red-600 rounded-none"
                  style={{ border: "none" }}
                />
              )}
            </div>

            {/* Nút sau */}
            <div className="pointer-events-auto">
              {currentMediaIndex < sharedMedia.length - 1 && (
                <Button
                  type="text"
                  icon={
                    <RightArrowOutlined
                      style={{ fontSize: "20px", color: "white" }}
                    />
                  }
                  onClick={handleNextMedia}
                  className="flex items-center justify-center h-12 w-12 bg-black bg-opacity-50 rounded-full"
                  style={{ border: "none" }}
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
        cancelText="Hủy">
        <Input
          value={localName}
          onChange={(e) => setLocalName(e.target.value)}
          className="w-full p-2 border rounded"
          placeholder="Nhập tên gợi nhớ"
        />
      </Modal>

      {/* GroupModal */}
      {isGroup && showGroupModal && (
        <GroupModal
          visible={showGroupModal}
          onClose={() => setShowGroupModal(false)}
          conversation={conversation}
          userAvatars={userAvatars}
          members={groupMembers}
          onLeaveGroup={handleLeaveGroup}
          refreshConversationData={refreshConversationData}
        />
      )}

      {/* AddMemberModal */}
      {isAddMemberModalVisible && (
        <AddMemberModal
          visible={isAddMemberModalVisible}
          onClose={() => setIsAddMemberModalVisible(false)}
          conversationId={currentConversation.conversationId}
          groupMembers={currentConversation.groupMembers || []}
          refreshConversationData={refreshConversationData}
        />
      )}

      {/* AddGroupModal */}
      {showAddGroupModal && (
        <AddGroupModal
          visible={showAddGroupModal}
          onClose={handleCloseAddGroupModal}
          onSelectConversation={onSelectConversation}
          preSelectedMembers={isGroup ? groupMembers : [otherUserId]}
        />
      )}
    </>
  );
};

export default ChatInfo;
