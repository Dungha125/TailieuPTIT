import { Button, Form, Input, message } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import { userAuthApi } from '../../api';
import SeoHead from '../../seo/SeoHead';

const RegisterPage = () => {
  const navigate = useNavigate();

  const onFinish = async (values) => {
    try {
      await userAuthApi.register(values);
      message.success('Đăng ký thành công! Bạn có thể đăng nhập ngay.');
      navigate('/login');
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (Array.isArray(detail)) {
        message.error(detail[0]?.msg || 'Đăng ký thất bại');
      } else {
        message.error(detail || 'Đăng ký thất bại');
      }
    }
  };

  return (
    <div className="auth-page">
      <SeoHead title="Đăng ký | TailieuPTIT" />
      <div className="auth-card">
        <h1>Đăng ký</h1>
        <p className="auth-card__sub">Tạo tài khoản bằng mã sinh viên PTIT</p>
        <Form layout="vertical" onFinish={onFinish} size="large">
          <Form.Item name="full_name" label="Họ tên" rules={[{ required: true, min: 2 }]}>
            <Input placeholder="Nguyễn Văn A" />
          </Form.Item>
          <Form.Item
            name="username"
            label="Mã sinh viên / Tên đăng nhập"
            rules={[
              { required: true, min: 4, message: 'Tối thiểu 4 ký tự' },
              { pattern: /^[a-zA-Z0-9._-]+$/, message: 'Chỉ chữ, số, . _ -' },
            ]}
          >
            <Input placeholder="VD: B20DCCN001" autoCapitalize="characters" />
          </Form.Item>
          <Form.Item name="password" label="Mật khẩu" rules={[{ required: true, min: 8 }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item
            name="confirm_password"
            label="Xác nhận mật khẩu"
            rules={[{ required: true, min: 8 }]}
          >
            <Input.Password />
          </Form.Item>
          <Button type="primary" htmlType="submit" block className="btn-gradient">
            Tạo tài khoản
          </Button>
        </Form>
        <p className="auth-card__footer">
          Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
