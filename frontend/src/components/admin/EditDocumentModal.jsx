import { Modal, Form, Input, Switch, Button } from 'antd';
import ClassifyTagFields from './ClassifyTagFields';

const EditDocumentModal = ({ open, document, tags, form, onCancel, onSubmit }) => (
  <Modal
    title="Chỉnh sửa tài liệu"
    open={open}
    onCancel={onCancel}
    footer={null}
    width={520}
    destroyOnClose
    styles={{
      content: {
        borderRadius: 16,
        border: '1px solid rgba(211, 47, 47, 0.15)',
      },
    }}
  >
    <Form form={form} layout="vertical" onFinish={onSubmit}>
      <Form.Item name="title" label="Tiêu đề" rules={[{ required: true, message: 'Nhập tiêu đề' }]}>
        <Input size="large" />
      </Form.Item>
      <Form.Item name="description" label="Mô tả">
        <Input.TextArea rows={3} />
      </Form.Item>
      <ClassifyTagFields tags={tags} />
      <Form.Item name="visibility" label="Công khai" valuePropName="checked">
        <Switch checkedChildren="Public" unCheckedChildren="Private" />
      </Form.Item>
      <Form.Item style={{ marginBottom: 0 }}>
        <Button type="primary" htmlType="submit" block size="large" className="btn-gradient">
          Lưu thay đổi
        </Button>
      </Form.Item>
    </Form>
  </Modal>
);

export default EditDocumentModal;
