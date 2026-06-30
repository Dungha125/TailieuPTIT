import { tagSlugify } from '../seo/seoConfig';

export const FILTER_LEVELS = ['faculty', 'subject', 'type', 'year'];

export function slugifyLabel(label) {
  return tagSlugify(label || 'khac');
}

export function parseFilterFromSearchParams(searchParams) {
  return {
    faculty: searchParams.get('faculty') || null,
    subject: searchParams.get('subject') || null,
    type: searchParams.get('type') || null,
    year: searchParams.get('year') || null,
    page: Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1),
    q: searchParams.get('q') || '',
  };
}

export function buildFilterSearchParams(filter, page = 1, q = '') {
  const params = new URLSearchParams();
  if (filter.faculty) params.set('faculty', filter.faculty);
  if (filter.subject) params.set('subject', filter.subject);
  if (filter.type) params.set('type', filter.type);
  if (filter.year) params.set('year', filter.year);
  if (q?.trim()) params.set('q', q.trim());
  if (page > 1) params.set('page', String(page));
  return params;
}

export function findNodePath(tree, filter) {
  const crumbs = [{ level: 'home', slug: null, label: 'Trang chủ' }];
  if (!filter.faculty) return crumbs;

  const facultyNode = tree.find((n) => n.slug === filter.faculty);
  if (!facultyNode) return crumbs;
  crumbs.push({ level: 'faculty', slug: facultyNode.slug, label: facultyNode.label });

  if (!filter.subject) return crumbs;
  const subjectNode = facultyNode.children?.find((n) => n.slug === filter.subject);
  if (!subjectNode) return crumbs;
  crumbs.push({ level: 'subject', slug: subjectNode.slug, label: subjectNode.label });

  if (!filter.type) return crumbs;
  const typeNode = subjectNode.children?.find((n) => n.slug === filter.type);
  if (!typeNode) return crumbs;
  crumbs.push({ level: 'type', slug: typeNode.slug, label: typeNode.label });

  if (!filter.year) return crumbs;
  const yearNode = typeNode.children?.find((n) => n.slug === filter.year);
  if (!yearNode) return crumbs;
  crumbs.push({ level: 'year', slug: yearNode.slug, label: yearNode.label });

  return crumbs;
}

export function isNodeActive(node, filter, ancestors = []) {
  return [...ancestors, node].every((n) => filter[n.level] === n.slug);
}

export function isOnActivePath(node, filter, ancestors = []) {
  return [...ancestors, node].every((n) => !filter[n.level] || filter[n.level] === n.slug);
}

export function filterFromNodeChain(ancestors, node) {
  const filter = { faculty: null, subject: null, type: null, year: null };
  [...ancestors, node].forEach((n) => {
    filter[n.level] = n.slug;
  });
  return filter;
}

/** @deprecated Use filterFromNodeChain with ancestor path — slug alone is not unique across branches. */
export function buildFilterForNode(tree, targetNode) {
  const path = [];
  const walk = (nodes, ancestors) => {
    for (const n of nodes) {
      const chain = [...ancestors, n];
      if (n.slug === targetNode.slug && n.level === targetNode.level) {
        path.push(...chain);
        return true;
      }
      if (n.children?.length && walk(n.children, chain)) return true;
    }
    return false;
  };
  walk(tree, []);
  const filter = { faculty: null, subject: null, type: null, year: null };
  path.forEach((n) => {
    filter[n.level] = n.slug;
  });
  return filter;
}

export function breadcrumbFilterFromIndex(crumbs, index) {
  const filter = { faculty: null, subject: null, type: null, year: null };
  crumbs.slice(1, index + 1).forEach((c) => {
    if (c.level !== 'home') filter[c.level] = c.slug;
  });
  return filter;
}
