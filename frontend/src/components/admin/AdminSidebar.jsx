import { Link, useLocation } from 'react-router-dom';
import {
  DashboardOutlined,
  FileTextOutlined,
  FolderOutlined,
  CloudUploadOutlined,
  TeamOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import StorageBar from './StorageBar';

const NAV_ITEMS = [
  { path: '/internal-admin-portal', icon: <DashboardOutlined />, label: 'Dashboard', end: true },
  { path: '/internal-admin-portal/files', icon: <FileTextOutlined />, label: 'Quản lý tài liệu' },
  { path: '/internal-admin-portal/tags', icon: <FolderOutlined />, label: 'Danh mục' },
  { path: '/internal-admin-portal/upload', icon: <CloudUploadOutlined />, label: 'Upload tài liệu' },
  { path: '/internal-admin-portal/users', icon: <TeamOutlined />, label: 'Người dùng' },
  { path: '/internal-admin-portal/statistics', icon: <BarChartOutlined />, label: 'Thống kê' },
];

const AdminSidebar = ({ open, onClose }) => {
  const location = useLocation();

  const isActive = (item) => {
    if (item.end) return location.pathname === item.path;
    return location.pathname.startsWith(item.path);
  };

  return (
    <>
      <div className={`admin-overlay ${open ? 'admin-overlay--visible' : ''}`} onClick={onClose} />
      <aside className={`admin-sidebar ${open ? 'admin-sidebar--open' : ''}`}>
        <div className="admin-sidebar__brand">
          <h1>TailieuPTIT</h1>
          <span>Admin Portal</span>
        </div>
        <nav className="admin-sidebar__nav">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`admin-sidebar__link ${isActive(item) ? 'admin-sidebar__link--active' : ''}`}
              onClick={onClose}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="admin-sidebar__footer">
          <StorageBar />
        </div>
      </aside>
    </>
  );
};

export default AdminSidebar;
