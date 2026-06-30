import { Input, Button, Drawer } from 'antd';
import {
  HomeOutlined,
  FileTextOutlined,
  SearchOutlined,
  CodeOutlined,
  MenuOutlined,
} from '@ant-design/icons';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';

const { Search } = Input;

const NAV_LINKS = [
  { path: '/', icon: <HomeOutlined />, label: 'Trang chủ' },
  { path: '/documents', icon: <FileTextOutlined />, label: 'Tài liệu' },
];

const PublicNavbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
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
              placeholder="Tìm kiếm..."
              allowClear
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onSearch={handleSearch}
              enterButton={<SearchOutlined />}
            />
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
        width={280}
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
      </Drawer>
    </header>
  );
};

export default PublicNavbar;
