import { Button, Form, Input, Modal, Select, Table, Tag, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import { adminApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/admin/PageHeader';
import ConfirmDeleteModal from '../../components/admin/ConfirmDeleteModal';
import { ROLE_ADMIN, ROLE_EDITOR, roleLabel } from '../../utils/roles';

const ROLE_OPTIONS = [
  { value: ROLE_EDITOR, label: roleLabel(ROLE_EDITOR) },
  { value: ROLE_ADMIN, label: roleLabel(ROLE_ADMIN) },
];

const AdminUsersPage = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();

  const fetchUsers = () => {
    setLoading(true);
    adminApi
      .listUsers()
      .then((res) => setUsers(res.data))
      .catch((err) => message.error(err.response?.data?.detail || 'Không tải được danh sách người dùng'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreate = async (values) => {
    setSubmitting(true);
    try {
      await adminApi.createUser(values);
      message.success('Tạo tài khoản thành công');
      setCreateOpen(false);
      createForm.resetFields();
      fetchUsers();
    } catch (err) {
      message.error(err.response?.data?.detail || 'Tạo tài khoản thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (record) => {
    setEditUser(record);
    editForm.setFieldsValue({ role: record.role, password: '' });
  };

  const handleUpdate = async (values) => {
    if (!editUser) return;
    setSubmitting(true);
    try {
      const payload = { role: values.role };
      if (values.password?.trim()) {
        payload.password = values.password;
      }
      await adminApi.updateUser(editUser.id, payload);
      message.success('Cập nhật thành công');
      setEditUser(null);
      fetchUsers();
    } catch (err) {
      message.error(err.response?.data?.detail || 'Cập nhật thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSubmitting(true);
    try {
      await adminApi.deleteUser(deleteTarget.id);
      message.success('Đã xóa tài khoản');
      setDeleteTarget(null);
      fetchUsers();
    } catch (err) {
      message.error(err.response?.data?.detail || 'Xóa thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      title: 'Tên đăng nhập',
      dataIndex: 'username',
      key: 'username',
    },
    {
      title: 'Vai trò',
      dataIndex: 'role',
      key: 'role',
      width: 160,
      render: (role) => (
        <Tag color={role === ROLE_ADMIN ? 'red' : 'blue'} style={{ borderRadius: 12 }}>
          {roleLabel(role)}
        </Tag>
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <div style={{ display: 'flex', gap: 8 }}>
          <Button type="text" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            disabled={record.id === currentUser?.id}
            onClick={() => setDeleteTarget(record)}
          />
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Người dùng"
        subtitle="Tạo và quản lý tài khoản Quản trị viên / Biên tập viên"
        breadcrumbs={[{ label: 'Người dùng' }]}
        action={
          <Button
            type="primary"
            className="btn-gradient"
            icon={<PlusOutlined />}
            onClick={() => setCreateOpen(true)}
          >
            Tạo tài khoản
          </Button>
        }
      />

      <div className="admin-doc-panel">
        <Table
          dataSource={users}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={false}
        />
      </div>

      <Modal
        title="Tạo tài khoản mới"
        open={createOpen}
        onCancel={() => {
          setCreateOpen(false);
          createForm.resetFields();
        }}
        footer={null}
        destroyOnClose
      >
        <Form
          form={createForm}
          layout="vertical"
          onFinish={handleCreate}
          initialValues={{ role: ROLE_EDITOR }}
        >
          <Form.Item
            name="username"
            label="Tên đăng nhập"
            rules={[
              { required: true, message: 'Nhập tên đăng nhập' },
              { min: 3, message: 'Tối thiểu 3 ký tự' },
            ]}
          >
            <Input placeholder="vd: bien_tap_01" />
          </Form.Item>
          <Form.Item
            name="password"
            label="Mật khẩu"
            rules={[
              { required: true, message: 'Nhập mật khẩu' },
              { min: 6, message: 'Tối thiểu 6 ký tự' },
            ]}
          >
            <Input.Password placeholder="Mật khẩu đăng nhập" />
          </Form.Item>
          <Form.Item name="role" label="Vai trò" rules={[{ required: true }]}>
            <Select options={ROLE_OPTIONS} />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Button onClick={() => setCreateOpen(false)} style={{ marginRight: 8 }}>
              Hủy
            </Button>
            <Button type="primary" htmlType="submit" loading={submitting} className="btn-gradient">
              Tạo tài khoản
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`Chỉnh sửa: ${editUser?.username || ''}`}
        open={!!editUser}
        onCancel={() => setEditUser(null)}
        footer={null}
        destroyOnClose
      >
        <Form form={editForm} layout="vertical" onFinish={handleUpdate}>
          <Form.Item name="role" label="Vai trò" rules={[{ required: true }]}>
            <Select
              options={ROLE_OPTIONS}
              disabled={editUser?.id === currentUser?.id}
            />
          </Form.Item>
          <Form.Item
            name="password"
            label="Mật khẩu mới"
            extra="Để trống nếu không đổi mật khẩu"
            rules={[{ min: 6, message: 'Tối thiểu 6 ký tự' }]}
          >
            <Input.Password placeholder="Mật khẩu mới (tùy chọn)" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Button onClick={() => setEditUser(null)} style={{ marginRight: 8 }}>
              Hủy
            </Button>
            <Button type="primary" htmlType="submit" loading={submitting} className="btn-gradient">
              Lưu thay đổi
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      <ConfirmDeleteModal
        open={!!deleteTarget}
        title={deleteTarget?.username}
        count={1}
        loading={submitting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default AdminUsersPage;
