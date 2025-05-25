import React, { useState } from 'react';
import { Button, Tooltip } from 'antd';
import { AudioOutlined } from '@ant-design/icons';
import VoiceRecorder from './VoiceRecorder';
import voiceMessageService from '../../../services/voiceMessageService';

interface VoiceRecorderButtonProps {
  conversationId: string;
  currentUserId: string;
  userCache: Record<string, any>;
  updateConversationWithNewMessage: (conversationId: string, message: any) => void;
  scrollToBottomSmooth: () => void;
  isValidConversation: boolean;
  isUploading: boolean;
  setIsUploading: React.Dispatch<React.SetStateAction<boolean>>;
}

const VoiceRecorderButton: React.FC<VoiceRecorderButtonProps> = ({
  conversationId,
  currentUserId,
  userCache,
  updateConversationWithNewMessage,
  scrollToBottomSmooth,
  isValidConversation,
  isUploading,
  setIsUploading
}) => {
  const [isRecording, setIsRecording] = useState(false);

  // Handle voice recording complete
  const handleVoiceRecordingComplete = async (blob: Blob, duration: number) => {
    try {
      setIsUploading(true);
      
      // Create a temporary message ID
      const tempId = `temp-voice-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Create a temporary message
      const tempMessage = {
        id: tempId,
        content: "Đang gửi tin nhắn thoại...",
        timestamp: new Date().toISOString(),
        sender: {
          id: currentUserId,
          name: "Bạn",
          avatar: userCache[currentUserId]?.urlavatar || "",
        },
        type: "audio",
        isRead: false,
        sendStatus: "sending",
        readBy: [],
        deliveredTo: [],
        audioDuration: duration
      };
      
      // Add to messages
      updateConversationWithNewMessage(conversationId, tempMessage);
      scrollToBottomSmooth();
      
      // Upload the voice message
      const result = await voiceMessageService.uploadVoiceMessage(blob, duration, conversationId);
      
      if (result && result.messageDetailId) {
        // Create the real message
        const realMessage = {
          id: result.messageDetailId,
          content: `Tin nhắn thoại (${voiceMessageService.formatAudioDuration(duration)})`,
          timestamp: result.createdAt,
          sender: {
            id: result.senderId,
            name: userCache[result.senderId]?.fullname || "Bạn",
            avatar: userCache[result.senderId]?.urlavatar || "",
          },
          type: "audio",
          isRead: Array.isArray(result.readBy) && result.readBy.length > 0,
          readBy: result.readBy || [],
          deliveredTo: result.deliveredTo || [],
          sendStatus: "sent",
          fileUrl: (result.attachment && result.attachment.url) || (result.attachments && result.attachments[0]?.url) || "",
          attachment: result.attachment || (result.attachments && result.attachments[0]) || undefined,
          attachments: Array.isArray(result.attachments) ? result.attachments : (result.attachments ? [result.attachments] : []),
          audioDuration: duration,
          replaceId: tempId
        };
        
        // Replace the temporary message with the real one
        updateConversationWithNewMessage(conversationId, realMessage);
      }
    } catch (error) {
      console.error("Error sending voice message:", error);
    } finally {
      setIsUploading(false);
      setIsRecording(false);
    }
  };

  // Handle voice recording cancel
  const handleVoiceRecordingCancel = () => {
    setIsRecording(false);
  };

  // Toggle voice recording mode
  const toggleVoiceRecording = () => {
    setIsRecording(!isRecording);
  };

  return (
    <>
      {/* Voice recorder component */}
      {isRecording && (
        <VoiceRecorder 
          onRecordingComplete={handleVoiceRecordingComplete}
          onCancel={handleVoiceRecordingCancel}
          maxDuration={120} // 2 minutes max
        />
      )}
      
      {/* Voice message button */}
      {!isRecording && (
        <div className="flex-shrink-0 mr-2">
          <Tooltip title="Ghi âm tin nhắn thoại">
            <Button
              type="text"
              icon={<AudioOutlined />}
              onClick={toggleVoiceRecording}
              disabled={!isValidConversation || isUploading}
            />
          </Tooltip>
        </div>
      )}
    </>
  );
};

export default VoiceRecorderButton; 