import { memo } from 'react';
import DocumentCard from '../DocumentCard';

const DocumentGrid = memo(({ documents, loading, onCardClick }) => {
  if (loading) {
    return (
      <div className="doc-grid">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="doc-grid__skeleton" />
        ))}
      </div>
    );
  }

  if (!documents.length) {
    return <div className="empty-state">Không tìm thấy tài liệu nào</div>;
  }

  return (
    <div className="doc-grid">
      {documents.map((doc) => (
        <DocumentCard key={doc.id} document={doc} onClick={onCardClick} />
      ))}
    </div>
  );
});

DocumentGrid.displayName = 'DocumentGrid';

export default DocumentGrid;
