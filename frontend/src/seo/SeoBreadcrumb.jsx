import { Link } from 'react-router-dom';
import { Breadcrumb } from 'antd';
import { HomeOutlined } from '@ant-design/icons';

const SeoBreadcrumb = ({ items = [] }) => (
  <Breadcrumb
    style={{ marginBottom: 16 }}
    items={[
      {
        title: (
          <Link to="/">
            <HomeOutlined /> Trang chủ
          </Link>
        ),
      },
      ...items.map((item) => ({
        title: item.path ? <Link to={item.path}>{item.name}</Link> : item.name,
      })),
    ]}
  />
);

export default SeoBreadcrumb;
