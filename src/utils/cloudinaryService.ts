import axios from 'axios';

// Cloudinary configuration
const CLOUDINARY_CLOUD_NAME = 'dyd5381vx';
const CLOUDINARY_API_KEY = '624578189739292';
const CLOUDINARY_API_SECRET = 'FKRVIJAReWhBG-QRmmoFBUpn9eA';
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`;

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
    console.log('Dữ liệu phản hồi từ Cloudinary:', cloudinaryResponse);
    
    // 2. Prepare attachment object
    const attachment = prepareAttachment(cloudinaryResponse, file);
    const fileType = getFileType(file);
    
    console.log('Dữ liệu attachment chuẩn bị gửi đi:', attachment);
    
    // 3. Send to backend API
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication token not found');
    }
    
    // Cấu trúc dữ liệu gửi đi được cập nhật để phù hợp với backend
    const requestData = {
      conversationId,
      content: file.name, // Sử dụng tên file làm nội dung mặc định
      messageType: fileType, // Đảm bảo messageType luôn có giá trị
      type: fileType, // Đảm bảo type luôn có giá trị
      attachment: {
        ...attachment,
        type: fileType, // Đảm bảo type trong attachment cũng có giá trị
      }
    };
    
    console.log('Dữ liệu gửi đến API:', requestData);
    console.log('Gọi API: http://localhost:3000/api/messages/send-file');
    
    const response = await axios.post(
      'http://localhost:3000/api/messages/send-file',
      requestData,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    console.log('File message sent successfully:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('Failed to send file message:', error);
    console.error('Chi tiết lỗi:', error.response?.status, error.response?.statusText);
    console.error('Dữ liệu lỗi:', error.response?.data || 'Không có dữ liệu phản hồi');
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