import { Input, Avatar, Dropdown, Badge } from 'antd';
import { SearchOutlined, BellOutlined, MenuOutlined, UserOutlined, LogoutOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { roleLabel } from '../../utils/roles';

const { Search } = Input;

const AdminTopbar = ({ onMenuClick, searchValue, onSearch }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/internal-admin-portal/login');
  };

  const userMenu = {
    items: [
      { key: 'user', label: user?.username || 'Tài khoản', disabled: true },
      { key: 'role', label: roleLabel(user?.role), disabled: true },
      { type: 'divider' },
      {
        key: 'logout',
        icon: <LogoutOutlined />,
        label: 'Đăng xuất',
        onClick: handleLogout,
      },
    ],
  };

  const handleSearch = (value) => {
    const q = value?.trim();
    if (q) {
      navigate(`/internal-admin-portal/files?search=${encodeURIComponent(q)}`);
    }
    onSearch?.(q);
  };

  return (
    <header className="admin-topbar">
      <button type="button" className="admin-topbar__icon-btn admin-topbar__menu-btn" onClick={onMenuClick}>
        <MenuOutlined />
      </button>
      <div className="admin-topbar__search">
        <Search
          placeholder="Tìm kiếm tài liệu..."
          allowClear
          value={searchValue}
          onChange={(e) => onSearch?.(e.target.value)}
          onSearch={handleSearch}
          enterButton={<SearchOutlined />}
          size="large"
        />
      </div>
      <div className="admin-topbar__actions">
        <Badge dot offset={[-2, 2]}>
          <button type="button" className="admin-topbar__icon-btn" aria-label="Thông báo">
            <BellOutlined />
          </button>
        </Badge>
        <Dropdown menu={userMenu} placement="bottomRight" trigger={['click']}>
          <Avatar
            className="admin-topbar__avatar"
            size={40}
            icon={<UserOutlined />}
            style={{ background: 'linear-gradient(135deg, #D32F2F, #B71C1C)' }}
          />
        </Dropdown>
      </div>
    </header>
  );
};

export default AdminTopbar;
