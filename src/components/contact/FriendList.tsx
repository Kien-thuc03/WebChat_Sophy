import React, { useState, useEffect } from "react";
import { List, Input, Dropdown, Button } from "antd";
import { MoreOutlined, SearchOutlined } from "@ant-design/icons";
import { Avatar } from "../common/Avatar";
import { useLanguage } from "../../features/auth/context/LanguageContext";
import ErrorBoundary from "../common/ErrorBoundary";
import { fetchFriends, createConversation, getUserById } from "../../api/API"; // Add getUserById
import { Conversation } from "../../features/chat/types/conversationTypes";
import { User } from "../../features/auth/types/authTypes"; // Import User type

interface FriendApiResponse {
  id?: string;
  userId?: string;
  _id?: string;
  name?: string;
  fullname?: string;
  username?: string;
  avatarUrl?: string;
  urlavatar?: string;
  avatar?: string;
  status?: "online" | "offline" | "away";
  lastSeen?: string;
  lastActive?: string;
}

interface Friend {
  id: string;
  name: string;
  avatarUrl?: string;
  status?: "online" | "offline" | "away";
  lastSeen?: string;
  activityStatus?: string; // Add activity status field
  isOnline?: boolean; // Add online status indicator
}

interface FriendListProps {
  onSelectFriend?: (friendId: string) => void;
  onSelectConversation?: (conversation: Conversation) => void; // New prop for conversation selection
}

const FriendList: React.FC<FriendListProps> = ({ onSelectFriend, onSelectConversation }) => {
  const { t } = useLanguage();
  const [searchText, setSearchText] = useState("");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortOrder, setSortOrder] = useState<"A-Z" | "All">("A-Z");
  const [error, setError] = useState<string | null>(null);
  const [userCache, setUserCache] = useState<Record<string, User>>({});

  // Fetch friends from API
  useEffect(() => {
    const getFriends = async () => {
      try {
        setLoading(true);
        const friendsData = (await fetchFriends()) as FriendApiResponse[];
        console.log("Raw friends data:", friendsData);

        const formattedFriends: Friend[] = friendsData.map(
          (friend: FriendApiResponse) => ({
            id: friend.userId || friend._id || "",
            name: friend.fullname || friend.username || "Unknown",
            avatarUrl: friend.avatarUrl || friend.urlavatar,
            status: friend.status || "offline",
            lastSeen: friend.lastActive,
            activityStatus: "Đang ngoại tuyến", // Default status
            isOnline: false, // Default to offline
          })
        );

        console.log("Formatted friends:", formattedFriends);
        setFriends(formattedFriends);
        setError(null);
        
        // Fetch detailed user data for each friend
        formattedFriends.forEach(friend => {
          fetchUserDetails(friend.id);
        });
        
      } catch (err) {
        console.error("Error fetching friends:", err);
        setError(
          err instanceof Error ? err.message : "Không thể tải danh sách bạn bè"
        );
      } finally {
        setLoading(false);
      }
    };

    getFriends();
  }, []);
  
  // Function to fetch user details and update activity status
  const fetchUserDetails = async (userId: string) => {
    try {
      // Skip if we already have this user in cache
      if (userCache[userId]) return;
      
      const userData = await getUserById(userId);
      if (userData) {
        // Update user cache
        setUserCache(prev => ({
          ...prev,
          [userId]: userData
        }));
        
        // Update friend's activity status
        updateFriendActivityStatus(userId, userData);
      }
    } catch (error) {
      console.error(`Failed to load data for user ${userId}:`, error);
    }
  };
  
  // Function to check and update activity status for a friend
  const updateFriendActivityStatus = (userId: string, userData: User) => {
    const lastActive = userData.lastActive;
    if (!lastActive) {
      updateFriendStatus(userId, "Đang ngoại tuyến", false);
      return;
    }
    
    const lastActiveTime = new Date(lastActive).getTime();
    const currentTime = new Date().getTime();
    const minutesDiff = Math.floor((currentTime - lastActiveTime) / (1000 * 60));
    
    if (minutesDiff < 5) {
      updateFriendStatus(userId, "Vừa mới truy cập", true);
    } else if (minutesDiff < 60) {
      updateFriendStatus(userId, `Hoạt động ${minutesDiff} phút trước`, false);
    } else if (minutesDiff < 24 * 60) {
      const hours = Math.floor(minutesDiff / 60);
      updateFriendStatus(userId, `Hoạt động ${hours} giờ trước`, false);
    } else {
      updateFriendStatus(userId, "Đang ngoại tuyến", false);
    }
  };
  
  // Helper function to update a friend's status in the state
  const updateFriendStatus = (userId: string, activityStatus: string, isOnline: boolean) => {
    setFriends(prevFriends => 
      prevFriends.map(friend => 
        friend.id === userId 
          ? { ...friend, activityStatus, isOnline } 
          : friend
      )
    );
  };
  
  // Set up interval to refresh activity statuses
  useEffect(() => {
    // Function to update all friends' statuses
    const updateAllFriendsStatus = () => {
      Object.entries(userCache).forEach(([userId, userData]) => {
        updateFriendActivityStatus(userId, userData);
      });
    };
    
    // Initial update
    if (Object.keys(userCache).length > 0) {
      updateAllFriendsStatus();
    }
    
    // Set up interval to check activity status every minute
    const intervalId = setInterval(updateAllFriendsStatus, 60000);
    
    // Clean up interval on unmount
    return () => clearInterval(intervalId);
  }, [userCache]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
  };

  const filteredFriends = friends.filter((friend) =>
    friend.name.toLowerCase().includes(searchText.toLowerCase())
  );

  // Group friends by first letter for A-Z display
  const groupedFriends = filteredFriends.reduce(
    (acc, friend) => {
      const firstLetter = friend.name.charAt(0).toUpperCase();
      if (!acc[firstLetter]) {
        acc[firstLetter] = [];
      }
      acc[firstLetter].push(friend);
      return acc;
    },
    {} as Record<string, Friend[]>
  );

  // Sort the letters
  const sortedLetters = Object.keys(groupedFriends).sort();

  const handleFriendClick = async (friendId: string) => {
    try {
      setLoading(true); // Show loading state
      
      // Call API to create or get conversation with the friend
      const conversation = await createConversation(friendId);
      
      if (conversation && onSelectConversation) {
        onSelectConversation(conversation); // Pass conversation to parent
      }
      
      if (onSelectFriend) {
        onSelectFriend(friendId); // Maintain existing functionality
      }
      
      setError(null); // Clear any previous errors
    } catch (err) {
      console.error("Error creating/getting conversation:", err);
      setError(
        err instanceof Error ? err.message : "Không thể mở cuộc trò chuyện"
      );
    } finally {
      setLoading(false); // Hide loading state
    }
  };

  const sortOptions = [
    { key: "A-Z", label: "Tên (A-Z)" },
    { key: "All", label: "Tất cả" },
  ];

  // Render functions for list items with updated status display
  const renderFriendItem = (friend: Friend) => (
    <List.Item
      className="px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
      onClick={() => handleFriendClick(friend.id)}
    >
      <div className="flex items-center w-full">
        <div className="relative mr-3">
          <Avatar
            name={friend.name}
            avatarUrl={friend.avatarUrl}
            size={40}
            className="mr-0"
          />
          {friend.isOnline && (
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
          )}
        </div>
        <div className="flex-1">
          <div className="font-medium">{friend.name}</div>
          <div className="text-sm text-gray-500">
            {friend.isOnline ? (
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                <span className="text-green-500">{friend.activityStatus}</span>
              </div>
            ) : (
              <span>{friend.activityStatus}</span>
            )}
          </div>
        </div>
        <MoreOutlined className="text-lg text-gray-500" />
      </div>
    </List.Item>
  );

  return (
    <div className="friend-list w-full h-full flex flex-col bg-white dark:bg-gray-900">
      <div className="p-4 border-b dark:border-gray-700">
        <h2 className="text-lg font-semibold mb-2 flex items-center">
          <span className="mr-2">
            {t.friend_list || "Bạn bè"} ({friends.length})
          </span>
        </h2>
        <Input
          placeholder={t.search || "Tìm Bạn"}
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={handleSearch}
          className="rounded-lg"
        />
      </div>

      <div className="flex justify-between items-center px-4 py-2 border-b dark:border-gray-700">
        <Dropdown
          menu={{
            items: sortOptions.map((option) => ({
              key: option.key,
              label: option.key === "A-Z" ? "Tên (A-Z)" : t.all || "Tất cả",
              onClick: () => setSortOrder(option.key as "A-Z" | "All"),
            })),
          }}
        >
          <Button type="text">
            {sortOrder === "A-Z" ? "Tên (A-Z)" : t.all || "Tất cả"}
          </Button>
        </Dropdown>

        <Dropdown
          menu={{
            items: [{ key: "all", label: t.all || "Tất cả" }],
          }}
        >
          <Button type="text">{t.all || "Tất cả"}</Button>
        </Dropdown>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center">{t.loading || "Đang tải..."}</div>
        ) : error ? (
          <div className="p-4 text-center text-red-500">{error}</div>
        ) : filteredFriends.length === 0 ? (
          <div className="p-4 text-center">
            {t.no_conversations || "Không tìm thấy bạn bè"}
          </div>
        ) : sortOrder === "A-Z" ? (
          sortedLetters.map((letter) => (
            <div key={letter}>
              <div className="sticky top-0 bg-gray-100 dark:bg-gray-800 px-4 py-1 font-semibold">
                {letter}
              </div>
              <List
                dataSource={groupedFriends[letter]}
                renderItem={renderFriendItem}
              />
            </div>
          ))
        ) : (
          <List
            dataSource={filteredFriends}
            renderItem={renderFriendItem}
          />
        )}
      </div>
    </div>
  );
};

// ErrorBoundary wrapper remains the same
const FriendListWithErrorBoundary: React.FC<FriendListProps> = (props) => {
  return (
    <ErrorBoundary>
      <FriendList {...props} />
    </ErrorBoundary>
  );
};

export default FriendListWithErrorBoundary;