import React from 'react';
import { Input, Button, Tooltip } from 'antd';
import { SendOutlined, SmileOutlined, PictureOutlined, FileOutlined, FileImageOutlined } from '@ant-design/icons';
import Picker from '@emoji-mart/react';
import data from '@emoji-mart/data';
import FileUploader from './FileUploader';
import VoiceRecorderButton from './VoiceRecorderButton';
import { DisplayMessage } from '../../../features/chat/types/chatTypes';
import { User } from '../../../features/auth/types/authTypes';

interface ChatInputAreaProps {
  conversationId: string;
  currentUserId: string;
  userCache: Record<string, User>;
  sendMessage: (conversationId: string, content: string, type: string, attachments?: any[]) => Promise<any>;
  sendImageMessage: (conversationId: string, file: File) => Promise<any>;
  replyMessage: (messageId: string, content: string) => Promise<any>;
  updateConversationWithNewMessage: (conversationId: string, message: any) => void;
  scrollToBottomSmooth: () => void;
  isValidConversation: boolean;
  t: any;
  attachments: File[];
  setAttachments: React.Dispatch<React.SetStateAction<File[]>>;
  pastedImage: File | null;
  setPastedImage: React.Dispatch<React.SetStateAction<File | null>>;
  pastedImagePreview: string | null;
  setPastedImagePreview: React.Dispatch<React.SetStateAction<string | null>>;
  replyingToMessage: DisplayMessage | null;
  setReplyingToMessage: React.Dispatch<React.SetStateAction<DisplayMessage | null>>;
  inputValue: string;
  setInputValue: React.Dispatch<React.SetStateAction<string>>;
  isUploading: boolean;
  setIsUploading: React.Dispatch<React.SetStateAction<boolean>>;
  emojiPickerVisible: boolean;
  setEmojiPickerVisible: React.Dispatch<React.SetStateAction<boolean>>;
  inputRef: React.RefObject<any>;
  fileInputRef: React.RefObject<HTMLInputElement>;
  imageInputRef: React.RefObject<HTMLInputElement>;
  videoInputRef: React.RefObject<HTMLInputElement>;
  audioInputRef: React.RefObject<HTMLInputElement>;
  handleSendMessage: () => Promise<void>;
  handleSendReplyMessage: () => Promise<void>;
  handleSendLike: () => Promise<void>;
  handleRemoveAttachment: (index: number) => void;
  handleRemovePastedImage: () => void;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleImageClick: () => void;
  handleEmojiSelect: (emoji: any) => void;
  toggleEmojiPicker: () => void;
  handleKeyPress: (e: React.KeyboardEvent) => void;
  onBeforeUpload: (file: File) => string | undefined;
  onUploadComplete: (result: any, tempId?: string) => void;
  onUploadError: (error: Error, tempId?: string) => void;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const ChatInputArea: React.FC<ChatInputAreaProps> = ({
  conversationId,
  currentUserId,
  userCache,
  updateConversationWithNewMessage,
  scrollToBottomSmooth,
  isValidConversation,
  attachments,
  pastedImage,
  pastedImagePreview,
  replyingToMessage,
  setReplyingToMessage,
  inputValue,
  isUploading,
  setIsUploading,
  emojiPickerVisible,
  inputRef,
  fileInputRef,
  imageInputRef,
  videoInputRef,
  audioInputRef,
  handleSendMessage,
  handleSendReplyMessage,
  handleSendLike,
  handleRemoveAttachment,
  handleRemovePastedImage,
  handleFileChange,
  handleImageClick,
  handleEmojiSelect,
  toggleEmojiPicker,
  handleKeyPress,
  onBeforeUpload,
  onUploadComplete,
  onUploadError,
  handleInputChange
}) => {
  return (
    <div className="chat-input-container bg-white border-t border-gray-200">
      {/* Display pasted image if any */}
      {pastedImage && pastedImagePreview && (
        <div className="pasted-image-preview p-2 border-b border-gray-100 flex items-center">
          <div className="relative">
            <img src={pastedImagePreview} alt="Pasted" className="h-16 rounded object-cover" />
            <button
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
              onClick={handleRemovePastedImage}
            >
              ×
            </button>
          </div>
          <div className="ml-2 text-xs text-gray-600">
            <div>Ảnh đã dán</div>
            <div className="text-blue-500">Sẽ được gửi cùng với tin nhắn</div>
          </div>
        </div>
      )}
      {/* Reply indicator */}
      {replyingToMessage && (
        <div className="reply-indicator p-2 border-b border-gray-100 flex items-center">
          <div className="flex-grow flex items-start">
            <div className="w-1 bg-blue-500 self-stretch mr-2"></div>
            <div className="flex-grow">
              <div className="font-medium text-sm text-blue-600">
                Đang trả lời {replyingToMessage.sender.name}
              </div>
              <div className="text-xs text-gray-600 truncate max-w-xs">
                {replyingToMessage.type === 'image' ? (
                  <div className="flex items-center">
                    <FileImageOutlined className="mr-1" />
                    <span>Hình ảnh</span>
                  </div>
                ) : replyingToMessage.type === 'file' ? (
                  <div className="flex items-center">
                    <FileOutlined className="mr-1" />
                    <span>{replyingToMessage.fileName || "Tập tin"}</span>
                  </div>
                ) : (
                  replyingToMessage.content
                )}
              </div>
            </div>
          </div>
          <button
            className="ml-2 text-gray-400 hover:text-gray-600 p-1"
            onClick={() => setReplyingToMessage(null)}
            aria-label="Cancel reply"
          >
            <svg 
              viewBox="0 0 24 24" 
              width="16" 
              height="16" 
              stroke="currentColor" 
              strokeWidth="2" 
              fill="none"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      )}
      {/* File attachments preview */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 p-2 border-b border-gray-100">
          {attachments.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-1 bg-gray-100 rounded px-2 py-1"
            >
              {file.type.startsWith('image/') ? (
                <img
                  src={URL.createObjectURL(file)}
                  alt={file.name}
                  className="w-10 h-10 object-cover rounded"
                />
              ) : (
                <i className="fas fa-file text-gray-500"></i>
              )}
              <span className="text-xs truncate max-w-32">{file.name}</span>
              <button
                onClick={() => handleRemoveAttachment(index)}
                className="text-gray-500 hover:text-red-500"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      
      {/* Main input area */}
      <div className="flex items-center p-2">
        {/* Input field */}
        <div className="flex-grow">
          <Input
            ref={inputRef}
            className="w-full py-2 px-2 bg-gray-100 rounded-2xl border-none focus:shadow-none"
            placeholder={
              isUploading
                ? "Đang tải lên..."
                : replyingToMessage
                ? `Trả lời ${replyingToMessage.sender.name}`
                : `Nhắn @, tin nhắn...`
            }
            bordered={false}
            disabled={isUploading}
            value={inputValue}
            onChange={handleInputChange}
            onPressEnter={handleKeyPress}
          />
        </div>
        {/* File attachment button */}
        <div className="flex-shrink-0 mr-2">
          {isValidConversation && (
            <FileUploader 
              conversationId={conversationId}
              onBeforeUpload={onBeforeUpload}
              onUploadComplete={onUploadComplete}
              onUploadError={onUploadError}
            />
          )}
        </div>
        {/* Image button */}
        <div className="flex-shrink-0 mr-2">
          <Tooltip title="Gửi hình ảnh">
            <Button
              type="text"
              icon={<PictureOutlined />}
              onClick={handleImageClick}
              disabled={!isValidConversation}
            />
          </Tooltip>
        </div>
        
        {/* Voice recorder button */}
        <VoiceRecorderButton 
          conversationId={conversationId}
          currentUserId={currentUserId}
          userCache={userCache}
          updateConversationWithNewMessage={updateConversationWithNewMessage}
          scrollToBottomSmooth={scrollToBottomSmooth}
          isValidConversation={isValidConversation}
          isUploading={isUploading}
          setIsUploading={setIsUploading}
        />
        
        {/* Emoji picker button */}
        <div className="emoji-picker-container flex-shrink-0 relative mr-2">
          <Button 
            type="text" 
            icon={<SmileOutlined />} 
            onClick={toggleEmojiPicker} 
            className="emoji-button"
          />
          {emojiPickerVisible && (
            <div className="emoji-picker absolute bottom-12 left-0 z-10 shadow-lg rounded-lg bg-white emoji-picker-container" style={{ width: '320px', height: '350px', zIndex: 5050,left: 'auto', right: '10px' }}>
              <Picker 
                data={data} // Truyền data emoji-mart nếu cần
                onEmojiSelect={handleEmojiSelect} 
                theme="light"
                previewPosition="none"
              />
            </div>
          )}
        </div>
        {/* Like/Send button */}
        <div className="flex-shrink-0 ml-2">
          {inputValue.trim() || attachments.length > 0 || pastedImage ? (
            <Button
              type="primary"
              shape="circle"
              icon={<SendOutlined />}
              onClick={replyingToMessage ? handleSendReplyMessage : handleSendMessage}
              disabled={!isValidConversation}
            />
          ) : (
            <Button
              type="primary" 
              shape="circle"
              icon={<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg>}
              onClick={handleSendLike}
              disabled={!isValidConversation}
            />
          )}
        </div>
      </div>
      {/* Hidden file inputs */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        multiple
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
        aria-label="Tải lên tập tin đính kèm"
      />
      <input
        type="file"
        ref={imageInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/*"
        aria-label="Tải lên hình ảnh"
      />
      <input
        type="file"
        ref={videoInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="video/*"
        aria-label="Tải lên video"
      />
      <input
        type="file"
        ref={audioInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="audio/*"
        aria-label="Tải lên ghi âm"
      />
    </div>
  );
};

export default ChatInputArea; 