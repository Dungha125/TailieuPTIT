export const TAG_CATEGORIES = [
  { value: 'faculty', label: 'Khoa / Viện' },
  { value: 'subject', label: 'Môn học' },
  { value: 'type', label: 'Loại tài liệu' },
  { value: 'year', label: 'Năm học' },
];

export const TAG_CATEGORY_LABELS = Object.fromEntries(
  TAG_CATEGORIES.map((item) => [item.value, item.label])
);

export const UNCLASSIFIED_TAG = 'Chưa phân loại';

export function getCategoryLabel(category) {
  if (!category) return 'Chưa phân nhóm';
  return TAG_CATEGORY_LABELS[category] || category;
}

export function filterTagsByCategory(tags, category) {
  return (tags || []).filter((t) => t.name !== UNCLASSIFIED_TAG && t.category === category);
}

export function getUncategorizedTags(tags) {
  return (tags || []).filter(
    (t) => t.name !== UNCLASSIFIED_TAG && !t.category
  );
}

export function useTagOptionsForCategory(tags, category) {
  return filterTagsByCategory(tags, category).map((t) => ({
    value: t.name,
    label: t.name,
  }));
}
