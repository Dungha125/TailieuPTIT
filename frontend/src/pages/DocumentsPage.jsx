import { FilterOutlined, FileTextOutlined, EditOutlined, StarOutlined } from '@ant-design/icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { documentsApi } from '../api';
import Breadcrumb from '../components/documents/Breadcrumb';
import DocumentGrid from '../components/documents/DocumentGrid';
import Pagination from '../components/documents/Pagination';
import SidebarTree from '../components/documents/SidebarTree';
import NotesWorkspace from '../components/notes/NotesWorkspace';
import BookmarksWorkspace from '../components/bookmarks/BookmarksWorkspace';
import PreviewModal from '../components/PreviewModal';
import SeoHead from '../seo/SeoHead';
import { breadcrumbSchema, collectionPageSchema } from '../seo/schema';
import { PAGE_SEO, documentPath } from '../seo/seoConfig';
import { useUserAuth } from '../context/UserAuthContext';
import {
  buildFilterSearchParams,
  breadcrumbFilterFromIndex,
  findNodePath,
  parseFilterFromSearchParams,
} from '../utils/taxonomy';
import { useDebouncedValue } from '../utils/useDebouncedValue';
import { downloadBlob } from '../utils/helpers';
import '../styles/documents-filter.css';
import '../styles/user-notes.css';

const PAGE_SIZE = 12;

const DocumentsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useUserAuth();
  const hubTabParam = searchParams.get('tab');
  const hubTab =
    hubTabParam === 'notes' ? 'notes' : hubTabParam === 'bookmarks' ? 'bookmarks' : 'docs';
  const noteId = searchParams.get('note');
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
    (nextFilter, nextPage = 1, q = debouncedQ, extras = {}) => {
      const params = buildFilterSearchParams(nextFilter, nextPage, q);
      if (extras.tab === 'notes') {
        params.set('tab', 'notes');
        if (extras.noteId) params.set('note', String(extras.noteId));
      }
      setSearchParams(params, { replace: true });
    },
    [debouncedQ, setSearchParams]
  );

  const setHubTab = (tab) => {
    if ((tab === 'notes' || tab === 'bookmarks') && !isAuthenticated) {
      navigate(`/login?redirect=${encodeURIComponent(`/documents?tab=${tab}`)}`);
      return;
    }
    const params = buildFilterSearchParams(filter, page, debouncedQ);
    params.delete('note');
    if (tab === 'docs') {
      params.delete('tab');
    } else {
      params.set('tab', tab);
      if (tab === 'notes' && noteId) params.set('note', noteId);
    }
    setSearchParams(params, { replace: true });
  };

  const openNote = (id) => {
    const params = buildFilterSearchParams(filter, page, debouncedQ);
    params.set('tab', 'notes');
    if (id) params.set('note', String(id));
    else params.delete('note');
    setSearchParams(params, { replace: true });
  };

  useEffect(() => {
    if ((hubTab === 'notes' || hubTab === 'bookmarks') && !authLoading && !isAuthenticated) {
      navigate(`/login?redirect=${encodeURIComponent(`/documents?tab=${hubTab}`)}`);
    }
  }, [hubTab, authLoading, isAuthenticated, navigate]);

  useEffect(() => {
    documentsApi
      .taxonomy()
      .then((res) => setTree(res.data.tree || []))
      .catch(console.error)
      .finally(() => setTreeLoading(false));
  }, []);

  useEffect(() => {
    if (hubTab !== 'docs') return;
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
  }, [page, filter, debouncedQ, hubTab]);

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

  const pageTitle =
    hubTab === 'notes'
      ? 'Ghi chú của tôi'
      : hubTab === 'bookmarks'
        ? 'Bookmark của tôi'
        : crumbs.length > 1
          ? crumbs[crumbs.length - 1].label
          : 'Danh sách tài liệu';
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
      <p className="page-subtitle">
        {hubTab === 'notes'
          ? 'Soạn thảo ghi chú và liên kết tài liệu học tập'
          : hubTab === 'bookmarks'
            ? 'Quản lý tài liệu đã lưu và xem lại nhanh'
            : 'Tra cứu và tải xuống tài liệu công khai PTIT'}
      </p>

      {isAuthenticated && (
        <div className="documents-hub-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={hubTab === 'docs'}
            className={`documents-hub-tabs__btn ${hubTab === 'docs' ? 'documents-hub-tabs__btn--active' : ''}`}
            onClick={() => setHubTab('docs')}
          >
            <FileTextOutlined /> Tài liệu
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={hubTab === 'notes'}
            className={`documents-hub-tabs__btn ${hubTab === 'notes' ? 'documents-hub-tabs__btn--active' : ''}`}
            onClick={() => setHubTab('notes')}
          >
            <EditOutlined /> Ghi chú
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={hubTab === 'bookmarks'}
            className={`documents-hub-tabs__btn ${hubTab === 'bookmarks' ? 'documents-hub-tabs__btn--active' : ''}`}
            onClick={() => setHubTab('bookmarks')}
          >
            <StarOutlined /> Bookmark
          </button>
        </div>
      )}

      {hubTab === 'docs' && (
        <>
      <div className="documents-page__toolbar">
        <button type="button" className="documents-page__filter-btn" onClick={() => setDrawerOpen(true)}>
          <FilterOutlined /> Bộ lọc
        </button>
        <div className="documents-page__search">
          <input
            type="search"
            placeholder="Tìm theo tên, mô tả hoặc tag..."
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
        </>
      )}

      {hubTab === 'notes' && isAuthenticated && (
        <NotesWorkspace noteId={noteId} onSelectNote={openNote} />
      )}

      {hubTab === 'bookmarks' && isAuthenticated && <BookmarksWorkspace />}

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
