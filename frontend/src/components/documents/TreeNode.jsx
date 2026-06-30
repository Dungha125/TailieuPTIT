import { memo, useState, useCallback } from 'react';
import { isNodeActive } from '../../utils/taxonomy';

const TreeNode = memo(({ node, filter, onSelect, depth }) => {
  const hasChildren = node.children?.length > 0;
  const active = isNodeActive(node, filter);
  const childActive = hasChildren && node.children.some(
    (c) => isNodeActive(c, filter) || c.children?.some((cc) => isNodeActive(cc, filter) || cc.children?.some((y) => isNodeActive(y, filter)))
  );
  const [expanded, setExpanded] = useState(depth < 1 || active || childActive);

  const handleToggle = useCallback((e) => {
    e.stopPropagation();
    setExpanded((v) => !v);
  }, []);

  const handleSelect = useCallback(() => {
    onSelect(node);
    if (hasChildren) setExpanded(true);
  }, [hasChildren, node, onSelect]);

  return (
    <div className="tree-node">
      <div className="tree-node__row-wrap" style={{ paddingLeft: depth * 4 }}>
        {hasChildren ? (
          <button type="button" className="tree-node__toggle" onClick={handleToggle} aria-label="Mở rộng">
            {expanded ? '▼' : '▶'}
          </button>
        ) : (
          <span className="tree-node__toggle tree-node__toggle--placeholder">•</span>
        )}
        <button
          type="button"
          className={`tree-node__row ${active ? 'tree-node__row--active' : ''}`}
          onClick={handleSelect}
        >
          <span className="tree-node__label">{node.label}</span>
          <span className="tree-node__count">{node.count}</span>
        </button>
      </div>
      {hasChildren && expanded && (
        <div className="tree-node__children">
          {node.children.map((child) => (
            <TreeNode
              key={`${child.level}-${child.slug}`}
              node={child}
              filter={filter}
              onSelect={onSelect}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
});

TreeNode.displayName = 'TreeNode';

export default TreeNode;
