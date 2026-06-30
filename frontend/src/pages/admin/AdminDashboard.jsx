import { Table } from 'antd';
import {
  FileTextOutlined,
  DownloadOutlined,
  FolderOutlined,
  RiseOutlined,
  FireOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi, documentsApi } from '../../api';
import { formatDate } from '../../utils/helpers';
import PageHeader from '../../components/admin/PageHeader';
import StatCard from '../../components/admin/StatCard';
import StatsSkeleton from '../../components/admin/StatsSkeleton';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const AdminDashboard = () => {
  const [documents, setDocuments] = useState([]);
  const [tagCount, setTagCount] = useState(0);
  const [recent, setRecent] = useState([]);
  const [hot, setHot] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      adminApi.listDocuments(),
      documentsApi.tags(),
      documentsApi.recent(),
      documentsApi.hot(),
    ])
      .then(([docsRes, tagsRes, recentRes, hotRes]) => {
        setDocuments(docsRes.data);
        setTagCount(tagsRes.data.total);
        setRecent(recentRes.data.slice(0, 5));
        setHot(hotRes.data.slice(0, 5));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    const now = Date.now();
    const newThisWeek = documents.filter(
      (d) => now - new Date(d.created_at).getTime() < WEEK_MS
    ).length;
    return {
      total: documents.length,
      downloads: documents.reduce((sum, d) => sum + (d.download_count || 0), 0),
      categories: tagCount,
      newThisWeek,
    };
  }, [documents, tagCount]);

  const columns = [
    {
      title: 'Tiêu đề',
      dataIndex: 'title',
      key: 'title',
      render: (title, record) => (
        <Link to={`/documents/${record.id}`} target="_blank">
          {title}
        </Link>
      ),
    },
    { title: 'Loại', dataIndex: 'file_type', key: 'file_type', width: 80 },
    { title: 'Lượt tải', dataIndex: 'download_count', key: 'download_count', width: 100 },
    {
      title: 'Ngày tạo',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (v) => formatDate(v),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Tổng quan hệ thống quản lý tài liệu TailieuPTIT"
        breadcrumbs={[{ label: 'Dashboard' }]}
      />

      {loading ? (
        <StatsSkeleton />
      ) : (
        <div className="admin-stats">
          <StatCard icon={<FileTextOutlined />} label="Tổng tài liệu" value={stats.total} color="red" />
          <StatCard icon={<DownloadOutlined />} label="Tổng lượt tải" value={stats.downloads} color="blue" />
          <StatCard icon={<FolderOutlined />} label="Số danh mục" value={stats.categories} color="green" />
          <StatCard icon={<RiseOutlined />} label="Mới tuần này" value={stats.newThisWeek} color="orange" />
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
        <div className="admin-doc-panel">
          <div className="admin-doc-panel__toolbar">
            <span className="admin-doc-panel__title">
              <FireOutlined style={{ color: '#D32F2F', marginRight: 8 }} />
              Top tải xuống
            </span>
          </div>
          <Table dataSource={hot} columns={columns} rowKey="id" pagination={false} size="middle" loading={loading} />
        </div>
        <div className="admin-doc-panel">
          <div className="admin-doc-panel__toolbar">
            <span className="admin-doc-panel__title">
              <ClockCircleOutlined style={{ color: '#D32F2F', marginRight: 8 }} />
              Tài liệu mới nhất
            </span>
          </div>
          <Table dataSource={recent} columns={columns} rowKey="id" pagination={false} size="middle" loading={loading} />
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
