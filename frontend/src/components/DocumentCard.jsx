import { Tag } from 'antd';
import BookmarkButton from './BookmarkButton';

const DocumentCard = ({ document, onClick, showTypeBadge = false }) => {
  const fileType = (document.file_type || 'file').toLowerCase();

  return (
    <div
      className={`doc-card doc-card--${fileType}`}
      onClick={() => onClick?.(document)}
    >
      {showTypeBadge && (
        <div className="doc-card__type-badge">{document.file_type?.toUpperCase() || 'FILE'}</div>
      )}
      <div className="doc-card__header">
        <div className="doc-card-title">{document.title}</div>
        <BookmarkButton documentId={document.id} />
      </div>
      <div className="doc-card-meta">
        <span>{document.file_type?.toUpperCase()}</span>
        <span>•</span>
        <span>{(document.size / 1024).toFixed(1)} KB</span>
        <span>•</span>
        <span>{document.download_count} lượt tải</span>
      </div>
      {document.description && (
        <p style={{ fontSize: '0.85rem', color: '#757575', marginBottom: 8 }}>
          {document.description.slice(0, 100)}
          {document.description.length > 100 ? '...' : ''}
        </p>
      )}
      <div className="doc-card-tags">
        {document.tags?.subject && (
          <Tag color="red">{document.tags.subject}</Tag>
        )}
        {document.tags?.type && (
          <Tag>{document.tags.type}</Tag>
        )}
        {document.tags?.year && (
          <Tag>{document.tags.year}</Tag>
        )}
        {!document.tags?.subject && document.legacy_tags?.map((tag) => (
          <Tag key={tag.id} color="red">
            {tag.name}
          </Tag>
        ))}
      </div>
    </div>
  );
};

export default DocumentCard;
