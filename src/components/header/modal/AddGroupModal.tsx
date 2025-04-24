// AddGroupModal.tsx
import React, { useState, useEffect, useCallback } from "react";
import { FaSearch } from "react-icons/fa";
import { Conversation } from "../../../features/chat/types/conversationTypes";
import {
  fetchFriends,
  searchUsers,
  createGroupConversation,
} from "../../../api/API";
import { useConversationContext } from "../../../features/chat/context/ConversationContext";

interface Friend {
  userId: string;
  fullname: string;
  urlavatar?: string;
}

interface User {
  userId: string;
  fullname: string;
  urlavatar?: string;
  phone?: string;
}

interface AddGroupModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectConversation?: (conversation: Conversation) => void;
}

const AddGroupModal: React.FC<AddGroupModalProps> = ({
  visible,
  onClose,
  onSelectConversation,
}) => {
  const { addNewConversation } = useConversationContext();
  const [groupName, setGroupName] = useState("");
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadFriends = async () => {
      if (!visible) return;

      setIsLoading(true);
      try {
        const friendsList = await fetchFriends();
        setFriends(friendsList);
      } catch (error) {
        console.error("Lỗi khi lấy danh sách bạn bè:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadFriends();
  }, [visible]);

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
              setSearchResults(results);
            } catch (error) {
              console.error("Lỗi khi tìm kiếm:", error);
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
    []
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    debouncedSearch(value);
  };

  const handleCreateGroup = async () => {
    try {
      setError(null);

      if (!groupName || selectedContacts.length === 0) {
        setError("Vui lòng nhập tên nhóm và chọn ít nhất một thành viên");
        return;
      }

      const currentUserId = localStorage.getItem("userId");
      const allMembers = [...selectedContacts];
      if (currentUserId && !allMembers.includes(currentUserId)) {
        allMembers.push(currentUserId);
      }

      // Tạo group conversation không có avatar
      const newConversation = await createGroupConversation(
        groupName,
        allMembers
      );

      console.log("Phản hồi từ createGroupConversation:", newConversation);

      // Format đối tượng conversation
      const formattedConversation: Conversation = {
        ...newConversation,
        isGroup: true,
        groupName: groupName,
        groupMembers: allMembers,
        groupAvatarUrl: newConversation.groupAvatarUrl,
        createdAt: newConversation.createdAt || new Date().toISOString(),
        lastChange: newConversation.lastChange || new Date().toISOString(),
        unreadCount: newConversation.unreadCount || [],
        hasUnread: false,
        blocked: newConversation.blocked || [],
        isDeleted: false,
        deletedAt: null,
        formerMembers: [],
        listImage: [],
        listFile: [],
        pinnedMessages: [],
        muteNotifications: [],
      };

      // Thêm conversation vào context
      addNewConversation({ conversation: formattedConversation });

      // Gọi onSelectConversation với conversation đã format
      if (onSelectConversation) {
        onSelectConversation(formattedConversation);
      }

      // Reset state và đóng modal
      setGroupName("");
      setSelectedContacts([]);
      onClose();
    } catch (error: unknown) {
      console.error("Lỗi khi tạo nhóm:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Không thể tạo nhóm. Vui lòng thử lại."
      );
    }
  };

  const toggleContactSelection = (userId: string) => {
    setSelectedContacts((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const combinedUsers = searchQuery
    ? searchResults.filter((user) =>
        friends.some((friend) => friend.userId === user.userId)
      )
    : friends;

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
    {} as Record<string, User[]>
  );

  const letters = Object.keys(groupedUsers).sort();

  const selectedUsers = friends.filter((friend) =>
    selectedContacts.includes(friend.userId)
  );

  if (!visible) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-gray-900/50 z-[1000]"
        onClick={onClose}
      />
      <div className="fixed inset-0 flex items-center justify-center z-[1001]">
        <div className="bg-white rounded-lg w-11/12 max-w-lg max-h-[80vh] p-4 overflow-y-auto">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-semibold text-gray-900">Tạo nhóm</h2>
            <button onClick={onClose} className="text-gray-500">
              ✕
            </button>
          </div>
          <div className="relative flex items-center border border-gray-200 rounded-md px-2 py-1.5 mb-2">
            <input
              type="text"
              placeholder="Nhập tên nhóm..."
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full focus:outline-none text-gray-900 placeholder-gray-400"
            />
          </div>
          {error && <div className="mb-2 text-red-500 text-sm">{error}</div>}
          <div className="relative flex items-center border border-gray-200 rounded-md px-2 py-1.5 mb-2">
            <FaSearch className="absolute left-2 text-gray-400 text-sm" />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Nhập tên, số điện thoại, hoặc danh sách số điện thoại"
              className="pl-8 w-full focus:outline-none text-gray-900 placeholder-gray-400 text-sm"
            />
          </div>
          <div className="flex space-x-1 mb-2 overflow-x-auto">
            {[
              "Tất cả",
              "Khách hàng",
              "Gia đình",
              "Công việc",
              "Bạn bè",
              "Trả lời sau",
            ].map((tab) => (
              <button
                key={tab}
                className={`px-2 py-0.5 rounded-full text-sm ${
                  activeFilter === tab.toLowerCase()
                    ? "bg-blue-500 text-white"
                    : "bg-gray-100 text-gray-700"
                }`}
                onClick={() => setActiveFilter(tab.toLowerCase())}>
                {tab}
              </button>
            ))}
          </div>
          {selectedUsers.length > 0 && (
            <div className="mb-2">
              <span className="text-sm text-gray-500">
                Đã chọn: {selectedUsers.length}/100
              </span>
              <div className="mt-1">
                {selectedUsers.map((user) => (
                  <div
                    key={user.userId}
                    className="flex items-center justify-between py-1">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                        {user.urlavatar ? (
                          <img
                            src={user.urlavatar}
                            alt={user.fullname}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-500">
                            {user.fullname.charAt(0)}
                          </div>
                        )}
                      </div>
                      <span className="text-gray-900 text-sm">
                        {user.fullname}
                      </span>
                    </div>
                    <button
                      onClick={() => toggleContactSelection(user.userId)}
                      className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="mb-2">
            <h3 className="text-xs font-medium text-gray-500 mb-1">
              {searchQuery ? "Kết quả tìm kiếm" : "Danh bạ"}
            </h3>
            <div className="max-h-64 overflow-y-auto">
              {isLoading || isSearching ? (
                <div className="text-center py-4 text-gray-500">
                  Đang tải...
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
                            checked={selectedContacts.includes(user.userId)}
                            onChange={() => toggleContactSelection(user.userId)}
                            className="h-4 w-4"
                          />
                          <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                            {user.urlavatar ? (
                              <img
                                src={user.urlavatar}
                                alt={user.fullname}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                {user.fullname.charAt(0)}
                              </div>
                            )}
                          </div>
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
                    ? "Không tìm thấy kết quả phù hợp"
                    : "Bạn chưa có bạn bè nào"}
                </div>
              )}
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <button
              onClick={onClose}
              className="px-3 py-1 rounded-md bg-gray-200 text-gray-700 text-sm">
              Hủy
            </button>
            <button
              onClick={handleCreateGroup}
              className={`px-3 py-1 rounded-md bg-blue-500 text-white text-sm ${
                !groupName || selectedContacts.length === 0
                  ? "opacity-50 cursor-not-allowed"
                  : ""
              }`}
              disabled={!groupName || selectedContacts.length === 0}>
              Tạo nhóm
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default AddGroupModal;
