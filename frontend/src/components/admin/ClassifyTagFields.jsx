import { Form, Select } from 'antd';
import { useMemo } from 'react';

const UNCLASSIFIED = 'Chưa phân loại';

export function useTagSelectOptions(tags) {
  return useMemo(
    () =>
      (tags || [])
        .filter((t) => t.name !== UNCLASSIFIED)
        .map((t) => ({ value: t.name, label: t.name })),
    [tags]
  );
}

const ClassifyTagFields = ({ tags, size = 'large' }) => {
  const options = useTagSelectOptions(tags);
  const selectProps = {
    size,
    allowClear: true,
    showSearch: true,
    optionFilterProp: 'label',
    placeholder: 'Chọn từ danh mục',
    options,
  };

  return (
    <>
      <Form.Item name="faculty" label="Khoa / Viện">
        <Select {...selectProps} />
      </Form.Item>
      <Form.Item name="subject" label="Môn học">
        <Select {...selectProps} />
      </Form.Item>
      <Form.Item name="doc_type" label="Loại tài liệu">
        <Select {...selectProps} />
      </Form.Item>
      <Form.Item name="year" label="Năm học">
        <Select {...selectProps} />
      </Form.Item>
    </>
  );
};

export default ClassifyTagFields;
