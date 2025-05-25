import axios from 'axios';

// Cloudinary configuration
const CLOUDINARY_CLOUD_NAME = 'dyd5381vx';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Helper function to convert File to base64
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

// Determine file type from MIME type
export const getFileType = (file: File): string => {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  return 'file';
};

// Format file size for display
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Upload file to Cloudinary
export const uploadToCloudinary = async (file: File): Promise<any> => {
  try {
    console.log(`Đang tải lên file: ${file.name}, loại: ${file.type}`);
    
    // Chuyển đổi file thành base64 để dễ xử lý
    const base64Data = await fileToBase64(file);
    
    // Sử dụng upload preset thay vì API key/secret (an toàn hơn cho client-side)
    const data = {
      file: base64Data,
      upload_preset: 'ml_default',
      resource_type: 'auto'
    };
    
    console.log('Đang tải lên:', `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/upload`);
    
    const response = await axios.post(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/upload`,
      data
    );
    
    console.log('Tải lên thành công:', response.data);
    return response.data;
  } catch (error: any) {
    // Chi tiết lỗi
    console.error('Lỗi tải lên Cloudinary:', error);
    console.error('Chi tiết lỗi:', error.response?.data || 'Không có dữ liệu phản hồi');
    
    throw new Error('Không thể tải lên file. Vui lòng thử lại sau.');
  }
};

// Định nghĩa interface cho attachment để đảm bảo TypeScript kiểm tra đúng
interface FileAttachment {
  name: string;
  type: string;
  size: number;
  url: string;
  downloadUrl: string;
  publicId?: string;
  format?: string;
  mimeType: string;
  duration?: number;
  thumbnail?: string;
}

// Prepare attachment object for API
export const prepareAttachment = (cloudinaryResponse: any, file: File): FileAttachment => {
  const type = getFileType(file);
  
  const attachment: FileAttachment = {
    name: file.name,
    type: type,
    size: file.size,
    url: cloudinaryResponse.secure_url,
    downloadUrl: cloudinaryResponse.secure_url.replace('/upload/', '/upload/fl_attachment/'),
    publicId: cloudinaryResponse.public_id,
    format: file.name.split('.').pop(),
    mimeType: file.type
  };

  // Thêm thông tin bổ sung cho video
  if (type === 'video' && cloudinaryResponse.duration) {
    attachment.duration = cloudinaryResponse.duration;
    attachment.thumbnail = cloudinaryResponse.thumbnail_url;
  }
  
  return attachment;
};

// Send a file message through the API
export const sendFileMessage = async (file: File, conversationId: string): Promise<any> => {
  try {
    // 1. Upload file to Cloudinary
    const cloudinaryResponse = await uploadToCloudinary(file);
    
    // 2. Prepare attachment object
    const attachment = prepareAttachment(cloudinaryResponse, file);
    // const fileType = getFileType(file);
    
    // 3. Send to backend API
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication token not found');
    }
    
    const response = await axios.post(
      `${API_BASE_URL}/api/messages/send-file`,
      {
        conversationId,
        attachment,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    console.log('File message sent successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('Failed to send file message:', error);
    throw error;
  }
};

export default {
  uploadToCloudinary,
  sendFileMessage,
  fileToBase64,
  getFileType,
  formatFileSize,
  prepareAttachment
}; 