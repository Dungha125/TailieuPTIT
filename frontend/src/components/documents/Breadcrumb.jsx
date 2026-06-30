import { memo } from 'react';

const Breadcrumb = memo(({ items, onNavigate }) => (
  <nav className="filter-breadcrumb" aria-label="Breadcrumb">
    {items.map((item, index) => (
      <span key={`${item.level}-${item.slug || 'root'}`} className="filter-breadcrumb__item">
        {index > 0 && <span className="filter-breadcrumb__sep"> &gt; </span>}
        {index < items.length - 1 ? (
          <button type="button" className="filter-breadcrumb__link" onClick={() => onNavigate(item, index)}>
            {item.label}
          </button>
        ) : (
          <span>{item.label}</span>
        )}
      </span>
    ))}
  </nav>
));

Breadcrumb.displayName = 'Breadcrumb';

export default Breadcrumb;
