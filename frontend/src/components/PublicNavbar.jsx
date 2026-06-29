import { Layout, Menu, Button, theme } from 'antd';
import {
  HomeOutlined,
  FileTextOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { Link, useLocation } from 'react-router-dom';

const { Header } = Layout;

const PublicNavbar = () => {
  const location = useLocation();
  const { token } = theme.useToken();

  const items = [
    { key: '/', icon: <HomeOutlined />, label: <Link to="/">Trang chủ</Link> },
    { key: '/documents', icon: <FileTextOutlined />, label: <Link to="/documents">Tài liệu</Link> },
    { key: '/search', icon: <SearchOutlined />, label: <Link to="/search">Tìm kiếm</Link> },
  ];

  const selectedKey = items.find((item) => location.pathname === item.key)?.key || '/';

  return (
    <Header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: token.colorPrimary,
        padding: '0 24px',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        <Link to="/" style={{ color: '#fff', fontWeight: 700, fontSize: '1.25rem' }}>
          TailieuPTIT
        </Link>
        <Menu
          theme="dark"
          mode="horizontal"
          selectedKeys={[selectedKey]}
          items={items}
          style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none' }}
        />
      </div>
    </Header>
  );
};

export default PublicNavbar;
