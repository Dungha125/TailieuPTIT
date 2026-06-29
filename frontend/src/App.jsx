import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import viVN from 'antd/locale/vi_VN';
import PublicNavbar from './components/PublicNavbar';
import AdminLayout from './components/admin/AdminLayout';
import ProtectedRoute from './components/admin/ProtectedRoute';
import HomePage from './pages/HomePage';
import DocumentsPage from './pages/DocumentsPage';
import SearchPage from './pages/SearchPage';
import DocumentDetailPage from './pages/DocumentDetailPage';
import AdminLoginPage from './pages/admin/AdminLoginPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUploadPage from './pages/admin/AdminUploadPage';
import AdminTagsPage from './pages/admin/AdminTagsPage';
import AdminFilesPage from './pages/admin/AdminFilesPage';

const theme = {
  token: {
    colorPrimary: '#C62828',
    colorLink: '#C62828',
    borderRadius: 8,
  },
};

const PublicLayout = ({ children }) => (
  <div className="app-layout">
    <PublicNavbar />
    <main className="main-content">{children}</main>
  </div>
);

function App() {
  return (
    <ConfigProvider theme={theme} locale={viVN}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<PublicLayout><HomePage /></PublicLayout>} />
          <Route path="/documents" element={<PublicLayout><DocumentsPage /></PublicLayout>} />
          <Route path="/documents/:id" element={<PublicLayout><DocumentDetailPage /></PublicLayout>} />
          <Route path="/search" element={<PublicLayout><SearchPage /></PublicLayout>} />

          <Route path="/internal-admin-portal/login" element={<AdminLoginPage />} />
          <Route
            path="/internal-admin-portal"
            element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="upload" element={<AdminUploadPage />} />
            <Route path="tags" element={<AdminTagsPage />} />
            <Route path="files" element={<AdminFilesPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
}

export default App;
