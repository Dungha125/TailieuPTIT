import { Button, Tag, Spin, Descriptions, Space } from 'antd';
import {
  DownloadOutlined,
  EyeOutlined,
  ArrowLeftOutlined,
  FileOutlined,
} from '@ant-design/icons';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { documentsApi } from '../api';
import PreviewModal from '../components/PreviewModal';
import { downloadBlob, formatDate, formatFileSize, isPreviewable } from '../utils/helpers';

const DocumentDetailPage = () => {
  const { id } = useParams();
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    documentsApi
      .get(id)
      .then((res) => setDocument(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

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

  return (
    <div>
      <Link to="/documents">
        <Button type="link" icon={<ArrowLeftOutlined />} style={{ paddingLeft: 0, marginBottom: 16 }}>
          Quay lại danh sách
        </Button>
      </Link>

      <div style={{ background: '#fff', borderRadius: 8, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 24 }}>
          <FileOutlined style={{ fontSize: 48, color: '#C62828' }} />
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: '1.5rem', marginBottom: 8, color: '#C62828' }}>{document.title}</h1>
            <div className="doc-card-tags">
              {document.tags?.map((tag) => (
                <Tag key={tag.id} color="red">
                  {tag.name}
                </Tag>
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

      <PreviewModal
        document={document}
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        onDownload={handleDownload}
      />
    </div>
  );
};

export default DocumentDetailPage;
