import { useNavigate, useSearchParams } from 'react-router-dom';
import { Input, Spin } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { documentsApi } from '../api';
import DocumentCard from '../components/DocumentCard';

const { Search } = Input;
const PAGE_SIZE = 20;

const SearchPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [documents, setDocuments] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searched, setSearched] = useState(false);
  const loadMoreRef = useRef(null);

  const doSearch = useCallback(async (q, pageNum, append = false) => {
    if (!q.trim()) return;
    const setter = append ? setLoadingMore : setLoading;
    setter(true);
    try {
      const res = await documentsApi.search(q, pageNum, PAGE_SIZE);
      const { items, has_more } = res.data;
      setDocuments((prev) => (append ? [...prev, ...items] : items));
      setHasMore(has_more);
      setSearched(true);
    } catch (err) {
      console.error(err);
    } finally {
      setter(false);
    }
  }, []);

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) {
      setQuery(q);
      setPage(1);
      doSearch(q, 1, false);
    }
  }, [searchParams, doSearch]);

  useEffect(() => {
    if (!hasMore || loading || loadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          const nextPage = page + 1;
          setPage(nextPage);
          doSearch(query, nextPage, true);
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, page, query, doSearch]);

  const handleSearch = (value) => {
    setSearchParams({ q: value });
    setPage(1);
  };

  return (
    <div>
      <h1 className="page-title">Tìm kiếm tài liệu</h1>
      <p className="page-subtitle">Nhập từ khóa để tìm tài liệu theo tên hoặc mô tả</p>

      <div className="search-bar">
        <Search
          placeholder="Tìm kiếm theo tên tài liệu..."
          enterButton={<><SearchOutlined /> Tìm kiếm</>}
          size="large"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onSearch={handleSearch}
          allowClear
        />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48 }}>
          <Spin size="large" />
        </div>
      ) : searched && documents.length === 0 ? (
        <div className="empty-state">Không tìm thấy kết quả cho &quot;{query}&quot;</div>
      ) : (
        <>
          <div className="doc-grid">
            {documents.map((doc) => (
              <DocumentCard
                key={doc.id}
                document={doc}
                onClick={() => navigate(`/documents/${doc.id}`)}
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
  );
};

export default SearchPage;
