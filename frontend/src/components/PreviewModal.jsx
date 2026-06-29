import { Modal, Spin, Button } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import { documentsApi } from '../api';
import { isPreviewable } from '../utils/helpers';

const PreviewModal = ({ document, open, onClose, onDownload }) => {
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !document) {
      setPreviewUrl(null);
      return;
    }

    if (!isPreviewable(document.file_type)) {
      setPreviewUrl(null);
      return;
    }

    setLoading(true);
    documentsApi
      .preview(document.id)
      .then((res) => setPreviewUrl(res.data.preview_url))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [open, document]);

  if (!document) return null;

  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(
    (document.file_type || '').toLowerCase()
  );
  const isPdf = (document.file_type || '').toLowerCase() === 'pdf';

  return (
    <Modal
      className="preview-modal"
      title={document.title}
      open={open}
      onCancel={onClose}
      width={800}
      footer={[
        <Button key="download" type="primary" icon={<DownloadOutlined />} onClick={onDownload}>
          Tải xuống
        </Button>,
        <Button key="close" onClick={onClose}>
          Đóng
        </Button>,
      ]}
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: 48 }}>
          <Spin size="large" />
        </div>
      ) : isImage && previewUrl ? (
        <img src={previewUrl} alt={document.title} className="preview-image" />
      ) : isPdf && previewUrl ? (
        <iframe src={previewUrl} className="preview-pdf" title={document.title} />
      ) : (
        <div className="empty-state">
          <p>Không hỗ trợ xem trước loại file này.</p>
          <Button type="primary" icon={<DownloadOutlined />} onClick={onDownload}>
            Tải xuống để xem
          </Button>
        </div>
      )}
    </Modal>
  );
};

export default PreviewModal;
