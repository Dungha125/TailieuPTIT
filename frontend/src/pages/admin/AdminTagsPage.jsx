import { Button, Form, Input, Table, Tag, message } from 'antd';
import { PlusOutlined, FolderOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import { adminApi, documentsApi } from '../../api';
import PageHeader from '../../components/admin/PageHeader';
import StatCard from '../../components/admin/StatCard';

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
      message.success('Tạo danh mục thành công');
      form.resetFields();
      fetchTags();
    } catch (err) {
      message.error(err.response?.data?.detail || 'Tạo danh mục thất bại');
    } finally {
      setCreating(false);
    }
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
    {
      title: 'Tên danh mục',
      dataIndex: 'name',
      key: 'name',
      render: (name) => (
        <Tag color="red" style={{ borderRadius: 12, padding: '4px 12px' }}>
          {name}
        </Tag>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Danh mục"
        subtitle="Tạo và quản lý nhãn phân loại tài liệu"
        breadcrumbs={[{ label: 'Danh mục' }]}
      />

      <div className="admin-stats" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <StatCard icon={<FolderOutlined />} label="Tổng danh mục" value={tags.length} color="red" />
      </div>

      <div className="admin-tags-panel">
        <Form form={form} layout="inline" onFinish={handleCreate} style={{ marginBottom: 24, flexWrap: 'wrap', gap: 8 }}>
          <Form.Item name="name" rules={[{ required: true, message: 'Nhập tên danh mục' }]}>
            <Input placeholder="Tên danh mục mới" size="large" style={{ width: 280 }} />
          </Form.Item>
          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={creating}
              icon={<PlusOutlined />}
              size="large"
              className="btn-gradient"
            >
              Thêm danh mục
            </Button>
          </Form.Item>
        </Form>

        <Table
          dataSource={tags}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 20, showTotal: (t) => `${t} danh mục` }}
        />
      </div>
    </div>
  );
};

export default AdminTagsPage;
