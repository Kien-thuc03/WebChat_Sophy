import React, { useState } from "react";
import { List } from "antd";
import Header from "../header/Header";
import { useLanguage } from "../../features/auth/context/LanguageContext";
import { FaUserFriends, FaUsers, FaUserPlus, FaUsersCog } from "react-icons/fa";
import ErrorBoundary from "../common/ErrorBoundary";

interface ContactListProps {
  onSelectOption?: (option: string) => void;
}

const ContactList: React.FC<ContactListProps> = ({ onSelectOption }) => {
  const { t } = useLanguage();
  const [selectedOption, setSelectedOption] = useState<string>("friends");

  const handleOptionSelect = (option: string) => {
    setSelectedOption(option);
    if (onSelectOption) {
      onSelectOption(option);
    }
  };

  const contactOptions = [
    {
      id: "friends",
      name: t.friend_list || "Danh sách bạn bè",
      icon: <FaUserFriends className="text-blue-600 text-xl" />,
    },
    {
      id: "groups",
      name: t.group_community_list || "Danh sách nhóm và cộng đồng",
      icon: <FaUsers className="text-blue-600 text-xl" />,
    },
    {
      id: "friendRequests",
      name: t.friend_requests || "Lời mời kết bạn",
      icon: <FaUserPlus className="text-blue-600 text-xl" />,
    },
    {
      id: "groupInvites",
      name: t.group_invites || "Lời mời vào nhóm và cộng đồng",
      icon: <FaUsersCog className="text-blue-600 text-xl" />,
    },
  ];

  return (
    <div className="contact-list w-80 bg-white dark:bg-gray-900 border-r dark:border-gray-100 h-full flex flex-col overflow-hidden">
      <div className="flex-shrink-0">
        <Header />
      </div>
      <List
        className="overflow-y-auto flex-1"
        dataSource={contactOptions}
        renderItem={(option) => (
          <List.Item
            className={`flex items-center px-2 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer ${
              selectedOption === option.id ? "bg-blue-50 dark:bg-blue-900" : ""
            }`}
            onClick={() => handleOptionSelect(option.id)}
          >
            <div className="flex items-center w-full">
              <div className="flex-shrink-0 w-8 flex justify-center">
                {option.icon}
              </div>
              <span className="ml-3 text-gray-800 dark:text-gray-200">
                {option.name}
              </span>
            </div>
          </List.Item>
        )}
      />
    </div>
  );
};

const ContactListWithErrorBoundary: React.FC<ContactListProps> = (props) => {
  return (
    <ErrorBoundary>
      <ContactList {...props} />
    </ErrorBoundary>
  );
};

export default ContactListWithErrorBoundary;