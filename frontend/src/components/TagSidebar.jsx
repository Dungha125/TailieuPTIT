import { Spin } from 'antd';
import { useEffect, useState } from 'react';
import { documentsApi } from '../api';

const TagSidebar = ({ activeTag, onTagSelect }) => {
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    documentsApi
      .tags()
      .then((res) => setTags(res.data.items))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spin />;

  return (
    <aside className="tag-sidebar">
      <h3>Nhãn phân loại</h3>
      <ul className="tag-list">
        <li
          className={`tag-item ${!activeTag ? 'active' : ''}`}
          onClick={() => onTagSelect(null)}
        >
          Tất cả
        </li>
        <li
          className={`tag-item ${activeTag === 'Chưa phân loại' ? 'active' : ''}`}
          onClick={() => onTagSelect('Chưa phân loại')}
        >
          Chưa phân loại
        </li>
        {tags
          .filter((t) => t.name !== 'Chưa phân loại')
          .map((tag) => (
            <li
              key={tag.id}
              className={`tag-item ${activeTag === tag.name ? 'active' : ''}`}
              onClick={() => onTagSelect(tag.name)}
            >
              {tag.name}
            </li>
          ))}
      </ul>
    </aside>
  );
};

export default TagSidebar;
