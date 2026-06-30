import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, App as AntApp, Spin } from 'antd';
import { HelmetProvider } from 'react-helmet-async';
import viVN from 'antd/locale/vi_VN';
import PublicNavbar from './components/PublicNavbar';
import AdminLayout from './components/admin/AdminLayout';
import ProtectedRoute from './components/admin/ProtectedRoute';
import HomePage from './pages/HomePage';
import DocumentsPage from './pages/DocumentsPage';
import SearchPage from './pages/SearchPage';
import DocumentDetailPage from './pages/DocumentDetailPage';

const AdminLoginPage = lazy(() => import('./pages/admin/AdminLoginPage'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminUploadPage = lazy(() => import('./pages/admin/AdminUploadPage'));
const AdminTagsPage = lazy(() => import('./pages/admin/AdminTagsPage'));
const AdminFilesPage = lazy(() => import('./pages/admin/AdminFilesPage'));
const AdminUsersPage = lazy(() => import('./pages/admin/AdminUsersPage'));
const AdminStatisticsPage = lazy(() => import('./pages/admin/AdminStatisticsPage'));

const theme = {
  token: {
    colorPrimary: '#D32F2F',
    colorLink: '#D32F2F',
    borderRadius: 12,
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  },
};

const PageLoader = () => (
  <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
    <Spin size="large" />
  </div>
);

const PublicLayout = ({ children }) => (
  <div className="app-layout">
    <PublicNavbar />
    <main className="main-content">{children}</main>
  </div>
);

function App() {
  return (
    <HelmetProvider>
      <ConfigProvider theme={theme} locale={viVN}>
        <AntApp>
          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<PublicLayout><HomePage /></PublicLayout>} />
                <Route path="/documents" element={<PublicLayout><DocumentsPage /></PublicLayout>} />
                <Route path="/danh-muc/:tagSlug" element={<PublicLayout><DocumentsPage /></PublicLayout>} />
                <Route path="/tai-lieu/:slug" element={<PublicLayout><DocumentDetailPage /></PublicLayout>} />
                <Route
                  path="/documents/:id"
                  element={<PublicLayout><DocumentDetailPage legacyId /></PublicLayout>}
                />
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
                  <Route path="files" element={<AdminFilesPage />} />
                  <Route path="tags" element={<AdminTagsPage />} />
                  <Route path="upload" element={<AdminUploadPage />} />
                  <Route path="users" element={<AdminUsersPage />} />
                  <Route path="statistics" element={<AdminStatisticsPage />} />
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </AntApp>
      </ConfigProvider>
    </HelmetProvider>
  );
}

export default App;
