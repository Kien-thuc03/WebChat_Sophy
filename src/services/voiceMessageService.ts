import cloudinaryService from './cloudinaryService';

// Convert a Blob to a File object
export const blobToFile = (blob: Blob, fileName: string): File => {
  return new File([blob], fileName, { type: blob.type });
};

// Generate a unique file name for a voice message
export const generateVoiceFileName = (duration: number): string => {
  const timestamp = new Date().getTime();
  return `voice_message_${timestamp}_${duration}s.webm`;
};

// Upload a voice message to Cloudinary and send it
export const uploadVoiceMessage = async (
  blob: Blob, 
  duration: number, 
  conversationId: string
): Promise<any> => {
  try {
    // Convert blob to file
    const fileName = generateVoiceFileName(duration);
    const file = blobToFile(blob, fileName);
    
    // Use the existing file upload mechanism
    const result = await cloudinaryService.sendFileMessage(file, conversationId);
    
    return result;
  } catch (error) {
    console.error('Error uploading voice message:', error);
    throw error;
  }
};

// Format duration for display (e.g., "0:45")
export const formatAudioDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Check if a file is a webm audio file
export const isWebmAudioFile = (fileName: string, fileType?: string, fileSize?: number): boolean => {
  // Kiểm tra tên file
  const hasAudioNamePattern = Boolean(
    fileName.match(/voice_message_|audio|tin_nhắn_thoại|voice|ghi_âm/i) && 
    fileName.match(/\.webm$/i)
  );
  
  // Kiểm tra type
  const hasAudioType = Boolean(fileType && (
    fileType.startsWith('audio/') || 
    (fileType === 'video/webm' && fileSize && fileSize < 1024 * 1024)
  ));
  
  // Kiểm tra kích thước file nhỏ (thường là audio)
  const isSmallWebmFile = Boolean(
    fileName.match(/\.webm$/i) && fileSize && fileSize < 1024 * 1024
  );
  
  return hasAudioNamePattern || hasAudioType || isSmallWebmFile;
};

export default {
  blobToFile,
  generateVoiceFileName,
  uploadVoiceMessage,
  formatAudioDuration,
  isWebmAudioFile
}; 