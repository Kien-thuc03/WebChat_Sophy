import { Modal } from "antd";

const SettingsModal: React.FC<{ visible: boolean; onClose: () => void }> = ({
  visible,
  onClose,
}) => {
  return (
    <Modal
      title="Cài đặt"
      open={visible} // Use `open` instead of `visible` in Ant Design v4+
      onCancel={onClose}
      footer={null}
      width={{
        xs: "90%",
        sm: "80%",
        md: "70%",
        lg: "60%",
        xl: "50%",
        xxl: "40%",
      }}>
      <p>Content of the modal</p>
    </Modal>
  );
};

export default SettingsModal;
