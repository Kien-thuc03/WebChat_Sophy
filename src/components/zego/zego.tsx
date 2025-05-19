import React, { useEffect, useRef, useState, useCallback } from "react";
import { ZegoExpressEngine } from "zego-express-engine-webrtc";
import { message, Button, Space, Spin } from "antd";
import {
  AudioMutedOutlined,
  AudioOutlined,
  VideoCameraOutlined,
  VideoCameraAddOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import "./zego.css";
import socketService from "../../services/socketService";

// Định nghĩa cho window.ZegoExpressEngine và loadZegoSDK
declare global {
  interface Window {
    ZegoExpressEngine?: typeof ZegoExpressEngine;
    loadZegoSDK?: () => void;
    incomingCallAudio?: HTMLAudioElement;
  }
}

// Thêm interface ZegoTokenResponse
interface ZegoTokenResponse {
  token: string;
  appID: string | number;
  userId: string;
  effectiveTimeInSeconds: number;
  error?: string;
}

interface ZegoUser {
  userID: string;
  userName: string;
}

interface ZegoStream {
  streamID: string;
  user: ZegoUser;
  extraInfo?: string;
}

interface StreamInfo {
  streamID: string;
  userID: string;
  userName: string;
  stream?: MediaStream;
  playing: boolean;
}

interface ZegoProps {
  appID: number;
  server: string;
  roomID: string;
  userID: string;
  userName: string;
  token: string;
  onRoomStateUpdate?: (state: string) => void;
  onUserUpdate?: (updateType: string, userList: ZegoUser[]) => void;
  onStreamUpdate?: (updateType: string, streamList: ZegoStream[]) => void;
  onMicStatusChanged?: (enabled: boolean) => void;
  onCameraStatusChanged?: (enabled: boolean) => void;
}

interface ZegoRefMethods {
  loginRoom: () => Promise<boolean>;
  logoutRoom: () => void;
  createStream: (
    video?: boolean,
    audio?: boolean
  ) => Promise<MediaStream | null>;
  startPublishingStream: (customStreamID?: string) => Promise<boolean>;
  stopPublishingStream: () => void;
  toggleMicrophone: () => boolean | undefined;
  toggleCamera: () => boolean | undefined;
}

const ZegoComponent = React.forwardRef<ZegoRefMethods, ZegoProps>(
  (
    {
      appID,
      server,
      roomID,
      userID,
      userName,
      token,
      onRoomStateUpdate,
      onUserUpdate,
      onStreamUpdate,
      onMicStatusChanged,
      onCameraStatusChanged,
    },
    ref
  ) => {
    const [zg, setZg] = useState<ZegoExpressEngine | null>(null);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [publishStreamID, setPublishStreamID] = useState<string>("");
    const [remoteStreams, setRemoteStreams] = useState<StreamInfo[]>([]);
    const [isPublishing, setIsPublishing] = useState<boolean>(false);
    const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
    const [micEnabled, setMicEnabled] = useState<boolean>(true);
    const [cameraEnabled, setCameraEnabled] = useState<boolean>(true);
    const localVideoRef = useRef<HTMLDivElement>(null);
    const remoteVideoRefs = useRef<{ [key: string]: HTMLDivElement | null }>(
      {}
    );
    const zegoEngineRef = useRef<ZegoExpressEngine | null>(null);

    useEffect(() => {
      console.log("ZegoComponent: Initializing with", {
        appID,
        server,
        roomID,
        userID,
      });

      try {
        if (!zegoEngineRef.current) {
          console.log("ZegoComponent: Creating ZegoExpressEngine instance");
          const zgEngine = new ZegoExpressEngine(appID, server);
          zegoEngineRef.current = zgEngine;
          setZg(zgEngine);

          try {
            const checkResult = ZegoExpressEngine.checkSystemRequirements?.();
            console.log("Browser compatibility check:", checkResult);
          } catch (err) {
            console.warn("Browser compatibility check not available:", err);
          }

          navigator.mediaDevices
            .getUserMedia({ audio: true, video: true })
            .then(() => console.log("Media permissions granted"))
            .catch((e) => {
              console.error("Media permissions denied:", e);
              message.error(
                "Vui lòng cấp quyền camera và microphone để sử dụng tính năng gọi video."
              );
            });

          registerCallbacks(zgEngine);
        } else {
          setZg(zegoEngineRef.current);
        }
      } catch (error) {
        console.error("ZegoComponent: Error initializing Zego engine:", error);
        message.error(
          "Không thể khởi tạo engine cuộc gọi. Vui lòng tải lại trang."
        );
      }

      return () => {
        if (localStream) {
          stopPublishingStream();
          if (zegoEngineRef.current)
            zegoEngineRef.current.destroyStream(localStream);
        }

        remoteStreams.forEach((stream) => {
          if (stream.streamID && zegoEngineRef.current) {
            zegoEngineRef.current.stopPlayingStream(stream.streamID);
          }
        });

        if (isLoggedIn && zegoEngineRef.current) {
          zegoEngineRef.current.logoutRoom(roomID);
        }

        if (zegoEngineRef.current) {
          zegoEngineRef.current.off("roomStateUpdate");
          zegoEngineRef.current.off("roomUserUpdate");
          zegoEngineRef.current.off("roomStreamUpdate");
          zegoEngineRef.current.off("publisherStateUpdate");
          zegoEngineRef.current.off("playerStateUpdate");
          zegoEngineRef.current.off("publishQualityUpdate");
          zegoEngineRef.current.off("playQualityUpdate");
          zegoEngineRef.current.off("roomTokenWillExpire");
        }
      };
    }, [appID, server]);

    useEffect(() => {
      // Kiểm tra nếu ZegoExpressEngine không được định nghĩa
      if (typeof window.ZegoExpressEngine === "undefined") {
        console.warn(
          "ZegoExpressEngine không được tìm thấy, đang tải từ CDN..."
        );

        // Thử tải lại
        if (window.loadZegoSDK) {
          window.loadZegoSDK();

          // Kiểm tra sau 2 giây
          const checkTimer = setTimeout(() => {
            if (typeof window.ZegoExpressEngine !== "undefined") {
              console.log("Tải lại thành công, khởi tạo lại engine");
              try {
                const zgEngine = new ZegoExpressEngine(appID, server);
                zegoEngineRef.current = zgEngine;
                setZg(zgEngine);
                registerCallbacks(zgEngine);
              } catch (error) {
                console.error(
                  "Không thể khởi tạo ZegoExpressEngine sau khi tải:",
                  error
                );
                message.error(
                  "Lỗi khi tải thư viện gọi video. Vui lòng tải lại trang."
                );
              }
            } else {
              console.error(
                "Không thể tải ZegoExpressEngine sau nhiều lần thử"
              );
              message.error(
                "Không thể tải thư viện gọi video. Vui lòng thử lại sau."
              );
            }
            clearTimeout(checkTimer);
          }, 2000);
        } else {
          // Cách tải cũ nếu loadZegoSDK không tồn tại
          const script = document.createElement("script");
          script.src =
            "https://unpkg.com/zego-express-engine-webrtc@2.26.0/dist/ZegoExpressWebRTC.js";
          script.async = true;

          // Xử lý khi tải thành công
          script.onload = () => {
            console.log(
              "Đã tải thành công thư viện ZegoExpressEngine từ CDN dự phòng"
            );
            // Reload component
            setZg(null);
            setTimeout(() => {
              try {
                const zgEngine = new ZegoExpressEngine(appID, server);
                zegoEngineRef.current = zgEngine;
                setZg(zgEngine);
                registerCallbacks(zgEngine);
              } catch (error) {
                console.error(
                  "Không thể khởi tạo ZegoExpressEngine sau khi tải:",
                  error
                );
                message.error(
                  "Lỗi khi tải thư viện gọi video. Vui lòng tải lại trang."
                );
              }
            }, 1000);
          };

          // Xử lý khi tải không thành công
          script.onerror = () => {
            console.error("Không thể tải ZegoExpressEngine từ CDN dự phòng");
            message.error(
              "Không thể tải thư viện gọi video. Vui lòng kiểm tra kết nối mạng và thử lại."
            );
          };

          // Thêm script vào head
          document.head.appendChild(script);
        }
      }
    }, []);

    const registerCallbacks = (zgEngine: ZegoExpressEngine) => {
      zgEngine.on(
        "roomStateUpdate",
        (roomID, state, errorCode, extendedData) => {
          console.log(
            `ZegoComponent: Room state update: room ${roomID}, state: ${state}, error: ${errorCode}`
          );
          if (onRoomStateUpdate) onRoomStateUpdate(state);

          if (state === "DISCONNECTED") {
            setIsLoggedIn(false);
            message.info("Đã ngắt kết nối khỏi phòng gọi");
          } else if (state === "CONNECTED") {
            setIsLoggedIn(true);
            message.success("Đã kết nối đến phòng gọi");
          }
        }
      );

      zgEngine.on("roomUserUpdate", (roomID, updateType, userList) => {
        console.log(
          `ZegoComponent: Room user update: room ${roomID}, ${updateType === "ADD" ? "users joined" : "users left"}`,
          userList
        );
        if (onUserUpdate) onUserUpdate(updateType, userList);

        if (updateType === "ADD") {
          message.info(`${userList.length} người dùng đã tham gia cuộc gọi`);
        } else if (updateType === "DELETE") {
          message.info(`${userList.length} người dùng đã rời cuộc gọi`);
        }
      });

      zgEngine.on(
        "roomStreamUpdate",
        async (roomID, updateType, streamList) => {
          console.log(
            `ZegoComponent: Room stream update: room ${roomID}, ${updateType === "ADD" ? "streams added" : "streams removed"}`,
            streamList
          );

          if (updateType === "ADD") {
            const newStreams = streamList.map((stream) => ({
              streamID: stream.streamID,
              userID: stream.user.userID,
              userName: stream.user.userName,
              playing: false,
            }));

            setRemoteStreams((prev) => [...prev, ...newStreams]);

            newStreams.forEach(async (streamInfo) => {
              await playStream(streamInfo.streamID);
            });
          } else if (updateType === "DELETE") {
            const streamIDsToRemove = streamList.map(
              (stream) => stream.streamID
            );
            setRemoteStreams((prev) =>
              prev.filter(
                (stream) => !streamIDsToRemove.includes(stream.streamID)
              )
            );
          }

          if (onStreamUpdate) onStreamUpdate(updateType, streamList);
        }
      );

      zgEngine.on("publisherStateUpdate", (result) => {
        console.log("ZegoComponent: Publisher state update:", result);

        if (result.state === "PUBLISHING") {
          message.success("Đang phát video của bạn");
        } else if (result.state === "NO_PUBLISH") {
          message.info("Đã dừng phát video của bạn");
        } else if (result.state === "PUBLISH_REQUESTING") {
          message.loading("Đang kết nối...");
        }
      });

      zgEngine.on("playerStateUpdate", (result) => {
        console.log("ZegoComponent: Player state update:", result);
      });

      zgEngine.on("publishQualityUpdate", (streamID, stats) => {
        console.log(
          `ZegoComponent: Publish quality update for stream ${streamID}:`,
          stats
        );
      });

      zgEngine.on("playQualityUpdate", (streamID, stats) => {
        console.log(
          `ZegoComponent: Play quality update for stream ${streamID}:`,
          stats
        );
      });

      zgEngine.on("roomTokenWillExpire", (roomID, remainTimeInSecond) => {
        console.log(
          `ZegoComponent: Token will expire in ${remainTimeInSecond}s`
        );

        if (remainTimeInSecond <= 30) {
          refreshToken();
        }
      });
    };

    const refreshToken = () => {
      socketService.emit("refreshZegoToken", (response: ZegoTokenResponse) => {
        if (!response?.token) {
          message.error("Không thể làm mới token. Cuộc gọi có thể bị ngắt.");
          return;
        }

        console.log("ZegoComponent: Token refreshed");

        if (zegoEngineRef.current && isLoggedIn) {
          zegoEngineRef.current.renewToken(roomID, response.token);
        }
      });
    };

    const loginRoom = async (): Promise<boolean> => {
      if (!zegoEngineRef.current) {
        console.error(
          "ZegoComponent: Cannot login to room, ZegoExpressEngine not initialized"
        );
        return false;
      }

      try {
        console.log(`ZegoComponent: Logging into room ${roomID} with token`);

        const result = await zegoEngineRef.current.loginRoom(
          roomID,
          token,
          { userID, userName },
          { userUpdate: true }
        );

        console.log(
          `ZegoComponent: Login result: ${result ? "success" : "failed"}`
        );
        setIsLoggedIn(result);
        return result;
      } catch (error) {
        console.error("ZegoComponent: Failed to login to room:", error);
        message.error("Không thể tham gia phòng gọi.");
        return false;
      }
    };

    const logoutRoom = (): void => {
      if (!zegoEngineRef.current || !isLoggedIn) return;

      try {
        console.log(`ZegoComponent: Logging out of room ${roomID}`);
        zegoEngineRef.current.logoutRoom(roomID);
        setIsLoggedIn(false);
      } catch (error) {
        console.error("ZegoComponent: Failed to logout from room:", error);
      }
    };

    const createStream = async (
      video: boolean = true,
      audio: boolean = true
    ): Promise<MediaStream | null> => {
      if (!zegoEngineRef.current) {
        console.error(
          "ZegoComponent: Cannot create stream, ZegoExpressEngine not initialized"
        );
        return null;
      }

      try {
        setCameraEnabled(video);
        setMicEnabled(audio);
        console.log(
          "ZegoComponent: Creating stream with video:",
          video,
          "audio:",
          audio
        );

        const stream = await zegoEngineRef.current.createStream({
          camera: {
            video,
            audio,
            videoQuality: 2,
            videoResolutionMode: 0,
            videoMirrorMode: 1,
          },
        });

        console.log("ZegoComponent: Stream created successfully");

        setLocalStream(stream);

        if (localVideoRef.current) {
          console.log("ZegoComponent: Playing local video preview");
          stream.playVideo(localVideoRef.current, {
            enableAutoplayDialog: true,
          });
        } else {
          console.warn(
            "ZegoComponent: No local video ref available for preview"
          );
        }

        return stream;
      } catch (error) {
        console.error("ZegoComponent: Failed to create stream:", error);
        message.error(
          "Không thể tạo luồng video/audio. Vui lòng kiểm tra quyền truy cập camera/micro."
        );
        return null;
      }
    };

    const startPublishingStream = async (
      customStreamID?: string
    ): Promise<boolean> => {
      if (!zegoEngineRef.current || !localStream) {
        console.error(
          "ZegoComponent: Cannot publish stream, ZegoExpressEngine not initialized or no local stream"
        );
        return false;
      }

      try {
        const streamID = customStreamID || `${roomID}_${userID}_${Date.now()}`;
        console.log(`ZegoComponent: Publishing stream with ID ${streamID}`);

        zegoEngineRef.current.startPublishingStream(streamID, localStream);
        setPublishStreamID(streamID);
        setIsPublishing(true);
        console.log("ZegoComponent: Stream publishing started");

        return true;
      } catch (error) {
        console.error("ZegoComponent: Failed to publish stream:", error);
        message.error("Không thể chia sẻ luồng của bạn.");
        return false;
      }
    };

    const stopPublishingStream = (): void => {
      if (!zegoEngineRef.current || !publishStreamID || !isPublishing) {
        console.warn(
          "ZegoComponent: Cannot stop publishing, ZegoExpressEngine not initialized or no stream published"
        );
        return;
      }

      try {
        console.log(
          `ZegoComponent: Stopping stream publishing for ${publishStreamID}`
        );
        zegoEngineRef.current.stopPublishingStream(publishStreamID);
        setIsPublishing(false);
      } catch (error) {
        console.error(
          "ZegoComponent: Failed to stop publishing stream:",
          error
        );
      }
    };

    const playStream = async (
      streamID: string
    ): Promise<MediaStream | null> => {
      if (!zegoEngineRef.current) {
        console.error(
          "ZegoComponent: Cannot play stream, ZegoExpressEngine not initialized"
        );
        return null;
      }

      try {
        console.log(`ZegoComponent: Starting to play stream ${streamID}`);
        const stream = await zegoEngineRef.current.startPlayingStream(streamID);
        console.log(`ZegoComponent: Stream ${streamID} playing successfully`);

        setRemoteStreams((prev) =>
          prev.map((item) =>
            item.streamID === streamID
              ? { ...item, stream, playing: true }
              : item
          )
        );

        if (remoteVideoRefs.current[streamID]) {
          console.log(
            `ZegoComponent: Playing remote video for stream ${streamID}`
          );
          stream.playVideo(remoteVideoRefs.current[streamID]!, {
            enableAutoplayDialog: true,
          });
        } else {
          console.warn(
            `ZegoComponent: No video element for stream ${streamID}`
          );
        }

        return stream;
      } catch (error) {
        console.error(
          `ZegoComponent: Failed to play stream ${streamID}:`,
          error
        );
        message.error("Không thể phát luồng video từ xa.");
        return null;
      }
    };

    const toggleMicrophone = () => {
      if (!localStream) {
        console.warn(
          "ZegoComponent: Cannot toggle microphone, no local stream"
        );
        return;
      }

      try {
        const audioTracks = localStream.getAudioTracks();
        if (audioTracks.length === 0) {
          console.warn("ZegoComponent: No audio tracks found");
          return false;
        }

        const newState = !micEnabled;
        console.log(
          `ZegoComponent: Toggling microphone from ${micEnabled ? "enabled" : "disabled"} to ${newState ? "enabled" : "disabled"}`
        );

        audioTracks.forEach((track) => {
          track.enabled = newState;
        });

        setMicEnabled(newState);
        if (onMicStatusChanged) onMicStatusChanged(newState);
        return newState;
      } catch (error) {
        console.error("ZegoComponent: Failed to toggle microphone:", error);
        message.error("Không thể thay đổi trạng thái micro.");
        return false;
      }
    };

    const toggleCamera = () => {
      if (!localStream) {
        console.warn("ZegoComponent: Cannot toggle camera, no local stream");
        return;
      }

      try {
        const videoTracks = localStream.getVideoTracks();
        if (videoTracks.length === 0) {
          console.warn("ZegoComponent: No video tracks found");
          return false;
        }

        const newState = !cameraEnabled;
        console.log(
          `ZegoComponent: Toggling camera from ${cameraEnabled ? "enabled" : "disabled"} to ${newState ? "enabled" : "disabled"}`
        );

        videoTracks.forEach((track) => {
          track.enabled = newState;
        });

        setCameraEnabled(newState);
        if (onCameraStatusChanged) onCameraStatusChanged(newState);
        return newState;
      } catch (error) {
        console.error("ZegoComponent: Failed to toggle camera:", error);
        message.error("Không thể thay đổi trạng thái camera.");
        return false;
      }
    };

    React.useImperativeHandle(ref, () => ({
      loginRoom,
      logoutRoom,
      createStream,
      startPublishingStream,
      stopPublishingStream,
      toggleMicrophone,
      toggleCamera,
    }));

    return (
      <div className="zego-container">
        <div className="local-video-container">
          <div ref={localVideoRef} className="video-box" id="local-video"></div>
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

        <div className="remote-videos-container">
          {remoteStreams.length === 0 && (
            <div className="no-remote-streams">
              <p>Đang chờ người dùng khác tham gia...</p>
            </div>
          )}

          {remoteStreams.map((stream) => (
            <div key={stream.streamID} className="remote-video-item">
              <div
                ref={(el) => (remoteVideoRefs.current[stream.streamID] = el)}
                className="video-box"
                id={`remote-video-${stream.streamID}`}></div>
              <div className="video-info">
                <div className="user-name">{stream.userName}</div>
                <div className="stream-status">
                  {stream.playing ? <Spin size="small" /> : <ReloadOutlined />}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
);

export const ZegoVideoCall: React.FC<{
  roomID: string;
  userID: string;
  userName: string;
  isIncomingCall?: boolean;
  onEndCall?: () => void;
}> = ({ roomID, userID, userName, isIncomingCall = false, onEndCall }) => {
  const [token, setToken] = useState<string>("");
  const [appID, setAppID] = useState<number>(0);
  const zegoRef = useRef<ZegoRefMethods | null>(null);
  const [callActive, setCallActive] = useState<boolean>(false);
  const [callStatus, setCallStatus] = useState<string>(
    isIncomingCall
      ? "Đang kết nối cuộc gọi đến..."
      : "Đang thiết lập cuộc gọi..."
  );
  const [micEnabled, setMicEnabled] = useState<boolean>(true);
  const [cameraEnabled, setCameraEnabled] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Thêm kiểm tra roomID ngay khi component được khởi tạo
  useEffect(() => {
    if (!roomID || roomID === "") {
      console.error("ZegoVideoCall: RoomID không hợp lệ hoặc trống:", roomID);
      setHasError(true);
      setErrorMessage("Lỗi thiết lập cuộc gọi: ID phòng không hợp lệ");

      // Thông báo cho người dùng và kết thúc cuộc gọi sau một khoảng thời gian ngắn
      message.error(
        "Không thể thiết lập kết nối cuộc gọi: ID phòng không hợp lệ"
      );
      const timer = setTimeout(() => {
        if (onEndCall) onEndCall();
      }, 2000);

      return () => clearTimeout(timer);
    }

    console.log(
      `ZegoVideoCall: Khởi tạo với roomID=${roomID}, userID=${userID}, isIncoming=${isIncomingCall}`
    );
  }, [roomID, userID, isIncomingCall, onEndCall]);

  // Trong component ZegoVideoCall, thêm effect để lắng nghe sự kiện acceptCall từ socket
  useEffect(() => {
    if (!roomID) return;

    // Xử lý khi có người chấp nhận cuộc gọi
    const handleAcceptCall = (data: {
      conversationId: string;
      roomID: string;
      callerId: string;
      receiverId: string;
    }) => {
      console.log("ZegoVideoCall: Nhận được sự kiện chấp nhận cuộc gọi:", data);

      // Kiểm tra xem sự kiện này có phải dành cho phòng hiện tại không
      if (data.roomID === roomID) {
        console.log("ZegoVideoCall: Phòng ID khớp, đang thiết lập kết nối");

        // Đánh dấu người dùng đã chấp nhận cuộc gọi để bắt đầu kết nối
        setCallActive(true);

        // Cập nhật trạng thái
        setCallStatus("Đã chấp nhận cuộc gọi, đang kết nối...");

        // Nếu token đã có sẵn, bắt đầu cuộc gọi ngay lập tức
        if (token && appID > 0 && zegoRef.current) {
          startCall();
        }
      }
    };

    // Đăng ký lắng nghe sự kiện acceptCall
    socketService.onAcceptCall(handleAcceptCall);

    return () => {
      // Hủy đăng ký khi unmount
      socketService.off("acceptCall");
    };
  }, [roomID, token, appID]);

  // Cải thiện useEffect xử lý token để đảm bảo bắt đầu cuộc gọi khi có token
  useEffect(() => {
    if (!roomID) {
      console.error("ZegoVideoCall: RoomID is empty, cannot start call");
      return;
    }

    console.log("ZegoVideoCall: Requesting token...");

    socketService.emit("refreshZegoToken", (response: ZegoTokenResponse) => {
      console.log("ZegoVideoCall: Received token response:", response);

      if (response?.error) {
        message.error("Không thể tạo token: " + response.error);
        return;
      }

      if (!response?.token) {
        message.error("Không nhận được token hợp lệ.");
        return;
      }

      const numericAppID =
        typeof response.appID === "string"
          ? parseInt(response.appID, 10)
          : response.appID;

      console.log("ZegoVideoCall: Setting token and appID:", {
        token: response.token.substring(0, 20) + "...",
        appID: numericAppID,
        roomID: roomID,
      });

      setToken(response.token);
      setAppID(numericAppID);

      // Nếu là người nhận cuộc gọi, hoặc cuộc gọi đã được chấp nhận, bắt đầu ngay lập tức
      if (isIncomingCall || callActive) {
        console.log("ZegoVideoCall: Token received, starting call immediately");
        // Thiết lập timeout nhỏ để đảm bảo state đã được cập nhật
        setTimeout(() => {
          if (zegoRef.current) {
            startCall();
          }
        }, 500);
      } else {
        console.log(
          "ZegoVideoCall: Token received, waiting for call acceptance"
        );
      }
    });

    return () => {
      console.log("ZegoVideoCall: Component unmounting, ending call if active");
      if (zegoRef.current && callActive) {
        try {
          zegoRef.current.stopPublishingStream();
          zegoRef.current.logoutRoom();
        } catch (e) {
          console.error("ZegoVideoCall: Error during cleanup:", e);
        }
      }
    };
  }, [roomID, isIncomingCall]);

  useEffect(() => {
    if (!roomID) {
      console.error("ZegoVideoCall: RoomID is empty, cannot start call");
      return;
    }

    if (token && appID > 0 && zegoRef.current) {
      console.log(
        "ZegoVideoCall: Token and appID available, starting call...",
        { roomID, userID }
      );
      startCall();
    }
  }, [token, appID, roomID]);

  const handleToggleMicrophone = useCallback(() => {
    if (!zegoRef.current) return;
    const newState = zegoRef.current.toggleMicrophone();
    if (typeof newState === "boolean") {
      setMicEnabled(newState);
    }
  }, []);

  const handleToggleCamera = useCallback(() => {
    if (!zegoRef.current) return;
    const newState = zegoRef.current.toggleCamera();
    if (typeof newState === "boolean") {
      setCameraEnabled(newState);
    }
  }, []);

  const startCall = async () => {
    if (!zegoRef.current || !token || appID <= 0) {
      console.error(
        "ZegoVideoCall: Không thể bắt đầu cuộc gọi, thiếu dữ liệu cần thiết",
        {
          hasRef: !!zegoRef.current,
          hasToken: !!token,
          appID,
          roomID,
        }
      );
      if (onEndCall) onEndCall();
      return;
    }

    if (!roomID || roomID.trim() === "") {
      console.error("ZegoVideoCall: Không thể bắt đầu cuộc gọi, roomID trống");
      message.error("Không thể bắt đầu cuộc gọi - ID phòng không hợp lệ");
      setHasError(true);
      setErrorMessage("Không thể bắt đầu cuộc gọi: ID phòng không hợp lệ");
      if (onEndCall) onEndCall();
      return;
    }

    try {
      setCallStatus("Đang đăng nhập vào phòng...");
      console.log("ZegoVideoCall: Logging into room:", roomID);

      const loginSuccess = await zegoRef.current.loginRoom();
      if (!loginSuccess) {
        message.error("Không thể tham gia phòng gọi.");
        if (onEndCall) onEndCall();
        return;
      }

      setCallStatus("Đang tạo luồng media...");
      console.log("ZegoVideoCall: Creating media stream...");

      const stream = await zegoRef.current.createStream();
      if (!stream) {
        message.error("Không thể tạo luồng media.");
        if (onEndCall) onEndCall();
        return;
      }

      setCallStatus("Đang xuất bản luồng...");
      console.log("ZegoVideoCall: Publishing stream...");

      const streamID = `${roomID}_${userID}_${Date.now()}`;
      console.log("ZegoVideoCall: Using streamID:", streamID);

      const publishSuccess =
        await zegoRef.current.startPublishingStream(streamID);
      if (!publishSuccess) {
        message.error("Không thể xuất bản luồng của bạn.");
        if (onEndCall) onEndCall();
        return;
      }

      setCallStatus("Đang kết nối...");
      console.log("ZegoVideoCall: Call active!");
      setCallActive(true);

      // Ghi log thêm thông tin kết nối để debug
      console.log("ZegoVideoCall: Thông tin phòng đang kết nối:", {
        roomID,
        userID,
        isIncomingCall,
        token: token.substring(0, 20) + "...",
      });
    } catch (error) {
      console.error("ZegoVideoCall: Error during call setup:", error);
      message.error("Có lỗi khi thiết lập cuộc gọi.");
      if (onEndCall) onEndCall();
    }
  };

  const endCall = () => {
    console.log("ZegoVideoCall: Ending call...", { roomID });
    if (!zegoRef.current) return;

    try {
      zegoRef.current.stopPublishingStream();
      zegoRef.current.logoutRoom();
      setCallActive(false);
      if (onEndCall) onEndCall();
    } catch (error) {
      console.error("ZegoVideoCall: Error ending call:", error);
      message.error("Có lỗi khi kết thúc cuộc gọi.");
      if (onEndCall) onEndCall();
    }
  };

  return (
    <div className="zego-video-call">
      {hasError ? (
        <div className="call-error">
          <div className="error-icon">
            <CloseCircleOutlined
              style={{ fontSize: "48px", color: "#f5222d" }}
            />
          </div>
          <div className="error-message">{errorMessage}</div>
          <Button
            type="primary"
            danger
            onClick={() => onEndCall && onEndCall()}>
            Kết thúc
          </Button>
        </div>
      ) : (
        <>
          <div className="call-status-container">
            {!callActive && <div className="calling-status">{callStatus}</div>}
          </div>

          <div className="call-controls">
            {callActive ? (
              <Space>
                <Button
                  type="primary"
                  danger
                  icon={<CloseCircleOutlined />}
                  onClick={endCall}
                  className="end-call-btn">
                  Kết thúc
                </Button>
                <Button
                  icon={micEnabled ? <AudioOutlined /> : <AudioMutedOutlined />}
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
              </Space>
            ) : (
              <Space>
                <Button
                  type="primary"
                  danger
                  icon={<CloseCircleOutlined />}
                  onClick={endCall}
                  className="end-call-btn">
                  Hủy
                </Button>
                {hasError && (
                  <Button
                    icon={<ReloadOutlined />}
                    onClick={() => window.location.reload()}
                    className="retry-btn">
                    Thử lại
                  </Button>
                )}
              </Space>
            )}
          </div>

          {token && appID > 0 && (
            <ZegoComponent
              ref={zegoRef}
              appID={appID}
              server="wss://webliveroom-test.zego.im/ws"
              roomID={roomID}
              userID={userID}
              userName={userName}
              token={token}
              onMicStatusChanged={setMicEnabled}
              onCameraStatusChanged={setCameraEnabled}
            />
          )}
        </>
      )}

      <style jsx>{`
        .call-error {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 350px;
          text-align: center;
        }
        .error-icon {
          margin-bottom: 20px;
        }
        .error-message {
          font-size: 18px;
          margin-bottom: 20px;
          color: #f5222d;
        }
      `}</style>
    </div>
  );
};

export default ZegoComponent;
