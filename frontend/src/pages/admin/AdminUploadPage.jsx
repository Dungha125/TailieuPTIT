import {
  Button,
  Form,
  Input,
  Switch,
  Select,
  Upload,
  message,
  List,
  Tag,
} from 'antd';
import { InboxOutlined, UploadOutlined } from '@ant-design/icons';
import { useCallback, useEffect, useState } from 'react';
import { adminApi, documentsApi } from '../../api';

const { Dragger } = Upload;
const MAX_SIZE_MB = 50;

const AdminUploadPage = () => {
  const [form] = Form.useForm();
  const [tags, setTags] = useState([]);
  const [fileList, setFileList] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [results, setResults] = useState([]);

  useEffect(() => {
    documentsApi.tags().then((res) => setTags(res.data.items)).catch(console.error);
  }, []);

  const handleUpload = async (values) => {
    if (fileList.length === 0) {
      message.warning('Vui lòng chọn ít nhất một file');
      return;
    }

    setUploading(true);
    setResults([]);

    try {
      const formData = new FormData();
      fileList.forEach((f) => formData.append('files', f.originFileObj || f));
      formData.append('title', values.title || '');
      formData.append('description', values.description || '');
      formData.append('visibility', values.visibility !== false);
      if (values.tag_ids?.length) {
        formData.append('tag_ids', values.tag_ids.join(','));
      }

      const res = await adminApi.upload(formData);
      setResults(res.data);

      const successCount = res.data.filter((r) => !r.duplicate).length;
      const dupCount = res.data.filter((r) => r.duplicate).length;

      if (successCount > 0) message.success(`Upload thành công ${successCount} file`);
      if (dupCount > 0) message.warning(`Phát hiện ${dupCount} file trùng lặp`);

      setFileList([]);
      form.resetFields(['title', 'description']);
    } catch (err) {
      message.error(err.response?.data?.detail || 'Upload thất bại');
    } finally {
      setUploading(false);
    }
  };

  const beforeUpload = useCallback((file) => {
    const isValidSize = file.size / 1024 / 1024 < MAX_SIZE_MB;
    if (!isValidSize) {
      message.error(`File ${file.name} vượt quá ${MAX_SIZE_MB}MB`);
      return Upload.LIST_IGNORE;
    }
    return false;
  }, []);

  const uploadProps = {
    multiple: true,
    fileList,
    beforeUpload,
    onChange: ({ fileList: newList }) => setFileList(newList),
    onDrop: () => setDragOver(false),
    accept: '.pdf,.doc,.docx,.zip,.jpg,.jpeg,.png,.gif,.webp',
  };

  return (
    <div>
      <h1 className="page-title">Upload tài liệu</h1>
      <p className="page-subtitle">Kéo thả hoặc chọn nhiều file để upload</p>

      <Form form={form} layout="vertical" onFinish={handleUpload} initialValues={{ visibility: true }}>
        <div
          className={`upload-dropzone ${dragOver ? 'drag-over' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
        >
          <Dragger {...uploadProps} style={{ border: 'none', background: 'transparent' }}>
            <p className="upload-icon">
              <InboxOutlined />
            </p>
            <p style={{ fontSize: 16 }}>Kéo thả file vào đây hoặc click để chọn</p>
            <p style={{ color: '#999' }}>
              Hỗ trợ: PDF, DOCX, ZIP, JPG, PNG (tối đa {MAX_SIZE_MB}MB/file)
            </p>
          </Dragger>
        </div>

        <Form.Item name="title" label="Tiêu đề (tùy chọn)" style={{ marginTop: 24 }}>
          <Input placeholder="Để trống sẽ dùng tên file" />
        </Form.Item>

        <Form.Item name="description" label="Mô tả">
          <Input.TextArea rows={3} placeholder="Mô tả tài liệu..." />
        </Form.Item>

        <Form.Item name="tag_ids" label="Nhãn">
          <Select
            mode="multiple"
            placeholder="Chọn nhãn (để trống = Chưa phân loại)"
            options={tags
              .filter((t) => t.name !== 'Chưa phân loại')
              .map((t) => ({ value: t.id, label: t.name }))}
          />
        </Form.Item>

        <Form.Item name="visibility" label="Công khai" valuePropName="checked">
          <Switch checkedChildren="Public" unCheckedChildren="Private" />
        </Form.Item>

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={uploading}
            icon={<UploadOutlined />}
            size="large"
          >
            Upload {fileList.length > 0 ? `(${fileList.length} file)` : ''}
          </Button>
        </Form.Item>
      </Form>

      {results.length > 0 && (
        <List
          header="Kết quả upload"
          bordered
          dataSource={results}
          renderItem={(item) => (
            <List.Item>
              <span>{item.title}</span>
              <Tag color={item.duplicate ? 'orange' : 'green'}>{item.message}</Tag>
            </List.Item>
          )}
          style={{ marginTop: 24 }}
        />
      )}
    </div>
  );
};

export default AdminUploadPage;
