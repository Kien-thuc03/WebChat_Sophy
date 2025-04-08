import { Modal, Form, Input, Button, message } from "antd";
import { useState, useContext } from "react";
import { AuthContext } from "../../../features/auth/context/AuthContext";

interface ChangePasswordModalProps {
  visible: boolean;
  onClose: () => void;
}

interface ChangePasswordFormValues {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  visible,
  onClose,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { changePassword } = useContext(AuthContext);

  const handleSubmit = async (values: ChangePasswordFormValues) => {
    if (values.newPassword !== values.confirmPassword) {
      message.error("Mật khẩu mới và xác nhận mật khẩu không khớp");
      return;
    }

    setLoading(true);
    try {
      await changePassword(values.currentPassword, values.newPassword);
      message.success("Đổi mật khẩu thành công");
      form.resetFields();
      onClose();
    } catch (error: unknown) {
      if (error instanceof Error) {
        message.error(error.message);
      } else {
        message.error("Đổi mật khẩu thất bại. Vui lòng thử lại");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Đổi mật khẩu"
      open={visible}
      onCancel={onClose}
      footer={null}
      maskClosable={false}
      destroyOnClose>
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        className="mt-4">
        <Form.Item
          name="currentPassword"
          label="Mật khẩu hiện tại"
          rules={[
            { required: true, message: "Vui lòng nhập mật khẩu hiện tại" },
          ]}>
          <Input.Password placeholder="Nhập mật khẩu hiện tại" />
        </Form.Item>

        <Form.Item
          name="newPassword"
          label="Mật khẩu mới"
          rules={[
            { required: true, message: "Vui lòng nhập mật khẩu mới" },
            { min: 6, message: "Mật khẩu phải có ít nhất 6 ký tự" },
          ]}>
          <Input.Password placeholder="Nhập mật khẩu mới" />
        </Form.Item>

        <Form.Item
          name="confirmPassword"
          label="Xác nhận mật khẩu mới"
          rules={[
            { required: true, message: "Vui lòng xác nhận mật khẩu mới" },
            { min: 6, message: "Mật khẩu phải có ít nhất 6 ký tự" },
          ]}>
          <Input.Password placeholder="Nhập lại mật khẩu mới" />
        </Form.Item>

        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>Hủy</Button>
          <Button type="primary" htmlType="submit" loading={loading}>
            Xác nhận
          </Button>
        </div>
      </Form>
    </Modal>
  );
};

export default ChangePasswordModal;
