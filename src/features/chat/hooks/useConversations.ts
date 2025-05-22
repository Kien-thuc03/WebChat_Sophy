import { useEffect, useState, useCallback } from "react";
import { fetchConversations, getUserById } from "../../../api/API";
import { Conversation } from "../types/conversationTypes";
import { User } from "../../auth/types/authTypes";
import { Label } from "../types/chatTypes";

export type TabType = "all" | "unread" | "label";

export const useConversations = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [userCache, setUserCache] = useState<Record<string, User>>({});
  const [displayNames, setDisplayNames] = useState<Record<string, string>>({});
  const [userAvatars, setUserAvatars] = useState<Record<string, string>>({});
  const [isLabelMenuOpen, setIsLabelMenuOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [labels, setLabels] = useState<Label[]>([
    { id: "customer", name: "Khách hàng", color: "rgb(217, 27, 27)", selected: false },
    { id: "family", name: "Gia đình", color: "rgb(75, 195, 119)", selected: false },
    { id: "work", name: "Công việc", color: "rgb(255, 105, 5)", selected: false },
    { id: "friends", name: "Bạn bè", color: "rgb(111, 63, 207)", selected: false },
    { id: "reply_later", name: "Trả lời sau", color: "rgb(250, 192, 0)", selected: false },
    { id: "stranger", name: "Tin nhắn từ người lạ", color: "#666", selected: false },
  ]);

  /**
   * Định dạng tên nhóm chat dựa trên danh sách thành viên
   * @param {string[]} members - Mảng chứa ID của các thành viên trong nhóm
   * @returns {string} Tên nhóm được định dạng
   */
  const formatGroupName = (members: string[] = []) => {
    if (!members.length) return "Nhóm không có thành viên";
    const displayNames = members.slice(0, 3).join(", ");
    return members.length > 3 ? `${displayNames}...` : displayNames;
  };

  /**
   * Lấy tên hiển thị cho một cuộc trò chuyện
   * @param {Conversation} chat - Đối tượng cuộc trò chuyện
   * @returns {Promise<string>} Tên hiển thị của cuộc trò chuyện
   */
  const getDisplayName = async (chat: Conversation) => {
    if (chat.isGroup) {
      return chat.groupName || formatGroupName(chat.groupMembers);
    }
    if (chat.receiverId) {
      try {
        if (!userCache[chat.receiverId]) {
          const userData = await getUserById(chat.receiverId);
          setUserCache((prev) => ({
            ...prev,
            [chat.receiverId as string]: userData,
          }));
          return userData?.fullname || chat.receiverId;
        }
        return userCache[chat.receiverId]?.fullname || chat.receiverId;
      } catch (error) {
        console.error("Lỗi khi lấy thông tin người dùng:", error);
        return chat.receiverId;
      }
    }
    return "Private Chat";
  };

  useEffect(() => {
    const loadConversations = async () => {
      try {
        const data = await fetchConversations();
        setConversations(data);
      } catch (error) {
        console.error("Lỗi khi tải danh sách hội thoại:", error);
      }
    };

    loadConversations();
  }, []);

  useEffect(() => {
    const fetchUserInfo = async () => {
      for (const chat of conversations) {
        if (chat.isGroup && chat.groupMembers) {
          for (const memberId of chat.groupMembers) {
            if (!userCache[memberId]) {
              try {
                const userData = await getUserById(memberId);
                setUserCache((prev) => ({
                  ...prev,
                  [memberId]: userData,
                }));

                if (userData?.urlavatar) {
                  setUserAvatars((prev) => ({
                    ...prev,
                    [memberId]: userData.urlavatar,
                  }));
                }
              } catch (error) {
                console.warn(`Không thể tải thông tin thành viên ${memberId}`);
              }
            }
          }
        }
        const displayName = await getDisplayName(chat);
        setDisplayNames((prev) => ({
          ...prev,
          [chat.conversationId]: displayName,
        }));

        if (chat.lastMessage?.senderId && !userCache[chat.lastMessage.senderId]) {
          try {
            const userData = await getUserById(chat.lastMessage.senderId);
            setUserCache((prev) => ({
              ...prev,
              [chat.lastMessage?.senderId as string]: userData,
            }));
          } catch (error) {
            console.warn(
              `Không thể tải thông tin người gửi ${chat.lastMessage.senderId}`
            );
          }
        }
      }
    };

    fetchUserInfo();
  }, [conversations]);

  /**
   * Xử lý thay đổi tab (Tất cả, Chưa đọc, Phân loại)
   * @param {TabType} tab - Loại tab được chọn
   */
  const handleTabChange = useCallback((tab: TabType) => {
    setActiveTab(tab);
  }, []);

  /**
   * Xử lý khi người dùng chọn/bỏ chọn một nhãn
   * @param {string} labelId - ID của nhãn được chọn
   */
  const handleLabelSelect = useCallback((labelId: string) => {
    setLabels(prevLabels => 
      prevLabels.map(label => 
        label.id === labelId ? { ...label, selected: !label.selected } : label
      )
    );
  }, []);

  /**
   * Xử lý đánh dấu tất cả tin nhắn là đã đọc
   */
  const handleMarkAsRead = useCallback(() => {
    // TODO: Implement mark as read functionality
    console.log("Đánh dấu đã đọc");
  }, []);

  /**
   * Xử lý quản lý các nhãn phân loại
   */
  const handleManageLabels = useCallback(() => {
    // TODO: Implement manage labels functionality
    console.log("Quản lý thẻ phân loại");
  }, []);

  /**
   * Lọc danh sách hội thoại dựa trên tab đang được chọn
   * @returns {Conversation[]} Danh sách hội thoại đã được lọc
   */
  const filteredConversations = useCallback(() => {
    switch (activeTab) {
      case "unread":
        return conversations.filter(conv => conv.unreadCount.length > 0);
      case "label":
        const selectedLabels = labels.filter(label => label.selected).map(label => label.id);
        // TODO: Implement label filtering when BE adds label support
        return conversations;
      default:
        return conversations;
    }
  }, [activeTab, conversations, labels]);

  /**
   * Bật/tắt menu phân loại nhãn
   */
  const toggleLabelMenu = useCallback(() => {
    setIsLabelMenuOpen(!isLabelMenuOpen);
    if (isMoreMenuOpen) setIsMoreMenuOpen(false);
  }, [isLabelMenuOpen, isMoreMenuOpen]);

  /**
   * Bật/tắt menu tùy chọn thêm
   */
  const toggleMoreMenu = useCallback(() => {
    setIsMoreMenuOpen(!isMoreMenuOpen);
    if (isLabelMenuOpen) setIsLabelMenuOpen(false);
  }, [isLabelMenuOpen, isMoreMenuOpen]);

  /**
   * Xử lý sự kiện click bên ngoài các menu dropdown
   * @param {MouseEvent} event - Sự kiện click chuột
   * @param {React.RefObject<HTMLDivElement>} labelMenuRef - Tham chiếu đến menu nhãn
   * @param {React.RefObject<HTMLDivElement>} labelButtonRef - Tham chiếu đến nút nhãn
   * @param {React.RefObject<HTMLDivElement>} moreMenuRef - Tham chiếu đến menu tùy chọn
   * @param {React.RefObject<HTMLDivElement>} moreButtonRef - Tham chiếu đến nút tùy chọn
   */
  const handleClickOutside = useCallback((event: MouseEvent, labelMenuRef: React.RefObject<HTMLDivElement>, labelButtonRef: React.RefObject<HTMLDivElement>, moreMenuRef: React.RefObject<HTMLDivElement>, moreButtonRef: React.RefObject<HTMLDivElement>) => {
    if (
      labelMenuRef.current &&
      !labelMenuRef.current.contains(event.target as Node) &&
      labelButtonRef.current &&
      !labelButtonRef.current.contains(event.target as Node) &&
      isLabelMenuOpen
    ) {
      setIsLabelMenuOpen(false);
    }

    if (
      moreMenuRef.current &&
      !moreMenuRef.current.contains(event.target as Node) &&
      moreButtonRef.current &&
      !moreButtonRef.current.contains(event.target as Node) &&
      isMoreMenuOpen
    ) {
      setIsMoreMenuOpen(false);
    }
  }, [isLabelMenuOpen, isMoreMenuOpen]);

  return {
    conversations: filteredConversations(),
    activeTab,
    labels,
    userCache,
    displayNames,
    userAvatars,
    isLabelMenuOpen,
    isMoreMenuOpen,
    handleTabChange,
    handleLabelSelect,
    handleMarkAsRead,
    handleManageLabels,
    getDisplayName,
    toggleLabelMenu,
    toggleMoreMenu,
    handleClickOutside
  };
};
