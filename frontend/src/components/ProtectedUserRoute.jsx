import { Navigate, useLocation } from 'react-router-dom';
import { Spin } from 'antd';
import { useUserAuth } from '../context/UserAuthContext';

const ProtectedUserRoute = ({ children }) => {
  const { user, loading } = useUserAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  }

  return children;
};

export default ProtectedUserRoute;
