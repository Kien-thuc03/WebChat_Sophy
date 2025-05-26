import React, { useState, useEffect, useCallback } from "react";
import { Modal, Button, Input, message } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import {
  searchUsers,
  addMemberToGroup,
  fetchFriends,
  getConversationDetail,
} from "../../../api/API";
import { Avatar } from "../../common/Avatar";
import { useConversationContext } from "../../../features/chat/context/ConversationContext";
import socketService from "../../../services/socketService";
import { useLanguage } from "../../../features/auth/context/LanguageContext";

// Use a type that contains only the properties we need
interface UserDisplay {
  userId: string;
  fullname: string;
  urlavatar?: string;
  phone?: string;
}

interface AddMemberModalProps {
  visible: boolean;
  onClose: () => void;
  conversationId: string;
  groupMembers: string[];
  refreshConversationData?: () => void; // Optional callback to refresh conversation data
}

const AddMemberModal: React.FC<AddMemberModalProps> = ({
  visible,
  onClose,
  conversationId,
  groupMembers,
  refreshConversationData,
}) => {
  const { t, language } = useLanguage(); // Use language context
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserDisplay[]>([]);
  const [friends, setFriends] = useState<UserDisplay[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [activeFilter, setActiveFilter] = useState(
    t.all_category ? t.all_category.toLowerCase() : "tất cả"
  );
  const { updateConversationField } = useConversationContext();

  // Update activeFilter when language changes
  useEffect(() => {
    setActiveFilter(t.all_category ? t.all_category.toLowerCase() : "tất cả");
  }, [language, t.all_category]);

  // Load friends chỉ khi modal mở/đóng
  useEffect(() => {
    const loadFriends = async () => {
      if (!visible) return;

      setIsLoading(true);
      try {
        const friendsList = await fetchFriends();
        const filteredFriends = friendsList
          .filter((friend) => !groupMembers.includes(friend.userId))
          .map((friend) => ({
            userId: friend.userId,
            fullname: friend.fullname,
            urlavatar: friend.urlavatar,
            phone: friend.phone,
          }));
        setFriends(filteredFriends);
      } catch (error) {
        console.error("Lỗi khi lấy danh sách bạn bè:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadFriends();
  }, [visible]); // Chỉ phụ thuộc vào visible

  // Socket listener riêng
  useEffect(() => {
    const handleUserAddedToGroup = (data: {
      conversationId: string;
      addedUser: { userId: string; fullname: string };
      addedByUser: { userId: string; fullname: string };
    }) => {
      if (data.conversationId === conversationId) {
        // Join conversation for the new member
        socketService.joinConversation(conversationId);
        if (refreshConversationData) {
          refreshConversationData();
        }
      }
    };

    socketService.onUserAddedToGroup(handleUserAddedToGroup);

    return () => {
      socketService.off("userAddedToGroup", handleUserAddedToGroup);
    };
  }, [conversationId, refreshConversationData]);

  // Refresh conversation data after successful member addition
  const refreshConversation = async () => {
    try {
      const updatedConversation = await getConversationDetail(conversationId);
      if (updatedConversation) {
        // Update groupMembers in the conversation context
        updateConversationField(
          conversationId,
          "groupMembers",
          updatedConversation.groupMembers
        );

        // Also call the optional callback if provided
        if (refreshConversationData) {
          refreshConversationData();
        }
      }
    } catch (error) {
      console.error("Error refreshing conversation data:", error);
    }
  };

  // Debounced search for users
  const debouncedSearch = useCallback(
    (() => {
      let timeout: NodeJS.Timeout | null = null;
      return (query: string) => {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(async () => {
          if (query.trim() !== "") {
            setIsSearching(true);
            try {
              const results = await searchUsers(query);
              // Filter out users who are already members
              const filteredResults = results
                .filter((user) => !groupMembers.includes(user.userId))
                .map((user) => ({
                  userId: user.userId,
                  fullname: user.fullname,
                  urlavatar: user.urlavatar,
                  phone: user.phone,
                }));
              setSearchResults(filteredResults);
            } catch (error) {
              console.error("Error searching users:", error);
              setSearchResults([]);
            } finally {
              setIsSearching(false);
            }
          } else {
            setSearchResults([]);
          }
        }, 500);
      };
    })(),
    [groupMembers]
  );

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    debouncedSearch(value);
  };

  // Toggle user selection
  const toggleUserSelection = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  // Handle adding members to the group
  const handleAddMembers = async () => {
    if (selectedUsers.length === 0) {
      message.warning(
        t.select_at_least_one || "Vui lòng chọn ít nhất một người dùng"
      );
      return;
    }

    setIsAddingMember(true);
    const errors: string[] = [];
    const successes: string[] = [];

    try {
      // Thêm tất cả thành viên cùng lúc và chỉ phát một thông báo
      for (const userId of selectedUsers) {
        try {
          await addMemberToGroup(conversationId, userId);
          successes.push(userId);
        } catch (error) {
          console.error(`Error adding member ${userId}:`, error);
          if (error instanceof Error) {
            errors.push(
              `${
                searchResults.find((u) => u.userId === userId)?.fullname ||
                friends.find((f) => f.userId === userId)?.fullname ||
                "Người dùng"
              }: ${error.message}`
            );
          } else {
            errors.push(
              `${t.cannot_add_member || "Không thể thêm"} ${
                searchResults.find((u) => u.userId === userId)?.fullname ||
                friends.find((f) => f.userId === userId)?.fullname ||
                "người dùng"
              }`
            );
          }
        }
      }

      if (successes.length > 0) {
        // Chỉ emit một sự kiện socket duy nhất cho tất cả thành viên đã thêm
        const currentUser = {
          userId: localStorage.getItem("userId") || "",
          fullname: localStorage.getItem("fullname") || "Người dùng",
        };

        // Nếu có nhiều thành viên được thêm, chỉ gửi một thông báo tổng hợp
        if (successes.length > 1) {
          // Gửi một thông báo hệ thống rằng nhiều người đã được thêm vào
          socketService.emit("newMessage", {
            conversationId: conversationId,
            message: {
              type: "system",
              content: `${currentUser.fullname} đã thêm ${successes.length} thành viên vào nhóm`,
              senderId: currentUser.userId,
              createdAt: new Date().toISOString(),
            },
          });
        } else if (successes.length === 1) {
          // Nếu chỉ thêm một người, gửi thông báo chi tiết
          const addedUser = searchResults.find(
            (u) => u.userId === successes[0]
          ) ||
            friends.find((f) => f.userId === successes[0]) || {
              userId: successes[0],
              fullname: "Người dùng mới",
            };

          socketService.emitUserAddedToGroup({
            conversationId,
            addedUser: {
              userId: addedUser.userId,
              fullname: addedUser.fullname,
            },
            addedByUser: {
              userId: currentUser.userId,
              fullname: currentUser.fullname,
            },
          });
        }

        // Join conversation for new members và refresh dữ liệu
        for (const userId of successes) {
          console.log("userId", userId);
          socketService.joinConversation(conversationId);
        }

        // Refresh conversation data một lần duy nhất
        await refreshConversation();
      }
    } catch (error) {
      console.error("Error in batch adding members:", error);
    } finally {
      setIsAddingMember(false);
    }

    if (successes.length > 0) {
      handleClose();
    }

    if (errors.length > 0) {
      message.error(errors.join("\n"));
    }
  };

  // Handle modal close and reset state
  const handleClose = () => {
    setSearchQuery("");
    setSearchResults([]);
    setSelectedUsers([]);
    setFriends([]);
    onClose();
  };

  // Combine users: show search results if searching, otherwise show friends
  const combinedUsers = searchQuery ? searchResults : friends;

  // Sort and group users by first letter of fullname
  const sortedUsers = [...combinedUsers].sort((a, b) =>
    a.fullname.localeCompare(b.fullname)
  );

  const groupedUsers = sortedUsers.reduce(
    (groups, user) => {
      const firstLetter = user.fullname.charAt(0).toUpperCase();
      if (!groups[firstLetter]) {
        groups[firstLetter] = [];
      }
      groups[firstLetter].push(user);
      return groups;
    },
    {} as Record<string, UserDisplay[]>
  );

  const letters = Object.keys(groupedUsers).sort();

  // Selected users for display
  const selectedUsersList = combinedUsers.filter((user) =>
    selectedUsers.includes(user.userId)
  );

  return (
    <Modal
      title={t.add_member || "Thêm thành viên"}
      open={visible}
      onCancel={handleClose}
      footer={[
        <Button key="cancel" onClick={handleClose}>
          {t.cancel || "Hủy"}
        </Button>,
        <Button
          key="add"
          type="primary"
          onClick={handleAddMembers}
          loading={isAddingMember}
          disabled={selectedUsers.length === 0}>
          {t.confirm || "Xác nhận"}
        </Button>,
      ]}
      width={500}>
      <div className="mb-4 relative">
        <Input
          prefix={<SearchOutlined className="text-gray-400" />}
          placeholder={
            t.enter_name_phone ||
            "Nhập tên, số điện thoại, hoặc danh sách số điện thoại"
          }
          value={searchQuery}
          onChange={handleSearchChange}
          className="w-full py-2"
        />
      </div>

      <div className="flex mb-4 overflow-x-auto">
        <div className="flex flex-wrap gap-1">
          {[
            { key: "all_category", default: "Tất cả" },
            { key: "customers_category", default: "Khách hàng" },
            { key: "family_category", default: "Gia đình" },
            { key: "work_category", default: "Công việc" },
            { key: "friends_category", default: "Bạn bè" },
            { key: "reply_later_category", default: "Trả lời sau" },
          ].map(({ key, default: defaultText }) => (
            <button
              key={key}
              className={`px-4 py-1 rounded-full text-sm ${
                activeFilter.toLowerCase() ===
                (t[key] ? t[key].toLowerCase() : defaultText.toLowerCase())
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 text-gray-700"
              }`}
              onClick={() =>
                setActiveFilter(
                  t[key] ? t[key].toLowerCase() : defaultText.toLowerCase()
                )
              }>
              {t[key] || defaultText}
            </button>
          ))}
        </div>
      </div>

      {selectedUsersList.length > 0 && (
        <div className="mb-4">
          <span className="text-sm text-gray-500">
            {t.selected_members || "Đã chọn"}: {selectedUsersList.length}/100
          </span>
          <div className="mt-1">
            {selectedUsersList.map((user) => (
              <div
                key={user.userId}
                className="flex items-center justify-between py-1">
                <div className="flex items-center space-x-2">
                  <Avatar
                    name={user.fullname}
                    avatarUrl={user.urlavatar}
                    size={32}
                    className="flex-shrink-0"
                  />
                  <span className="text-gray-900 text-sm">{user.fullname}</span>
                </div>
                <button
                  onClick={() => toggleUserSelection(user.userId)}
                  className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mb-4">
        <h3 className="text-sm font-medium mb-2">
          {searchQuery
            ? t.search_results_label || "Kết quả tìm kiếm"
            : t.contacts_label || "Danh bạ"}
        </h3>
        <div className="max-h-60 overflow-y-auto">
          {isLoading || isSearching ? (
            <div className="text-center py-4 text-gray-500">
              {t.loading_contacts || "Đang tải..."}
            </div>
          ) : sortedUsers.length > 0 ? (
            <div>
              {letters.map((letter) => (
                <div key={letter} className="mb-2">
                  <div className="text-xs font-semibold text-gray-500 py-1 sticky top-0 bg-white">
                    {letter}
                  </div>
                  {groupedUsers[letter].map((user) => (
                    <div
                      key={user.userId}
                      className="flex items-center space-x-2 py-1 pl-2">
                      <input
                        title={user.fullname}
                        type="checkbox"
                        checked={selectedUsers.includes(user.userId)}
                        onChange={() => toggleUserSelection(user.userId)}
                        className="h-4 w-4"
                      />
                      <Avatar
                        name={user.fullname}
                        avatarUrl={user.urlavatar}
                        size={40}
                        className="flex-shrink-0"
                      />
                      <div className="flex flex-col">
                        <span className="text-gray-900 text-sm">
                          {user.fullname}
                        </span>
                        {user.phone && (
                          <span className="text-gray-500 text-xs">
                            {user.phone}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500">
              {searchQuery
                ? t.no_search_results_found || "Không tìm thấy kết quả phù hợp"
                : t.no_friends_yet || "Bạn chưa có bạn bè nào"}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default AddMemberModal;
