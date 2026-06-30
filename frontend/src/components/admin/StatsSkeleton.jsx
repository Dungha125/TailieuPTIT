import { Skeleton } from 'antd';

const StatsSkeleton = () => (
  <div className="admin-stats">
    {[1, 2, 3, 4].map((i) => (
      <div key={i} className="stat-card">
        <Skeleton.Avatar active size={52} shape="square" style={{ borderRadius: 12 }} />
        <div style={{ flex: 1 }}>
          <Skeleton.Input active size="small" style={{ width: 100, marginBottom: 8 }} />
          <Skeleton.Input active size="large" style={{ width: 60 }} />
        </div>
      </div>
    ))}
  </div>
);

export default StatsSkeleton;
