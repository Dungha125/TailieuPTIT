import { useCallback, useEffect, useState } from 'react';
import { Alert, Input, List, message, Modal, Spin, Tag } from 'antd';
import { PushpinFilled, PushpinOutlined } from '@ant-design/icons';
import { notesApi } from '../../api';
import { useDebouncedValue } from '../../utils/useDebouncedValue';
import NotesSidebar from './NotesSidebar';
import NoteEditor from './NoteEditor';

const NotesWorkspace = ({ noteId, onSelectNote }) => {
  const [folders, setFolders] = useState([]);
  const [notes, setNotes] = useState([]);
  const [total, setTotal] = useState(0);
  const [quota, setQuota] = useState(null);
  const [page, setPage] = useState(1);
  const [view, setView] = useState('all');
  const [folderId, setFolderId] = useState(null);
  const [search, setSearch] = useState('');
  const [activeNote, setActiveNote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [pendingSave, setPendingSave] = useState(null);
  const debouncedSearch = useDebouncedValue(search);
  const debouncedSave = useDebouncedValue(pendingSave, 800);

  const loadFolders = useCallback(() => {
    notesApi.folders().then((res) => setFolders(res.data)).catch(console.error);
  }, []);

  const loadNotes = useCallback(() => {
    setLoading(true);
    notesApi
      .list({ page, page_size: 20, view, folder_id: folderId, q: debouncedSearch })
      .then((res) => {
        setNotes(res.data.items);
        setTotal(res.data.total);
        if (res.data.quota) setQuota(res.data.quota);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page, view, folderId, debouncedSearch]);

  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  useEffect(() => {
    if (!noteId) {
      setActiveNote(null);
      return;
    }
    notesApi
      .get(noteId)
      .then((res) => setActiveNote(res.data))
      .catch(() => message.error('Không tải được ghi chú'));
  }, [noteId]);

  useEffect(() => {
    if (!activeNote?.id || !debouncedSave || activeNote.is_trashed) return;
    notesApi.update(activeNote.id, debouncedSave).catch(console.error);
  }, [debouncedSave, activeNote?.id, activeNote?.is_trashed]);

  const handleSave = (patch) => {
    setActiveNote((prev) => (prev ? { ...prev, ...patch } : prev));
    setPendingSave(patch);
  };

  const createNote = async () => {
    try {
      const res = await notesApi.create({ title: 'Không có tiêu đề', folder_id: folderId });
      onSelectNote?.(res.data.id);
      loadNotes();
    } catch (err) {
      message.error(err.response?.data?.detail || 'Không thể tạo ghi chú mới');
    }
  };

  const handlePinToggle = async () => {
    if (!activeNote) return;
    const next = !activeNote.is_pinned;
    try {
      const res = await notesApi.update(activeNote.id, { is_pinned: next });
      setActiveNote(res.data);
      loadNotes();
      message.success(next ? 'Đã ghim ghi chú' : 'Đã bỏ ghim');
    } catch {
      message.error('Không thể cập nhật ghim');
    }
  };

  const handleMoveToTrash = () => {
    if (!activeNote) return;
    Modal.confirm({
      title: 'Chuyển vào thùng rác?',
      content: 'Ghi chú sẽ được chuyển vào thùng rác. Bạn có thể khôi phục trong vòng 14 ngày.',
      okText: 'Chuyển vào thùng rác',
      cancelText: 'Hủy',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await notesApi.delete(activeNote.id);
          setActiveNote(null);
          onSelectNote?.(null);
          loadNotes();
          message.success('Đã chuyển vào thùng rác');
        } catch {
          message.error('Không thể xóa ghi chú');
        }
      },
    });
  };

  const handleRestore = async () => {
    if (!activeNote) return;
    try {
      const res = await notesApi.restore(activeNote.id);
      setActiveNote(res.data);
      setView('all');
      loadNotes();
      message.success('Đã khôi phục ghi chú');
    } catch (err) {
      message.error(err.response?.data?.detail || 'Không thể khôi phục ghi chú');
    }
  };

  const handlePermanentDelete = () => {
    if (!activeNote) return;
    Modal.confirm({
      title: 'Xóa vĩnh viễn?',
      content: 'Ghi chú sẽ bị xóa hoàn toàn và không thể khôi phục.',
      okText: 'Xóa vĩnh viễn',
      cancelText: 'Hủy',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await notesApi.delete(activeNote.id, true);
          setActiveNote(null);
          onSelectNote?.(null);
          loadNotes();
          message.success('Đã xóa vĩnh viễn');
        } catch (err) {
          message.error(err.response?.data?.detail || 'Không thể xóa');
        }
      },
    });
  };

  const isTrashView = view === 'trash';

  return (
    <div className="notes-workspace notes-workspace--embedded">
      <NotesSidebar
        folders={folders}
        view={view}
        canCreateNote={quota?.can_create !== false}
        onViewChange={(v) => {
          setView(v);
          setFolderId(null);
          setPage(1);
          if (v === 'trash') {
            setActiveNote(null);
            onSelectNote?.(null);
          }
        }}
        onFolderSelect={(id) => {
          setFolderId(id);
          setView('all');
          setPage(1);
        }}
        onCreateFolder={async (name) => {
          await notesApi.createFolder({ name, parent_id: folderId });
          loadFolders();
        }}
        onCreateNote={createNote}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((v) => !v)}
      />

      <div className="notes-workspace__list">
        {quota?.storage_warning && !isTrashView && (
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 12 }}
            message="Dung lượng ghi chú sắp đầy"
            description="Bạn cần xóa bớt ghi chú để có thêm không gian lưu trữ."
          />
        )}

        {isTrashView && (
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 12 }}
            message="Thùng rác"
            description="Ghi chú trong thùng rác sẽ bị xóa vĩnh viễn sau 14 ngày kể từ ngày xóa."
          />
        )}

        <Input.Search
          placeholder="Tìm ghi chú..."
          allowClear
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ marginBottom: 12 }}
        />
        {loading ? (
          <Spin />
        ) : (
          <List
            dataSource={notes}
            renderItem={(item) => (
              <List.Item
                className={`notes-list-item ${String(activeNote?.id) === String(item.id) ? 'notes-list-item--active' : ''}`}
                onClick={() => onSelectNote?.(item.id)}
              >
                <div className="notes-list-item__body">
                  <div className="notes-list-item__title">
                    {item.is_pinned && !item.is_trashed && (
                      <PushpinFilled className="notes-list-item__pin" />
                    )}
                    {item.title}
                  </div>
                  <div className="notes-list-item__meta">
                    {new Date(item.updated_at).toLocaleString('vi-VN')}
                    {item.is_trashed && item.trash_days_remaining != null && (
                      <Tag color="orange" style={{ marginLeft: 8 }}>
                        Còn {item.trash_days_remaining} ngày
                      </Tag>
                    )}
                  </div>
                </div>
              </List.Item>
            )}
          />
        )}
        {page * 20 < total && (
          <button type="button" className="notes-load-more" onClick={() => setPage((p) => p + 1)}>
            Tải thêm
          </button>
        )}
      </div>

      <div className="notes-workspace__editor">
        {activeNote ? (
          <NoteEditor
            note={activeNote}
            folders={folders}
            readOnly={activeNote.is_trashed}
            onSave={handleSave}
            onTitleChange={(title) => handleSave({ title })}
            onFolderChange={(folder_id) => {
              handleSave({ folder_id });
              loadNotes();
            }}
            onPinToggle={handlePinToggle}
            onMoveToTrash={handleMoveToTrash}
            onRestore={handleRestore}
            onPermanentDelete={handlePermanentDelete}
          />
        ) : (
          <div className="notes-empty">
            {isTrashView ? 'Chọn ghi chú trong thùng rác để khôi phục hoặc xóa' : 'Chọn hoặc tạo ghi chú để bắt đầu'}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotesWorkspace;
