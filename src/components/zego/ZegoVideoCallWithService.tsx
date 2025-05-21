import React, { useState, useEffect, useRef } from "react";
import { message, Button, Space, Spin } from "antd";
import {
  AudioMutedOutlined,
  AudioOutlined,
  VideoCameraOutlined,
  VideoCameraAddOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons";
import { zegoService } from "../../services/zegoService";
import "./zego.css";

export const ZegoVideoCallWithService: React.FC<{
  roomID: string;
  userID: string;
  userName: string;
  isIncomingCall?: boolean;
  onEndCall?: () => void;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onAcceptCall?: (roomID: string) => void;
  zegoToken?: {
    token: string;
    appID: number | string;
  };
}> = ({
  roomID,
  userID,
  userName,
  isIncomingCall = false,
  onEndCall,
  zegoToken,
}) => {
  // Các state quản lý trạng thái cuộc gọi
  const [callActive, setCallActive] = useState<boolean>(isIncomingCall);
  const [callStatus, setCallStatus] = useState<string>(
    isIncomingCall
      ? "Đang kết nối cuộc gọi đến..."
      : "Đang thiết lập cuộc gọi..."
  );
  const [micEnabled, setMicEnabled] = useState<boolean>(true);
  const [cameraEnabled, setCameraEnabled] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [callDuration, setCallDuration] = useState<number>(0);
  const [callTimerActive, setCallTimerActive] = useState<boolean>(false);
  const [hasRemoteStream, setHasRemoteStream] = useState<boolean>(false);
  const [isConnectionEstablished, setIsConnectionEstablished] =
    useState<boolean>(false);
  const [remoteStreamIDs, setRemoteStreamIDs] = useState<string[]>([]);

  // Các tham chiếu cho timer và video containers
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);
  const localVideoRef = useRef<HTMLDivElement>(null);
  const remoteVideoRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Kiểm tra roomID
  useEffect(() => {
    if (!roomID || roomID.trim() === "") {
      console.error("ZegoVideoCallWithService: ID phòng không hợp lệ:", roomID);
      setHasError(true);
      setErrorMessage("ID phòng không hợp lệ");
      message.error("ID phòng không hợp lệ");
      setTimeout(() => onEndCall && onEndCall(), 2000);
    } else {
      console.log(
        `ZegoVideoCallWithService: Khởi tạo với roomID=${roomID}, userID=${userID}, isIncoming=${isIncomingCall}`
      );
    }
  }, [roomID, userID, isIncomingCall, onEndCall]);

  // Khởi tạo Zego và tham gia phòng khi component mount
  useEffect(() => {
    if (!roomID || !userID || !zegoToken || hasError) return;

    const initializeZegoAndJoinRoom = async () => {
      try {
        console.log(
          "ZegoVideoCallWithService: Bắt đầu khởi tạo Zego với token",
          {
            appID: zegoToken.appID,
            tokenPrefix: zegoToken.token.slice(0, 10) + "...",
          }
        );

        // Kiểm tra xem đã tải SDK chưa
        if (!window.ZegoExpressEngine) {
          console.warn(
            "ZegoVideoCallWithService: SDK chưa được tải, đang tải lại..."
          );
          window.loadZegoSDK?.();

          // Đợi SDK tải trong 5 giây
          let attempts = 0;
          while (!window.ZegoExpressEngine && attempts < 10) {
            await new Promise((resolve) => setTimeout(resolve, 500));
            attempts++;
          }

          if (!window.ZegoExpressEngine) {
            throw new Error(
              "Không thể tải ZEGO SDK. Vui lòng làm mới trang và thử lại."
            );
          }
        }

        // Yêu cầu quyền truy cập media trước khi khởi tạo Zego
        try {
          // Yêu cầu quyền truy cập vào mic và camera
          const mediaStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: cameraEnabled,
          });

          // Dừng stream này - chỉ cần nó để xin quyền
          mediaStream.getTracks().forEach((track) => track.stop());

          console.log("ZegoVideoCallWithService: Đã được cấp quyền media");
        } catch (mediaError: unknown) {
          console.error(
            "ZegoVideoCallWithService: Lỗi quyền media:",
            mediaError
          );
          if (mediaError instanceof Error) {
            throw new Error(
              `Không thể truy cập mic/camera: ${mediaError.message}`
            );
          } else {
            throw new Error(
              "Không thể truy cập mic/camera vì lý do không xác định"
            );
          }
        }

        // Đặt lại tất cả kết nối cũ trước khi bắt đầu mới
        zegoService.resetAllConnections();

        // Khởi tạo Zego service với token và event handlers - Sử dụng server chuẩn thay vì test
        try {
          const initResult = await zegoService.initialize(
            {
              appID: Number(zegoToken.appID),
              server: "wss://webliveroom-api.zego.im", // Thay đổi từ test tới production url
              userID: userID,
              userName: userName,
              token: zegoToken.token,
              roomID: roomID,
              video: cameraEnabled,
              audio: micEnabled,
            },
            // Register event handlers during initialization
            {
              onRoomStateUpdate: (state: string, errorCode: number) => {
                console.log(
                  `ZegoVideoCallWithService: Cập nhật trạng thái phòng: ${state}, errorCode: ${errorCode}`
                );

                if (errorCode !== 0) {
                  // Xử lý các lỗi phổ biến
                  if (errorCode === 1102016) {
                    setHasError(true);
                    setErrorMessage(
                      "Lỗi xác thực token (1102016) - Token không hợp lệ"
                    );
                    message.error("Lỗi xác thực token");
                  } else if (errorCode === 1002001) {
                    setHasError(true);
                    setErrorMessage(
                      "Vượt quá giới hạn phòng (1002001) - Tài khoản đã hết giới hạn số phòng"
                    );
                    message.error("Vượt quá giới hạn phòng");
                  }
                  return;
                }

                if (state === "CONNECTED") {
                  setIsConnectionEstablished(true);
                  setCallStatus("Cuộc gọi đang diễn ra");
                  setCallActive(true);
                  setCallTimerActive(true);
                } else if (state === "DISCONNECTED") {
                  setIsConnectionEstablished(false);
                  setCallTimerActive(false);
                }
              },
              onStreamUpdate: (
                updateType: string,
                streamList: Array<unknown>
              ) => {
                console.log(
                  `ZegoVideoCallWithService: Cập nhật stream ${updateType}`,
                  streamList
                );

                // Need to cast streamList elements to get streamID
                const streamInfoList = streamList as Array<{
                  streamID: string;
                }>;

                if (
                  updateType === "ADD" &&
                  Array.isArray(streamList) &&
                  streamList.length > 0
                ) {
                  // Cập nhật danh sách stream IDs
                  const newStreamIDs = streamInfoList.map(
                    (stream) => stream.streamID
                  );

                  // Update remote stream IDs
                  setRemoteStreamIDs((prev) => {
                    const combinedIDs = [...prev, ...newStreamIDs];
                    // Remove duplicates
                    return [...new Set(combinedIDs)];
                  });

                  setHasRemoteStream(true);
                  if (!isConnectionEstablished) {
                    setIsConnectionEstablished(true);
                    setCallStatus("Cuộc gọi đang diễn ra");
                    setCallTimerActive(true);
                  }
                } else if (updateType === "DELETE") {
                  // Xóa stream IDs đã ngắt kết nối
                  const removedStreamIDs = streamInfoList.map(
                    (stream) => stream.streamID
                  );
                  setRemoteStreamIDs((prev) =>
                    prev.filter((id) => !removedStreamIDs.includes(id))
                  );

                  // Nếu không còn stream nào nữa
                  setTimeout(() => {
                    // Check after a short delay to ensure all updates are processed
                    setRemoteStreamIDs((currentIds) => {
                      if (currentIds.length === 0) {
                        setHasRemoteStream(false);
                        // Không tự động kết thúc cuộc gọi khi stream biến mất
                        // Người dùng phải tự chủ động nhấn nút kết thúc
                      }
                      return currentIds;
                    });
                  }, 300);
                }
              },
              onMicStatusChanged: (enabled: boolean) => {
                setMicEnabled(enabled);
              },
              onCameraStatusChanged: (enabled: boolean) => {
                setCameraEnabled(enabled);
              },
            }
          );

          if (!initResult) {
            throw new Error("Không thể khởi tạo Zego Engine");
          }
        } catch (zegoError: unknown) {
          console.error(
            "ZegoVideoCallWithService: Lỗi khởi tạo Zego:",
            zegoError
          );
          if (zegoError instanceof Error) {
            throw new Error(`Khởi tạo thất bại: ${zegoError.message}`);
          } else {
            throw new Error("Không thể khởi tạo Zego Engine");
          }
        }

        console.log(
          "ZegoVideoCallWithService: Đã khởi tạo và tham gia phòng:",
          roomID
        );

        // Tạo local stream
        try {
          if (localVideoRef.current) {
            const localStream = await zegoService.createStream(
              cameraEnabled,
              micEnabled
            );
            if (localStream) {
              await zegoService.startPublishingStream();
              // Đảm bảo kích hoạt trạng thái đang gọi
              setCallActive(true);
            } else {
              throw new Error("Không thể tạo stream cục bộ");
            }
          }
        } catch (streamError: unknown) {
          console.error(
            "ZegoVideoCallWithService: Lỗi tạo stream:",
            streamError
          );
          if (streamError instanceof Error) {
            throw new Error(`Không thể tạo stream: ${streamError.message}`);
          } else {
            throw new Error("Không thể tạo stream cục bộ");
          }
        }

        setCallStatus("Đã kết nối phòng, đang chờ người dùng khác...");
        setCallActive(true);
      } catch (error: unknown) {
        console.error("ZegoVideoCallWithService: Lỗi khởi tạo:", error);
        let errorMsg = "";

        if (error instanceof Error) {
          if (error.name === "NotAllowedError") {
            errorMsg =
              "Không thể truy cập mic/camera. Vui lòng cấp quyền và thử lại.";
          } else if (error.name === "NotFoundError") {
            errorMsg = "Không tìm thấy thiết bị mic/camera.";
          } else if (error.message.includes("SSL")) {
            errorMsg = "Yêu cầu kết nối HTTPS để sử dụng tính năng gọi điện.";
          } else if (error.message.includes("1102016")) {
            errorMsg =
              "Lỗi xác thực token - Token không hợp lệ hoặc không phù hợp với môi trường server.";
          } else if (error.message.includes("1002001")) {
            errorMsg = "Tài khoản đã vượt quá giới hạn số phòng. Thử lại sau.";
          } else {
            errorMsg = `Lỗi kết nối: ${error.message}`;
          }
        } else {
          errorMsg = "Lỗi kết nối không xác định";
        }

        setHasError(true);
        setErrorMessage(errorMsg);
        message.error("Không thể kết nối đến dịch vụ gọi điện");
      }
    };

    initializeZegoAndJoinRoom();

    // Gỡ bỏ component cleanup
    return () => {
      console.log("ZegoVideoCallWithService: Cleanup khi unmount component");
      // Không gọi zegoService.destroy() ở đây vì nó sẽ được gọi trong useEffect dọn dẹp ở dưới
    };
  }, [
    roomID,
    userID,
    userName,
    zegoToken,
    hasError,
    cameraEnabled,
    micEnabled,
  ]);

  // Dọn dẹp khi component unmount
  useEffect(() => {
    return () => {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
        callTimerRef.current = null;
      }

      // Dừng và dọn dẹp Zego Service
      zegoService.destroy();
    };
  }, []);

  // Bắt đầu đếm thời gian khi kết nối thành công
  useEffect(() => {
    if (callActive && !hasError && isConnectionEstablished) {
      setCallTimerActive(true);
    } else {
      setCallTimerActive(false);
    }
  }, [callActive, hasError, isConnectionEstablished]);

  // Đếm thời gian cuộc gọi
  useEffect(() => {
    if (callTimerActive) {
      console.log("ZegoVideoCallWithService: Bắt đầu đếm thời gian cuộc gọi");
      callTimerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }

    return () => {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
        callTimerRef.current = null;
      }
    };
  }, [callTimerActive]);

  // Effect to play remote streams when container refs are available
  useEffect(() => {
    if (!hasRemoteStream || remoteStreamIDs.length === 0) return;

    // For each remote stream ID, try to play it if the container is available
    remoteStreamIDs.forEach(async (streamID) => {
      if (remoteVideoRefs.current[streamID]) {
        try {
          // Try to play the stream in its container
          await zegoService.startPlayingStream(streamID);
        } catch (error) {
          console.error(`Error playing remote stream ${streamID}:`, error);
        }
      }
    });
  }, [hasRemoteStream, remoteStreamIDs]);

  // Xử lý bật/tắt mic
  const handleToggleMicrophone = () => {
    const newState = zegoService.toggleMicrophone();
    setMicEnabled(newState);
  };

  // Xử lý bật/tắt camera
  const handleToggleCamera = () => {
    const newState = zegoService.toggleCamera();
    setCameraEnabled(newState);
  };

  // Xử lý kết thúc cuộc gọi
  const endCall = () => {
    console.log("ZegoVideoCallWithService: Kết thúc cuộc gọi");

    // Dọn dẹp và kết thúc cuộc gọi
    zegoService.destroy();

    // Thông báo kết thúc cho server
    if (roomID) {
      zegoService.endCall(roomID).catch((err) => {
        console.error("Lỗi khi gửi thông báo kết thúc cuộc gọi:", err);
      });
    }

    // Cập nhật UI
    setCallActive(false);
    setIsConnectionEstablished(false);

    // Callback để component cha xử lý
    if (onEndCall) onEndCall();
  };

  // Format thời gian hiển thị
  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // Render UI
  return (
    <div className="zego-video-call">
      {hasError ? (
        // Hiển thị lỗi nếu có
        <div className="call-error">
          <div className="error-icon">
            <CloseCircleOutlined
              style={{ fontSize: "48px", color: "#f5222d" }}
            />
          </div>
          <div className="error-message">{errorMessage}</div>
          <Button type="primary" danger onClick={endCall}>
            Kết thúc
          </Button>
        </div>
      ) : (
        <>
          {/* Hiển thị trạng thái cuộc gọi và thời gian */}
          <div className="call-status-container">
            <div className="calling-status">{callStatus}</div>
            {(callTimerActive || isConnectionEstablished) && (
              <div
                className="call-timer"
                style={{ fontSize: 18, color: "#52c41a", marginTop: 8 }}>
                <span>⏱️ {formatDuration(callDuration)}</span>
                {hasRemoteStream && (
                  <span> (Đã kết nối luồng video/audio)</span>
                )}
              </div>
            )}
          </div>

          {/* Phần hiển thị video */}
          <div className="call-video-container">
            {/* Video của người dùng hiện tại */}
            <div className="local-video-container">
              <div
                ref={localVideoRef}
                className="video-box"
                id="local-video"></div>
              <div className="video-info">
                <div className="user-name">{userName} (Bạn)</div>
                <div className="stream-status">
                  {micEnabled ? (
                    <AudioOutlined />
                  ) : (
                    <AudioMutedOutlined style={{ color: "red" }} />
                  )}
                  {cameraEnabled ? (
                    <VideoCameraOutlined />
                  ) : (
                    <VideoCameraAddOutlined style={{ color: "red" }} />
                  )}
                </div>
              </div>
            </div>

            {/* Video của người dùng khác */}
            <div className="remote-videos-container">
              {!hasRemoteStream && (
                <div className="no-remote-streams">
                  <p>Đang chờ người dùng khác...</p>
                  <Spin size="large" />
                </div>
              )}
              {remoteStreamIDs.map((streamID) => (
                <div key={streamID} className="remote-video-item">
                  <div
                    ref={(el) => (remoteVideoRefs.current[streamID] = el)}
                    className="video-box"
                    id={`remote-video-${streamID}`}></div>
                  <div className="video-info">
                    <div className="user-name">Người dùng khác</div>
                    <div className="stream-status">
                      <Spin size="small" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Điều khiển cuộc gọi */}
          <div className="call-controls">
            <Space>
              <Button
                type="primary"
                danger
                icon={<CloseCircleOutlined />}
                onClick={endCall}
                className="end-call-btn">
                {callActive ? "Kết thúc" : "Hủy"}
              </Button>
              {callActive && (
                <>
                  <Button
                    icon={
                      micEnabled ? <AudioOutlined /> : <AudioMutedOutlined />
                    }
                    onClick={handleToggleMicrophone}
                    className="toggle-mic-btn">
                    {micEnabled ? "Tắt mic" : "Bật mic"}
                  </Button>
                  <Button
                    icon={
                      cameraEnabled ? (
                        <VideoCameraOutlined />
                      ) : (
                        <VideoCameraAddOutlined />
                      )
                    }
                    onClick={handleToggleCamera}
                    className="toggle-camera-btn">
                    {cameraEnabled ? "Tắt camera" : "Bật camera"}
                  </Button>
                </>
              )}
            </Space>
          </div>
        </>
      )}
      {/* CSS cho component */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .call-error { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 350px; text-align: center; }
            .error-icon { margin-bottom: 20px; }
            .error-message { font-size: 18px; margin-bottom: 20px; color: #f5222d; }
            .call-status-container { text-align: center; margin-bottom: 20px; }
            .calling-status { font-size: 16px; color: #1890ff; }
            .call-controls { text-align: center; margin-top: 20px; }
            .call-timer { font-weight: bold; }
            .call-video-container { display: flex; flex-direction: column; gap: 20px; }
            .local-video-container { position: relative; width: 100%; height: 200px; border-radius: 8px; overflow: hidden; background: #f0f2f5; }
            .remote-videos-container { position: relative; width: 100%; min-height: 200px; border-radius: 8px; overflow: hidden; background: #f0f2f5; }
            .video-box { width: 100%; height: 100%; background-color: #262626; }
            .video-info { position: absolute; bottom: 0; left: 0; right: 0; padding: 8px; background: rgba(0,0,0,0.5); color: white; display: flex; justify-content: space-between; }
            .user-name { font-size: 14px; }
            .stream-status { display: flex; gap: 8px; }
            .no-remote-streams { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 200px; color: #8c8c8c; }
          `,
        }}
      />
    </div>
  );
};

export default ZegoVideoCallWithService;
