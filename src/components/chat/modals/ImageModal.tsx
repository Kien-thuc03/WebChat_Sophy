import React from 'react';
import { Modal } from 'antd';
import { CloseOutlined, DownloadOutlined } from '@ant-design/icons';

interface ImageModalProps {
  imageUrl: string;
  isOpen: boolean;
  onClose: () => void;
}

const ImageModal: React.FC<ImageModalProps> = ({ imageUrl, isOpen, onClose }) => {
  // Handle image download
  const handleDownload = () => {
    // Create an anchor element and set download attributes
    const link = document.createElement('a');
    link.href = imageUrl;
    
    // Extract filename from URL or use default
    const filename = imageUrl.split('/').pop() || 'image.jpg';
    link.download = filename;
    
    // Append to body, trigger click and clean up
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  return (
    <Modal
      open={isOpen}
      footer={null}
      closable={false}
      centered
      className="image-viewer-modal"
      width="auto"
      bodyStyle={{ padding: 0, maxHeight: '90vh', overflow: 'hidden' }}
      style={{ maxWidth: '90vw' }}
      maskStyle={{ background: 'rgba(0, 0, 0, 0.85)' }}
    >
      <div className="relative">
        {/* Close button in top-right corner */}
        <button 
          onClick={onClose}
          className="absolute top-2 right-2 bg-black bg-opacity-50 text-white rounded-full p-2 z-10 hover:bg-opacity-70 transition"
          aria-label="Close"
        >
          <CloseOutlined />
        </button>
        
        {/* Download button in bottom-right corner */}
        <button 
          onClick={handleDownload}
          className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white rounded-full p-2 z-10 hover:bg-opacity-70 transition"
          aria-label="Download"
        >
          <DownloadOutlined />
        </button>
        
        {/* The image */}
        <div className="flex items-center justify-center">
          <img 
            src={imageUrl} 
            alt="Enlarged view" 
            className="max-h-[90vh] max-w-[90vw] object-contain"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = '/images/image-placeholder.png';
            }}
          />
        </div>
      </div>
    </Modal>
  );
};

export default ImageModal; 