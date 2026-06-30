import { Button, Form, Input, Modal, Table, Tag, Tooltip, message } from 'antd';
import { PlusOutlined, FolderOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import { adminApi, documentsApi } from '../../api';
import PageHeader from '../../components/admin/PageHeader';
import StatCard from '../../components/admin/StatCard';
import ConfirmDeleteModal from '../../components/admin/ConfirmDeleteModal';

const UNCLASSIFIED = 'Chưa phân loại';

const AdminTagsPage = () => {
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();

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

  const openEdit = (record) => {
    setEditing(record);
    editForm.setFieldsValue({ name: record.name });
  };

  const handleUpdate = async (values) => {
    setSaving(true);
    try {
      await adminApi.updateTag(editing.id, values.name);
      message.success('Cập nhật danh mục thành công');
      setEditing(null);
      fetchTags();
    } catch (err) {
      message.error(err.response?.data?.detail || 'Cập nhật danh mục thất bại');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    setDeleting(true);
    try {
      await adminApi.deleteTag(deleteTarget.id);
      message.success('Xóa danh mục thành công');
      setDeleteTarget(null);
      fetchTags();
    } catch (err) {
      message.error(err.response?.data?.detail || 'Xóa danh mục thất bại');
    } finally {
      setDeleting(false);
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
    {
      title: '',
      key: 'actions',
      width: 100,
      render: (_, record) => {
        if (record.name === UNCLASSIFIED) return null;
        return (
          <div style={{ display: 'flex', gap: 6 }}>
            <Tooltip title="Sửa">
              <button type="button" className="action-btn" onClick={() => openEdit(record)}>
                <EditOutlined />
              </button>
            </Tooltip>
            <Tooltip title="Xóa">
              <button
                type="button"
                className="action-btn action-btn--danger"
                onClick={() => setDeleteTarget(record)}
              >
                <DeleteOutlined />
              </button>
            </Tooltip>
          </div>
        );
      },
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

      <Modal
        title="Sửa danh mục"
        open={!!editing}
        onCancel={() => setEditing(null)}
        footer={null}
        destroyOnClose
        styles={{ content: { borderRadius: 16 } }}
      >
        <Form form={editForm} layout="vertical" onFinish={handleUpdate}>
          <Form.Item
            name="name"
            label="Tên danh mục"
            rules={[{ required: true, message: 'Nhập tên danh mục' }]}
          >
            <Input size="large" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={saving} block size="large" className="btn-gradient">
            Lưu thay đổi
          </Button>
        </Form>
      </Modal>

      <ConfirmDeleteModal
        open={!!deleteTarget}
        title={deleteTarget?.name}
        loading={deleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default AdminTagsPage;
