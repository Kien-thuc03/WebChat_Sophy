export const formatMessageTime = (timestamp: string) => {
  const date = new Date(timestamp);
  
  // Format time as HH:MM
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  
  return `${hours}:${minutes}`;
};