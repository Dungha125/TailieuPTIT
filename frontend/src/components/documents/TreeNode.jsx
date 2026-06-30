import { memo, useState, useCallback } from 'react';
import { isNodeActive, isOnActivePath, filterFromNodeChain } from '../../utils/taxonomy';

const TreeNode = memo(({ node, filter, onSelect, depth, ancestors = [] }) => {
  const hasChildren = node.children?.length > 0;
  const chain = [...ancestors, node];
  const active = isNodeActive(node, filter, ancestors);
  const onPath = isOnActivePath(node, filter, ancestors);
  const childActive =
    hasChildren &&
    node.children.some((c) => isOnActivePath(c, filter, chain));
  const [expanded, setExpanded] = useState(depth < 1 || onPath || childActive);

  const handleToggle = useCallback((e) => {
    e.stopPropagation();
    setExpanded((v) => !v);
  }, []);

  const handleSelect = useCallback(() => {
    onSelect(filterFromNodeChain(ancestors, node));
    if (hasChildren) setExpanded(true);
  }, [ancestors, hasChildren, node, onSelect]);

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
              ancestors={chain}
            />
          ))}
        </div>
      )}
    </div>
  );
});

TreeNode.displayName = 'TreeNode';

export default TreeNode;
