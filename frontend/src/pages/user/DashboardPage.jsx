import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Col, List, Row, Spin, Tag } from 'antd';
import { FileTextOutlined, FolderOutlined, StarOutlined } from '@ant-design/icons';
import { userApi } from '../../api';
import UserLayout from '../../components/user/UserLayout';
import SeoHead from '../../seo/SeoHead';

const DashboardPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    userApi
      .dashboard()
      .then((res) => setData(res.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <UserLayout>
        <div style={{ textAlign: 'center', padding: 80 }}>
          <Spin size="large" />
        </div>
      </UserLayout>
    );
  }

  return (
    <UserLayout>
      <SeoHead title="Bảng điều khiển | TailieuPTIT" />
      <h1 className="page-title">Bảng điều khiển</h1>
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card>
            <FileTextOutlined style={{ color: '#D32F2F' }} /> {data.note_count} ghi chú
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <FolderOutlined style={{ color: '#D32F2F' }} /> {data.folder_count} thư mục
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <StarOutlined style={{ color: '#D32F2F' }} /> {data.bookmark_count} bookmark
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="Ghi chú gần đây">
            <List
              dataSource={data.recent_notes}
              renderItem={(n) => (
                <List.Item>
                  <Link to={`/app/notes/${n.id}`}>{n.title}</Link>
                </List.Item>
              )}
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Tài liệu đã xem">
            <List
              dataSource={data.recent_documents}
              renderItem={(d) => (
                <List.Item>
                  <Link to={d.slug ? `/tai-lieu/${d.slug}` : `/documents/${d.id}`}>{d.title}</Link>
                  <Tag>{d.file_type}</Tag>
                </List.Item>
              )}
            />
          </Card>
        </Col>
        <Col xs={24}>
          <Card title="Bookmark">
            <List
              dataSource={data.bookmarked_documents}
              renderItem={(b) => (
                <List.Item>
                  <Link to={b.document_slug ? `/tai-lieu/${b.document_slug}` : `/documents/${b.document_id}`}>
                    {b.document_title}
                  </Link>
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
    </UserLayout>
  );
};

export default DashboardPage;
