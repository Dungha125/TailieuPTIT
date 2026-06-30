import { memo, useMemo } from 'react';

const Pagination = memo(({ page, totalPages, onChange }) => {
  const pages = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const set = new Set([1, totalPages, page, page - 1, page + 1]);
    return [...set].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  }, [page, totalPages]);

  if (totalPages <= 1) return null;

  return (
    <nav className="doc-pagination" aria-label="Phân trang">
      <button
        type="button"
        className="doc-pagination__btn"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        Trước
      </button>
      {pages.map((p, idx) => {
        const prev = pages[idx - 1];
        const gap = prev && p - prev > 1;
        return (
          <span key={p} style={{ display: 'contents' }}>
            {gap && <span className="doc-pagination__btn" style={{ border: 'none', cursor: 'default' }}>…</span>}
            <button
              type="button"
              className={`doc-pagination__btn ${p === page ? 'doc-pagination__btn--active' : ''}`}
              onClick={() => onChange(p)}
            >
              {p}
            </button>
          </span>
        );
      })}
      <button
        type="button"
        className="doc-pagination__btn"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
      >
        Sau
      </button>
    </nav>
  );
});

Pagination.displayName = 'Pagination';

export default Pagination;
