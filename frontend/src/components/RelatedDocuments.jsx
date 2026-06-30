import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Spin } from 'antd';
import { documentsApi } from '../api';
import DocumentCard from './DocumentCard';
import { documentPath } from '../seo/seoConfig';

const RelatedDocuments = ({ documentId }) => {
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!documentId) return;
    documentsApi
      .related(documentId)
      .then((res) => setRelated(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [documentId]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 24 }}>
        <Spin />
      </div>
    );
  }

  if (!related.length) return null;

  return (
    <section style={{ marginTop: 32 }}>
      <h2 className="page-title" style={{ fontSize: '1.25rem' }}>
        Tài liệu liên quan
      </h2>
      <div className="doc-grid">
        {related.map((doc) => (
          <Link key={doc.id} to={documentPath(doc)}>
            <DocumentCard document={doc} />
          </Link>
        ))}
      </div>
    </section>
  );
};

export default RelatedDocuments;
