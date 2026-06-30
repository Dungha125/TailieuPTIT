import { Spin } from 'antd';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { documentsApi } from '../api';
import { categoryPath, tagName, tagSlug } from '../seo/seoConfig';

const TagSidebar = ({ activeTag, tagSlug, onTagSelect }) => {
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

  const isTagActive = (tag) => {
    const slug = tagSlug(tag);
    const name = tagName(tag);
    return tagSlug === slug || activeTag === name;
  };

  return (
    <aside className="tag-sidebar">
      <h2 style={{ fontSize: '1rem', marginBottom: 12, color: '#D32F2F' }}>Danh mục</h2>
      <ul className="tag-list">
        <li
          className={`tag-item ${!activeTag && !tagSlug ? 'active' : ''}`}
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
              className={`tag-item ${isTagActive(tag) ? 'active' : ''}`}
            >
              <Link to={categoryPath(tag)}>{tag.name}</Link>
            </li>
          ))}
      </ul>
    </aside>
  );
};

export default TagSidebar;
