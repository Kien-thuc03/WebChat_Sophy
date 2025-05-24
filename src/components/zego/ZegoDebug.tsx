import React, { useEffect, useState } from "react";
import {
  Card,
  Button,
  Typography,
  Space,
  Alert,
  Divider,
  Spin,
  Collapse,
  Tag,
  Input,
} from "antd";
import { zegoService } from "../../services/zegoService";
import {
  generateZegoToken,
  ZEGO_APP_ID,
  ZEGO_SERVER,
} from "../../services/zegoHelper";

const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;

const ZegoDebug: React.FC = () => {
  const [isSDKLoaded, setIsSDKLoaded] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [sdkVersion, setSDKVersion] = useState<string>("Unknown");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [mediaPermissions, setMediaPermissions] = useState<{
    camera: boolean;
    microphone: boolean;
  } | null>(null);
  const [tokenGenerated, setTokenGenerated] = useState<string>("");
  const [userId, setUserId] = useState<string>(
    localStorage.getItem("userId") || ""
  );
  const [roomId, setRoomId] = useState<string>(`test_room_${Date.now()}`);

  // Kiểm tra xem Zego SDK đã được tải chưa
  useEffect(() => {
    const checkSDKLoaded = () => {
      if (typeof window !== "undefined") {
        const isLoaded = !!window.ZegoExpressEngine;
        setIsSDKLoaded(isLoaded);

        if (isLoaded && window.ZegoExpressEngine.getVersion) {
          try {
            const version = window.ZegoExpressEngine.getVersion();
            setSDKVersion(version);
          } catch (error) {
            console.error("Lỗi khi lấy phiên bản SDK:", error);
            setSDKVersion("Error getting version");
          }
        }
      }
    };

    // Kiểm tra ngay lập tức
    checkSDKLoaded();

    // Đăng ký lắng nghe sự kiện khi SDK được tải
    const handleSDKLoaded = () => {
      console.log("ZegoDebug: Phát hiện sự kiện SDK đã được tải");
      checkSDKLoaded();
    };

    window.addEventListener("zegoSDKLoaded", handleSDKLoaded);

    // Kiểm tra mỗi 2 giây trong trường hợp sự kiện không được kích hoạt
    const intervalId = setInterval(checkSDKLoaded, 2000);

    return () => {
      window.removeEventListener("zegoSDKLoaded", handleSDKLoaded);
      clearInterval(intervalId);
    };
  }, []);

  // Kiểm tra quyền truy cập media
  const checkPermissions = async () => {
    setIsLoading(true);
    try {
      const permissions = await zegoService.checkMediaPermissions();
      setMediaPermissions(permissions);
    } catch (error) {
      console.error("Lỗi khi kiểm tra quyền truy cập media:", error);
      setErrorMessage("Không thể kiểm tra quyền truy cập media");
    } finally {
      setIsLoading(false);
    }
  };

  // Thử tải lại SDK
  const reloadSDK = () => {
    setIsLoading(true);
    try {
      if (window.loadZegoSDK) {
        window.loadZegoSDK();
        setTimeout(() => {
          const isLoaded = !!window.ZegoExpressEngine;
          setIsSDKLoaded(isLoaded);
          setIsLoading(false);
        }, 3000);
      } else {
        setErrorMessage("window.loadZegoSDK function not found");
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Lỗi khi tải lại SDK:", error);
      setErrorMessage(
        "Lỗi khi tải lại SDK: " +
          (error instanceof Error ? error.message : String(error))
      );
      setIsLoading(false);
    }
  };

  // Tạo token
  const generateToken = () => {
    try {
      if (!userId) {
        setErrorMessage("Vui lòng nhập User ID");
        return;
      }

      const token = generateZegoToken(userId, roomId);
      setTokenGenerated(token);
    } catch (error) {
      console.error("Lỗi khi tạo token:", error);
      setErrorMessage(
        "Lỗi khi tạo token: " +
          (error instanceof Error ? error.message : String(error))
      );
    }
  };

  return (
    <Card
      title="ZEGO Debug Tool"
      style={{ maxWidth: 800, margin: "20px auto" }}>
      <Space direction="vertical" style={{ width: "100%" }}>
        {errorMessage && (
          <Alert
            message="Error"
            description={errorMessage}
            type="error"
            closable
            onClose={() => setErrorMessage("")}
          />
        )}

        <Divider>SDK Status</Divider>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}>
          <Space>
            <Text strong>SDK Loaded:</Text>
            {isSDKLoaded ? (
              <Tag color="green">Yes</Tag>
            ) : (
              <Tag color="red">No</Tag>
            )}
          </Space>

          <Button
            type="primary"
            loading={isLoading}
            onClick={reloadSDK}
            disabled={isSDKLoaded}>
            {isSDKLoaded ? "SDK Already Loaded" : "Force Reload SDK"}
          </Button>
        </div>

        <div>
          <Text strong>SDK Version: </Text>
          <Text>{sdkVersion}</Text>
        </div>

        <Divider>Media Permissions</Divider>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}>
          {mediaPermissions ? (
            <Space>
              <Text strong>Camera: </Text>
              {mediaPermissions.camera ? (
                <Tag color="green">Granted</Tag>
              ) : (
                <Tag color="red">Denied</Tag>
              )}

              <Text strong>Microphone: </Text>
              {mediaPermissions.microphone ? (
                <Tag color="green">Granted</Tag>
              ) : (
                <Tag color="red">Denied</Tag>
              )}
            </Space>
          ) : (
            <Text type="secondary">Click to check permissions</Text>
          )}

          <Button onClick={checkPermissions} loading={isLoading}>
            Check Permissions
          </Button>
        </div>

        <Divider>Generate Token (Client-side)</Divider>

        <Space direction="vertical" style={{ width: "100%" }}>
          <div style={{ display: "flex", gap: "10px" }}>
            <Input
              placeholder="User ID"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              style={{ width: "50%" }}
            />

            <Input
              placeholder="Room ID"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              style={{ width: "50%" }}
            />
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}>
            <div>
              <Text strong>App ID: </Text>
              <Text copyable>{ZEGO_APP_ID}</Text>
            </div>

            <Button type="primary" onClick={generateToken} disabled={!userId}>
              Generate Token
            </Button>
          </div>

          {tokenGenerated && (
            <Paragraph>
              <Text strong>Generated Token: </Text>
              <Text copyable={{ text: tokenGenerated }}>
                {tokenGenerated.substring(0, 20)}...
              </Text>
            </Paragraph>
          )}
        </Space>

        <Divider>Information</Divider>

        <Collapse>
          <Panel header="Browser Information" key="1">
            <Paragraph>
              <Text strong>User Agent: </Text>
              <Text>{navigator.userAgent}</Text>
            </Paragraph>
            <Paragraph>
              <Text strong>ZEGO Server: </Text>
              <Text>{ZEGO_SERVER}</Text>
            </Paragraph>
          </Panel>
        </Collapse>
      </Space>
    </Card>
  );
};

export default ZegoDebug;
