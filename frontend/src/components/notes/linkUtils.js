export function normalizeLinkUrl(url) {
  const trimmed = (url || '').trim();
  if (!trimmed) return '';
  if (/^(https?:\/\/|mailto:|tel:|\/|#)/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function isInternalAppLink(href) {
  return href.startsWith('/') && !href.startsWith('//');
}

export function openNoteLink(href, { navigate, event }) {
  if (!href || href === '#') return;

  const openNewTab = event?.ctrlKey || event?.metaKey || event?.button === 1;

  if (isInternalAppLink(href)) {
    if (openNewTab) {
      window.open(href, '_blank', 'noopener,noreferrer');
    } else {
      navigate(href);
    }
    return;
  }

  let url = href;
  if (!/^(https?:\/\/|mailto:|tel:)/i.test(url)) {
    url = `https://${url}`;
  }

  window.open(url, '_blank', 'noopener,noreferrer');
}
