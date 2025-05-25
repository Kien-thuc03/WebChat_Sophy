import React, { useState, useRef, useEffect } from 'react';
import { Button, message, Progress } from 'antd';
import { AudioOutlined, CloseCircleOutlined, SendOutlined, PauseOutlined, LoadingOutlined } from '@ant-design/icons';

interface VoiceRecorderProps {
  onRecordingComplete: (blob: Blob, duration: number) => void;
  onCancel: () => void;
  maxDuration?: number; // Maximum recording duration in seconds
}

const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  onRecordingComplete,
  onCancel,
  maxDuration = 60 // Default max duration is 60 seconds
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Format time as mm:ss
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Start recording
  const startRecording = async () => {
    try {
      audioChunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        setAudioBlob(audioBlob);
        setAudioUrl(audioUrl);
        
        // Stop all tracks in the stream
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      
      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= maxDuration) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      message.error('Không thể truy cập microphone. Vui lòng kiểm tra quyền truy cập.');
    }
  };

  // Pause recording
  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      
      // Pause timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  // Resume recording
  const resumeRecording = () => {
    if (mediaRecorderRef.current && isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      
      // Resume timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= maxDuration) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      
      // Stop timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  // Send recorded audio
  const sendRecording = () => {
    if (audioBlob) {
      setIsProcessing(true);
      onRecordingComplete(audioBlob, recordingTime);
    }
  };

  // Cancel recording
  const cancelRecording = () => {
    // If recording, stop it
    if (isRecording) {
      stopRecording();
    }
    
    // Release audio URL if exists
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    
    onCancel();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
      }
    };
  }, [audioUrl, isRecording]);

  return (
    <div className="voice-recorder p-3 bg-gray-100 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <div className="text-lg font-medium">
          {audioBlob ? 'Ghi âm đã hoàn thành' : 'Ghi âm tin nhắn thoại'}
        </div>
        <Button 
          type="text" 
          icon={<CloseCircleOutlined />} 
          onClick={cancelRecording}
          disabled={isProcessing}
        />
      </div>
      
      {/* Recording progress */}
      <Progress 
        percent={Math.round((recordingTime / maxDuration) * 100)} 
        showInfo={false}
        strokeColor={isRecording ? (isPaused ? '#faad14' : '#1890ff') : '#52c41a'}
        status={recordingTime >= maxDuration ? 'exception' : 'normal'}
      />
      
      <div className="flex justify-between items-center mt-2">
        <div className="text-lg font-medium">
          {formatTime(recordingTime)}
        </div>
        <div className="max-duration text-gray-500">
          / {formatTime(maxDuration)}
        </div>
      </div>
      
      {/* Audio player for preview */}
      {audioUrl && (
        <div className="audio-preview my-3">
          <audio ref={audioRef} src={audioUrl} controls className="w-full" />
        </div>
      )}
      
      {/* Action buttons */}
      <div className="flex justify-between mt-3">
        {!audioBlob ? (
          // Recording controls
          <>
            {!isRecording ? (
              <Button 
                type="primary" 
                icon={<AudioOutlined />} 
                onClick={startRecording}
                className="flex-1 mr-2"
              >
                Bắt đầu ghi âm
              </Button>
            ) : (
              <>
                {!isPaused ? (
                  <Button 
                    icon={<PauseOutlined />} 
                    onClick={pauseRecording}
                    className="flex-1 mr-2"
                  >
                    Tạm dừng
                  </Button>
                ) : (
                  <Button 
                    icon={<AudioOutlined />} 
                    onClick={resumeRecording}
                    className="flex-1 mr-2"
                  >
                    Tiếp tục
                  </Button>
                )}
                <Button 
                  type="primary" 
                  onClick={stopRecording}
                  className="flex-1"
                >
                  Hoàn thành
                </Button>
              </>
            )}
          </>
        ) : (
          // Send or re-record controls
          <>
            <Button 
              onClick={() => {
                setAudioBlob(null);
                setAudioUrl(null);
                setRecordingTime(0);
              }}
              className="flex-1 mr-2"
              disabled={isProcessing}
            >
              Ghi âm lại
            </Button>
            <Button 
              type="primary" 
              icon={isProcessing ? <LoadingOutlined /> : <SendOutlined />}
              onClick={sendRecording}
              className="flex-1"
              loading={isProcessing}
              disabled={isProcessing}
            >
              Gửi
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default VoiceRecorder; 