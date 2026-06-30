import { Layout, Menu, Input, Button } from 'antd';
import {
  HomeOutlined,
  FileTextOutlined,
  SearchOutlined,
  CodeOutlined,
} from '@ant-design/icons';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';

const { Header } = Layout;
const { Search } = Input;

const PublicNavbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const items = [
    { key: '/', icon: <HomeOutlined />, label: <Link to="/">Trang chủ</Link> },
    { key: '/documents', icon: <FileTextOutlined />, label: <Link to="/documents">Tài liệu</Link> },
  ];

  const selectedKey =
    items.find((item) => location.pathname === item.key)?.key ||
    (location.pathname.startsWith('/search') ? '/search' : '/');

  const handleSearch = (value) => {
    const q = (value || query).trim();
    if (!q) return;
    navigate(`/search?q=${encodeURIComponent(q)}`);
  };

  return (
    <Header className="public-navbar">
      <div className="public-navbar__left">
        <Link to="/" className="public-navbar__brand">
          TailieuPTIT
        </Link>
        <Menu
          theme="dark"
          mode="horizontal"
          selectedKeys={[selectedKey]}
          items={items}
          className="public-navbar__menu"
        />
      </div>
      <div className="public-navbar__right">
        <a
          href="https://code.ptit.edu.vn/"
          target="_blank"
          rel="noopener noreferrer"
          className="public-navbar__practice-link"
        >
          <Button type="default" ghost icon={<CodeOutlined />} className="public-navbar__practice-btn">
            Luyện tập
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
            size="middle"
          />
        </div>
      </div>
    </Header>
  );
};

export default PublicNavbar;
