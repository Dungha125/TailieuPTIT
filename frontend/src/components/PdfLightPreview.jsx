import { Spin, Typography } from 'antd';
import { useEffect, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { documentsApi } from '../api';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const MAX_PAGES = 10;
const PREVIEW_SCALE = 0.75;

const PdfLightPreview = ({ documentId, title }) => {
  const [pages, setPages] = useState([]);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      setPages([]);

      try {
        const res = await documentsApi.previewStream(documentId);
        const buffer = await res.data.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
        const pageCount = pdf.numPages;
        const renderCount = Math.min(pageCount, MAX_PAGES);

        if (cancelled) return;

        setTotalPages(pageCount);
        const rendered = [];

        for (let i = 1; i <= renderCount; i += 1) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: PREVIEW_SCALE });
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          canvas.width = viewport.width;
          canvas.height = viewport.height;

          await page.render({ canvasContext: ctx, viewport }).promise;
          rendered.push({ pageNum: i, src: canvas.toDataURL('image/jpeg', 0.72) });
        }

        if (!cancelled) setPages(rendered);
      } catch (err) {
        if (!cancelled) setError('Không thể tải bản xem trước PDF.');
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [documentId]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 48 }}>
        <Spin size="large" />
        <p style={{ marginTop: 12, color: '#888' }}>Đang tạo bản xem trước nhẹ...</p>
      </div>
    );
  }

  if (error) {
    return <div className="empty-state">{error}</div>;
  }

  return (
    <div className="pdf-light-preview">
      {totalPages > MAX_PAGES && (
        <Typography.Text type="secondary" className="pdf-preview-note">
          Hiển thị {MAX_PAGES}/{totalPages} trang đầu (độ phân giải thấp). Tải file để xem đầy đủ.
        </Typography.Text>
      )}
      {pages.map((p) => (
        <div key={p.pageNum} className="pdf-preview-page">
          <span className="pdf-preview-page-label">Trang {p.pageNum}</span>
          <img src={p.src} alt={`${title} - trang ${p.pageNum}`} loading="lazy" />
        </div>
      ))}
    </div>
  );
};

export default PdfLightPreview;
