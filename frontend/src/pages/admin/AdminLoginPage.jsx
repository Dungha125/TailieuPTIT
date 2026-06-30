import { Button, Card, Form, Input, message } from 'antd';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { createSubmitLock } from '../../utils/security';
import '../../styles/admin.scss';

const submitLock = createSubmitLock();

const AdminLoginPage = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { loadUser } = useAuth();

  const onFinish = async (values) => {
    if (submitLock.isLocked()) return;

    await submitLock.run(async () => {
      setLoading(true);
      try {
        const res = await authApi.login(values.username, values.password);
        localStorage.setItem('admin_token', res.data.access_token);
        const user = await loadUser();
        if (!user) {
          message.error('Tài khoản không có quyền truy cập portal');
          return;
        }
        message.success('Đăng nhập thành công');
        navigate('/internal-admin-portal');
      } catch (err) {
        const detail = err.response?.data?.detail;
        const msg =
          err.message ||
          (typeof detail === 'string' ? detail : null) ||
          'Đăng nhập thất bại';
        message.error(msg);
      } finally {
        setLoading(false);
      }
    });
  };

  return (
    <div className="admin-login-page">
      <Card className="login-card" title="TailieuPTIT Portal">
        <Form onFinish={onFinish} layout="vertical" size="large">
          <Form.Item
            name="username"
            rules={[{ required: true, message: 'Vui lòng nhập tên đăng nhập' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="Tên đăng nhập" />
          </Form.Item>
          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Vui lòng nhập mật khẩu' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Mật khẩu" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block className="btn-gradient">
              Đăng nhập
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default AdminLoginPage;
