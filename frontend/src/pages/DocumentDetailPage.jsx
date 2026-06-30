import { Button, Tag, Spin, Descriptions, Space } from 'antd';
import { DownloadOutlined, EyeOutlined, FileOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { documentsApi } from '../api';
import PreviewModal from '../components/PreviewModal';
import RelatedDocuments from '../components/RelatedDocuments';
import SeoBreadcrumb from '../seo/SeoBreadcrumb';
import SeoHead from '../seo/SeoHead';
import { breadcrumbSchema, creativeWorkSchema } from '../seo/schema';
import { categoryPath, documentPath, documentTitle } from '../seo/seoConfig';
import { downloadBlob, formatDate, formatFileSize, isPreviewable } from '../utils/helpers';

const DocumentDetailPage = () => {
  const { slug } = useParams();
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    documentsApi
      .getBySlug(slug)
      .then((res) => setDocument(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [slug]);

  const handleDownload = async () => {
    try {
      const res = await documentsApi.download(document.id);
      downloadBlob(res.data, `${document.title}.${document.file_type}`);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 48 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!document) {
    return <div className="empty-state">Không tìm thấy tài liệu</div>;
  }

  const primaryTag = document.tags?.find((t) => t.name !== 'Chưa phân loại') || document.tags?.[0];
  const description =
    document.description?.slice(0, 160) ||
    `Tải xuống ${document.title} - tài liệu học tập PTIT (${document.file_type?.toUpperCase()}).`;
  const keywords = [
    document.title,
    ...(document.tags?.map((t) => t.name) || []),
    'PTIT',
    'tài liệu',
  ].join(', ');

  const breadcrumbItems = [
    { name: 'Tài liệu', path: '/documents' },
    ...(primaryTag
      ? [{ name: primaryTag.name, path: categoryPath(primaryTag) }]
      : []),
    { name: document.title },
  ];

  return (
    <article>
      <SeoHead
        title={documentTitle(document.title)}
        description={description}
        keywords={keywords}
        canonical={documentPath(document)}
        ogType="article"
        jsonLd={[
          creativeWorkSchema(document),
          breadcrumbSchema(breadcrumbItems),
        ]}
      />

      <SeoBreadcrumb items={breadcrumbItems} />

      <div style={{ background: '#fff', borderRadius: 8, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 24 }}>
          <FileOutlined style={{ fontSize: 48, color: '#D32F2F' }} aria-hidden />
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: '1.5rem', marginBottom: 8, color: '#D32F2F' }}>{document.title}</h1>
            <div className="doc-card-tags">
              {document.tags?.map((tag) => (
                <Link key={tag.id} to={categoryPath(tag)}>
                  <Tag color="red">{tag.name}</Tag>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {document.description && (
          <p style={{ marginBottom: 24, color: '#616161' }}>{document.description}</p>
        )}

        <Descriptions bordered column={{ xs: 1, sm: 2 }} style={{ marginBottom: 24 }}>
          <Descriptions.Item label="Loại file">{document.file_type?.toUpperCase()}</Descriptions.Item>
          <Descriptions.Item label="Kích thước">{formatFileSize(document.size)}</Descriptions.Item>
          <Descriptions.Item label="Lượt tải">{document.download_count}</Descriptions.Item>
          <Descriptions.Item label="Ngày tải lên">{formatDate(document.created_at)}</Descriptions.Item>
        </Descriptions>

        <Space>
          <Button type="primary" icon={<DownloadOutlined />} size="large" onClick={handleDownload}>
            Tải xuống
          </Button>
          {isPreviewable(document.file_type) && (
            <Button icon={<EyeOutlined />} size="large" onClick={() => setPreviewOpen(true)}>
              Xem trước
            </Button>
          )}
        </Space>
      </div>

      <RelatedDocuments documentId={document.id} />

      <PreviewModal
        document={document}
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        onDownload={handleDownload}
      />
    </article>
  );
};

export default DocumentDetailPage;
