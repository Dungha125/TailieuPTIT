import { Progress, Typography } from 'antd';
import { HddOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import { adminApi } from '../../api';
import { formatFileSize } from '../../utils/helpers';

const StorageBar = () => {
  const [storage, setStorage] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStorage = () => {
    adminApi
      .getStorage()
      .then((res) => setStorage(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchStorage();
    const timer = setInterval(fetchStorage, 60000);
    return () => clearInterval(timer);
  }, []);

  if (loading && !storage) {
    return null;
  }

  if (!storage) {
    return null;
  }

  const percent = storage.used_percent;
  const strokeColor = percent >= 90 ? '#ff4d4f' : percent >= 70 ? '#faad14' : '#D32F2F';

  return (
    <div className="admin-storage-bar">
      <div className="admin-storage-bar__header">
        <span>
          <HddOutlined /> Dung lượng lưu trữ
        </span>
        <Typography.Text type="secondary">
          {formatFileSize(storage.used_bytes)} / {formatFileSize(storage.total_bytes)}
        </Typography.Text>
      </div>
      <Progress
        percent={percent}
        strokeColor={strokeColor}
        showInfo={false}
        size="small"
      />
      <Typography.Text type="secondary" className="admin-storage-bar__meta">
        {storage.file_count} tài liệu · {percent}% đã dùng
      </Typography.Text>
    </div>
  );
};

export default StorageBar;
