import { Input, Button } from 'antd';
import {
  HomeOutlined,
  FileTextOutlined,
  SearchOutlined,
  CodeOutlined,
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

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const handleSearch = (value) => {
    const q = (value || query).trim();
    if (!q) return;
    navigate(`/search?q=${encodeURIComponent(q)}`);
  };

  return (
    <header className="public-navbar">
      <div className="public-navbar__inner">
        <div className="public-navbar__left">
          <Link to="/" className="public-navbar__brand">
            TailieuPTIT
          </Link>
          <nav className="public-navbar__nav">
            {NAV_LINKS.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`public-navbar__link ${isActive(item.path) ? 'public-navbar__link--active' : ''}`}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>

        <div className="public-navbar__right">
          <a
            href="https://code.ptit.edu.vn/"
            target="_blank"
            rel="noopener noreferrer"
            className="public-navbar__practice-link"
          >
            <Button
              type="default"
              ghost
              icon={<CodeOutlined />}
              className="public-navbar__practice-btn"
              title="Luyện tập CodePTIT"
            >
              Luyện tập CodePTIT
            </Button>
          </a>
          <div className="public-navbar__search">
            <Search
              placeholder="Tìm kiếm tài liệu..."
              allowClear
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onSearch={handleSearch}
              enterButton={<SearchOutlined />}
            />
          </div>
        </div>
      </div>
    </header>
  );
};

export default PublicNavbar;
