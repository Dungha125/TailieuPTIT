export const SITE_URL = import.meta.env.VITE_SITE_URL || 'https://tailieuptit.lcdkhoacntt1.com';
export const SITE_NAME = 'TailieuPTIT';
export const SITE_TITLE = 'Tài liệu học tập PTIT | Tổng hợp đề thi, slide, giáo trình';
export const SITE_DESCRIPTION =
  'Kho tài liệu PTIT miễn phí gồm đề thi, giáo trình, slide bài giảng, bài tập lớn. Tra cứu, xem trước và tải xuống nhanh chóng.';
export const SITE_KEYWORDS =
  'tài liệu PTIT, đề thi PTIT, slide PTIT, giáo trình, học tập, Học viện Công nghệ Bưu chính Viễn thông';
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-default.png`;

export const PAGE_SEO = {
  home: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    keywords: SITE_KEYWORDS,
    path: '/',
  },
  documents: {
    title: 'Danh sách tài liệu PTIT | Tổng hợp tài liệu học tập',
    description: 'Khám phá kho tài liệu PTIT theo danh mục: đề thi, giáo trình, slide, bài tập và nhiều hơn nữa.',
    keywords: 'danh sách tài liệu PTIT, tài liệu học tập, đề thi, giáo trình',
    path: '/documents',
  },
  search: {
    title: 'Tìm kiếm tài liệu PTIT',
    description: 'Tìm kiếm đề thi, giáo trình, slide và tài liệu học tập PTIT miễn phí.',
    keywords: 'tìm kiếm tài liệu PTIT, tra cứu đề thi',
    path: '/search',
  },
};

export function absoluteUrl(path = '/') {
  if (!path) return SITE_URL;
  if (path.startsWith('http')) return path;
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

export function documentPath(doc) {
  if (doc?.slug) return `/tai-lieu/${doc.slug}`;
  if (doc?.id) return `/documents/${doc.id}`;
  return '/documents';
}

export function categoryPath(tag) {
  if (tag?.slug) return `/danh-muc/${tag.slug}`;
  return '/documents';
}

export function documentTitle(title) {
  return `${title} | Tài liệu PTIT`;
}

export function categoryTitle(name) {
  return `Tài liệu ${name} PTIT`;
}
