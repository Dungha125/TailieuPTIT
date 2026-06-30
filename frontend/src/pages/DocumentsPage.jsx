import { FilterOutlined } from '@ant-design/icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { documentsApi } from '../api';
import Breadcrumb from '../components/documents/Breadcrumb';
import DocumentGrid from '../components/documents/DocumentGrid';
import Pagination from '../components/documents/Pagination';
import SidebarTree from '../components/documents/SidebarTree';
import PreviewModal from '../components/PreviewModal';
import SeoHead from '../seo/SeoHead';
import { breadcrumbSchema, collectionPageSchema } from '../seo/schema';
import { PAGE_SEO, documentPath } from '../seo/seoConfig';
import {
  buildFilterSearchParams,
  breadcrumbFilterFromIndex,
  findNodePath,
  parseFilterFromSearchParams,
} from '../utils/taxonomy';
import { useDebouncedValue } from '../utils/useDebouncedValue';
import { downloadBlob } from '../utils/helpers';
import '../styles/documents-filter.css';

const PAGE_SIZE = 12;

const DocumentsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const parsed = parseFilterFromSearchParams(searchParams);
  const filter = useMemo(
    () => ({
      faculty: parsed.faculty,
      subject: parsed.subject,
      type: parsed.type,
      year: parsed.year,
    }),
    [parsed.faculty, parsed.subject, parsed.type, parsed.year]
  );

  const [tree, setTree] = useState([]);
  const [treeLoading, setTreeLoading] = useState(true);
  const [documents, setDocuments] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchInput, setSearchInput] = useState(parsed.q);
  const debouncedQ = useDebouncedValue(searchInput);

  const page = parsed.page;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const crumbs = useMemo(() => findNodePath(tree, filter), [tree, filter]);

  const applyState = useCallback(
    (nextFilter, nextPage = 1, q = debouncedQ) => {
      const params = buildFilterSearchParams(nextFilter, nextPage, q);
      setSearchParams(params, { replace: true });
    },
    [debouncedQ, setSearchParams]
  );

  useEffect(() => {
    documentsApi
      .taxonomy()
      .then((res) => setTree(res.data.tree || []))
      .catch(console.error)
      .finally(() => setTreeLoading(false));
  }, []);

  useEffect(() => {
    setLoading(true);
    documentsApi
      .browse({
        page,
        pageSize: PAGE_SIZE,
        faculty: filter.faculty,
        subject: filter.subject,
        type: filter.type,
        year: filter.year,
        q: debouncedQ,
      })
      .then((res) => {
        setDocuments(res.data.items);
        setTotal(res.data.total);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page, filter, debouncedQ]);

  useEffect(() => {
    const currentQ = searchParams.get('q') || '';
    if (debouncedQ !== currentQ) {
      applyState(filter, 1, debouncedQ);
    }
  }, [debouncedQ]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleNodeSelect = (nextFilter) => {
    applyState(nextFilter, 1);
    setDrawerOpen(false);
  };

  const handleClearFilter = () => {
    applyState({ faculty: null, subject: null, type: null, year: null }, 1, '');
    setSearchInput('');
    setDrawerOpen(false);
  };

  const handleBreadcrumb = (item, index) => {
    if (item.level === 'home') {
      handleClearFilter();
      return;
    }
    applyState(breadcrumbFilterFromIndex(crumbs, index), 1);
  };

  const handlePageChange = (nextPage) => {
    applyState(filter, nextPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCardClick = (doc) => navigate(documentPath(doc));

  const handleDownload = async (doc) => {
    try {
      const res = await documentsApi.download(doc.id);
      downloadBlob(res.data, `${doc.title}.${doc.file_type}`);
    } catch (err) {
      console.error(err);
    }
  };

  const pageTitle = crumbs.length > 1 ? crumbs[crumbs.length - 1].label : 'Danh sách tài liệu';
  const seoPath = `/documents${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;

  const sidebar = (
    <SidebarTree
      tree={tree}
      filter={filter}
      onSelect={handleNodeSelect}
      onClear={handleClearFilter}
      loading={treeLoading}
    />
  );

  return (
    <div className="documents-page">
      <SeoHead
        title={`${pageTitle} | Tài liệu PTIT`}
        description={PAGE_SEO.documents.description}
        keywords={PAGE_SEO.documents.keywords}
        canonical={seoPath}
        jsonLd={[
          collectionPageSchema(pageTitle, PAGE_SEO.documents.description, seoPath),
          breadcrumbSchema(crumbs.map((c) => ({ name: c.label, path: c.level === 'home' ? '/' : undefined }))),
        ]}
      />

      <h1 className="page-title">{pageTitle}</h1>
      <p className="page-subtitle">Tra cứu và tải xuống tài liệu công khai PTIT</p>

      <div className="documents-page__toolbar">
        <button type="button" className="documents-page__filter-btn" onClick={() => setDrawerOpen(true)}>
          <FilterOutlined /> Bộ lọc
        </button>
        <div className="documents-page__search">
          <input
            type="search"
            placeholder="Tìm kiếm tài liệu..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
      </div>

      <Breadcrumb items={crumbs} onNavigate={handleBreadcrumb} />

      <div className="documents-page__layout">
        <div className={`documents-sidebar-wrap ${drawerOpen ? 'documents-sidebar-wrap--open' : ''}`}>
          {sidebar}
        </div>
        <div
          className={`documents-drawer-backdrop ${drawerOpen ? 'documents-drawer-backdrop--visible' : ''}`}
          onClick={() => setDrawerOpen(false)}
          aria-hidden
        />

        <div>
          <p style={{ marginBottom: 12, color: '#757575', fontSize: '0.9rem' }}>
            {loading ? 'Đang tải...' : `${total} tài liệu`}
          </p>
          <DocumentGrid documents={documents} loading={loading} onCardClick={handleCardClick} />
          <Pagination page={page} totalPages={totalPages} onChange={handlePageChange} />
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
