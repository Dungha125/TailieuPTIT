import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Input, List, message, Popconfirm, Spin, Tag } from 'antd';
import {
  DeleteOutlined,
  FolderOutlined,
  PlusOutlined,
  StarFilled,
  HistoryOutlined,
} from '@ant-design/icons';
import { userApi } from '../../api';
import { useUserAuth } from '../../context/UserAuthContext';
import { documentPath } from '../../seo/seoConfig';

const docHref = (item) =>
  item.document_slug ? `/tai-lieu/${item.document_slug}` : `/documents/${item.document_id}`;

const BookmarksWorkspace = () => {
  const navigate = useNavigate();
  const { refreshBookmarks } = useUserAuth();
  const [folders, setFolders] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [recentDocs, setRecentDocs] = useState([]);
  const [folderId, setFolderId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [addingFolder, setAddingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const loadFolders = useCallback(() => {
    userApi.bookmarkFolders().then((res) => setFolders(res.data)).catch(console.error);
  }, []);

  const loadBookmarks = useCallback(() => {
    setLoading(true);
    userApi
      .bookmarks(folderId)
      .then((res) => setBookmarks(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [folderId]);

  const loadRecent = useCallback(() => {
    userApi
      .dashboard()
      .then((res) => setRecentDocs(res.data.recent_documents || []))
      .catch(console.error);
  }, []);

  useEffect(() => {
    loadFolders();
    loadRecent();
  }, [loadFolders, loadRecent]);

  useEffect(() => {
    loadBookmarks();
  }, [loadBookmarks]);

  const handleCreateFolder = async () => {
    const name = newFolderName.trim();
    if (!name) return;
    try {
      await userApi.createBookmarkFolder(name);
      setNewFolderName('');
      setAddingFolder(false);
      loadFolders();
      message.success('Đã tạo thư mục bookmark');
    } catch {
      message.error('Không tạo được thư mục');
    }
  };

  const handleDeleteFolder = async (id) => {
    try {
      await userApi.deleteBookmarkFolder(id);
      if (folderId === id) setFolderId(null);
      loadFolders();
      loadBookmarks();
      message.success('Đã xóa thư mục');
    } catch {
      message.error('Không xóa được thư mục');
    }
  };

  const handleRemoveBookmark = async (documentId) => {
    try {
      await userApi.removeBookmark(documentId);
      await refreshBookmarks();
      loadBookmarks();
      message.success('Đã bỏ lưu tài liệu');
    } catch {
      message.error('Không bỏ lưu được');
    }
  };

  return (
    <div className="bookmarks-workspace">
      <aside className="bookmarks-sidebar">
        <div className="bookmarks-sidebar__header">
          <strong>Thư mục bookmark</strong>
          <Button type="text" size="small" icon={<PlusOutlined />} onClick={() => setAddingFolder(true)} />
        </div>

        {addingFolder && (
          <Input
            size="small"
            placeholder="Tên thư mục"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onPressEnter={handleCreateFolder}
            onBlur={() => {
              if (!newFolderName.trim()) setAddingFolder(false);
            }}
            style={{ marginBottom: 8 }}
          />
        )}

        <button
          type="button"
          className={`bookmarks-sidebar__item ${folderId === null ? 'bookmarks-sidebar__item--active' : ''}`}
          onClick={() => setFolderId(null)}
        >
          <StarFilled />
          <span>Tất cả bookmark</span>
        </button>

        {folders.map((folder) => (
          <div key={folder.id} className="bookmarks-sidebar__folder-row">
            <button
              type="button"
              className={`bookmarks-sidebar__item ${folderId === folder.id ? 'bookmarks-sidebar__item--active' : ''}`}
              onClick={() => setFolderId(folder.id)}
            >
              <FolderOutlined />
              <span>{folder.name}</span>
            </button>
            <Popconfirm title="Xóa thư mục này?" onConfirm={() => handleDeleteFolder(folder.id)}>
              <Button type="text" size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </div>
        ))}
      </aside>

      <div className="bookmarks-main">
        <section className="bookmarks-section">
          <h2 className="bookmarks-section__title">
            <StarFilled /> Tài liệu đã lưu ({bookmarks.length})
          </h2>
          {loading ? (
            <Spin />
          ) : bookmarks.length === 0 ? (
            <div className="bookmarks-empty">
              Chưa có bookmark. Bấm nút sao trên thẻ tài liệu để lưu.
            </div>
          ) : (
            <List
              dataSource={bookmarks}
              renderItem={(item) => (
                <List.Item
                  actions={[
                    <Button
                      key="open"
                      type="link"
                      onClick={() => navigate(docHref(item))}
                    >
                      Mở
                    </Button>,
                    <Button
                      key="remove"
                      type="text"
                      danger
                      onClick={() => handleRemoveBookmark(item.document_id)}
                    >
                      Bỏ lưu
                    </Button>,
                  ]}
                >
                  <List.Item.Meta
                    title={<Link to={docHref(item)}>{item.document_title || 'Tài liệu'}</Link>}
                    description={
                      <Tag>{item.file_type?.toUpperCase()}</Tag>
                    }
                  />
                </List.Item>
              )}
            />
          )}
        </section>

        {recentDocs.length > 0 && (
          <section className="bookmarks-section">
            <h2 className="bookmarks-section__title">
              <HistoryOutlined /> Đã xem gần đây
            </h2>
            <List
              dataSource={recentDocs}
              renderItem={(doc) => (
                <List.Item>
                  <Link to={documentPath(doc)}>{doc.title}</Link>
                  <Tag>{doc.file_type?.toUpperCase()}</Tag>
                </List.Item>
              )}
            />
          </section>
        )}
      </div>
    </div>
  );
};

export default BookmarksWorkspace;
