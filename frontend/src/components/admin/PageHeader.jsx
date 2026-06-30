import { Breadcrumb } from 'antd';
import { Link } from 'react-router-dom';
import { HomeOutlined } from '@ant-design/icons';

const PageHeader = ({ title, subtitle, breadcrumbs = [], action }) => (
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
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action}
    </div>
  </div>
);

export default PageHeader;
