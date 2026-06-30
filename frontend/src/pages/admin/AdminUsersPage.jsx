import { Button } from 'antd';
import { TeamOutlined } from '@ant-design/icons';
import PageHeader from '../../components/admin/PageHeader';
import EmptyState from '../../components/admin/EmptyState';

const AdminUsersPage = () => (
  <div>
    <PageHeader
      title="Người dùng"
      subtitle="Quản lý tài khoản quản trị viên"
      breadcrumbs={[{ label: 'Người dùng' }]}
    />
    <div className="admin-doc-panel">
      <EmptyState
        title="Tính năng đang phát triển"
        description="Quản lý người dùng sẽ được bổ sung trong phiên bản tiếp theo"
        action={
          <Button className="btn-outline-red" icon={<TeamOutlined />} disabled>
            Sắp ra mắt
          </Button>
        }
      />
    </div>
  </div>
);

export default AdminUsersPage;
