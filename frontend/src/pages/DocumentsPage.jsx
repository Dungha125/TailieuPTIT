import { Spin } from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { documentsApi } from '../api';
import DocumentCard from '../components/DocumentCard';
import PreviewModal from '../components/PreviewModal';
import TagSidebar from '../components/TagSidebar';
import SeoBreadcrumb from '../seo/SeoBreadcrumb';
import SeoHead from '../seo/SeoHead';
import { breadcrumbSchema, collectionPageSchema } from '../seo/schema';
import { PAGE_SEO, categoryTitle, documentPath } from '../seo/seoConfig';
import { downloadBlob } from '../utils/helpers';

const PAGE_SIZE = 20;

const DocumentsPage = () => {
  const { tagSlug } = useParams();
  const [documents, setDocuments] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeTag, setActiveTag] = useState(null);
  const [categoryName, setCategoryName] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null);
  const loadMoreRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (tagSlug) {
      documentsApi.tags().then((res) => {
        const tag = res.data.items.find((t) => t.slug === tagSlug);
        setCategoryName(tag?.name || tagSlug.replace(/-/g, ' '));
      });
    }
  }, [tagSlug]);

  const fetchDocuments = useCallback(
    async (pageNum, tag, slug, append = false) => {
      const setter = append ? setLoadingMore : setLoading;
      setter(true);
      try {
        let res;
        if (slug) {
          try {
            res = await documentsApi.byCategorySlug(slug, pageNum, PAGE_SIZE);
          } catch {
            const tagsRes = await documentsApi.tags();
            const tag = tagsRes.data.items.find((t) => t.slug === slug);
            if (tag) {
              res = await documentsApi.byTag(tag.name, pageNum, PAGE_SIZE);
            } else {
              throw new Error('Category not found');
            }
          }
        } else if (tag === 'Chưa phân loại') {
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
    if (tagSlug) {
      setActiveTag(null);
      setPage(1);
      fetchDocuments(1, null, tagSlug, false);
      return;
    }
    setCategoryName(null);
    setPage(1);
    fetchDocuments(1, activeTag, null, false);
  }, [activeTag, tagSlug, fetchDocuments]);

  useEffect(() => {
    if (!hasMore || loading || loadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          const nextPage = page + 1;
          setPage(nextPage);
          fetchDocuments(nextPage, activeTag, tagSlug, true);
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, page, activeTag, tagSlug, fetchDocuments]);

  const handleDownload = async (doc) => {
    try {
      const res = await documentsApi.download(doc.id);
      downloadBlob(res.data, `${doc.title}.${doc.file_type}`);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCardClick = (doc) => {
    navigate(documentPath(doc));
  };

  const seo = tagSlug && categoryName
    ? {
        title: categoryTitle(categoryName),
        description: `Tổng hợp tài liệu ${categoryName} PTIT - đề thi, slide, giáo trình miễn phí.`,
        keywords: `${categoryName}, tài liệu PTIT, ${categoryName} PTIT`,
        path: `/danh-muc/${tagSlug}`,
      }
    : PAGE_SEO.documents;

  const breadcrumbItems = tagSlug && categoryName
    ? [{ name: 'Tài liệu', path: '/documents' }, { name: categoryName }]
    : [{ name: 'Danh sách tài liệu' }];

  return (
    <div>
      <SeoHead
        title={seo.title}
        description={seo.description}
        keywords={seo.keywords}
        canonical={seo.path}
        jsonLd={[
          collectionPageSchema(seo.title, seo.description, seo.path),
          breadcrumbSchema([
            { name: 'Trang chủ', path: '/' },
            ...breadcrumbItems.map((b) => ({ name: b.name, path: b.path || seo.path })),
          ]),
        ]}
      />

      <SeoBreadcrumb items={breadcrumbItems} />

      <h1 className="page-title">
        {tagSlug && categoryName ? `Tài liệu ${categoryName}` : 'Danh sách tài liệu'}
      </h1>
      <p className="page-subtitle">Tra cứu và tải xuống tài liệu công khai PTIT</p>

      <div className="documents-layout">
        <TagSidebar
          activeTag={activeTag}
          tagSlug={tagSlug}
          onTagSelect={(tag) => {
            if (tag?.slug) {
              navigate(`/danh-muc/${tag.slug}`);
            } else if (tag === null) {
              navigate('/documents');
            } else {
              navigate('/documents');
              setActiveTag(tag);
            }
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
                  <DocumentCard key={doc.id} document={doc} onClick={handleCardClick} />
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
