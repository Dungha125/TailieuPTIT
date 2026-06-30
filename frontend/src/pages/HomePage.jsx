import { Button, Spin } from 'antd';
import { FileTextOutlined, FireOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { documentsApi } from '../api';
import DocumentCard from '../components/DocumentCard';
import SeoHead from '../seo/SeoHead';
import { PAGE_SEO, documentPath } from '../seo/seoConfig';
import { websiteSchema } from '../seo/schema';

const HomePage = () => {
  const [hot, setHot] = useState([]);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([documentsApi.hot(), documentsApi.recent()])
      .then(([hotRes, recentRes]) => {
        setHot(hotRes.data);
        setRecent(recentRes.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 48 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <SeoHead
        title={PAGE_SEO.home.title}
        description={PAGE_SEO.home.description}
        keywords={PAGE_SEO.home.keywords}
        canonical={PAGE_SEO.home.path}
        jsonLd={websiteSchema()}
      />

      <section className="hero-section">
        <h1>TailieuPTIT — Tài liệu học tập PTIT</h1>
        <p style={{ fontSize: '1.1rem', marginBottom: 4 }}>Hệ thống quản lý tài liệu công khai</p>
        <p style={{ opacity: 0.9 }}>Tra cứu, xem trước và tải xuống đề thi, slide, giáo trình miễn phí</p>
        <Link to="/documents">
          <Button type="default" size="large" style={{ marginTop: 16 }}>
            <FileTextOutlined /> Xem tài liệu
          </Button>
        </Link>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 className="page-title">
          <FireOutlined /> Tài liệu phổ biến
        </h2>
        {hot.length === 0 ? (
          <div className="empty-state">Chưa có tài liệu nào</div>
        ) : (
          <div className="doc-grid">
            {hot.map((doc) => (
              <Link key={doc.id} to={documentPath(doc)}>
                <DocumentCard document={doc} />
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="page-title">
          <ClockCircleOutlined /> Tài liệu mới nhất
        </h2>
        {recent.length === 0 ? (
          <div className="empty-state">Chưa có tài liệu nào</div>
        ) : (
          <div className="doc-grid">
            {recent.map((doc) => (
              <Link key={doc.id} to={documentPath(doc)}>
                <DocumentCard document={doc} />
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default HomePage;
