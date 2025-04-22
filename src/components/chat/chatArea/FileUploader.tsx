import React, { useRef, useState } from 'react';
import { Button, message, Upload, Space, Progress, Tooltip } from 'antd';
import { 
  PaperClipOutlined, 
  DeleteOutlined, 
  CloseCircleOutlined,
  FileImageOutlined,
  FileWordOutlined,
  FilePdfOutlined,
  FileExcelOutlined,
  FilePptOutlined,
  FileZipOutlined,
  FileUnknownOutlined,
  VideoCameraOutlined,
  AudioOutlined
} from '@ant-design/icons';
import cloudinaryService, { formatFileSize } from '../../../services/cloudinaryService';
import socketService from '../../../services/socketService';
import './FileUploader.css';

interface FileUploaderProps {
  conversationId: string;
  onUploadStart?: () => void;
  onUploadComplete?: (result: any) => void;
  onUploadError?: (error: Error) => void;
}

const FileUploader: React.FC<FileUploaderProps> = ({
  conversationId,
  onUploadStart,
  onUploadComplete,
  onUploadError
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // File type icons mapping
  const getFileIcon = (file: File) => {
    const type = file.type;
    const name = file.name.toLowerCase();

    if (type.startsWith('image/')) {
      return <FileImageOutlined />;
    } else if (type.startsWith('video/')) {
      return <VideoCameraOutlined />;
    } else if (type.startsWith('audio/')) {
      return <AudioOutlined />;
    } else if (type === 'application/pdf') {
      return <FilePdfOutlined />;
    } else if (type.includes('word') || name.endsWith('.doc') || name.endsWith('.docx')) {
      return <FileWordOutlined />;
    } else if (type.includes('excel') || name.endsWith('.xls') || name.endsWith('.xlsx')) {
      return <FileExcelOutlined />;
    } else if (type.includes('powerpoint') || name.endsWith('.ppt') || name.endsWith('.pptx')) {
      return <FilePptOutlined />;
    } else if (type.includes('zip') || name.endsWith('.zip') || name.endsWith('.rar') || name.endsWith('.7z')) {
      return <FileZipOutlined />;
    }
    return <FileUnknownOutlined />;
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setSelectedFile(file);

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreviewUrl(null);
    }

    // Reset file input
    e.target.value = '';
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setUploadProgress(0);
  };

  const uploadFile = async () => {
    if (!selectedFile || !conversationId) return;

    try {
      setUploading(true);
      onUploadStart?.();

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const newProgress = prev + Math.floor(Math.random() * 15);
          return newProgress > 90 ? 90 : newProgress;
        });
      }, 500);

      // Use socketService to send file message
      const result = await socketService.sendFileMessage(conversationId, selectedFile);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      message.success(`${selectedFile.name} uploaded successfully`);
      clearSelectedFile();
      onUploadComplete?.(result);
    } catch (error) {
      console.error('Error uploading file:', error);
      message.error(`Failed to upload ${selectedFile.name}. Please try again.`);
      onUploadError?.(error as Error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="file-uploader">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        style={{ display: 'none' }}
        aria-label="File upload"
        title="Upload file"
      />

      {!selectedFile ? (
        <Button
          icon={<PaperClipOutlined />}
          onClick={triggerFileInput}
          className="attach-button"
        >
        </Button>
      ) : (
        <div className="selected-file">
          {previewUrl ? (
            <div className="file-preview-image">
              <img src={previewUrl} alt="Preview" />
              <Button 
                icon={<CloseCircleOutlined />} 
                size="small" 
                className="remove-preview" 
                onClick={clearSelectedFile}
              />
            </div>
          ) : (
            <div className="file-preview">
              <div className="file-icon">{getFileIcon(selectedFile)}</div>
              <div className="file-info">
                <div className="file-name">{selectedFile.name}</div>
                <div className="file-size">{formatFileSize(selectedFile.size)}</div>
              </div>
              <div className="file-actions">
                <Tooltip title="Remove">
                  <Button 
                    icon={<DeleteOutlined />} 
                    size="small" 
                    danger 
                    onClick={clearSelectedFile} 
                    disabled={uploading}
                  />
                </Tooltip>
              </div>
            </div>
          )}

          {uploadProgress > 0 && (
            <Progress percent={uploadProgress} size="small" status={uploadProgress === 100 ? "success" : "active"} />
          )}

          <div className="file-upload-actions">
            <Button 
              type="primary" 
              onClick={uploadFile} 
              loading={uploading} 
              disabled={uploading}
            >
              {uploading ? 'Uploading...' : 'Send'}
            </Button>
            {!uploading && (
              <Button danger onClick={clearSelectedFile}>
                Cancel
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUploader; 