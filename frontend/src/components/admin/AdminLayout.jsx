import { useState } from 'react';
import { Outlet, useSearchParams } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import AdminTopbar from './AdminTopbar';
import '../../styles/admin.scss';

const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const searchValue = searchParams.get('search') || '';

  const handleSearch = (value) => {
    if (value) {
      setSearchParams({ search: value });
    } else {
      setSearchParams({});
    }
  };

  return (
    <div className="admin-shell">
      <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="admin-main">
        <AdminTopbar
          onMenuClick={() => setSidebarOpen(true)}
          searchValue={searchValue}
          onSearch={handleSearch}
        />
        <main className="admin-content">
          <Outlet context={{ searchValue }} />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
