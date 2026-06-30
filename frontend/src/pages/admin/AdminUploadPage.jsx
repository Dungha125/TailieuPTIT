import { Button, Form, Input, Switch, Select, Upload, message, List, Tag, Progress } from 'antd';
import { InboxOutlined, UploadOutlined, FileOutlined } from '@ant-design/icons';
import { useCallback, useEffect, useState } from 'react';
import { adminApi, documentsApi } from '../../api';
import PageHeader from '../../components/admin/PageHeader';

const { Dragger } = Upload;
const MAX_SIZE_MB = 50;

const AdminUploadPage = () => {
  const [form] = Form.useForm();
  const [tags, setTags] = useState([]);
  const [fileList, setFileList] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [results, setResults] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    documentsApi.tags().then((res) => setTags(res.data.items)).catch(console.error);
  }, []);

  const handleUpload = async (values) => {
    if (fileList.length === 0) {
      message.warning('Vui lòng chọn ít nhất một file');
      return;
    }

    setUploading(true);
    setUploadProgress(30);
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

      setUploadProgress(60);
      const res = await adminApi.upload(formData);
      setUploadProgress(100);
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
      setTimeout(() => setUploadProgress(0), 800);
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
    showUploadList: false,
  };

  return (
    <div>
      <PageHeader
        title="Upload tài liệu"
        subtitle="Kéo thả hoặc chọn file để tải lên hệ thống"
        breadcrumbs={[
          { label: 'Quản lý tài liệu', path: '/internal-admin-portal/files' },
          { label: 'Upload' },
        ]}
      />

      <Form form={form} layout="vertical" onFinish={handleUpload} initialValues={{ visibility: true }}>
        <div
          className={`upload-zone ${dragOver ? 'upload-zone--drag' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
        >
          <Dragger {...uploadProps} style={{ border: 'none', background: 'transparent', padding: 0 }}>
            <div className="upload-zone__icon">
              <InboxOutlined />
            </div>
            <div className="upload-zone__title">Kéo thả file vào đây</div>
            <div className="upload-zone__hint">
              hoặc click để chọn · PDF, DOCX, ZIP, JPG, PNG (tối đa {MAX_SIZE_MB}MB/file)
            </div>
          </Dragger>
        </div>

        {fileList.length > 0 && (
          <div className="upload-form-card" style={{ marginTop: 16 }}>
            <div style={{ fontWeight: 600, marginBottom: 12 }}>
              <FileOutlined style={{ marginRight: 8, color: '#D32F2F' }} />
              {fileList.length} file đã chọn
            </div>
            <List
              size="small"
              dataSource={fileList}
              renderItem={(f) => (
                <List.Item>
                  {f.name}
                  <Tag>{((f.size || 0) / 1024 / 1024).toFixed(2)} MB</Tag>
                </List.Item>
              )}
            />
          </div>
        )}

        <div className="upload-form-card">
          <Form.Item name="title" label="Tiêu đề">
            <Input size="large" placeholder="Để trống sẽ dùng tên file" />
          </Form.Item>
          <Form.Item name="description" label="Mô tả">
            <Input.TextArea rows={3} placeholder="Mô tả tài liệu..." />
          </Form.Item>
          <Form.Item name="tag_ids" label="Danh mục / Tags">
            <Select
              mode="multiple"
              size="large"
              placeholder="Chọn tags (để trống = Chưa phân loại)"
              options={tags
                .filter((t) => t.name !== 'Chưa phân loại')
                .map((t) => ({ value: t.id, label: t.name }))}
            />
          </Form.Item>
          <Form.Item name="visibility" label="Công khai" valuePropName="checked">
            <Switch checkedChildren="Public" unCheckedChildren="Private" />
          </Form.Item>

          {uploading && uploadProgress > 0 && (
            <Progress percent={uploadProgress} strokeColor={{ from: '#D32F2F', to: '#B71C1C' }} style={{ marginBottom: 16 }} />
          )}

          <Button
            type="primary"
            htmlType="submit"
            loading={uploading}
            icon={<UploadOutlined />}
            size="large"
            block
            className="btn-gradient"
          >
            Upload {fileList.length > 0 ? `(${fileList.length} file)` : ''}
          </Button>
        </div>
      </Form>

      {results.length > 0 && (
        <div className="upload-form-card">
          <div style={{ fontWeight: 600, marginBottom: 12 }}>Kết quả upload</div>
          <List
            dataSource={results}
            renderItem={(item) => (
              <List.Item>
                <span>{item.title}</span>
                <Tag color={item.duplicate ? 'orange' : 'green'} style={{ borderRadius: 12 }}>
                  {item.message}
                </Tag>
              </List.Item>
            )}
          />
        </div>
      )}
    </div>
  );
};

export default AdminUploadPage;
