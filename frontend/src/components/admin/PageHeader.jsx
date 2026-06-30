import { Breadcrumb } from 'antd';
import { Link } from 'react-router-dom';
import { HomeOutlined } from '@ant-design/icons';

const PageHeader = ({ title, subtitle, breadcrumbs = [] }) => (
  <div className="admin-page-header">
    <Breadcrumb
      className="admin-page-header__breadcrumb"
      items={[
        {
          title: (
            <Link to="/internal-admin-portal">
              <HomeOutlined /> Admin
            </Link>
          ),
        },
        ...breadcrumbs.map((b) => ({
          title: b.path ? <Link to={b.path}>{b.label}</Link> : b.label,
        })),
      ]}
    />
    <h1>{title}</h1>
    {subtitle && <p>{subtitle}</p>}
  </div>
);

export default PageHeader;
