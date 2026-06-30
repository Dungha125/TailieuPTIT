import { Modal } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';

const ConfirmDeleteModal = ({ open, title, count = 1, loading, onConfirm, onCancel }) => (
  <Modal
    title={
      <span>
        <ExclamationCircleOutlined style={{ color: '#D32F2F', marginRight: 8 }} />
        Xác nhận xóa
      </span>
    }
    open={open}
    onOk={onConfirm}
    onCancel={onCancel}
    okText="Xóa"
    cancelText="Hủy"
    okButtonProps={{ danger: true, loading }}
    styles={{ content: { borderRadius: 16 } }}
  >
    <p>
      {count > 1
        ? `Bạn có chắc muốn xóa ${count} tài liệu đã chọn? Hành động này không thể hoàn tác.`
        : `Bạn có chắc muốn xóa "${title}"? Hành động này không thể hoàn tác.`}
    </p>
  </Modal>
);

export default ConfirmDeleteModal;
