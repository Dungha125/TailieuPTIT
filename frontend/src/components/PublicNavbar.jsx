import { Input, Button, Drawer, Dropdown } from 'antd';
import {
  HomeOutlined,
  FileTextOutlined,
  SearchOutlined,
  CodeOutlined,
  MenuOutlined,
  UserOutlined,
  EditOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useUserAuth } from '../context/UserAuthContext';

const { Search } = Input;

const NAV_LINKS = [
  { path: '/', icon: <HomeOutlined />, label: 'Trang chủ' },
  { path: '/documents', icon: <FileTextOutlined />, label: 'Tài liệu' },
];

const PublicNavbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useUserAuth();
  const [query, setQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const handleSearch = (value) => {
    const q = (value || query).trim();
    if (!q) return;
    navigate(`/search?q=${encodeURIComponent(q)}`);
    setMenuOpen(false);
  };

  const closeMenu = () => setMenuOpen(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
    closeMenu();
  };

  const userInitial = (user?.full_name || user?.username || '?').charAt(0).toUpperCase();

  const userMenuItems = [
    {
      key: 'notes',
      icon: <EditOutlined />,
      label: <Link to="/documents?tab=notes">Ghi chú của tôi</Link>,
    },
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: <Link to="/app/profile">Hồ sơ cá nhân</Link>,
    },
    { type: 'divider' },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Đăng xuất',
      danger: true,
      onClick: handleLogout,
    },
  ];

  return (
    <header className="public-navbar">
      <div className="public-navbar__inner">
        <div className="public-navbar__left">
          <Link to="/" className="public-navbar__brand" onClick={closeMenu}>
            TailieuPTIT
          </Link>
          <nav className="public-navbar__nav public-navbar__nav--desktop">
            {NAV_LINKS.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`public-navbar__link ${isActive(item.path) ? 'public-navbar__link--active' : ''}`}
              >
                {item.icon}
                <span className="public-navbar__link-label">{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>

        <div className="public-navbar__right">
          <a
            href="https://code.ptit.edu.vn/"
            target="_blank"
            rel="noopener noreferrer"
            className="public-navbar__practice-link public-navbar__practice-link--desktop"
          >
            <Button
              type="default"
              ghost
              icon={<CodeOutlined />}
              className="public-navbar__practice-btn"
              title="Luyện tập CodePTIT"
            >
              <span className="public-navbar__practice-label">Luyện tập CodePTIT</span>
            </Button>
          </a>
          <div className="public-navbar__search">
            <Search
              placeholder="Tìm theo tên hoặc tag..."
              allowClear
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onSearch={handleSearch}
              enterButton={<SearchOutlined />}
            />
          </div>
          <div className="public-navbar__auth public-navbar__auth--desktop">
            {isAuthenticated ? (
              <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" trigger={['click']}>
                <button type="button" className="public-navbar__user-btn">
                  <span className="public-navbar__user-avatar">{userInitial}</span>
                  <span className="public-navbar__user-name">{user?.full_name || user?.username}</span>
                </button>
              </Dropdown>
            ) : (
              <div className="public-navbar__auth-actions">
                <Link to="/login" className="public-navbar__auth-btn public-navbar__auth-btn--login">
                  Đăng nhập
                </Link>
                <Link to="/register" className="public-navbar__auth-btn public-navbar__auth-btn--register">
                  Đăng ký
                </Link>
              </div>
            )}
          </div>
          <button
            type="button"
            className="public-navbar__menu-btn"
            aria-label="Mở menu"
            onClick={() => setMenuOpen(true)}
          >
            <MenuOutlined />
          </button>
        </div>
      </div>

      <Drawer
        title="Menu"
        placement="right"
        open={menuOpen}
        onClose={closeMenu}
        className="public-navbar__drawer"
        width={300}
      >
        <nav className="public-navbar__drawer-nav">
          {NAV_LINKS.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`public-navbar__drawer-link ${isActive(item.path) ? 'public-navbar__drawer-link--active' : ''}`}
              onClick={closeMenu}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          ))}
          <a
            href="https://code.ptit.edu.vn/"
            target="_blank"
            rel="noopener noreferrer"
            className="public-navbar__drawer-practice"
            onClick={closeMenu}
          >
            <CodeOutlined />
            <span>Luyện tập CodePTIT</span>
          </a>
        </nav>

        <div className="public-navbar__drawer-auth">
          {isAuthenticated ? (
            <>
              <div className="public-navbar__drawer-user">
                <span className="public-navbar__user-avatar">{userInitial}</span>
                <div>
                  <div className="public-navbar__drawer-user-name">{user?.full_name}</div>
                  <div className="public-navbar__drawer-user-id">@{user?.username}</div>
                </div>
              </div>
              <Link to="/documents?tab=notes" className="public-navbar__drawer-link" onClick={closeMenu}>
                <EditOutlined />
                <span>Ghi chú của tôi</span>
              </Link>
              <Link to="/app/profile" className="public-navbar__drawer-link" onClick={closeMenu}>
                <UserOutlined />
                <span>Hồ sơ cá nhân</span>
              </Link>
              <button type="button" className="public-navbar__drawer-logout" onClick={handleLogout}>
                <LogoutOutlined />
                <span>Đăng xuất</span>
              </button>
            </>
          ) : (
            <div className="public-navbar__drawer-auth-actions">
              <Link to="/login" className="public-navbar__auth-btn public-navbar__auth-btn--login" onClick={closeMenu}>
                Đăng nhập
              </Link>
              <Link to="/register" className="public-navbar__auth-btn public-navbar__auth-btn--register" onClick={closeMenu}>
                Đăng ký
              </Link>
            </div>
          )}
        </div>
      </Drawer>
    </header>
  );
};

export default PublicNavbar;
