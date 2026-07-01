import { useState } from 'react';
import { message } from 'antd';
import { StarFilled, StarOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useUserAuth } from '../context/UserAuthContext';

const BookmarkButton = ({ documentId, size = 'default', className = '' }) => {
  const navigate = useNavigate();
  const { isAuthenticated, isBookmarked, toggleBookmark } = useUserAuth();
  const [loading, setLoading] = useState(false);
  const saved = isBookmarked(documentId);

  const handleClick = async (e) => {
    e.stopPropagation();
    e.preventDefault();

    if (!isAuthenticated) {
      navigate(`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      return;
    }

    setLoading(true);
    try {
      const next = await toggleBookmark(documentId);
      message.success(next ? 'Đã lưu tài liệu' : 'Đã bỏ lưu');
    } catch {
      message.error('Không thể cập nhật bookmark');
    } finally {
      setLoading(false);
    }
  };

  const iconSize = size === 'large' ? '1.25rem' : '1rem';

  return (
    <button
      type="button"
      className={`bookmark-btn ${saved ? 'bookmark-btn--saved' : ''} ${className}`.trim()}
      onClick={handleClick}
      disabled={loading}
      aria-label={saved ? 'Bỏ lưu tài liệu' : 'Lưu tài liệu'}
      title={saved ? 'Bỏ lưu' : 'Lưu tài liệu'}
    >
      {saved ? (
        <StarFilled style={{ fontSize: iconSize, color: '#FFB300' }} />
      ) : (
        <StarOutlined style={{ fontSize: iconSize }} />
      )}
    </button>
  );
};

export default BookmarkButton;
