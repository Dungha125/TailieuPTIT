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
    return [{ tag: 'a[data-document-id]' }];
  },

  renderHTML({ HTMLAttributes }) {
    const href = HTMLAttributes.slug
      ? `/tai-lieu/${HTMLAttributes.slug}`
      : HTMLAttributes.documentId
        ? `/documents/${HTMLAttributes.documentId}`
        : '#';
    return [
      'a',
      mergeAttributes(HTMLAttributes, {
        'data-document-id': HTMLAttributes.documentId,
        href,
        target: '_blank',
        rel: 'noopener noreferrer',
        class: HTMLAttributes.available === false ? 'doc-link doc-link--unavailable' : 'doc-link',
        title: HTMLAttributes.anchorText || 'Tài liệu',
      }),
      0,
    ];
  },
});
