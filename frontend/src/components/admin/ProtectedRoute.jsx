import { Navigate } from 'react-router-dom';
import { Spin } from 'antd';
import { useEffect, useState } from 'react';
import { authApi } from '../../api';

const ProtectedRoute = ({ children }) => {
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      setStatus('denied');
      return;
    }

    authApi
      .me()
      .then(() => setStatus('allowed'))
      .catch(() => {
        localStorage.removeItem('admin_token');
        setStatus('denied');
      });
  }, []);

  if (status === 'loading') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (status === 'denied') {
    return <Navigate to="/internal-admin-portal/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
