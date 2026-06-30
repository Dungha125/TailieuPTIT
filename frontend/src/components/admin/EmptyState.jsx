import { FileSearchOutlined } from '@ant-design/icons';

const EmptyState = ({ title = 'Không có dữ liệu', description, action }) => (
  <div className="admin-empty">
    <div className="admin-empty__icon">
      <FileSearchOutlined />
    </div>
    <h3>{title}</h3>
    {description && <p>{description}</p>}
    {action}
  </div>
);

export default EmptyState;
