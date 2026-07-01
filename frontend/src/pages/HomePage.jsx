import { Button, Input, Spin } from 'antd';
import {
  FileTextOutlined,
  FireOutlined,
  ClockCircleOutlined,
  SearchOutlined,
  BookOutlined,
  EditOutlined,
  CodeOutlined,
  CloudDownloadOutlined,
  FolderOpenOutlined,
  RightOutlined,
  RocketOutlined,
} from '@ant-design/icons';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { documentsApi } from '../api';
import DocumentCard from '../components/DocumentCard';
import SeoHead from '../seo/SeoHead';
import { PAGE_SEO, documentPath } from '../seo/seoConfig';
import { websiteSchema } from '../seo/schema';
import { useUserAuth } from '../context/UserAuthContext';
import '../styles/home-page.css';

const { Search } = Input;

const HomePage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useUserAuth();
  const [hot, setHot] = useState([]);
  const [recent, setRecent] = useState([]);
  const [totalDocs, setTotalDocs] = useState(0);
  const [categoryCount, setCategoryCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQ, setSearchQ] = useState('');

  useEffect(() => {
    Promise.all([
      documentsApi.hot(),
      documentsApi.recent(),
      documentsApi.browse({ page: 1, pageSize: 1 }),
      documentsApi.taxonomy(),
    ])
      .then(([hotRes, recentRes, browseRes, taxRes]) => {
        setHot(hotRes.data);
        setRecent(recentRes.data);
        setTotalDocs(browseRes.data.total || 0);
        const tree = taxRes.data.tree || [];
        const countNodes = (nodes) =>
          nodes.reduce((sum, n) => sum + 1 + countNodes(n.children || []), 0);
        setCategoryCount(countNodes(tree));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSearch = (value) => {
    const q = (value || searchQ).trim();
    if (!q) return;
    navigate(`/search?q=${encodeURIComponent(q)}`);
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 48 }}>
        <Spin size="large" />
      </div>
    );
  }

  const features = [
    {
      to: '/documents',
      icon: <FolderOpenOutlined />,
      title: 'Duyệt tài liệu',
      desc: 'Lọc theo môn, năm, khoa',
    },
    {
      to: '/search',
      icon: <SearchOutlined />,
      title: 'Tìm kiếm',
      desc: 'Theo tên hoặc tag',
    },
    {
      to: isAuthenticated ? '/documents?tab=notes' : '/register',
      icon: <EditOutlined />,
      title: 'Ghi chú',
      desc: isAuthenticated ? 'Soạn & lưu ghi chú' : 'Đăng ký để dùng',
    },
    {
      to: 'https://code.ptit.edu.vn/',
      icon: <CodeOutlined />,
      title: 'CodePTIT',
      desc: 'Luyện tập thuật toán',
      external: true,
    },
  ];

  return (
    <div className="home-page">
      <SeoHead
        title={PAGE_SEO.home.title}
        description={PAGE_SEO.home.description}
        keywords={PAGE_SEO.home.keywords}
        canonical={PAGE_SEO.home.path}
        jsonLd={websiteSchema()}
      />

      <section className="home-hero">
        <div className="home-hero__bg" aria-hidden>
          <div className="home-hero__orb home-hero__orb--1" />
          <div className="home-hero__orb home-hero__orb--2" />
          <div className="home-hero__orb home-hero__orb--3" />
        </div>
        <div className="home-hero__inner">
          <div className="home-hero__badge">
            <RocketOutlined /> Kho tài liệu PTIT miễn phí
          </div>
          <h1>TailieuPTIT — Tài liệu học tập PTIT</h1>
          <p className="home-hero__lead">Hệ thống quản lý tài liệu công khai</p>
          <p className="home-hero__sub">
            Tra cứu, xem trước và tải xuống đề thi, slide, giáo trình
          </p>
          <div className="home-hero__search">
            <Search
              placeholder="Tìm theo tên, môn học hoặc tag..."
              allowClear
              size="large"
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              onSearch={handleSearch}
              enterButton={<SearchOutlined />}
            />
          </div>
          <div className="home-hero__actions">
            <Link to="/documents">
              <Button size="large" className="home-hero__btn home-hero__btn--primary" icon={<FileTextOutlined />}>
                Xem tài liệu
              </Button>
            </Link>
            <Link to="/search">
              <Button size="large" className="home-hero__btn home-hero__btn--ghost" icon={<SearchOutlined />}>
                Tìm nâng cao
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <div className="home-stats">
        <div className="home-stat">
          <div className="home-stat__icon">
            <FileTextOutlined />
          </div>
          <div className="home-stat__value">{totalDocs.toLocaleString('vi-VN')}</div>
          <div className="home-stat__label">Tài liệu có sẵn</div>
        </div>
        <div className="home-stat">
          <div className="home-stat__icon">
            <BookOutlined />
          </div>
          <div className="home-stat__value">{categoryCount}</div>
          <div className="home-stat__label">Danh mục phân loại</div>
        </div>
        <div className="home-stat">
          <div className="home-stat__icon">
            <CloudDownloadOutlined />
          </div>
          <div className="home-stat__value">Miễn phí</div>
          <div className="home-stat__label">Tải xuống không giới hạn</div>
        </div>
      </div>

      <div className="home-features">
        {features.map((f) =>
          f.external ? (
            <a
              key={f.title}
              href={f.to}
              target="_blank"
              rel="noopener noreferrer"
              className="home-feature"
            >
              <span className="home-feature__icon">{f.icon}</span>
              <span className="home-feature__text">
                <strong>{f.title}</strong>
                <span>{f.desc}</span>
              </span>
            </a>
          ) : (
            <Link key={f.title} to={f.to} className="home-feature">
              <span className="home-feature__icon">{f.icon}</span>
              <span className="home-feature__text">
                <strong>{f.title}</strong>
                <span>{f.desc}</span>
              </span>
            </Link>
          )
        )}
      </div>

      <section className="home-section home-section--hot">
        <div className="home-section__head">
          <h2 className="home-section__title">
            <FireOutlined /> Tài liệu phổ biến
          </h2>
          <Link to="/documents" className="home-section__more">
            Xem tất cả <RightOutlined />
          </Link>
        </div>
        {hot.length === 0 ? (
          <div className="empty-state">Chưa có tài liệu nào</div>
        ) : (
          <div className="home-doc-grid">
            {hot.map((doc) => (
              <Link key={doc.id} to={documentPath(doc)} className="doc-card-link">
                <DocumentCard document={doc} showTypeBadge />
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="home-section home-section--recent">
        <div className="home-section__head">
          <h2 className="home-section__title">
            <ClockCircleOutlined /> Tài liệu mới nhất
          </h2>
          <Link to="/documents" className="home-section__more">
            Xem tất cả <RightOutlined />
          </Link>
        </div>
        {recent.length === 0 ? (
          <div className="empty-state">Chưa có tài liệu nào</div>
        ) : (
          <div className="home-doc-grid">
            {recent.map((doc) => (
              <Link key={doc.id} to={documentPath(doc)} className="doc-card-link">
                <DocumentCard document={doc} showTypeBadge />
              </Link>
            ))}
          </div>
        )}
      </section>

      {!isAuthenticated && (
        <section className="home-cta">
          <h3>Tạo tài khoản để lưu bookmark & ghi chú</h3>
          <p>Đăng ký bằng mã sinh viên — lưu tài liệu yêu thích, soạn ghi chú và theo dõi lịch học tập.</p>
          <Link to="/register">
            <Button type="primary" size="large" className="btn-gradient">
              Đăng ký miễn phí
            </Button>
          </Link>
        </section>
      )}
    </div>
  );
};

export default HomePage;
