import { Tag } from 'antd';

const DocumentCard = ({ document, onClick }) => {
  return (
    <div className="doc-card" onClick={() => onClick?.(document)}>
      <div className="doc-card-title">{document.title}</div>
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
        {document.tags?.map((tag) => (
          <Tag key={tag.id} color="red">
            {tag.name}
          </Tag>
        ))}
      </div>
    </div>
  );
};

export default DocumentCard;
