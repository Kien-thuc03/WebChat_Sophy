import React, { useEffect, useState } from "react";
import { Empty, Spin } from "antd";
import { Conversation } from "../../features/chat/types/conversationTypes";
import { useLanguage } from "../../features/auth/context/LanguageContext";
import ErrorBoundary from "../common/ErrorBoundary";


interface GroupRequestListProps {
  onSelectConversation?: (conversation: Conversation) => void;
}

const GroupRequestList: React.FC<GroupRequestListProps> = () => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchGroupInvites = async () => {
      setLoading(true);
      try {
        // TODO: Implement API call to fetch group invitations
        // Sau này sẽ bổ sung API khi cần thiết
      } catch (error) {
        console.error("Error fetching group invites:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchGroupInvites();
  }, []);

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900 w-full">
      <div className="p-4 border-b dark:border-gray-700 w-full">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
          {t.group_invites || "Lời mời vào nhóm và cộng đồng"}
        </h2>
      </div>

      <div className="flex-1 flex items-center justify-center">
        {loading ? (
          <Spin size="large" />
        ) : (
          <div className="w-full max-w-md text-center">
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              className="custom-empty-image"
              imageStyle={{ height: 80 }}
              description={
                <div className="text-center">
                  <div className="mb-2 text-lg font-medium text-gray-800 dark:text-gray-200">
                    {t.no_group_invites ||
                      "Không có lời mời vào nhóm và cộng đồng"}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {t.when_to_receive_group_invites ||
                      "Khi nào tôi nhận được lời mời?"}
                  </div>
                  <a
                    href="#"
                    className="text-blue-500 hover:underline text-sm block mt-1">
                    {t.learn_more || "Tìm hiểu thêm"}
                  </a>
                </div>
              }
            />
          </div>
        )}
      </div>
    </div>
  );
};

const GroupRequestListWithErrorBoundary: React.FC<GroupRequestListProps> = (
  props
) => {
  return (
    <ErrorBoundary>
      <GroupRequestList {...props} />
    </ErrorBoundary>
  );
};

export default GroupRequestListWithErrorBoundary;
