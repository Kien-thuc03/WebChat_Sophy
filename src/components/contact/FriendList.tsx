import React, { useState, useEffect } from "react";
import { List, Input, Dropdown, Button } from "antd";
import { MoreOutlined, SearchOutlined } from "@ant-design/icons";
import { Avatar } from "../common/Avatar";
import { useLanguage } from "../../features/auth/context/LanguageContext";
import ErrorBoundary from "../common/ErrorBoundary";
import { fetchFriends } from "../../api/API";

// Define interface for API response
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
}

interface FriendListProps {
  onSelectFriend?: (friendId: string) => void;
}

const FriendList: React.FC<FriendListProps> = ({ onSelectFriend }) => {
  const { t } = useLanguage();
  const [searchText, setSearchText] = useState("");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortOrder, setSortOrder] = useState<"A-Z" | "All">("A-Z");
  const [error, setError] = useState<string | null>(null);

  // Fetch friends from API
  useEffect(() => {
    const getFriends = async () => {
      try {
        setLoading(true);
        const friendsData = await fetchFriends() as FriendApiResponse[];
        
        // Transform API data to match our Friend interface
        const formattedFriends: Friend[] = friendsData.map((friend: FriendApiResponse) => ({
          id: friend.id || friend.userId || friend._id || "",
          name: friend.name || friend.fullname || friend.username || "",
          avatarUrl: friend.avatarUrl || friend.urlavatar || friend.avatar,
          status: friend.status || "offline",
          lastSeen: friend.lastSeen || friend.lastActive
        }));
        
        setFriends(formattedFriends);
        setError(null);
      } catch (err) {
        console.error("Error fetching friends:", err);
        setError(err instanceof Error ? err.message : "Không thể tải danh sách bạn bè");
      } finally {
        setLoading(false);
      }
    };

    getFriends();
  }, []);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
  };

  const filteredFriends = friends.filter(friend => 
    friend.name.toLowerCase().includes(searchText.toLowerCase())
  );

  // Group friends by first letter for A-Z display
  const groupedFriends = filteredFriends.reduce((acc, friend) => {
    const firstLetter = friend.name.charAt(0).toUpperCase();
    if (!acc[firstLetter]) {
      acc[firstLetter] = [];
    }
    acc[firstLetter].push(friend);
    return acc;
  }, {} as Record<string, Friend[]>);

  // Sort the letters
  const sortedLetters = Object.keys(groupedFriends).sort();

  const handleFriendClick = (friendId: string) => {
    if (onSelectFriend) {
      onSelectFriend(friendId);
    }
  };

  const sortOptions = [
    { key: "A-Z", label: "Tên (A-Z)" },
    { key: "All", label: "Tất cả" }
  ];

  return (
    <div className="friend-list w-full h-full flex flex-col bg-white dark:bg-gray-900">
      <div className="p-4 border-b dark:border-gray-700">
        <h2 className="text-lg font-semibold mb-2 flex items-center">
          <span className="mr-2">{t.friend_list || "Bạn bè"} ({friends.length})</span>
        </h2>
        <Input
          placeholder={t.search || "Tìm bạn"}
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={handleSearch}
          className="rounded-lg"
        />
      </div>

      <div className="flex justify-between items-center px-4 py-2 border-b dark:border-gray-700">
        <Dropdown
          menu={{
            items: sortOptions.map(option => ({
              key: option.key,
              label: option.key === "A-Z" ? "Tên (A-Z)" : t.all || "Tất cả",
              onClick: () => setSortOrder(option.key as "A-Z" | "All")
            }))
          }}
        >
          <Button type="text">
            {sortOrder === "A-Z" ? "Tên (A-Z)" : t.all || "Tất cả"}
          </Button>
        </Dropdown>
        
        <Dropdown
          menu={{
            items: [
              { key: "all", label: t.all || "Tất cả" }
            ]
          }}
        >
          <Button type="text">
            {t.all || "Tất cả"}
          </Button>
        </Dropdown>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center">{t.loading || "Đang tải..."}</div>
        ) : error ? (
          <div className="p-4 text-center text-red-500">{error}</div>
        ) : filteredFriends.length === 0 ? (
          <div className="p-4 text-center">{t.no_conversations || "Không tìm thấy bạn bè"}</div>
        ) : sortOrder === "A-Z" ? (
          sortedLetters.map(letter => (
            <div key={letter}>
              <div className="sticky top-0 bg-gray-100 dark:bg-gray-800 px-4 py-1 font-semibold">
                {letter}
              </div>
              <List
                dataSource={groupedFriends[letter]}
                renderItem={friend => (
                  <List.Item 
                    className="px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                    onClick={() => handleFriendClick(friend.id)}
                  >
                    <div className="flex items-center w-full">
                      <Avatar 
                        name={friend.name} 
                        avatarUrl={friend.avatarUrl} 
                        size={40}
                        className="mr-3"
                      />
                      <div className="flex-1">
                        <div className="font-medium">{friend.name}</div>
                        <div className="text-sm text-gray-500">
                          {friend.status === "online" ? (
                            <span className="text-green-500">Online</span>
                          ) : (
                            <span>Offline</span>
                          )}
                        </div>
                      </div>
                      <MoreOutlined className="text-lg text-gray-500" />
                    </div>
                  </List.Item>
                )}
              />
            </div>
          ))
        ) : (
          <List
            dataSource={filteredFriends}
            renderItem={friend => (
              <List.Item 
                className="px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                onClick={() => handleFriendClick(friend.id)}
              >
                <div className="flex items-center w-full">
                  <Avatar 
                    name={friend.name} 
                    avatarUrl={friend.avatarUrl} 
                    size={40}
                    className="mr-3"
                  />
                  <div className="flex-1">
                    <div className="font-medium">{friend.name}</div>
                    <div className="text-sm text-gray-500">
                      {friend.status === "online" ? (
                        <span className="text-green-500">Online</span>
                      ) : (
                        <span>Offline</span>
                      )}
                    </div>
                  </div>
                  <MoreOutlined className="text-lg text-gray-500" />
                </div>
              </List.Item>
            )}
          />
        )}
      </div>
    </div>
  );
};

const FriendListWithErrorBoundary: React.FC<FriendListProps> = (props) => {
  return (
    <ErrorBoundary>
      <FriendList {...props} />
    </ErrorBoundary>
  );
};

export default FriendListWithErrorBoundary;