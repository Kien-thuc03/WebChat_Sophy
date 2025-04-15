// Format time as HH:MM for chat messages
export const formatMessageTime = (timestamp: string) => {
  const date = new Date(timestamp);
  
  // Format time as HH:MM
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  
  return `${hours}:${minutes}`;
};

// Original relative time format for ChatList
export const formatRelativeTime = (timestamp: string) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  // Less than 1 hour
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000);
    return `${minutes} phút`;
  }
  
  // Less than 24 hours
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `${hours} giờ`;
  }
  
  //less than 2 days nếu lớn hơn 24h và nhỏ hơn 3 ngày thì hiển thị là "Hôm qua"
  if (diff < 172800000) {
    return "Hôm qua"; 
  }

  // Less than 7 days
  if (diff < 604800000) {
    const days = Math.floor(diff / 86400000);
    return `${days} ngày`;
  }
  
  // More than 24 hours
  return date.toLocaleDateString('vi-VN');
};