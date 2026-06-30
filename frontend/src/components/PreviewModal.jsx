import { Modal, Button } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { documentsApi } from '../api';
import PdfLightPreview from './PdfLightPreview';
import { isPreviewable } from '../utils/helpers';

const PreviewModal = ({ document, open, onClose, onDownload }) => {
  const [imgError, setImgError] = useState(false);

  if (!document) return null;

  const fileType = (document.file_type || '').toLowerCase();
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(fileType);
  const isPdf = fileType === 'pdf';
  const canPreview = isPreviewable(fileType);
  const streamUrl = canPreview ? documentsApi.previewStreamUrl(document.id) : null;

  return (
    <Modal
      className="preview-modal"
      title={document.title}
      open={open}
      onCancel={onClose}
      width={820}
      destroyOnClose
      footer={[
        <Button key="download" type="primary" icon={<DownloadOutlined />} onClick={onDownload}>
          Tải xuống
        </Button>,
        <Button key="close" onClick={onClose}>
          Đóng
        </Button>,
      ]}
    >
      {!canPreview ? (
        <div className="empty-state">
          <p>Không hỗ trợ xem trước loại file này.</p>
          <Button type="primary" icon={<DownloadOutlined />} onClick={onDownload}>
            Tải xuống để xem
          </Button>
        </div>
      ) : isImage ? (
        imgError ? (
          <div className="empty-state">Không tải được ảnh xem trước.</div>
        ) : (
          <img
            src={streamUrl}
            alt={document.title}
            className="preview-image"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        )
      ) : isPdf ? (
        <PdfLightPreview documentId={document.id} title={document.title} />
      ) : (
        <div className="empty-state">
          <p>Không hỗ trợ xem trước loại file này.</p>
        </div>
      )}
    </Modal>
  );
};

export default PreviewModal;
