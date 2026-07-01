import { Button, Form, Input, message } from 'antd';
import { Link } from 'react-router-dom';
import { userAuthApi } from '../../api';
import SeoHead from '../../seo/SeoHead';

const ForgotPasswordPage = () => (
  <div className="auth-page">
    <SeoHead title="Quên mật khẩu | TailieuPTIT" />
    <div className="auth-card">
      <h1>Quên mật khẩu</h1>
      <p className="auth-card__sub">
        Nhập mã sinh viên. Nếu tài khoản chưa có email liên kết, vui lòng liên hệ quản trị viên.
      </p>
      <Form
        layout="vertical"
        size="large"
        onFinish={async (v) => {
          try {
            await userAuthApi.forgotPassword(v.username);
            message.success('Nếu tài khoản có email, bạn sẽ nhận link đặt lại mật khẩu.');
          } catch (err) {
            message.error(err.response?.data?.detail || 'Yêu cầu thất bại');
          }
        }}
      >
        <Form.Item name="username" label="Mã sinh viên" rules={[{ required: true, min: 4 }]}>
          <Input />
        </Form.Item>
        <Button type="primary" htmlType="submit" block className="btn-gradient">
          Gửi yêu cầu
        </Button>
      </Form>
      <p className="auth-card__footer">
        <Link to="/login">Quay lại đăng nhập</Link>
      </p>
    </div>
  </div>
);

export default ForgotPasswordPage;
