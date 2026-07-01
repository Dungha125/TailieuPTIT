import { useEffect, useState } from 'react';
import { Button, message, Popover, Select } from 'antd';
import { StarFilled, StarOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { userApi } from '../api';
import { useUserAuth } from '../context/UserAuthContext';

const BookmarkButton = ({ documentId, size = 'default', className = '' }) => {
  const navigate = useNavigate();
  const { isAuthenticated, isBookmarked, toggleBookmark } = useUserAuth();
  const [loading, setLoading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [folders, setFolders] = useState([]);
  const [folderId, setFolderId] = useState(null);
  const saved = isBookmarked(documentId);

  useEffect(() => {
    if (!pickerOpen || !isAuthenticated) return;
    userApi.bookmarkFolders().then((res) => setFolders(res.data)).catch(console.error);
  }, [pickerOpen, isAuthenticated]);

  const handleRemove = async (e) => {
    e.stopPropagation();
    e.preventDefault();
    setLoading(true);
    try {
      await toggleBookmark(documentId);
      message.success('Đã bỏ lưu tài liệu');
    } catch {
      message.error('Không thể bỏ lưu');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e?.stopPropagation();
    e?.preventDefault();
    setLoading(true);
    try {
      await toggleBookmark(documentId, folderId);
      message.success(folderId ? 'Đã lưu vào thư mục' : 'Đã lưu tài liệu');
      setPickerOpen(false);
      setFolderId(null);
    } catch {
      message.error('Không thể lưu bookmark');
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerClick = (e) => {
    e.stopPropagation();
    e.preventDefault();

    if (!isAuthenticated) {
      navigate(`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      return;
    }

    if (saved) {
      handleRemove(e);
      return;
    }

    setPickerOpen(true);
  };

  const iconSize = size === 'large' ? '1.25rem' : '1rem';

  const picker = (
    <div className="bookmark-picker" onClick={(e) => e.stopPropagation()}>
      <p className="bookmark-picker__label">Chọn thư mục (tuỳ chọn)</p>
      <Select
        allowClear
        placeholder="Không có thư mục"
        style={{ width: '100%', marginBottom: 10 }}
        value={folderId ?? undefined}
        options={folders.map((f) => ({ value: f.id, label: f.name }))}
        onChange={(v) => setFolderId(v ?? null)}
      />
      <Button type="primary" block loading={loading} onClick={handleSave}>
        Lưu bookmark
      </Button>
    </div>
  );

  return (
    <Popover
      content={picker}
      title="Lưu tài liệu"
      open={pickerOpen && !saved}
      onOpenChange={(open) => {
        if (!saved) setPickerOpen(open);
        if (!open) setFolderId(null);
      }}
    >
      <button
        type="button"
        className={`bookmark-btn ${saved ? 'bookmark-btn--saved' : ''} ${className}`.trim()}
        onClick={handleTriggerClick}
        disabled={loading}
        aria-label={saved ? 'Bỏ lưu tài liệu' : 'Lưu tài liệu'}
        title={saved ? 'Bỏ lưu' : 'Lưu vào bookmark'}
      >
        {saved ? (
          <StarFilled style={{ fontSize: iconSize, color: '#FFB300' }} />
        ) : (
          <StarOutlined style={{ fontSize: iconSize }} />
        )}
      </button>
    </Popover>
  );
};

export default BookmarkButton;
