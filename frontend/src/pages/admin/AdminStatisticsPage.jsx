import { Table } from 'antd';
import {
  FileTextOutlined,
  DownloadOutlined,
  FolderOutlined,
  RiseOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import { useEffect, useMemo, useState } from 'react';
import { adminApi, documentsApi } from '../../api';
import { formatDate, formatFileSize } from '../../utils/helpers';
import PageHeader from '../../components/admin/PageHeader';
import StatCard from '../../components/admin/StatCard';
import StatsSkeleton from '../../components/admin/StatsSkeleton';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const AdminStatisticsPage = () => {
  const [documents, setDocuments] = useState([]);
  const [tagCount, setTagCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([adminApi.listDocuments(), documentsApi.tags()])
      .then(([docsRes, tagsRes]) => {
        setDocuments(docsRes.data);
        setTagCount(tagsRes.data.total);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    const now = Date.now();
    const newThisWeek = documents.filter(
      (d) => now - new Date(d.created_at).getTime() < WEEK_MS
    ).length;
    const totalSize = documents.reduce((sum, d) => sum + (d.size || 0), 0);
    const avgDownloads =
      documents.length > 0
        ? Math.round(
            documents.reduce((sum, d) => sum + (d.download_count || 0), 0) / documents.length
          )
        : 0;
    return {
      total: documents.length,
      downloads: documents.reduce((sum, d) => sum + (d.download_count || 0), 0),
      categories: tagCount,
      newThisWeek,
      totalSize,
      avgDownloads,
    };
  }, [documents, tagCount]);

  const byType = useMemo(() => {
    const map = {};
    documents.forEach((d) => {
      const t = (d.file_type || 'unknown').toUpperCase();
      map[t] = (map[t] || 0) + 1;
    });
    return Object.entries(map)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);
  }, [documents]);

  const topDownloads = useMemo(
    () => [...documents].sort((a, b) => b.download_count - a.download_count).slice(0, 10),
    [documents]
  );

  const columns = [
    { title: 'Loại file', dataIndex: 'type', key: 'type' },
    { title: 'Số lượng', dataIndex: 'count', key: 'count', width: 120 },
  ];

  const topColumns = [
    { title: 'Tiêu đề', dataIndex: 'title', key: 'title', ellipsis: true },
    { title: 'Lượt tải', dataIndex: 'download_count', key: 'download_count', width: 100 },
    {
      title: 'Dung lượng',
      dataIndex: 'size',
      key: 'size',
      width: 100,
      render: (v) => formatFileSize(v),
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 150,
      render: (v) => formatDate(v),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Thống kê"
        subtitle="Phân tích chi tiết dữ liệu hệ thống"
        breadcrumbs={[{ label: 'Thống kê' }]}
      />

      {loading ? (
        <StatsSkeleton />
      ) : (
        <>
          <div className="admin-stats">
            <StatCard icon={<FileTextOutlined />} label="Tổng tài liệu" value={stats.total} color="red" />
            <StatCard icon={<DownloadOutlined />} label="Tổng lượt tải" value={stats.downloads} color="blue" />
            <StatCard icon={<FolderOutlined />} label="Số danh mục" value={stats.categories} color="green" />
            <StatCard icon={<RiseOutlined />} label="Mới tuần này" value={stats.newThisWeek} color="orange" />
          </div>

          <div className="admin-stats" style={{ marginBottom: 24 }}>
            <StatCard
              icon={<BarChartOutlined />}
              label="TB lượt tải / tài liệu"
              value={stats.avgDownloads}
              color="blue"
            />
            <StatCard
              icon={<FileTextOutlined />}
              label="Tổng dung lượng"
              value={formatFileSize(stats.totalSize)}
              color="red"
            />
          </div>
        </>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
        <div className="admin-doc-panel">
          <div className="admin-doc-panel__toolbar">
            <span className="admin-doc-panel__title">Phân bố theo loại file</span>
          </div>
          <Table dataSource={byType} columns={columns} rowKey="type" pagination={false} loading={loading} />
        </div>
        <div className="admin-doc-panel">
          <div className="admin-doc-panel__toolbar">
            <span className="admin-doc-panel__title">Top 10 tải xuống</span>
          </div>
          <Table dataSource={topDownloads} columns={topColumns} rowKey="id" pagination={false} loading={loading} scroll={{ x: 600 }} />
        </div>
      </div>
    </div>
  );
};

export default AdminStatisticsPage;
