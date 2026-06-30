import { Input, Select, Button } from 'antd';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';

const SORT_OPTIONS = [
  { value: 'date_desc', label: 'Mới nhất' },
  { value: 'date_asc', label: 'Cũ nhất' },
  { value: 'downloads_desc', label: 'Lượt tải cao' },
  { value: 'size_desc', label: 'Kích thước lớn' },
];

const DocumentFilters = ({ tags, filters, onChange, onReset }) => (
  <div className="admin-filter-bar">
    <div className="admin-filter-bar__row">
      <Input
        className="admin-filter-bar__search"
        placeholder="Tìm theo tên, mô tả..."
        prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
        allowClear
        size="large"
        value={filters.search}
        onChange={(e) => onChange({ ...filters, search: e.target.value })}
      />
      <Select
        className="admin-filter-bar__select"
        placeholder="Danh mục / Tag"
        allowClear
        size="large"
        value={filters.tagId || undefined}
        onChange={(tagId) => onChange({ ...filters, tagId: tagId || null })}
        options={tags.map((t) => ({ value: t.id, label: t.name }))}
      />
      <Select
        className="admin-filter-bar__select"
        placeholder="Sắp xếp"
        size="large"
        value={filters.sort}
        onChange={(sort) => onChange({ ...filters, sort })}
        options={SORT_OPTIONS}
      />
      <Button className="btn-outline-red" icon={<ReloadOutlined />} onClick={onReset}>
        Đặt lại
      </Button>
    </div>
  </div>
);

export default DocumentFilters;
export { SORT_OPTIONS };
