import { Form, Select } from 'antd';
import { useMemo } from 'react';
import { UNCLASSIFIED_TAG, filterTagsByCategory } from '../../utils/tagCategories';

function useCategoryOptions(tags, category) {
  return useMemo(
    () =>
      filterTagsByCategory(tags, category).map((t) => ({
        value: t.name,
        label: t.name,
      })),
    [tags, category]
  );
}

const ClassifyTagFields = ({ tags, size = 'large' }) => {
  const facultyOptions = useCategoryOptions(tags, 'faculty');
  const subjectOptions = useCategoryOptions(tags, 'subject');
  const typeOptions = useCategoryOptions(tags, 'type');
  const yearOptions = useCategoryOptions(tags, 'year');

  const baseProps = {
    size,
    allowClear: true,
    showSearch: true,
    optionFilterProp: 'label',
    placeholder: 'Chọn từ danh mục',
  };

  return (
    <>
      <Form.Item name="faculty" label="Khoa / Viện">
        <Select {...baseProps} options={facultyOptions} />
      </Form.Item>
      <Form.Item name="subject" label="Môn học">
        <Select {...baseProps} options={subjectOptions} />
      </Form.Item>
      <Form.Item name="doc_type" label="Loại tài liệu">
        <Select {...baseProps} options={typeOptions} />
      </Form.Item>
      <Form.Item name="year" label="Năm học">
        <Select {...baseProps} options={yearOptions} />
      </Form.Item>
    </>
  );
};

export function useTagSelectOptions(tags) {
  return useMemo(
    () =>
      (tags || [])
        .filter((t) => t.name !== UNCLASSIFIED_TAG)
        .map((t) => ({ value: t.name, label: t.name })),
    [tags]
  );
}

export default ClassifyTagFields;
