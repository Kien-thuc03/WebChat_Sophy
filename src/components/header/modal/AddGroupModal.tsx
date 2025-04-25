import React, { useState, useEffect } from "react";
import { FaSearch } from "react-icons/fa";
import { Conversation } from "../../../features/chat/types/conversationTypes";
import { fetchFriends, createGroupConversation } from "../../../api/API";
import { useConversationContext } from "../../../features/chat/context/ConversationContext";

interface Friend {
  userId: string;
  fullname: string;
  urlavatar?: string;
  phone?: string;
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
  preSelectedMembers?: string[];
}

const AddGroupModal: React.FC<AddGroupModalProps> = ({
  visible,
  onClose,
  onSelectConversation,
  preSelectedMembers = [],
}) => {
  const { addNewConversation } = useConversationContext();
  const [groupName, setGroupName] = useState("");
  const [selectedContacts, setSelectedContacts] =
    useState<string[]>(preSelectedMembers);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadFriends = async () => {
      if (!visible) return;

      setIsLoading(true);
      setError(null);

      try {
        const friendsData = await fetchFriends();
        console.log("Raw friends data:", friendsData);

        const formattedFriends = friendsData.map((friend) => ({
          userId: friend.userId,
          fullname: friend.fullname,
          urlavatar: friend.urlavatar,
          phone: friend.phone,
        }));

        console.log("Formatted friends:", formattedFriends);
        setFriends(formattedFriends);
        setIsLoading(false);
      } catch (error) {
        console.error("Lỗi khi lấy danh sách bạn bè:", error);
        setError("Không thể tải danh sách bạn bè. Vui lòng thử lại sau.");
        setIsLoading(false);
      }
    };

    loadFriends();
  }, [visible]);

  useEffect(() => {
    console.log("Friends state changed:", friends);
  }, [friends]);

  useEffect(() => {
    console.log("Current state:", {
      isLoading,
      friendsCount: friends.length,
      searchQuery,
      searchResults,
      combinedUsers: searchQuery ? searchResults : friends,
    });
  }, [isLoading, friends, searchQuery, searchResults]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);

    if (value.trim() === "") {
      setSearchResults([]);
    } else {
      const filtered = friends.filter((friend) =>
        friend.fullname.toLowerCase().includes(value.toLowerCase())
      );
      setSearchResults(filtered);
    }
  };

  const handleCreateGroup = async () => {
    try {
      setError(null);

      if (selectedContacts.length === 0) {
        setError("Vui lòng chọn ít nhất một thành viên");
        return;
      }

      const currentUserId = localStorage.getItem("userId");
      const allMembers = [...selectedContacts];
      if (currentUserId && !allMembers.includes(currentUserId)) {
        allMembers.push(currentUserId);
      }

      let finalGroupName = groupName.trim();
      if (!finalGroupName) {
        const currentUserName =
          friends.find((f) => f.userId === currentUserId)?.fullname || "";
        const otherMemberNames: string[] = [];

        selectedContacts
          .filter((user) => user !== currentUserId)
          .slice(0, 2)
          .forEach((user) => {
            const userName =
              friends.find((f) => f.userId === user)?.fullname || "";
            otherMemberNames.push(userName);
          });

        const memberNames = [currentUserName, ...otherMemberNames].filter(
          Boolean
        );
        finalGroupName = memberNames.join(", ");

        if (selectedContacts.length > memberNames.length) {
          finalGroupName += "...";
        }
      }

      const newConversation = await createGroupConversation(
        finalGroupName,
        allMembers
      );

      console.log("Phản hồi từ createGroupConversation:", newConversation);

      const formattedConversation: Conversation = {
        ...newConversation,
        isGroup: true,
        groupName: finalGroupName,
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

      addNewConversation({ conversation: formattedConversation });

      if (onSelectConversation) {
        onSelectConversation(formattedConversation);
      }

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

  const combinedUsers = searchQuery ? searchResults : friends;

  console.log("Combined users:", combinedUsers);

  const sortedUsers = [...combinedUsers].sort((a, b) =>
    a.fullname.localeCompare(b.fullname)
  );

  console.log("Sorted users:", sortedUsers);

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

  console.log("Grouped users:", groupedUsers);

  const letters = Object.keys(groupedUsers).sort();

  console.log("Letters:", letters);

  const selectedUsers = friends.filter((friend) =>
    selectedContacts.includes(friend.userId)
  );

  if (!visible) {
    console.log("Modal is not visible, returning null");
    return null;
  }

  console.log("Rendering modal with:", {
    isLoading,
    hasError: !!error,
    friendsCount: friends.length,
    sortedUsersCount: sortedUsers.length,
    letters,
  });

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
              {isLoading ? (
                <div className="text-center py-4 text-gray-500">
                  Đang tải...
                </div>
              ) : error ? (
                <div className="text-center py-4 text-red-500">{error}</div>
              ) : friends.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  Bạn chưa có bạn bè nào
                </div>
              ) : sortedUsers.length === 0 && searchQuery ? (
                <div className="text-center py-4 text-gray-500">
                  Không tìm thấy kết quả phù hợp
                </div>
              ) : (
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
                selectedContacts.length === 0
                  ? "opacity-50 cursor-not-allowed"
                  : ""
              }`}
              disabled={selectedContacts.length === 0}>
              Tạo nhóm
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default AddGroupModal;
