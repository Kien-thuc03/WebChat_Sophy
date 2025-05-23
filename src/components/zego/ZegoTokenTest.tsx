import { useState, useEffect } from "react";
import zegoHelper from "../../services/zegoHelper";
import {
  Button,
  Card,
  Typography,
  Row,
  Col,
  Divider,
  Space,
  message,
} from "antd";

const { Title, Text } = Typography;

const ZegoTokenTest = () => {
  const [token, setToken] = useState<string>("");
  const [userId, setUserId] = useState<string>(
    localStorage.getItem("userId") || ""
  );
  const [roomId, setRoomId] = useState<string>(`test_room_${Date.now()}`);
  const [mediaPermissions, setMediaPermissions] = useState<{
    camera: boolean;
    microphone: boolean;
  } | null>(null);

  useEffect(() => {
    // Kiểm tra quyền truy cập media
    const checkPermissions = async () => {
      const permissions = await zegoHelper.checkMediaPermissions();
      setMediaPermissions(permissions);
    };
    checkPermissions();
  }, []);

  const generateToken = () => {
    try {
      if (!userId) {
        message.error("Vui lòng đăng nhập để có User ID");
        return;
      }

      const generatedToken = zegoHelper.generateZegoToken(userId, roomId);
      setToken(generatedToken);
      message.success("Đã tạo token thành công!");
    } catch (error) {
      message.error(
        "Lỗi khi tạo token: " +
          (error instanceof Error ? error.message : "Unknown error")
      );
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(token);
      message.success("Đã sao chép token vào clipboard");
    } catch (error) {
      message.error("Không thể sao chép token");
    }
  };

  return (
    <Card
      title="ZEGO Token Test"
      style={{ maxWidth: 800, margin: "20px auto" }}>
      <Space direction="vertical" style={{ width: "100%" }}>
        <Title level={4}>Thông tin ZEGO</Title>
        <Text>App ID: {zegoHelper.ZEGO_APP_ID}</Text>

        <Divider />

        <Title level={4}>Quyền truy cập thiết bị</Title>
        <Row gutter={16}>
          <Col span={12}>
            <Card title="Camera" type="inner">
              {mediaPermissions === null
                ? "Đang kiểm tra..."
                : mediaPermissions.camera
                  ? "Đã cấp quyền ✅"
                  : "Chưa cấp quyền ❌"}
            </Card>
          </Col>
          <Col span={12}>
            <Card title="Microphone" type="inner">
              {mediaPermissions === null
                ? "Đang kiểm tra..."
                : mediaPermissions.microphone
                  ? "Đã cấp quyền ✅"
                  : "Chưa cấp quyền ❌"}
            </Card>
          </Col>
        </Row>

        <Divider />

        <Title level={4}>Tạo Token</Title>
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Button type="primary" onClick={generateToken} block>
              Tạo Token ZEGO
            </Button>
          </Col>

          {token && (
            <>
              <Col span={24}>
                <Card title="Token đã tạo" type="inner">
                  <div
                    style={{
                      wordBreak: "break-all",
                      maxHeight: "100px",
                      overflowY: "auto",
                      padding: "8px",
                      backgroundColor: "#f5f5f5",
                      borderRadius: "4px",
                    }}>
                    {token}
                  </div>
                  <Button
                    onClick={copyToClipboard}
                    type="default"
                    style={{ marginTop: "8px" }}>
                    Sao chép
                  </Button>
                </Card>
              </Col>
            </>
          )}
        </Row>
      </Space>
    </Card>
  );
};

export default ZegoTokenTest;
