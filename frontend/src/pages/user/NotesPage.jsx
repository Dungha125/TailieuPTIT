import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Input, List, message, Spin } from 'antd';
import { notesApi } from '../../api';
import { useDebouncedValue } from '../../utils/useDebouncedValue';
import NotesSidebar from '../../components/notes/NotesSidebar';
import NoteEditor from '../../components/notes/NoteEditor';
import UserLayout from '../../components/user/UserLayout';

const NotesPage = () => {
  const { noteId } = useParams();
  const navigate = useNavigate();
  const [folders, setFolders] = useState([]);
  const [notes, setNotes] = useState([]);
  const [total, setTotal] = useState(0);
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
      })
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
    if (!activeNote?.id || !debouncedSave) return;
    notesApi.update(activeNote.id, debouncedSave).catch(console.error);
  }, [debouncedSave, activeNote?.id]);

  const handleSave = (patch) => {
    setActiveNote((prev) => (prev ? { ...prev, ...patch } : prev));
    setPendingSave(patch);
  };

  const createNote = async () => {
    const res = await notesApi.create({ title: 'Không có tiêu đề', folder_id: folderId });
    navigate(`/app/notes/${res.data.id}`);
    loadNotes();
  };

  return (
    <UserLayout>
      <div className="notes-workspace">
        <NotesSidebar
          folders={folders}
          view={view}
          onViewChange={(v) => {
            setView(v);
            setFolderId(null);
            setPage(1);
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
                  onClick={() => navigate(`/app/notes/${item.id}`)}
                >
                  <div>
                    <div className="notes-list-item__title">{item.title}</div>
                    <div className="notes-list-item__meta">
                      {new Date(item.updated_at).toLocaleString('vi-VN')}
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
              onSave={handleSave}
              onTitleChange={(title) => handleSave({ title })}
            />
          ) : (
            <div className="notes-empty">Chọn hoặc tạo ghi chú để bắt đầu</div>
          )}
        </div>
      </div>
    </UserLayout>
  );
};

export default NotesPage;
