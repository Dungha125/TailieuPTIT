import {
  Button,
  Table,
  Tag,
  Modal,
  Form,
  Input,
  Switch,
  Select,
  message,
  Popconfirm,
  Space,
} from 'antd';
import { EditOutlined, DeleteOutlined, EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import { adminApi, documentsApi } from '../../api';
import { formatDate, formatFileSize } from '../../utils/helpers';

const AdminFilesPage = () => {
  const [documents, setDocuments] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();

  const fetchData = () => {
    setLoading(true);
    Promise.all([adminApi.listDocuments(), documentsApi.tags()])
      .then(([docsRes, tagsRes]) => {
        setDocuments(docsRes.data);
        setTags(tagsRes.data.items);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleEdit = (record) => {
    setEditing(record);
    form.setFieldsValue({
      title: record.title,
      description: record.description,
      visibility: record.visibility,
      tag_ids: record.tags?.map((t) => t.id),
    });
  };

  const handleUpdate = async (values) => {
    try {
      await adminApi.updateDocument(editing.id, values);
      message.success('Cập nhật thành công');
      setEditing(null);
      fetchData();
    } catch (err) {
      message.error(err.response?.data?.detail || 'Cập nhật thất bại');
    }
  };

  const handleDelete = async (id) => {
    try {
      await adminApi.deleteDocument(id);
      message.success('Xóa thành công');
      fetchData();
    } catch (err) {
      message.error(err.response?.data?.detail || 'Xóa thất bại');
    }
  };

  const columns = [
    { title: 'Tiêu đề', dataIndex: 'title', key: 'title', ellipsis: true },
    {
      title: 'Loại',
      dataIndex: 'file_type',
      key: 'file_type',
      width: 80,
      render: (v) => v?.toUpperCase(),
    },
    {
      title: 'Kích thước',
      dataIndex: 'size',
      key: 'size',
      width: 100,
      render: (v) => formatFileSize(v),
    },
    {
      title: 'Nhãn',
      dataIndex: 'tags',
      key: 'tags',
      render: (tags) =>
        tags?.map((t) => (
          <Tag key={t.id} color="red">
            {t.name}
          </Tag>
        )),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'visibility',
      key: 'visibility',
      width: 100,
      render: (v) =>
        v ? (
          <Tag icon={<EyeOutlined />} color="green">
            Public
          </Tag>
        ) : (
          <Tag icon={<EyeInvisibleOutlined />} color="default">
            Private
          </Tag>
        ),
    },
    {
      title: 'Lượt tải',
      dataIndex: 'download_count',
      key: 'download_count',
      width: 80,
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 150,
      render: (v) => formatDate(v),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          />
          <Popconfirm
            title="Xóa tài liệu này?"
            onConfirm={() => handleDelete(record.id)}
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <h1 className="page-title">Quản lý File</h1>
      <p className="page-subtitle">Chỉnh sửa metadata, visibility và xóa tài liệu</p>

      <Table
        dataSource={documents}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 15 }}
        scroll={{ x: 1000 }}
      />

      <Modal
        title="Chỉnh sửa tài liệu"
        open={!!editing}
        onCancel={() => setEditing(null)}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleUpdate}>
          <Form.Item name="title" label="Tiêu đề" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Mô tả">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="tag_ids" label="Nhãn">
            <Select
              mode="multiple"
              options={tags.map((t) => ({ value: t.id, label: t.name }))}
            />
          </Form.Item>
          <Form.Item name="visibility" label="Công khai" valuePropName="checked">
            <Switch checkedChildren="Public" unCheckedChildren="Private" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              Lưu thay đổi
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AdminFilesPage;
