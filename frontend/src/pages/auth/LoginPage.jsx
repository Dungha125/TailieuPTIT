import { Button, Form, Input, message } from 'antd';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useUserAuth } from '../../context/UserAuthContext';
import SeoHead from '../../seo/SeoHead';

const LoginPage = () => {
  const { login } = useUserAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next') || '/app/dashboard';

  const onFinish = async (values) => {
    try {
      await login(values.username, values.password);
      message.success('Đăng nhập thành công');
      navigate(next);
    } catch (err) {
      message.error(err.response?.data?.detail || 'Đăng nhập thất bại');
    }
  };

  return (
    <div className="auth-page">
      <SeoHead title="Đăng nhập | TailieuPTIT" />
      <div className="auth-card">
        <h1>Đăng nhập</h1>
        <p className="auth-card__sub">Dùng mã sinh viên để truy cập ghi chú và bookmark</p>
        <Form layout="vertical" onFinish={onFinish} size="large">
          <Form.Item
            name="username"
            label="Mã sinh viên / Tên đăng nhập"
            rules={[{ required: true, min: 4, message: 'Nhập mã sinh viên' }]}
          >
            <Input placeholder="VD: B20DCCN001" autoCapitalize="characters" />
          </Form.Item>
          <Form.Item name="password" label="Mật khẩu" rules={[{ required: true }]}>
            <Input.Password />
          </Form.Item>
          <Button type="primary" htmlType="submit" block className="btn-gradient">
            Đăng nhập
          </Button>
        </Form>
        <p className="auth-card__footer">
          Chưa có tài khoản? <Link to="/register">Đăng ký</Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
