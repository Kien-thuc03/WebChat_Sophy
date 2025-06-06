import React, { useState, useEffect, useMemo } from "react";
import { Button, Empty, Input, Modal, App } from "antd";
import { LeftOutlined, SearchOutlined } from "@ant-design/icons";
import { Avatar } from "../../common/Avatar";
import { User } from "../../../features/auth/types/authTypes";
import { Conversation } from "../../../features/chat/types/conversationTypes";
import { getUserById, getConversationDetail } from "../../../api/API";
import { useConversationContext } from "../../../features/chat/context/ConversationContext";
import socketService from "../../../services/socketService";
import { useLanguage } from "../../../features/auth/context/LanguageContext";

interface BlockedMembersListProps {
  conversation: Conversation;
  userCache: Record<string, User>;
  userAvatars: Record<string, string>;
  userRole: "owner" | "co-owner" | "member";
  onBack: () => void;
  blockMember: (
    conversationId: string,
    userId: string
  ) => Promise<Conversation | null>;
  unblockMember: (
    conversationId: string,
    userId: string
  ) => Promise<Conversation | null>;
  onConversationUpdate?: (updatedConversation: Conversation) => void;
}

interface BlockMemberModalProps {
  visible: boolean;
  onCancel: () => void;
  onBlock: (userId: string) => void;
  members: string[];
  userCache: Record<string, User>;
  localUserCache: Record<string, User>;
  userAvatars: Record<string, string>;
  blockedMembers: string[];
  userRole: "owner" | "co-owner" | "member";
  ownerId?: string;
  coOwnerIds?: string[];
}

// Modal component for blocking members
const BlockMemberModal: React.FC<BlockMemberModalProps> = ({
  visible,
  onCancel,
  onBlock,
  members,
  userCache,
  localUserCache,
  userAvatars,
  blockedMembers,
  userRole,
  ownerId,
  coOwnerIds = [],
}) => {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState("");

  // Filter members based on user role
  const eligibleMembers = useMemo(() => {
    // If owner, can block anyone except self
    if (userRole === "owner") {
      const userId = localStorage.getItem("userId") || "";
      return members.filter((memberId) => memberId !== userId);
    }

    // If co-owner, can only block regular members (not owner or other co-owners)
    if (userRole === "co-owner") {
      return members.filter(
        (memberId) => memberId !== ownerId && !coOwnerIds.includes(memberId)
      );
    }

    // Regular members can't block anyone
    return [];
  }, [members, userRole, ownerId, coOwnerIds]);

  // Filter members who are not already blocked and match search term
  const filteredMembers = eligibleMembers.filter(
    (memberId) =>
      !blockedMembers.includes(memberId) &&
      (userCache[memberId]?.fullname
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
        localUserCache[memberId]?.fullname
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        memberId.includes(searchTerm))
  );

  return (
    <Modal
      open={visible}
      title={t.add_to_block_list_title || "Thêm vào danh sách chặn"}
      onCancel={onCancel}
      footer={null}
      width={400}>
      <div className="p-2">
        <Input
          placeholder={t.search_members || "Tìm kiếm thành viên..."}
          prefix={<SearchOutlined />}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="mb-4"
        />

        <div className="max-h-80 overflow-y-auto">
          {filteredMembers.length === 0 ? (
            <Empty
              description={
                t.no_members_found || "Không tìm thấy thành viên nào"
              }
            />
          ) : (
            filteredMembers.map((memberId) => {
              const memberInfo =
                userCache[memberId] || localUserCache[memberId];
              return (
                <div
                  key={memberId}
                  className="flex items-center justify-between p-3 hover:bg-gray-100">
                  <div className="flex items-center">
                    <Avatar
                      name={memberInfo?.fullname || "User"}
                      avatarUrl={memberInfo?.urlavatar || userAvatars[memberId]}
                      size={40}
                      className="rounded-full mr-3"
                    />
                    <div className="font-medium">
                      {memberInfo?.fullname ||
                        `User-${memberId.substring(0, 6)}`}
                    </div>
                  </div>
                  <Button danger onClick={() => onBlock(memberId)}>
                    {t.block || "Chặn"}
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Modal>
  );
};

const BlockedMembersList: React.FC<BlockedMembersListProps> = ({
  conversation: initialConversation,
  userCache,
  userAvatars,
  userRole,
  onBack,
  blockMember,
  unblockMember,
  onConversationUpdate,
}) => {
  const { t, language } = useLanguage();

  // Local state
  const [conversation, setConversation] =
    useState<Conversation>(initialConversation);
  const [localUserCache, setLocalUserCache] = useState<Record<string, User>>(
    {}
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isBlockModalVisible, setIsBlockModalVisible] = useState(false);
  const { message, modal } = App.useApp();

  // Access the ConversationContext to update conversation data
  const { refreshConversations } = useConversationContext();

  // Get blocked members list
  const blockedMembers = conversation.blocked || [];
  const groupMembers = conversation.groupMembers || [];
  const formerMembers = conversation.formerMembers || [];

  // Get owner and co-owner IDs from conversation rules
  const ownerId = conversation.rules?.ownerId;
  const coOwnerIds = conversation.rules?.coOwnerIds || [];

  // Determine if user has permission to manage blocks
  const canManageBlocks = userRole === "owner" || userRole === "co-owner";

  // Handle blocking a member
  const handleBlockMember = async (userId: string) => {
    if (!conversation.conversationId) return;

    try {
      message.loading({
        content: t.blocking || "Đang thêm vào danh sách chặn...",
        key: "block-member",
      });

      const result = await blockMember(conversation.conversationId, userId);

      if (result) {
        message.success({
          content: t.member_blocked || "Đã chặn thành viên thành công",
          key: "block-member",
          duration: 2,
        });
        setConversation(result);
        setIsBlockModalVisible(false);

        // Call the callback to update parent component
        if (onConversationUpdate) {
          onConversationUpdate(result);
        }

        // Emit socket event với sự kiện userBlocked cụ thể thay vì force_refresh
        try {
          socketService.emit("userBlocked", {
            conversationId: result.conversationId,
            blockedUserId: userId,
            fromCurrentUser: true,
          });
        } catch (socketErr) {
          // Fallback sang refresh thông thường nếu socket fails
          refreshConversations();
        }
      } else {
        message.error({
          content: t.cannot_block || "Không thể chặn thành viên",
          key: "block-member",
          duration: 2,
        });
      }
    } catch (err: any) {
      console.error("Error blocking member:", err);

      if (err.response?.status === 403) {
        message.error(
          t.no_permission || "Bạn không có quyền chặn thành viên này"
        );
      } else {
        message.error(
          t.block_error || "Không thể chặn thành viên. Vui lòng thử lại sau."
        );
      }
    }
  };

  // Handle unblocking a member
  const handleUnblockMember = async (userId: string) => {
    if (!conversation.conversationId) return;

    modal.confirm({
      title: t.unblock_member_title || "Bỏ chặn thành viên",
      content:
        t.unblock_member_confirm ||
        "Bạn có chắc chắn muốn bỏ chặn thành viên này?",
      okText: t.unblock || "Bỏ chặn",
      cancelText: t.cancel || "Hủy",
      onOk: async () => {
        try {
          const key = "unblock-member";
          message.loading({
            content: t.unblocking || "Đang bỏ chặn thành viên...",
            key,
          });

          const result = await unblockMember(
            conversation.conversationId,
            userId
          );

          if (result) {
            message.success({
              content: t.member_unblocked || "Đã bỏ chặn thành viên thành công",
              key,
              duration: 2,
            });
            setConversation(result);

            // Call the callback to update parent component
            if (onConversationUpdate) {
              onConversationUpdate(result);
            }

            // Emit socket event với sự kiện userUnblocked cụ thể thay vì force_refresh
            try {
              socketService.emit("userUnblocked", {
                conversationId: result.conversationId,
                unblockedUserId: userId,
                fromCurrentUser: true,
              });
            } catch (socketErr) {
              // Fallback sang refresh thông thường nếu socket fails
              refreshConversations();
            }
          } else {
            message.error({
              content: t.cannot_unblock || "Không thể bỏ chặn thành viên",
              key,
              duration: 2,
            });
          }
        } catch (err: any) {
          console.error("Error unblocking member:", err);

          if (err.response?.status === 403) {
            message.error(
              t.no_permission || "Bạn không có quyền bỏ chặn thành viên này"
            );
          } else {
            message.error(
              t.unblock_error ||
                "Không thể bỏ chặn thành viên. Vui lòng thử lại sau."
            );
          }
        }
      },
    });
  };

  // Update conversation when the prop changes
  useEffect(() => {
    setConversation(initialConversation);
  }, [initialConversation]);

  // Thêm socket listeners cho events userBlocked và userUnblocked
  useEffect(() => {
    if (!conversation.conversationId) return;

    // Đăng ký một lần duy nhất cho mỗi loại sự kiện
    const handleUserBlocked = (data: {
      conversationId: string;
      blockedUserId: string;
      fromCurrentUser?: boolean;
    }) => {
      if (data.conversationId !== conversation.conversationId) return;

      // Nếu đây không phải là event từ chính người dùng này thì mới refresh
      if (!data.fromCurrentUser) {
        refreshConversationData();
      }
    };

    const handleUserUnblocked = (data: {
      conversationId: string;
      unblockedUserId: string;
      fromCurrentUser?: boolean;
    }) => {
      if (data.conversationId !== conversation.conversationId) return;

      // Nếu đây không phải là event từ chính người dùng này thì mới refresh
      if (!data.fromCurrentUser) {
        refreshConversationData();
      }
    };

    // Đăng ký một lần duy nhất
    const socket = socketService.socketInstance;
    if (socket) {
      socket.on("userBlocked", handleUserBlocked);
      socket.on("userUnblocked", handleUserUnblocked);
    }

    // Giảm tần suất polling xuống 30 giây thay vì 10 giây
    const pollInterval = setInterval(refreshConversationData, 30000);

    return () => {
      if (socket) {
        socket.off("userBlocked", handleUserBlocked);
        socket.off("userUnblocked", handleUserUnblocked);
      }
      clearInterval(pollInterval);
    };
  }, [conversation.conversationId]);

  // Hàm để refresh dữ liệu cuộc trò chuyện từ server
  const refreshConversationData = async () => {
    try {
      setIsRefreshing(true);
      if (!conversation.conversationId) return;

      const updatedConversation = await getConversationDetail(
        conversation.conversationId
      );
      if (updatedConversation) {
        setConversation(updatedConversation);

        // Cập nhật parent component nếu cần
        if (onConversationUpdate) {
          onConversationUpdate(updatedConversation);
        }
      }
    } catch (error) {
      message.error("Không thể cập nhật danh sách thành viên bị chặn");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Thêm useEffect để catch khi props thay đổi do cập nhật từ component cha
  useEffect(() => {
    if (
      JSON.stringify(initialConversation.blocked) !==
      JSON.stringify(conversation.blocked)
    ) {
      setConversation(initialConversation);
    }
  }, [initialConversation.blocked]);

  // Load user data for blocked members not in cache
  useEffect(() => {
    const loadMissingUsers = async () => {
      const allUserIds = [...blockedMembers, ...formerMembers];

      for (const userId of allUserIds) {
        if (!userCache[userId] && !localUserCache[userId]) {
          try {
            const userData = await getUserById(userId);
            if (userData) {
              setLocalUserCache((prev) => ({
                ...prev,
                [userId]: userData,
              }));
            }
          } catch (error) {
            console.error(`Failed to load data for user ${userId}:`, error);
          }
        }
      }
    };

    loadMissingUsers();
  }, [blockedMembers, formerMembers, userCache, localUserCache]);

  // Thêm useEffect để cập nhật UI khi ngôn ngữ thay đổi
  useEffect(() => {
    // Reload UI khi ngôn ngữ thay đổi
  }, [language]);

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
          {t.block_from_group_title || "Chặn khỏi nhóm"}
        </h2>
        {isRefreshing && (
          <div className="ml-2 text-xs text-gray-500">Đang cập nhật...</div>
        )}
      </div>

      <div className="p-4">
        <div className="bg-gray-50 p-3 rounded-lg mb-4">
          <p className="text-gray-600 text-sm">
            {t.block_explanation ||
              "Những người đã bị chặn không thể tham gia lại nhóm, trừ khi được trưởng, phó nhóm bỏ chặn hoặc thêm lại vào nhóm."}
          </p>
        </div>

        {canManageBlocks && (
          <Button
            block
            danger
            className="mb-6"
            onClick={() => setIsBlockModalVisible(true)}>
            {t.add_to_block_list || "Thêm vào danh sách chặn"}
          </Button>
        )}

        {blockedMembers.length > 0 ? (
          <div>
            <div className="font-medium mb-2">
              {t.blocked_members || "Thành viên bị chặn"} (
              {blockedMembers.length})
            </div>
            <div className="member-list">
              {blockedMembers.map((userId) => {
                const memberInfo = userCache[userId] || localUserCache[userId];

                return (
                  <div
                    key={userId}
                    className="flex items-center justify-between py-3 border-b border-gray-100">
                    <div className="flex items-center">
                      <Avatar
                        name={memberInfo?.fullname || "User"}
                        avatarUrl={memberInfo?.urlavatar}
                        size={48}
                        className="rounded-full mr-3"
                      />
                      <div className="font-medium">
                        {memberInfo?.fullname ||
                          `User-${userId.substring(0, 6)}`}
                      </div>
                    </div>

                    {canManageBlocks && (
                      <Button onClick={() => handleUnblockMember(userId)}>
                        {t.unblock || "Bỏ chặn"}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              t.no_blocked_members || "Không có thành viên nào bị chặn"
            }
          />
        )}
      </div>

      {/* Block Member Modal */}
      <BlockMemberModal
        visible={isBlockModalVisible}
        onCancel={() => setIsBlockModalVisible(false)}
        onBlock={handleBlockMember}
        members={groupMembers}
        userCache={userCache}
        localUserCache={localUserCache}
        userAvatars={userAvatars}
        blockedMembers={blockedMembers}
        userRole={userRole}
        ownerId={ownerId}
        coOwnerIds={coOwnerIds}
      />
    </div>
  );
};

export default BlockedMembersList;
