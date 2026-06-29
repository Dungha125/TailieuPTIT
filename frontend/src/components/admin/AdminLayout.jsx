import { Layout, Menu, Button } from 'antd';
import {
  DashboardOutlined,
  UploadOutlined,
  TagsOutlined,
  FileOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';

const { Sider, Header, Content } = Layout;

const AdminLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const menuItems = [
    {
      key: '/internal-admin-portal',
      icon: <DashboardOutlined />,
      label: <Link to="/internal-admin-portal">Dashboard</Link>,
    },
    {
      key: '/internal-admin-portal/upload',
      icon: <UploadOutlined />,
      label: <Link to="/internal-admin-portal/upload">Upload</Link>,
    },
    {
      key: '/internal-admin-portal/tags',
      icon: <TagsOutlined />,
      label: <Link to="/internal-admin-portal/tags">Quản lý Tag</Link>,
    },
    {
      key: '/internal-admin-portal/files',
      icon: <FileOutlined />,
      label: <Link to="/internal-admin-portal/files">Quản lý File</Link>,
    },
  ];

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    navigate('/internal-admin-portal/login');
  };

  const selectedKey =
    menuItems.find((item) => location.pathname === item.key)?.key ||
    (location.pathname.startsWith('/internal-admin-portal') ? '/internal-admin-portal' : '');

  return (
    <Layout className="admin-layout" style={{ minHeight: '100vh' }}>
      <Sider
        breakpoint="lg"
        collapsedWidth="0"
        style={{ background: '#C62828' }}
      >
        <div
          style={{
            color: '#fff',
            padding: '16px',
            fontWeight: 700,
            fontSize: '1.1rem',
            textAlign: 'center',
            borderBottom: '1px solid rgba(255,255,255,0.2)',
          }}
        >
          TailieuPTIT Admin
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          style={{ background: '#C62828', borderRight: 0 }}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            background: '#fff',
            padding: '0 24px',
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
          }}
        >
          <Button type="text" icon={<LogoutOutlined />} onClick={handleLogout}>
            Đăng xuất
          </Button>
        </Header>
        <Content className="admin-content">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default AdminLayout;
