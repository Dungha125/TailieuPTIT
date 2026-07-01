import { useState } from 'react';
import {
  FolderOutlined,
  PlusOutlined,
  PushpinOutlined,
  DeleteOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { Button, Input, Tree } from 'antd';

const VIEWS = [
  { key: 'all', label: 'Tất cả ghi chú', icon: <FileTextOutlined /> },
  { key: 'pinned', label: 'Đã ghim', icon: <PushpinOutlined /> },
  { key: 'trash', label: 'Thùng rác', icon: <DeleteOutlined /> },
];

const buildTreeData = (folders) =>
  folders.map((f) => ({
    key: `folder-${f.id}`,
    title: f.name,
    icon: <FolderOutlined />,
    children: f.children?.length ? buildTreeData(f.children) : undefined,
    folderId: f.id,
  }));

const NotesSidebar = ({
  folders,
  view,
  onViewChange,
  onFolderSelect,
  onCreateFolder,
  onCreateNote,
  canCreateNote = true,
  collapsed,
  onToggle,
}) => {
  const [newFolder, setNewFolder] = useState('');
  const [addingFolder, setAddingFolder] = useState(false);

  return (
    <aside className={`notes-sidebar ${collapsed ? 'notes-sidebar--collapsed' : ''}`}>
      <div className="notes-sidebar__header">
        <strong>Ghi chú</strong>
        <Button type="text" size="small" onClick={onToggle}>
          {collapsed ? '»' : '«'}
        </Button>
      </div>

      {!collapsed && (
        <>
          <Button
            type="primary"
            block
            icon={<PlusOutlined />}
            className="btn-gradient notes-sidebar__new"
            onClick={onCreateNote}
            disabled={!canCreateNote}
          >
            Note mới
          </Button>

          <nav className="notes-sidebar__nav">
            {VIEWS.map((v) => (
              <button
                key={v.key}
                type="button"
                className={`notes-sidebar__item ${view === v.key ? 'notes-sidebar__item--active' : ''}`}
                onClick={() => onViewChange(v.key)}
              >
                {v.icon}
                <span>{v.label}</span>
              </button>
            ))}
          </nav>

          {view !== 'trash' && (
            <div className="notes-sidebar__section">
              <div className="notes-sidebar__section-title">
                Thư mục
                <Button type="text" size="small" icon={<PlusOutlined />} onClick={() => setAddingFolder(true)} />
              </div>
              {addingFolder && (
                <Input
                  size="small"
                  placeholder="Tên thư mục"
                  value={newFolder}
                  onChange={(e) => setNewFolder(e.target.value)}
                  onPressEnter={() => {
                    if (newFolder.trim()) onCreateFolder(newFolder.trim());
                    setNewFolder('');
                    setAddingFolder(false);
                  }}
                  onBlur={() => setAddingFolder(false)}
                />
              )}
              <Tree
                showIcon
                selectable
                treeData={buildTreeData(folders)}
                onSelect={(keys, info) => {
                  const id = info.node.folderId;
                  if (id) onFolderSelect(id);
                }}
              />
            </div>
          )}
        </>
      )}
    </aside>
  );
};

export default NotesSidebar;
