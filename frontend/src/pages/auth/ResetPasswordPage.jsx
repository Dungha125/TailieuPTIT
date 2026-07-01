import { Button, Form, Input, message } from 'antd';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { userAuthApi } from '../../api';
import SeoHead from '../../seo/SeoHead';

const ResetPasswordPage = () => {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const navigate = useNavigate();

  return (
    <div className="auth-page">
      <SeoHead title="Đặt lại mật khẩu | TailieuPTIT" />
      <div className="auth-card">
        <h1>Đặt lại mật khẩu</h1>
        <Form
          layout="vertical"
          size="large"
          onFinish={async (v) => {
            try {
              await userAuthApi.resetPassword({ token, ...v });
              message.success('Đặt lại mật khẩu thành công');
              navigate('/login');
            } catch (err) {
              message.error(err.response?.data?.detail || 'Token không hợp lệ');
            }
          }}
        >
          <Form.Item name="password" label="Mật khẩu mới" rules={[{ required: true, min: 8 }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item name="confirm_password" label="Xác nhận" rules={[{ required: true, min: 8 }]}>
            <Input.Password />
          </Form.Item>
          <Button type="primary" htmlType="submit" block className="btn-gradient">
            Lưu mật khẩu
          </Button>
        </Form>
        <p className="auth-card__footer">
          <Link to="/login">Đăng nhập</Link>
        </p>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
