import React, { useEffect, useState } from "react";
import { List, Input, Dropdown, Menu, Badge, Modal, message } from "antd";
import {
  SearchOutlined,
  FilterOutlined,
  SortAscendingOutlined,
  EllipsisOutlined,
} from "@ant-design/icons";
import { fetchUserGroups, leaveGroup } from "../../api/API"; // Import API để lấy danh sách nhóm
import { Conversation } from "../../features/chat/types/conversationTypes";
import { useLanguage } from "../../features/auth/context/LanguageContext";
import ErrorBoundary from "../common/ErrorBoundary";
import GroupAvatar from "../chat/GroupAvatar";

interface GroupListProps {
  onSelectConversation?: (conversation: Conversation) => void;
}

const GroupList: React.FC<GroupListProps> = ({ onSelectConversation }) => {
  const { t } = useLanguage(); // Hook để lấy bản dịch ngôn ngữ
  const [groups, setGroups] = useState<Conversation[]>([]); // State lưu danh sách nhóm
  const [filteredGroups, setFilteredGroups] = useState<Conversation[]>([]); // State lưu danh sách nhóm đã lọc
  const [searchText, setSearchText] = useState<string>(""); // State lưu giá trị tìm kiếm
  const [loading, setLoading] = useState<boolean>(true); // State hiển thị loading
  const [leavingGroup, setLeavingGroup] = useState<boolean>(false); // State để theo dõi trạng thái rời nhóm
  const [selectedGroup, setSelectedGroup] = useState<Conversation | null>(null); // State để theo dõi nhóm được chọn

  // Gọi API để lấy danh sách nhóm khi component được render
  useEffect(() => {
    const loadGroups = async () => {
      try {
        setLoading(true);
        const groupData = await fetchUserGroups();
        setGroups(groupData);
        setFilteredGroups(groupData);
      } catch (error) {
        console.error("Lỗi khi tải danh sách nhóm:", error);
      } finally {
        setLoading(false);
      }
    };

    loadGroups();
  }, []);

  useEffect(() => {
    if (searchText.trim() === "") {
      setFilteredGroups(groups);
    } else {
      const filtered = groups.filter((group) =>
        group.groupName?.toLowerCase().includes(searchText.toLowerCase())
      );
      setFilteredGroups(filtered);
    }
  }, [searchText, groups]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
  };

  const handleSelectGroup = (group: Conversation) => {
    if (onSelectConversation) {
      onSelectConversation(group);
    }
  };

  const handleLeaveGroup = async (group: Conversation) => {
    setSelectedGroup(group);
    Modal.confirm({
      title: "Rời nhóm",
      content: `Bạn có chắc chắn muốn rời khỏi nhóm "${group.groupName}" không?`,
      okText: "Rời nhóm",
      cancelText: "Hủy",
      onOk: async () => {
        try {
          setLeavingGroup(true);
          await leaveGroup(group.conversationId);
          message.success("Rời nhóm thành công");

          // Cập nhật danh sách nhóm sau khi rời
          setGroups((prevGroups) =>
            prevGroups.filter((g) => g.conversationId !== group.conversationId)
          );
        } catch (error) {
          console.error("Lỗi khi rời nhóm:", error);
          if (error instanceof Error) {
            message.error(error.message);
          } else {
            message.error("Không thể rời nhóm. Vui lòng thử lại sau.");
          }
        } finally {
          setLeavingGroup(false);
          setSelectedGroup(null);
        }
      },
    });
  };

  const getGroupMenu = (group: Conversation) => (
    <Menu>
      <Menu.Item key="category">
        <div className="font-medium text-gray-700">Phân loại</div>
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item
        key="leave"
        onClick={(e) => {
          e.domEvent.stopPropagation();
          handleLeaveGroup(group);
        }}>
        <div className="text-red-500">Rời cộng đồng</div>
      </Menu.Item>
    </Menu>
  );

  const renderGroup = (group: Conversation) => {
    const memberCount = group.groupMembers?.length || 0;
    const isLeaving =
      leavingGroup && selectedGroup?.conversationId === group.conversationId;

    return (
      <List.Item
        className="flex items-center py-3 px-2 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer rounded-lg"
        onClick={() => handleSelectGroup(group)}
        actions={[
          <Dropdown
            overlay={getGroupMenu(group)}
            trigger={["click"]}
            key="actions">
            <div
              onClick={(e) => e.stopPropagation()}
              className="p-1 hover:bg-gray-200 rounded-full">
              <EllipsisOutlined className="text-gray-500 dark:text-gray-400 text-lg" />
            </div>
          </Dropdown>,
        ]}>
        <div className="flex items-center w-full">
          {/* Avatar nhóm */}
          <div className="flex-shrink-0 w-12 h-12 mr-3 relative">
            <GroupAvatar
              members={group.groupMembers || []}
              userAvatars={{}}
              size={48}
              groupAvatarUrl={group.groupAvatarUrl || undefined}
            />
            {/* Badge for unread messages if needed */}
            {group.hasUnread && (
              <Badge
                count="TN"
                style={{
                  backgroundColor: "#1890ff",
                  position: "absolute",
                  bottom: 0,
                  right: 0,
                }}
              />
            )}
          </div>

          {/* Thông tin nhóm */}
          <div className="flex-1">
            <div className="text-gray-800 dark:text-gray-200 font-semibold">
              {group.groupName}
              {isLeaving && (
                <span className="ml-2 text-gray-400 text-xs">
                  (Đang rời...)
                </span>
              )}
            </div>
            <div className="text-gray-500 dark:text-gray-400 text-sm">
              {memberCount} thành viên
            </div>
          </div>
        </div>
      </List.Item>
    );
  };

  return (
    <div className="group-list w-full bg-white dark:bg-gray-900 h-full flex flex-col overflow-hidden">
      {/* Tiêu đề */}
      <div className="px-4 py-3 border-b dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
          {t.group_community_list || "Nhóm và cộng đồng"} ({groups.length})
        </h2>
      </div>

      {/* Thanh tìm kiếm và nút sắp xếp/lọc */}
      <div className="px-4 py-2 flex flex-col gap-2">
        <Input
          placeholder={t.search || "Tìm kiếm..."}
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={handleSearch}
          className="rounded-lg"
        />
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <SortAscendingOutlined className="text-blue-600" />
            <span className="text-gray-600 dark:text-gray-300">
              Hoạt động (mới -&gt; cũ)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <FilterOutlined className="text-blue-600" />
            <span className="text-gray-600 dark:text-gray-300">Tất cả</span>
          </div>
        </div>
      </div>

      {/* Danh sách nhóm */}
      <List
        className="overflow-y-auto flex-1 px-2"
        loading={loading}
        dataSource={filteredGroups}
        renderItem={renderGroup}
        locale={{
          emptyText: searchText
            ? "Không tìm thấy nhóm phù hợp"
            : "Bạn chưa tham gia nhóm nào",
        }}
      />
    </div>
  );
};

// Bọc component trong ErrorBoundary để xử lý lỗi
const GroupListWithErrorBoundary: React.FC<GroupListProps> = (props) => {
  return (
    <ErrorBoundary>
      <GroupList {...props} />
    </ErrorBoundary>
  );
};

export default GroupListWithErrorBoundary;
