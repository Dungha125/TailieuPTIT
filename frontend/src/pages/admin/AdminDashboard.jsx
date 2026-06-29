import { Card, Col, Row, Statistic, Table, Spin } from 'antd';
import {
  FileOutlined,
  DownloadOutlined,
  TagsOutlined,
  FireOutlined,
} from '@ant-design/icons';
import { useEffect, useState } from 'react';
import { adminApi, documentsApi } from '../../api';
import { formatDate } from '../../utils/helpers';

const AdminDashboard = () => {
  const [stats, setStats] = useState({ total: 0, tags: 0, downloads: 0 });
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
        const docs = docsRes.data;
        setStats({
          total: docs.length,
          tags: tagsRes.data.total,
          downloads: docs.reduce((sum, d) => sum + d.download_count, 0),
        });
        setRecent(recentRes.data.slice(0, 5));
        setHot(hotRes.data.slice(0, 5));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const columns = [
    { title: 'Tiêu đề', dataIndex: 'title', key: 'title' },
    { title: 'Loại', dataIndex: 'file_type', key: 'file_type', width: 80 },
    {
      title: 'Lượt tải',
      dataIndex: 'download_count',
      key: 'download_count',
      width: 100,
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (v) => formatDate(v),
    },
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 48 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="page-title">Dashboard</h1>
      <p className="page-subtitle">Tổng quan hệ thống TailieuPTIT</p>

      <Row gutter={[16, 16]} style={{ marginBottom: 32 }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Tổng tài liệu"
              value={stats.total}
              prefix={<FileOutlined style={{ color: '#C62828' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Tổng nhãn"
              value={stats.tags}
              prefix={<TagsOutlined style={{ color: '#C62828' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Tổng lượt tải"
              value={stats.downloads}
              prefix={<DownloadOutlined style={{ color: '#C62828' }} />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title={<><FireOutlined /> Top tải xuống</>}>
            <Table
              dataSource={hot}
              columns={columns}
              rowKey="id"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Tài liệu mới nhất">
            <Table
              dataSource={recent}
              columns={columns}
              rowKey="id"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default AdminDashboard;
