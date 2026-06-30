import { memo } from 'react';
import TreeNode from './TreeNode';

const SidebarTree = memo(({ tree, filter, onSelect, onClear, loading }) => {
  if (loading) {
    return (
      <div className="documents-sidebar">
        <h2 className="documents-sidebar__title">Danh mục</h2>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="doc-grid__skeleton" style={{ height: 32, marginBottom: 8 }} />
        ))}
      </div>
    );
  }

  const hasFilter = filter.faculty || filter.subject || filter.type || filter.year;

  return (
    <div className="documents-sidebar">
      <h2 className="documents-sidebar__title">Danh mục</h2>
      <button
        type="button"
        className={`documents-sidebar__all ${!hasFilter ? 'documents-sidebar__all--active' : ''}`}
        onClick={onClear}
      >
        Tất cả tài liệu
      </button>
      {tree.map((node) => (
        <TreeNode key={`${node.level}-${node.slug}`} node={node} filter={filter} onSelect={onSelect} depth={0} />
      ))}
    </div>
  );
});

SidebarTree.displayName = 'SidebarTree';

export default SidebarTree;
