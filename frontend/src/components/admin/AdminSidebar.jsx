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
import { useAuth } from '../../context/AuthContext';

const NAV_ITEMS = [
  { path: '/internal-admin-portal', icon: <DashboardOutlined />, label: 'Dashboard', end: true, roles: ['admin', 'editor'] },
  { path: '/internal-admin-portal/files', icon: <FileTextOutlined />, label: 'Quản lý tài liệu', roles: ['admin', 'editor'] },
  { path: '/internal-admin-portal/tags', icon: <FolderOutlined />, label: 'Danh mục', roles: ['admin', 'editor'] },
  { path: '/internal-admin-portal/upload', icon: <CloudUploadOutlined />, label: 'Upload tài liệu', roles: ['admin', 'editor'] },
  { path: '/internal-admin-portal/users', icon: <TeamOutlined />, label: 'Người dùng', roles: ['admin'] },
  { path: '/internal-admin-portal/statistics', icon: <BarChartOutlined />, label: 'Thống kê', roles: ['admin', 'editor'] },
];

const AdminSidebar = ({ open, onClose }) => {
  const location = useLocation();
  const { user, isAdmin } = useAuth();

  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(user?.role));

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
          <span>{isAdmin ? 'Admin Portal' : 'Biên tập'}</span>
        </div>
        <nav className="admin-sidebar__nav">
          {visibleItems.map((item) => (
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
