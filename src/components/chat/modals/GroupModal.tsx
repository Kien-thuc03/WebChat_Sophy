import React, { useState, useEffect, useRef } from "react";
import { Modal, Button, Avatar, Tooltip, Spin, Input, App } from "antd";
import {
  EditOutlined,
  CloseOutlined,
  CopyOutlined,
  ShareAltOutlined,
  SettingOutlined,
  CameraOutlined,
  CheckOutlined,
} from "@ant-design/icons";
import { Conversation } from "../../../features/chat/types/conversationTypes";
import GroupAvatar from "../GroupAvatar";
import {
  leaveGroup,
  getUserById,
  getConversationDetail,
  updateGroupName,
  updateGroupAvatar,
} from "../../../api/API";
import UpdateAvatarGroupModal from "../../header/modal/UpdateAvatarGroupModal";
import { useConversationContext } from "../../../features/chat/context/ConversationContext";
import socketService from "../../../services/socketService";

interface MemberInfo {
  userId: string;
  fullname: string;
  urlavatar?: string;
}

interface GroupModalProps {
  visible: boolean;
  onClose: () => void;
  conversation: Conversation;
  userAvatars: Record<string, string>;
  members: string[]; // Used in type declaration only, actual data fetched from API
  onLeaveGroup?: () => void;
  onUpdateGroupAvatar?: (newAvatarUrl: string) => void;
  onUpdateGroupName?: (newName: string) => void;
  refreshConversationData?: () => void; // Add this line to allow refreshing data
}

const GroupModal: React.FC<GroupModalProps> = ({
  visible,
  onClose,
  conversation: initialConversation,
  userAvatars = {},
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onLeaveGroup,
  onUpdateGroupAvatar,
  onUpdateGroupName,
  refreshConversationData,
}) => {
  const { updateConversationField } = useConversationContext();
  const { message } = App.useApp(); // Use App.useApp() for message API
  const [loading, setLoading] = useState(false);
  const [memberDetails, setMemberDetails] = useState<MemberInfo[]>([]); // Initialize with empty array
  const [fetchingMembers, setFetchingMembers] = useState(false);
  const [isUpdateAvatarModalOpen, setIsUpdateAvatarModalOpen] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [conversation, setConversation] = useState(initialConversation);
  const [groupName, setGroupName] = useState(
    initialConversation.groupName || ""
  );
  const [updatingGroupName, setUpdatingGroupName] = useState(false);
  const [updatedName, setUpdatedName] = useState<string | null>(null);

  // Use a ref to track previous member count to avoid unnecessary refreshes
  const prevMemberCountRef = useRef<number | null>(null);

  // Update local state when initial conversation changes
  useEffect(() => {
    setConversation(initialConversation);
    setGroupName(initialConversation.groupName || "");
  }, [initialConversation]);

  // Effect to handle group name updates
  useEffect(() => {
    if (updatedName) {
      // Update local conversation state
      setConversation((prev) => ({
        ...prev,
        groupName: updatedName,
      }));

      // Update the conversation in the global context
      updateConversationField(
        conversation.conversationId,
        "groupName",
        updatedName
      );

      // Notify parent component
      if (onUpdateGroupName) {
        onUpdateGroupName(updatedName);
      }

      // Reset the updatedName trigger
      setUpdatedName(null);
    }
  }, [
    updatedName,
    onUpdateGroupName,
    conversation.conversationId,
    updateConversationField,
  ]);

  // Replace existing useEffect for visible change with one that also fetches fresh data
  useEffect(() => {
    if (!visible) {
      prevMemberCountRef.current = null;
    } else {
      // Force fetch fresh conversation data when modal opens
      const fetchFreshData = async () => {
        try {
          setFetchingMembers(true);
          const freshConversationData = await getConversationDetail(
            conversation.conversationId
          );

          if (freshConversationData) {
            // Update conversation data
            setConversation((prev) => ({
              ...prev,
              ...freshConversationData,
              groupAvatarUrl:
                freshConversationData.groupAvatarUrl || prev.groupAvatarUrl,
              groupName: freshConversationData.groupName || prev.groupName,
              groupMembers:
                freshConversationData.groupMembers || prev.groupMembers,
            }));

            // Fetch details for each member
            const memberIds = freshConversationData.groupMembers || [];

            // Save current member count for next comparison
            prevMemberCountRef.current = memberIds.length;

            // Fetch details for each member
            const fetchPromises = memberIds.map(async (userId) => {
              try {
                const userDetails = await getUserById(userId);
                return {
                  userId,
                  fullname:
                    userDetails.fullname || `User-${userId.substring(0, 6)}`,
                  urlavatar: userDetails.urlavatar,
                };
              } catch (error) {
                console.error(`Error fetching user ${userId}:`, error);
                return {
                  userId,
                  fullname: `User-${userId.substring(0, 6)}`,
                };
              }
            });

            const memberDetailsResult = await Promise.all(fetchPromises);
            setMemberDetails(memberDetailsResult);
          }
        } catch (error) {
          console.error("Error fetching fresh conversation data:", error);
        } finally {
          setFetchingMembers(false);
        }
      };

      fetchFreshData();
    }
  }, [visible, conversation.conversationId]);

  // Add useEffect to handle immediate avatar updates
  useEffect(() => {
    if (conversation.groupAvatarUrl) {
      // Force a re-render when the avatar URL changes
      const img = new Image();
      img.src = conversation.groupAvatarUrl;
      img.onload = () => {
        // Using this approach to force a re-render without changing state
        // This helps ensure the GroupAvatar component receives the new URL
        setConversation((prev) => ({ ...prev }));
      };
    }
  }, [conversation.groupAvatarUrl]);

  // Đảm bảo giá trị của groupAvatarUrl được log ra để kiểm tra
  useEffect(() => {
    // Giới hạn log để tránh spam
    const savedLogTimestamp = sessionStorage.getItem('lastAvatarLog');
    const currentTime = Date.now();
    
    if (!savedLogTimestamp || currentTime - parseInt(savedLogTimestamp) > 2000) {
      console.log("Conversation in GroupModal:", conversation);
      console.log("Group avatar URL:", conversation.groupAvatarUrl);
      sessionStorage.setItem('lastAvatarLog', currentTime.toString());
    }
  }, [conversation.groupAvatarUrl]);

  // Tạo link tham gia nhóm
  const groupLink = `https://zalo.me/g/${conversation.conversationId.replace("conv", "")}`;

  // Xử lý sao chép link
  const handleCopyLink = () => {
    navigator.clipboard.writeText(groupLink);
    message.success("Đã sao chép liên kết");
  };

  // Xử lý chia sẻ link
  const handleShareLink = () => {
    if (navigator.share) {
      navigator.share({
        title: `Nhóm: ${conversation.groupName}`,
        text: "Tham gia nhóm chat của tôi trên Zalo",
        url: groupLink,
      });
    } else {
      handleCopyLink();
    }
  };

  // Xử lý nhắn tin
  const handleMessage = () => {
    onClose();
  };

  // Xử lý rời nhóm
  const handleLeaveGroup = async () => {
    try {
      setLoading(true);
      await leaveGroup(conversation.conversationId);
      message.success("Rời nhóm thành công");

      if (onLeaveGroup) {
        onLeaveGroup();
      }

      onClose();
    } catch (error) {
      console.error("Lỗi khi rời nhóm:", error);
      if (error instanceof Error) {
        message.error(error.message);
      } else {
        message.error("Không thể rời nhóm. Vui lòng thử lại sau.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Xử lý mở modal cập nhật ảnh
  const handleOpenUpdateAvatarModal = () => {
    setIsUpdateAvatarModalOpen(true);
  };

  // Xử lý cập nhật ảnh đại diện nhóm
  const handleUpdateAvatar = async (data: {
    url: string;
    file: File | null;
  }) => {
    if (!data.file) return;

    try {
      // Hiển thị thông báo đang xử lý
      const key = "updating-avatar";
      message.loading({ content: "Đang cập nhật ảnh đại diện...", key });

      // Lưu URL trước đó để có thể quay lại nếu cập nhật thất bại
      const previousAvatarUrl = conversation.groupAvatarUrl;

      // Không cập nhật blob URL trực tiếp vào state để tránh vấn đề với việc render và lưu trữ
      // Chỉ hiển thị URL tạm thời trên UI và đợi URL thực từ server

      // Gọi API để cập nhật ảnh
      const result = await updateGroupAvatar(
        conversation.conversationId,
        data.file
      );

      if (result && result.conversation) {
        // Xóa thông báo loading
        message.destroy(key);

        // Add timestamp to server URL to prevent caching
        const serverUrlWithTimestamp = `${result.conversation.groupAvatarUrl}?t=${Date.now()}`;

        // Lấy thông tin user hiện tại
        const currentUserId = localStorage.getItem("userId") || "";
        // Tìm thông tin người dùng hiện tại từ danh sách thành viên
        const currentMember = memberDetails.find(member => member.userId === currentUserId);
        const currentUserName = currentMember?.fullname || "Một thành viên";

        // Emit sự kiện thay đổi ảnh nhóm với thông tin người thay đổi
        socketService.emit("groupAvatarChanged", {
          conversationId: conversation.conversationId,
          newAvatar: result.conversation.groupAvatarUrl, // Sử dụng URL thực từ server, không phải URL blob
          changedBy: {
            userId: currentUserId,
            fullname: currentUserName
          }
        });

        // Cập nhật state conversation with actual server URL
        const finalConversation = {
          ...conversation,
          groupAvatarUrl: serverUrlWithTimestamp,
        };
        setConversation(finalConversation);

        // Cập nhật vào context
        updateConversationField(
          conversation.conversationId,
          "groupAvatarUrl",
          serverUrlWithTimestamp
        );

        // Gọi callback nếu có
        if (onUpdateGroupAvatar) {
          onUpdateGroupAvatar(serverUrlWithTimestamp);
        }

        // Refresh conversation data nếu có
        if (refreshConversationData) {
          refreshConversationData();
        }

        message.success("Cập nhật ảnh đại diện thành công");
      } else {
        // Revert to previous avatar if update failed
        setConversation((prev) => ({
          ...prev,
          groupAvatarUrl: previousAvatarUrl,
        }));
        message.error({
          content: "Không thể cập nhật ảnh đại diện",
          key,
          duration: 2,
        });
      }
    } catch (error) {
      console.error("Lỗi cập nhật ảnh đại diện:", error);
      message.error("Không thể cập nhật ảnh đại diện. Vui lòng thử lại sau.");
      // Revert to previous avatar if there was an error
      setConversation((prev) => ({
        ...prev,
        groupAvatarUrl: prev.groupAvatarUrl,
      }));
    }
  };

  // Xử lý bắt đầu sửa tên nhóm
  const handleStartEditName = () => {
    setIsEditingName(true);
  };

  // Xử lý hủy sửa tên nhóm
  const handleCancelEditName = () => {
    setIsEditingName(false);
    setGroupName(conversation.groupName || "");
  };

  // Xử lý lưu tên nhóm mới
  const handleSaveGroupName = async () => {
    const newName = groupName.trim();
    const currentName = conversation.groupName?.trim() || "";

    // Compare trimmed values to ensure exact comparison
    if (newName === currentName) {
      setIsEditingName(false);
      return;
    }

    if (newName.length < 3) {
      message.error("Tên nhóm phải có ít nhất 3 ký tự");
      return;
    }

    if (newName.length > 50) {
      message.error("Tên nhóm không được vượt quá 50 ký tự");
      return;
    }

    try {
      setUpdatingGroupName(true);
      const result = await updateGroupName(
        conversation.conversationId,
        newName
      );

      if (result && result.conversation) {
        // Cập nhật tên nhóm thành công, hiển thị thông báo thành công
        message.success("Đã cập nhật tên nhóm");
        setUpdatedName(newName);

        // Lấy thông tin user hiện tại
        const currentUserId = localStorage.getItem("userId") || "";
        // Tìm thông tin người dùng hiện tại từ danh sách thành viên
        const currentMember = memberDetails.find(member => member.userId === currentUserId);
        const currentUserName = currentMember?.fullname || "Một thành viên";

        // Emit sự kiện thay đổi tên nhóm với thông tin người thay đổi
        socketService.emit("groupNameChanged", {
          conversationId: conversation.conversationId,
          newName,
          changedBy: {
            userId: currentUserId,
            fullname: currentUserName
          }
        });

        // Update the global context
        updateConversationField(
          conversation.conversationId,
          "groupName",
          newName
        );

        // Call the refreshConversationData function if provided
        if (refreshConversationData) {
          refreshConversationData();
        }

        // Notify parent component
        if (onUpdateGroupName) {
          onUpdateGroupName(newName);
        }
      } else {
        message.error("Không thể cập nhật tên nhóm");
      }
    } catch (error) {
      console.error("Lỗi khi cập nhật tên nhóm:", error);
      message.error("Không thể cập nhật tên nhóm");
    } finally {
      setUpdatingGroupName(false);
      setIsEditingName(false);
    }
  };

  // Lắng nghe sự kiện thay đổi tên nhóm
  useEffect(() => {
    const handleGroupNameChanged = (data: {
      conversationId: string;
      newName: string;
      changedBy?: { userId: string; fullname: string };
    }) => {
      if (data.conversationId === conversation.conversationId) {
        setConversation((prev) => ({
          ...prev,
          groupName: data.newName,
        }));
        setGroupName(data.newName);
      }
    };

    socketService.onGroupNameChanged(handleGroupNameChanged);

    return () => {
      socketService.off("groupNameChanged", handleGroupNameChanged);
    };
  }, [conversation.conversationId]);

  // Lắng nghe sự kiện thay đổi ảnh nhóm
  useEffect(() => {
    const handleGroupAvatarChanged = (data: {
      conversationId: string;
      newAvatar: string;
      changedBy?: { userId: string; fullname: string };
    }) => {
      if (data.conversationId === conversation.conversationId) {
        // Chỉ cập nhật nếu URL mới khác với URL hiện tại
        if (data.newAvatar && data.newAvatar !== conversation.groupAvatarUrl) {
          // Cập nhật ảnh đại diện nhóm với timestamp để tránh cache
          const avatarUrl = `${data.newAvatar}?t=${Date.now()}`;
          setConversation((prev) => ({
            ...prev,
            groupAvatarUrl: avatarUrl,
          }));
        }
      }
    };

    socketService.onGroupAvatarChanged(handleGroupAvatarChanged);

    return () => {
      socketService.off("groupAvatarChanged", handleGroupAvatarChanged);
    };
  }, [conversation.conversationId, conversation.groupAvatarUrl]);

  return (
    <>
      <Modal
        visible={visible}
        onCancel={onClose}
        footer={null}
        closeIcon={<CloseOutlined />}
        title="Thông tin nhóm"
        centered
        className="group-info-modal"
        width={400}>
        <div className="flex flex-col">
          {/* Avatar và tên nhóm */}
          <div className="flex flex-col items-center py-4 border-b">
            <div className="relative mb-4">
              <GroupAvatar
                key={`group-avatar-${conversation.groupAvatarUrl || "default"}-${Date.now()}`}
                members={conversation.groupMembers || []}
                userAvatars={userAvatars}
                size={80}
                groupAvatarUrl={conversation.groupAvatarUrl || ""}
              />
              <div
                className="absolute bottom-0 right-0 w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center cursor-pointer hover:bg-gray-300"
                onClick={handleOpenUpdateAvatarModal}>
                <CameraOutlined style={{ color: "#666" }} />
              </div>
            </div>

            <div className="flex items-center mb-2">
              {isEditingName ? (
                <div className="flex items-center">
                  <Input
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    onPressEnter={handleSaveGroupName}
                    className="mr-2"
                    autoFocus
                    maxLength={50}
                  />
                  <Button
                    type="primary"
                    size="small"
                    icon={<CheckOutlined />}
                    onClick={handleSaveGroupName}
                    loading={updatingGroupName}
                  />
                  <Button
                    type="default"
                    size="small"
                    onClick={handleCancelEditName}
                    className="ml-1"
                    disabled={updatingGroupName}>
                    Hủy
                  </Button>
                </div>
              ) : (
                <>
                  <h3 className="text-lg font-semibold mr-2">
                    {conversation.groupName}
                  </h3>
                  <EditOutlined
                    className="text-gray-500 cursor-pointer hover:text-blue-500"
                    onClick={handleStartEditName}
                  />
                </>
              )}
            </div>

            <Button
              type="primary"
              className="mt-2 w-full"
              onClick={handleMessage}>
              Nhắn tin
            </Button>
          </div>

          {/* Danh sách thành viên */}
          <div className="py-4 border-b">
            <h4 className="text-base font-medium mb-3">
              Thành viên (
              {memberDetails.length || conversation.groupMembers?.length || 0})
            </h4>
            {fetchingMembers ? (
              <div className="flex justify-center py-4">
                <Spin size="small" />
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {memberDetails.slice(0, 5).map((member) => (
                  <Tooltip key={member.userId} title={member.fullname}>
                    <Avatar
                      src={member.urlavatar || userAvatars[member.userId]}
                      size={50}
                      style={{ cursor: "pointer" }}>
                      {!member.urlavatar && member.fullname?.charAt(0)}
                    </Avatar>
                  </Tooltip>
                ))}
                {memberDetails.length > 5 && (
                  <Avatar
                    className="bg-gray-200 flex items-center justify-center"
                    size={50}>
                    <span className="text-gray-500">...</span>
                  </Avatar>
                )}
              </div>
            )}
          </div>

          {/* Ảnh/Video */}
          <div className="py-4 border-b">
            <h4 className="text-base font-medium mb-3">Ảnh/Video</h4>
            <div className="text-center text-gray-500 py-4">
              Chưa có ảnh nào được chia sẻ trong nhóm này
            </div>
          </div>

          {/* Link tham gia nhóm */}
          <div className="py-4 border-b">
            <div className="flex items-center justify-between mb-2">
              <span className="text-base font-medium">Link tham gia nhóm</span>
            </div>
            <div className="flex items-center">
              <div className="flex-1 text-blue-500 text-sm truncate">
                {groupLink}
              </div>
              <div className="flex space-x-2">
                <Button
                  type="text"
                  shape="circle"
                  icon={<CopyOutlined />}
                  onClick={handleCopyLink}
                  className="flex items-center justify-center"
                />
                <Button
                  type="text"
                  shape="circle"
                  icon={<ShareAltOutlined />}
                  onClick={handleShareLink}
                  className="flex items-center justify-center"
                />
              </div>
            </div>
          </div>

          {/* Quản lý nhóm */}
          <div className="py-4 border-b">
            <div className="flex items-center cursor-pointer hover:bg-gray-50 py-2 -mx-2 px-2 rounded">
              <SettingOutlined className="text-gray-600 mr-3" />
              <span>Quản lý nhóm</span>
            </div>
          </div>

          {/* Rời nhóm */}
          <div className="py-4">
            <div
              className="flex items-center cursor-pointer hover:bg-gray-50 py-2 -mx-2 px-2 rounded text-red-500"
              onClick={handleLeaveGroup}>
              {loading ? "Đang xử lý..." : "Rời nhóm"}
            </div>
          </div>
        </div>
      </Modal>

      {/* Modal cập nhật ảnh đại diện nhóm */}
      <UpdateAvatarGroupModal
        isOpen={isUpdateAvatarModalOpen}
        onClose={() => setIsUpdateAvatarModalOpen(false)}
        currentAvatar={conversation.groupAvatarUrl || ""}
        conversationId={conversation.conversationId}
        onUpdate={handleUpdateAvatar}
      />
    </>
  );
};

export default GroupModal;
