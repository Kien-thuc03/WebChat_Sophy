import React, { useState } from 'react';
import { Button, Switch, Tooltip } from 'antd';
import {
  ArrowLeftOutlined,
  QuestionCircleOutlined,
  CopyOutlined,
  ShareAltOutlined,
  ReloadOutlined,
  UserDeleteOutlined,
  TeamOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import { Conversation } from '../../../features/chat/types/conversationTypes';

interface GroupManagementProps {
  conversation: Conversation;
  groupLink: string;
  onBack: () => void;
}

const GroupManagement: React.FC<GroupManagementProps> = ({
  conversation,
  groupLink,
  onBack
}) => {
  // State for the permission settings
  const [permissions, setPermissions] = useState({
    canChangeNameAndAvatar: false,
    canPinMessages: true,
    canCreateNotes: true,
    canCreatePolls: true,
    canSendMessages: true
  });

  // State for the additional settings
  const [settings, setSettings] = useState({
    approvalRequired: false,
    highlightAdminMessages: true,
    allowAccessToHistory: false,
    allowLinkInvitation: true
  });

  const handlePermissionChange = (permissionKey: keyof typeof permissions) => {
    setPermissions(prev => ({
      ...prev,
      [permissionKey]: !prev[permissionKey]
    }));
  };

  const handleSettingChange = (settingKey: keyof typeof settings) => {
    setSettings(prev => ({
      ...prev,
      [settingKey]: !prev[settingKey]
    }));
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(groupLink);
    // You could add notification here
  };

  const handleShareLink = () => {
    // Implement share functionality
  };

  const handleRefreshLink = () => {
    // Implement link refresh functionality
  };

  const handleDisbandGroup = () => {
    // Implement disband group functionality with confirmation
  };

  return (
    <div className="group-management flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex-none p-4 border-b border-gray-200 relative">
        <Button 
          type="text" 
          icon={<ArrowLeftOutlined />} 
          className="absolute left-2 top-3.5"
          onClick={onBack}
        />
        <h2 className="text-lg font-semibold text-center">
          Quản lý nhóm
        </h2>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Member Permissions Section */}
        <div className="mb-4">
          <div className="font-medium mb-3">Cho phép các thành viên trong nhóm:</div>
          
          <div className="space-y-4">
            {/* Change name and avatar */}
            <div className="flex items-center justify-between">
              <span>Thay đổi tên & ảnh đại diện của nhóm</span>
              <div 
                onClick={() => handlePermissionChange('canChangeNameAndAvatar')}
                className={`border rounded-sm w-5 h-5 flex items-center justify-center cursor-pointer ${
                  permissions.canChangeNameAndAvatar ? 'bg-blue-500 border-blue-500' : 'border-gray-400'
                }`}
              >
                {permissions.canChangeNameAndAvatar && (
                  <span className="text-white text-xs">✓</span>
                )}
              </div>
            </div>

            {/* Pin messages */}
            <div className="flex items-center justify-between">
              <span>Ghim tin nhắn, ghi chú, bình chọn lên đầu hội thoại</span>
              <div 
                onClick={() => handlePermissionChange('canPinMessages')}
                className={`border rounded-sm w-5 h-5 flex items-center justify-center cursor-pointer ${
                  permissions.canPinMessages ? 'bg-blue-500 border-blue-500' : 'border-gray-400'
                }`}
              >
                {permissions.canPinMessages && (
                  <span className="text-white text-xs">✓</span>
                )}
              </div>
            </div>

            {/* Create notes */}
            <div className="flex items-center justify-between">
              <span>Tạo mới ghi chú, nhắc hẹn</span>
              <div 
                onClick={() => handlePermissionChange('canCreateNotes')}
                className={`border rounded-sm w-5 h-5 flex items-center justify-center cursor-pointer ${
                  permissions.canCreateNotes ? 'bg-blue-500 border-blue-500' : 'border-gray-400'
                }`}
              >
                {permissions.canCreateNotes && (
                  <span className="text-white text-xs">✓</span>
                )}
              </div>
            </div>

            {/* Create polls */}
            <div className="flex items-center justify-between">
              <span>Tạo mới bình chọn</span>
              <div 
                onClick={() => handlePermissionChange('canCreatePolls')}
                className={`border rounded-sm w-5 h-5 flex items-center justify-center cursor-pointer ${
                  permissions.canCreatePolls ? 'bg-blue-500 border-blue-500' : 'border-gray-400'
                }`}
              >
                {permissions.canCreatePolls && (
                  <span className="text-white text-xs">✓</span>
                )}
              </div>
            </div>

            {/* Send messages */}
            <div className="flex items-center justify-between">
              <span>Gửi tin nhắn</span>
              <div 
                onClick={() => handlePermissionChange('canSendMessages')}
                className={`border rounded-sm w-5 h-5 flex items-center justify-center cursor-pointer ${
                  permissions.canSendMessages ? 'bg-blue-500 border-blue-500' : 'border-gray-400'
                }`}
              >
                {permissions.canSendMessages && (
                  <span className="text-white text-xs">✓</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200 my-4"></div>

        {/* Group Settings Section */}
        <div className="space-y-4">
          {/* Approval */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center">
              <span>Chế độ phê duyệt thành viên mới</span>
              <Tooltip title="Yêu cầu phê duyệt trước khi thành viên mới tham gia nhóm">
                <QuestionCircleOutlined className="ml-1 text-gray-400" />
              </Tooltip>
            </div>
            <Switch 
              size="small" 
              checked={settings.approvalRequired} 
              onChange={() => handleSettingChange('approvalRequired')}
            />
          </div>

          {/* Highlight admin messages */}
          <div className="flex items-center justify-between py-2 border-t border-gray-100">
            <div className="flex items-center">
              <span>Đánh dấu tin nhắn từ trưởng/phó nhóm</span>
              <Tooltip title="Tin nhắn của trưởng/phó nhóm sẽ được đánh dấu để dễ nhận biết">
                <QuestionCircleOutlined className="ml-1 text-gray-400" />
              </Tooltip>
            </div>
            <Switch 
              size="small" 
              checked={settings.highlightAdminMessages} 
              onChange={() => handleSettingChange('highlightAdminMessages')}
            />
          </div>

          {/* Access to history */}
          <div className="flex items-center justify-between py-2 border-t border-gray-100">
            <div className="flex items-center">
              <span>Cho phép thành viên mới đọc tin nhắn gần nhất</span>
              <Tooltip title="Thành viên mới có thể xem lịch sử tin nhắn của nhóm">
                <QuestionCircleOutlined className="ml-1 text-gray-400" />
              </Tooltip>
            </div>
            <Switch 
              size="small" 
              checked={settings.allowAccessToHistory} 
              onChange={() => handleSettingChange('allowAccessToHistory')}
            />
          </div>

          {/* Link invitation */}
          <div className="flex items-center justify-between py-2 border-t border-gray-100">
            <div className="flex items-center">
              <span className="font-medium">Cho phép dùng link tham gia nhóm</span>
              <Tooltip title="Bất kỳ ai có link đều có thể tham gia nhóm">
                <QuestionCircleOutlined className="ml-1 text-gray-400" />
              </Tooltip>
            </div>
            <Switch 
              size="small" 
              checked={settings.allowLinkInvitation} 
              onChange={() => handleSettingChange('allowLinkInvitation')}
            />
          </div>

          {/* Group invitation link */}
          {settings.allowLinkInvitation && (
            <div className="flex flex-col mt-2 bg-gray-50 p-3 rounded-md">
              <div className="flex items-center justify-between">
                <span className="text-blue-500 truncate flex-1">{groupLink}</span>
                <div className="flex space-x-1">
                  <Button 
                    type="text" 
                    icon={<CopyOutlined />} 
                    size="small"
                    onClick={handleCopyLink}
                  />
                  <Button 
                    type="text" 
                    icon={<ShareAltOutlined />} 
                    size="small"
                    onClick={handleShareLink}
                  />
                  <Button 
                    type="text" 
                    icon={<ReloadOutlined />} 
                    size="small"
                    onClick={handleRefreshLink}
                    title="Lấy link mới"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200 my-4"></div>

        {/* Admin Actions */}
        <div className="space-y-3">
          <div className="flex items-center py-2 cursor-pointer">
            <UserDeleteOutlined className="mr-2 text-gray-600" />
            <span>Chặn khỏi nhóm</span>
          </div>
          
          <div className="flex items-center py-2 cursor-pointer">
            <TeamOutlined className="mr-2 text-gray-600" />
            <span>Trưởng & phó nhóm</span>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200 my-4"></div>

        {/* Disband Group */}
        <div className="my-4">
          <Button
            danger
            type="primary" 
            icon={<DeleteOutlined />}
            block
            onClick={handleDisbandGroup}
          >
            Giải tán nhóm
          </Button>
        </div>
      </div>
    </div>
  );
};

export default GroupManagement; 