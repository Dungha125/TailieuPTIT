import { Mark, mergeAttributes } from '@tiptap/core';

export const DocumentLink = Mark.create({
  name: 'documentLink',

  addAttributes() {
    return {
      documentId: { default: null },
      slug: { default: null },
      anchorText: { default: '' },
      available: { default: true },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'a[data-document-id]',
        getAttrs: (node) => ({
          documentId: node.getAttribute('data-document-id'),
          slug: node.getAttribute('data-slug') || '',
          anchorText: node.textContent || '',
          available: node.classList?.contains('doc-link--unavailable') ? false : true,
        }),
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const href = HTMLAttributes.slug
      ? `/tai-lieu/${HTMLAttributes.slug}`
      : HTMLAttributes.documentId
        ? `/documents/${HTMLAttributes.documentId}`
        : '#';
    const unavailable = HTMLAttributes.available === false || HTMLAttributes.available === 'false';
    return [
      'a',
      mergeAttributes(HTMLAttributes, {
        'data-document-id': HTMLAttributes.documentId,
        'data-slug': HTMLAttributes.slug || '',
        href,
        class: unavailable ? 'doc-link doc-link--unavailable' : 'doc-link',
        title: HTMLAttributes.anchorText || 'Tài liệu',
      }),
      0,
    ];
  },
});
