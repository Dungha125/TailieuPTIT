import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('admin_token');
  if (!token) {
    return <Navigate to="/internal-admin-portal/login" replace />;
  }
  return children;
};

export default ProtectedRoute;
