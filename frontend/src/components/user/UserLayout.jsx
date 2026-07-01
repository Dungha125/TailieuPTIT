import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button, Dropdown } from 'antd';
import {
  DashboardOutlined,
  EditOutlined,
  UserOutlined,
  LogoutOutlined,
  MenuOutlined,
} from '@ant-design/icons';
import { useState } from 'react';
import { useUserAuth } from '../../context/UserAuthContext';

const NAV = [
  { path: '/documents', icon: <DashboardOutlined />, label: 'Tài liệu' },
  { path: '/documents?tab=notes', icon: <EditOutlined />, label: 'Ghi chú' },
  { path: '/app/profile', icon: <UserOutlined />, label: 'Hồ sơ' },
];

const UserLayout = ({ children }) => {
  const { user, logout } = useUserAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const menuItems = NAV.map((item) => ({
    key: item.path,
    label: item.label,
    icon: item.icon,
    onClick: () => {
      navigate(item.path);
      setMobileOpen(false);
    },
  }));

  return (
    <div className="user-shell">
      <header className="user-shell__header">
        <Link to="/" className="user-shell__brand">
          TailieuPTIT
        </Link>
        <nav className="user-shell__nav user-shell__nav--desktop">
          {NAV.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`user-shell__link ${location.pathname.startsWith(item.path) ? 'user-shell__link--active' : ''}`}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="user-shell__actions">
          <span className="user-shell__user">{user?.full_name || user?.username}</span>
          <Button type="text" icon={<LogoutOutlined />} onClick={() => logout().then(() => navigate('/'))}>
            Thoát
          </Button>
          <Dropdown menu={{ items: menuItems }} className="user-shell__mobile-menu">
            <Button type="text" icon={<MenuOutlined />} onClick={() => setMobileOpen(true)} />
          </Dropdown>
        </div>
      </header>
      <main className="user-shell__main">{children}</main>
    </div>
  );
};

export default UserLayout;
