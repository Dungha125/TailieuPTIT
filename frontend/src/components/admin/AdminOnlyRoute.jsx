import { Navigate } from 'react-router-dom';
import { Spin } from 'antd';
import { useAuth } from '../../context/AuthContext';

const AdminOnlyRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return <Navigate to="/internal-admin-portal" replace />;
  }

  return children;
};

export default AdminOnlyRoute;
