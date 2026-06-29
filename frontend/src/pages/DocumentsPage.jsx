import { Button, Spin } from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { documentsApi } from '../api';
import DocumentCard from '../components/DocumentCard';
import PreviewModal from '../components/PreviewModal';
import TagSidebar from '../components/TagSidebar';
import { downloadBlob } from '../utils/helpers';

const PAGE_SIZE = 20;

const DocumentsPage = () => {
  const [documents, setDocuments] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeTag, setActiveTag] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null);
  const observerRef = useRef(null);
  const loadMoreRef = useRef(null);
  const navigate = useNavigate();

  const fetchDocuments = useCallback(
    async (pageNum, tag, append = false) => {
      const setter = append ? setLoadingMore : setLoading;
      setter(true);
      try {
        let res;
        if (tag === 'Chưa phân loại') {
          res = await documentsApi.unclassified(pageNum, PAGE_SIZE);
        } else if (tag) {
          res = await documentsApi.byTag(tag, pageNum, PAGE_SIZE);
        } else {
          res = await documentsApi.list(pageNum, PAGE_SIZE);
        }
        const { items, has_more } = res.data;
        setDocuments((prev) => (append ? [...prev, ...items] : items));
        setHasMore(has_more);
      } catch (err) {
        console.error(err);
      } finally {
        setter(false);
      }
    },
    []
  );

  useEffect(() => {
    setPage(1);
    fetchDocuments(1, activeTag, false);
  }, [activeTag, fetchDocuments]);

  useEffect(() => {
    if (!hasMore || loading || loadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          const nextPage = page + 1;
          setPage(nextPage);
          fetchDocuments(nextPage, activeTag, true);
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) observer.observe(loadMoreRef.current);
    observerRef.current = observer;

    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, page, activeTag, fetchDocuments]);

  const handleDownload = async (doc) => {
    try {
      const res = await documentsApi.download(doc.id);
      const filename = doc.title + '.' + doc.file_type;
      downloadBlob(res.data, filename);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCardClick = (doc) => {
    navigate(`/documents/${doc.id}`);
  };

  return (
    <div>
      <h1 className="page-title">Danh sách tài liệu</h1>
      <p className="page-subtitle">Tra cứu và tải xuống tài liệu công khai</p>

      <div className="documents-layout">
        <TagSidebar
          activeTag={activeTag}
          onTagSelect={(tag) => {
            setActiveTag(tag);
            setPage(1);
          }}
        />

        <div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 48 }}>
              <Spin size="large" />
            </div>
          ) : documents.length === 0 ? (
            <div className="empty-state">Không tìm thấy tài liệu nào</div>
          ) : (
            <>
              <div className="doc-grid">
                {documents.map((doc) => (
                  <DocumentCard
                    key={doc.id}
                    document={doc}
                    onClick={handleCardClick}
                  />
                ))}
              </div>
              {hasMore && (
                <div className="load-more" ref={loadMoreRef}>
                  {loadingMore && <Spin />}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <PreviewModal
        document={previewDoc}
        open={!!previewDoc}
        onClose={() => setPreviewDoc(null)}
        onDownload={() => previewDoc && handleDownload(previewDoc)}
      />
    </div>
  );
};

export default DocumentsPage;
