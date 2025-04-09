import { Modal, Form, Input, Button, message } from "antd";
import { useState, useContext } from "react";
import { AuthContext } from "../../../features/auth/context/AuthContext";
import { useLanguage } from "../../../features/auth/context/LanguageContext"; // Import context

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
  const { t } = useLanguage(); // Sử dụng context

  const handleSubmit = async (values: ChangePasswordFormValues) => {
    if (values.newPassword !== values.confirmPassword) {
      message.error(
        t.password_mismatch || "Mật khẩu mới và xác nhận mật khẩu không khớp"
      );
      return;
    }

    setLoading(true);
    try {
      await changePassword(values.currentPassword, values.newPassword);
      message.success(t.change_password_success || "Đổi mật khẩu thành công");
      form.resetFields();
      onClose();
    } catch (error: unknown) {
      if (error instanceof Error) {
        // Hiển thị thông báo lỗi chính xác từ API
        message.error(
          error.message || "Đổi mật khẩu thất bại. Vui lòng thử lại"
        );
      } else {
        message.error(
          t.change_password_error || "Đổi mật khẩu thất bại. Vui lòng thử lại"
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={t.change_password || "Đổi mật khẩu"}
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
          label={t.current_password || "Mật khẩu hiện tại"}
          rules={[
            {
              required: true,
              message:
                t.enter_current_password || "Vui lòng nhập mật khẩu hiện tại",
            },
          ]}>
          <Input.Password
            placeholder={t.enter_current_password || "Nhập mật khẩu hiện tại"}
          />
        </Form.Item>
        <Form.Item
          name="newPassword"
          label={t.new_password || "Mật khẩu mới"}
          rules={[
            {
              required: true,
              message: t.enter_new_password || "Vui lòng nhập mật khẩu mới",
            },
            {
              min: 6,
              message:
                t.password_min_length || "Mật khẩu phải có ít nhất 6 ký tự",
            },
          ]}>
          <Input.Password
            placeholder={t.enter_new_password || "Nhập mật khẩu mới"}
          />
        </Form.Item>
        <Form.Item
          name="confirmPassword"
          label={t.confirm_new_password || "Xác nhận mật khẩu mới"}
          rules={[
            {
              required: true,
              message:
                t.confirm_new_password_required ||
                "Vui lòng xác nhận mật khẩu mới",
            },
            {
              min: 6,
              message:
                t.password_min_length || "Mật khẩu phải có ít nhất 6 ký tự",
            },
          ]}>
          <Input.Password
            placeholder={t.confirm_new_password || "Nhập lại mật khẩu mới"}
          />
        </Form.Item>
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>{t.cancel || "Hủy"}</Button>
          <Button type="primary" htmlType="submit" loading={loading}>
            {t.confirm || "Xác nhận"}
          </Button>
        </div>
      </Form>
    </Modal>
  );
};
export default ChangePasswordModal;
