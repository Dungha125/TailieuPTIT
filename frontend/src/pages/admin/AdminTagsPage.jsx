import { Button, Form, Input, Table, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import { adminApi, documentsApi } from '../../api';

const AdminTagsPage = () => {
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form] = Form.useForm();

  const fetchTags = () => {
    setLoading(true);
    documentsApi
      .tags()
      .then((res) => setTags(res.data.items))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTags();
  }, []);

  const handleCreate = async (values) => {
    setCreating(true);
    try {
      await adminApi.createTag(values.name);
      message.success('Tạo tag thành công');
      form.resetFields();
      fetchTags();
    } catch (err) {
      message.error(err.response?.data?.detail || 'Tạo tag thất bại');
    } finally {
      setCreating(false);
    }
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
    { title: 'Tên nhãn', dataIndex: 'name', key: 'name' },
  ];

  return (
    <div>
      <h1 className="page-title">Quản lý Tag</h1>
      <p className="page-subtitle">Tạo và quản lý nhãn phân loại tài liệu</p>

      <Form
        form={form}
        layout="inline"
        onFinish={handleCreate}
        style={{ marginBottom: 24 }}
      >
        <Form.Item
          name="name"
          rules={[{ required: true, message: 'Nhập tên tag' }]}
        >
          <Input placeholder="Tên tag mới" style={{ width: 250 }} />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={creating} icon={<PlusOutlined />}>
            Thêm tag
          </Button>
        </Form.Item>
      </Form>

      <Table
        dataSource={tags}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 20 }}
      />
    </div>
  );
};

export default AdminTagsPage;
