import { SITE_NAME, SITE_URL, absoluteUrl } from './seoConfig';

export function websiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    description: 'Kho tài liệu PTIT miễn phí',
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE_URL}/search?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
}

export function creativeWorkSchema(document) {
  if (!document) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: document.title,
    description: document.description || document.title,
    author: {
      '@type': 'Organization',
      name: SITE_NAME,
    },
    datePublished: document.created_at,
    dateModified: document.updated_at || document.created_at,
    keywords: document.tags?.map((t) => t.name).join(', '),
    educationalLevel: 'University',
    learningResourceType: document.file_type?.toUpperCase(),
    url: absoluteUrl(`/tai-lieu/${document.slug || document.id}`),
  };
}

export function collectionPageSchema(name, description, url) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name,
    description,
    url: absoluteUrl(url),
  };
}

export function breadcrumbSchema(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function JsonLd({ data }) {
  if (!data) return null;
  const payload = Array.isArray(data) ? data : [data];
  return (
    <>
      {payload.filter(Boolean).map((item, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(item)}
        </script>
      ))}
    </>
  );
}
