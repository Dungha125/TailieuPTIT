import { Button, Form, Input, message } from 'antd';
import { userAuthApi } from '../../api';
import { useUserAuth } from '../../context/UserAuthContext';
import UserLayout from '../../components/user/UserLayout';
import SeoHead from '../../seo/SeoHead';

const ProfilePage = () => {
  const { user, loadUser } = useUserAuth();

  return (
    <UserLayout>
      <SeoHead title="Hồ sơ | TailieuPTIT" />
      <h1 className="page-title">Hồ sơ cá nhân</h1>
      <div className="auth-card" style={{ maxWidth: 480 }}>
        <Form
          layout="vertical"
          initialValues={{ full_name: user?.full_name }}
          onFinish={async (v) => {
            await userAuthApi.updateProfile(v);
            message.success('Đã cập nhật hồ sơ');
            loadUser();
          }}
        >
          <Form.Item label="Mã sinh viên">
            <Input value={user?.username} disabled />
          </Form.Item>
          <Form.Item name="full_name" label="Họ tên" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Button type="primary" htmlType="submit" className="btn-gradient">
            Lưu
          </Button>
        </Form>
      </div>
    </UserLayout>
  );
};

export default ProfilePage;
